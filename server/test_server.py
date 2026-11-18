"""python -m unittest test_server (whisper and claude are faked, nothing leaves this machine)"""
import http.client
import json
import os
import shutil
import tempfile
import threading
import time
import unittest
from http.server import ThreadingHTTPServer
from types import SimpleNamespace

TMP = tempfile.mkdtemp(prefix="classcribe-test-")
os.environ["CLASSCRIBE_CONFIG"] = os.path.join(TMP, "config.json")
os.environ["CLASSCRIBE_DATA"] = os.path.join(TMP, "data")
os.environ["CLASSCRIBE_TOKEN"] = "test-token"

import classcribe_server as cs  # noqa: E402

NOTES = {
    "title": "Derivatives",
    "unit": None,
    "blocks": [{"type": "heading", "text": "1. Limits", "items": [], "at": None}],
    "alerts": [{"kind": "exam", "quote": "this is on the exam", "summary": "Study limits", "at": 12, "due": None}],
}


class FakeWhisper:
    def transcribe(self, path, **kw):
        parts = [SimpleNamespace(start=0.0, end=5.0, text=" hello "), SimpleNamespace(start=5.0, end=10.0, text="this is on the exam")]
        return iter(parts), SimpleNamespace(duration=10.0)


class Api(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cs.configure()
        cs.load_whisper = lambda: FakeWhisper()
        cls.calls = []

        def fake_claude(job, command, prompt, cwd):
            cls.calls.append((command, prompt, cwd, sorted(os.listdir(cwd))))
            if "FAIL" in prompt:
                return 1, json.dumps({"is_error": True, "result": "usage limit reached"}), ""
            return 0, json.dumps({"is_error": False, "structured_output": NOTES}), ""

        cs.run_claude = fake_claude
        threading.Thread(target=cs.worker, daemon=True).start()
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), cs.Handler)
        cls.port = cls.srv.server_address[1]
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()
        shutil.rmtree(TMP, ignore_errors=True)

    def req(self, method, path, body=None, token="test-token", raw=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        headers = {"Authorization": "Bearer " + token} if token else {}
        data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
        c.request(method, path, body=data, headers=headers)
        r = c.getresponse()
        out = json.loads(r.read() or b"null")
        c.close()
        return r.status, out

    def new_job(self, **extra):
        body = {"subject": "Maths", "lecture_date": "2026-11-18", "weekday": "Wednesday", "units": ["Unit 1"], **extra}
        code, job = self.req("POST", "/api/jobs", body)
        self.assertEqual(code, 201)
        return job["id"]

    def wait(self, job_id):
        for _ in range(200):
            code, job = self.req("GET", "/api/jobs/" + job_id)
            if job["status"] in ("done", "error"):
                return job
            time.sleep(0.02)
        self.fail("job never finished")

    def test_health_is_public_and_the_rest_is_not(self):
        self.assertEqual(self.req("GET", "/api/health", token=None)[0], 200)
        self.assertEqual(self.req("GET", "/api/status", token=None)[0], 401)
        self.assertEqual(self.req("GET", "/api/status", token="wrong")[0], 401)
        self.assertEqual(self.req("POST", "/api/jobs", {}, token="wrong")[0], 401)

    def test_full_lecture(self):
        job_id = self.new_job(syllabus=[{"name": "../../evil.pdf", "mime": "application/pdf"}])
        self.assertEqual(self.req("POST", "/api/jobs/%s/start" % job_id)[0], 409)
        self.assertEqual(self.req("PUT", "/api/jobs/%s/audio" % job_id, raw=b"audio")[0], 200)
        self.assertEqual(self.req("PUT", "/api/jobs/%s/syllabus/2" % job_id, raw=b"x")[0], 404)
        self.assertEqual(self.req("PUT", "/api/jobs/%s/syllabus/1" % job_id, raw=b"%PDF")[0], 200)
        self.assertEqual(self.req("POST", "/api/jobs/%s/start" % job_id)[0], 202)

        job = self.wait(job_id)
        self.assertEqual(job["status"], "done")
        self.assertEqual(job["result"]["title"], "Derivatives")
        self.assertTrue(job["result"]["used_syllabus"])

        command, prompt, cwd, files = self.calls[-1]
        self.assertEqual(files, ["1.pdf"])
        self.assertIn("[00:00:05] this is on the exam", prompt)
        self.assertFalse(os.path.exists(os.path.join(cs.job_dir(job_id), "audio.bin")))

        code, out = self.req("GET", "/api/jobs/%s/transcript" % job_id)
        self.assertEqual((code, out["segments"][0]["text"]), (200, "hello"))
        self.assertEqual(self.req("DELETE", "/api/jobs/" + job_id)[0], 200)
        self.assertEqual(self.req("GET", "/api/jobs/" + job_id)[0], 404)
        self.assertFalse(os.path.exists(cs.job_dir(job_id)))

    def test_retry_with_a_transcript_needs_no_audio(self):
        job_id = self.new_job(transcript=[{"start": 1, "end": 2, "text": "already transcribed"}])
        self.assertEqual(self.req("POST", "/api/jobs/%s/start" % job_id)[0], 202)
        self.assertEqual(self.wait(job_id)["status"], "done")
        self.assertIn("already transcribed", self.calls[-1][1])

    def test_claude_errors_reach_the_phone(self):
        job_id = self.new_job(transcript=[{"start": 1, "end": 2, "text": "FAIL"}])
        self.req("POST", "/api/jobs/%s/start" % job_id)
        job = self.wait(job_id)
        self.assertEqual((job["status"], job["error"]), ("error", "usage limit reached"))

    def test_bad_input(self):
        self.assertEqual(self.req("POST", "/api/jobs", {"lecture_date": "soon"})[0], 400)
        bad = {"lecture_date": "2026-11-18", "syllabus": [{"name": "x", "mime": "application/x-sh"}]}
        self.assertEqual(self.req("POST", "/api/jobs", bad)[0], 400)
        self.assertEqual(self.req("GET", "/api/jobs/..%2f..%2fconfig")[0], 404)

    def test_claude_is_locked_down(self):
        job = {"syllabus": []}
        command = cs.claude_command(job, "system.txt")
        self.assertIn("--restricted", command)
        self.assertIn("--strict-mcp-config", command)
        self.assertEqual(command[command.index("--tools") + 1], "")
        self.assertEqual(cs.claude_command({"syllabus": [1]}, "s")[command.index("--tools") + 1], "Read")
        self.assertNotIn("bypassPermissions", command)

    def test_a_stray_api_key_is_not_used(self):
        os.environ["ANTHROPIC_API_KEY"] = "sk-ant-test"
        try:
            self.assertNotIn("ANTHROPIC_API_KEY", cs.claude_env())
        finally:
            del os.environ["ANTHROPIC_API_KEY"]

    def test_private_clients_only(self):
        for ip in ("127.0.0.1", "192.168.1.20", "10.0.0.4", "100.101.102.103", "::1", "::ffff:192.168.1.20"):
            self.assertTrue(cs.is_private_client(ip), ip)
        for ip in ("8.8.8.8", "1.1.1.1", "::ffff:8.8.8.8", "nonsense"):
            self.assertFalse(cs.is_private_client(ip), ip)

    def test_unfinished_jobs_survive_a_restart(self):
        job_id = self.new_job(transcript=[{"start": 1, "end": 2, "text": "restart"}])
        job = cs._jobs[job_id]
        cs.update(job, status="writing")
        cs._jobs.clear()
        cs.restore_jobs()
        self.assertEqual(self.wait(job_id)["status"], "done")


if __name__ == "__main__":
    unittest.main()
