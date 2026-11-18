# Classcribe server

Process your lectures on a computer you own instead of paying for API calls. An old laptop or a mini PC is enough.

```
 phone ──── audio + syllabus ───▶ your computer
                                    ├─ faster-whisper   transcribes the audio locally
                                    └─ Claude Code      writes the notes with your account
 phone ◀─── notes + alerts ────────┘
```

The server is optional. The app works with [API keys](../README.md#api-keys) out of the box, and you can switch between both modes in **Settings** at any time.

## What you need

- A computer that stays on. Linux, Windows or macOS.
- Python 3.10 or newer.
- [Claude Code](https://claude.com/claude-code), logged in to your account.
- [Tailscale](https://tailscale.com/download) on the computer and the phone, to reach the server from anywhere. On the same wifi you can skip it.

## Set it up

**1. Get the code and install the transcription model's runtime**

```bash
git clone https://github.com/iago-df/classcribe.git
cd classcribe/server
python3 -m venv .venv
source .venv/bin/activate    # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**2. Log in to Claude Code**, if you have not done it yet on this computer:

```bash
claude
```

**3. Start the server**

```bash
python classcribe_server.py
```

It checks that everything is in place and prints what the app needs:

```
  claude code  ok, model sonnet
  whisper      ok, model small

in the app, settings > my server:

  url (tailscale)  http://100.101.102.103:8788
  token  Zk3v…
```

**4. Connect the app.** Open **Settings → AI processing → My server**, paste the address and the token, and tap **Test connection**.

That is all. New lectures now go to your server. The first one takes longer because the transcription model has to download.

## Keep it running

On Linux, let systemd start it with the computer. Create `/etc/systemd/system/classcribe.service`, changing the user and the paths:

```ini
[Unit]
Description=Classcribe server
After=network-online.target
Wants=network-online.target

[Service]
User=you
WorkingDirectory=/home/you/classcribe/server
ExecStart=/home/you/classcribe/server/.venv/bin/python classcribe_server.py
Environment=PATH=/home/you/.local/bin:/usr/local/bin:/usr/bin:/bin
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now classcribe
journalctl -u classcribe -f
```

It uses its own port, so it can live next to anything else you run on that computer.

## What happens when…

| | |
|---|---|
| **The computer is off** | The lecture stays on your phone and shows *Waiting for your server*. It is sent as soon as the server is back and the app is open. |
| **You close the app** | The server keeps working. The notes appear the next time you open the app. |
| **The server restarts** | Unfinished lectures go back in the queue. |
| **You record several lectures** | They are processed one at a time, in order. |
| **You reach your Claude usage limit** | The lecture shows the error. Tap **Retry** later; it does not transcribe again. |

## Settings

The first run creates `config.json` next to the script. Restart the server after changing it.

| Key | Default | What it does |
|---|---|---|
| `claude_model` | `sonnet` | Model for the notes. Anything `claude --model` accepts. |
| `whisper_model` | `small` | `tiny` and `base` are faster, `medium` and `large-v3` are more accurate and much slower on a CPU. |
| `whisper_device` | `auto` | `cpu`, `cuda` or `auto`. |
| `whisper_compute` | `int8` | Use `float16` on a GPU. |
| `port` | `8788` | Port to listen on. |
| `notes_timeout_min` | `30` | Time Claude gets to write one lecture's notes. |
| `max_upload_mb` | `1024` | Largest file the server accepts. |
| `keep_days` | `14` | How long a finished lecture waits for the phone to pick it up. |

## Security

- **Do not forward this port on your router.** The server talks plain HTTP. Tailscale encrypts the connection for you; on an open network, anyone could read what you send. The server rejects clients from public addresses and the app refuses plain HTTP to them.
- **Keep the token private.** It is in `config.json`, which git ignores. Delete the `token` value and restart to get a new one.
- **Claude runs locked down.** Recordings and uploaded files are untrusted, so each lecture runs with Claude Code's restricted mode: no commands, no web, no MCP servers and none of your settings. It can only read the syllabus files of that lecture.
- Lectures are deleted from the server as soon as the phone has them.

## Good to know

- Every lecture counts against your Claude plan's usage limits.
- This is meant for your own lectures. Everyone runs their own server with their own Claude account; do not offer yours to other people.
- The transcript and the syllabus still reach Anthropic through Claude Code. The audio never leaves your computer.

## API

Everything except `/api/health` needs `Authorization: Bearer <token>`.

| Method | Path | |
|---|---|---|
| `GET` | `/api/health` | Is this a Classcribe server, and which API version |
| `GET` | `/api/status` | Claude, Whisper, models and queue |
| `POST` | `/api/jobs` | New job: subject, date, units, syllabus list, optional transcript |
| `PUT` | `/api/jobs/{id}/audio` | Upload the recording |
| `PUT` | `/api/jobs/{id}/syllabus/{n}` | Upload syllabus file `n`, starting at 1 |
| `POST` | `/api/jobs/{id}/start` | Queue the job |
| `GET` | `/api/jobs/{id}` | Status, progress and, when done, the result |
| `GET` | `/api/jobs/{id}/transcript` | Transcript with timestamps |
| `DELETE` | `/api/jobs/{id}` | Cancel a job or remove it from the server |

Run the tests with `python -m unittest test_server`. They fake Whisper and Claude, so they use none of your limits.
