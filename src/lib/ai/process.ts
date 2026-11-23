import Anthropic from '@anthropic-ai/sdk';
import { useStore, uid } from '../../store';
import { translate } from '../../i18n';
import { getKey } from '../keys';
import { fileSize, recordingUri } from '../files';
import { isoDay } from '../time';
import { MAX_UPLOAD, TranscriptionError, transcribe } from './transcribe';
import { NotesSchema, RefusalError, toNotesResult, writeNotes, type NotesResult } from './notes';
import {
  ServerError,
  createJob,
  deleteJob,
  getJob,
  getTranscript,
  serverConfig,
  startJob,
  uploadFile,
  type ServerConfig,
  type ServerJob,
} from './server';
import type { Alert, Lecture, SyllabusFile } from '../../types';

/** the run working on each lecture; a run that is no longer here stops by itself */
const running = new Map<string, symbol>();
const store = useStore.getState;
const POLL_MS = 3000;
const OFFLINE_MS = 15000;
/** lecture.serverJob while the lecture is on its way to the server */
const PENDING = 'pending';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const find = (id: string) => store().lectures.find((l) => l.id === id);
const update = (id: string, patch: Partial<Lecture>) => store().updateLecture(id, patch);

/** the files that go with a lecture: the ones marked current, or all of them */
function syllabusFor(subjectId: string) {
  const files = store().files.filter((f) => f.subjectId === subjectId);
  const current = files.filter((f) => f.current);
  return current.length ? current : files;
}

function saveNotes(lecture: Lecture, result: NotesResult, usedSyllabus: boolean) {
  const units = store().units.filter((u) => u.subjectId === lecture.subjectId);
  const alerts: Alert[] = result.alerts.map((a) => ({
    id: uid(),
    lectureId: lecture.id,
    subjectId: lecture.subjectId,
    kind: a.kind,
    quote: a.quote,
    summary: a.summary,
    at: a.at,
    due: a.due && /^\d{4}-\d{2}-\d{2}$/.test(a.due) ? a.due : null,
    createdAt: Date.now(),
    done: false,
  }));
  store().setAlertsFor(lecture.id, alerts);
  update(lecture.id, {
    status: 'ready',
    progress: 1,
    title: result.title || lecture.title,
    // only ever one of the student's own units
    unitId: units.find((u) => u.name.trim().toLowerCase() === result.unit?.trim().toLowerCase())?.id ?? lecture.unitId,
    notes: result.blocks,
    usedSyllabus,
    seen: false,
    error: undefined,
    serverJob: undefined,
    waiting: undefined,
  });
}

/** recording -> transcript -> notes + alerts. Safe to call again to retry. */
export async function processLecture(lectureId: string) {
  if (running.has(lectureId)) return;
  const lecture = find(lectureId);
  if (!lecture) return;
  const run = Symbol(lectureId);
  running.set(lectureId, run);
  try {
    // a lecture already handed to the server finishes there, whatever the setting says now
    if (lecture.serverJob || store().settings.engine === 'server') await viaServer(lectureId, run);
    else await viaApis(lectureId);
  } finally {
    if (running.get(lectureId) === run) running.delete(lectureId);
  }
}

/** picks up the lectures the server is working on, after the app was closed for example */
export function resumeServerLectures() {
  store()
    .lectures.filter((l) => l.serverJob)
    .forEach((l) => processLecture(l.id));
}

/** stops waiting for a server that isn't coming back; retrying uses the current setting */
export function stopWaiting(lectureId: string) {
  running.delete(lectureId);
  update(lectureId, { status: 'interrupted', serverJob: undefined, waiting: undefined });
}

// ---------------------------------------------------------------- cloud apis

async function viaApis(lectureId: string) {
  const lang = store().settings.language;
  const fail = (error: string) => update(lectureId, { status: 'error', error });

  let ticker: ReturnType<typeof setInterval> | undefined;
  try {
    const lecture = find(lectureId);
    if (!lecture) return;
    const subject = store().subjects.find((s) => s.id === lecture.subjectId);

    const [anthropicKey, openaiKey] = await Promise.all([getKey('anthropic_api_key'), getKey('openai_api_key')]);
    if (!anthropicKey || !openaiKey) return fail(translate(lang, 'errors.noKeys'));
    const audioUri = recordingUri(lecture.id, lecture.audioUri);
    if (audioUri !== lecture.audioUri) update(lectureId, { audioUri });
    if (fileSize(audioUri) > MAX_UPLOAD) return fail(translate(lang, 'errors.tooLarge'));

    // 1. transcription (skipped on retry if we already have it)
    let segments = lecture.transcript;
    if (!segments?.length) {
      update(lectureId, { status: 'transcribing', progress: 0.04, error: undefined });
      // whisper gives no progress, so ease towards 40% while we wait
      ticker = setInterval(() => {
        const p = find(lectureId)?.progress ?? 0;
        update(lectureId, { progress: p + (0.4 - p) * 0.04 });
      }, 1000);
      try {
        segments = await transcribe(audioUri, openaiKey);
      } catch (e) {
        const detail = e instanceof TranscriptionError ? e.message : String(e);
        return fail(translate(lang, 'errors.transcription', { detail }));
      } finally {
        clearInterval(ticker);
      }
      update(lectureId, { transcript: segments });
    }

    // 2. notes
    update(lectureId, { status: 'writing', progress: 0.45, error: undefined });
    const units = store().units.filter((u) => u.subjectId === lecture.subjectId);
    let result;
    try {
      result = await writeNotes({
        apiKey: anthropicKey,
        subject: subject?.name ?? '',
        lectureDate: new Date(lecture.createdAt),
        segments,
        syllabus: syllabusFor(lecture.subjectId),
        units: units.map((u) => u.name),
        onPhase: (phase, p) => update(lectureId, { progress: phase === 'reading' ? 0.48 : 0.5 + p * 0.48 }),
      });
    } catch (e) {
      if (e instanceof RefusalError) return fail(translate(lang, 'errors.refusal'));
      const detail = e instanceof Anthropic.APIError ? `${e.status ?? ''} ${e.message}`.trim() : String(e);
      return fail(translate(lang, 'errors.notes', { detail }));
    }
    const fresh = find(lectureId);
    if (fresh) saveNotes(fresh, result, result.usedSyllabus);
  } finally {
    if (ticker) clearInterval(ticker);
  }
}

// ---------------------------------------------------------------- your own server

const canSend = (f: SyllabusFile) => f.mimeType === 'application/pdf' || /^image\/(jpeg|png|webp|gif)$/.test(f.mimeType) || /^text\/(plain|markdown|csv)$/.test(f.mimeType);

/** uploads the lecture and returns the id of the job working on it */
async function submit(cfg: ServerConfig, lecture: Lecture) {
  const subject = store().subjects.find((s) => s.id === lecture.subjectId);
  const units = store().units.filter((u) => u.subjectId === lecture.subjectId);
  const files = syllabusFor(lecture.subjectId).filter(canSend);
  const date = new Date(lecture.createdAt);
  const hasTranscript = !!lecture.transcript?.length;

  const job = await createJob(cfg, {
    subject: subject?.name ?? '',
    lecture_date: isoDay(date),
    weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
    units: units.map((u) => u.name),
    transcript: hasTranscript ? lecture.transcript! : null,
    syllabus: files.map((f) => ({ name: f.name, mime: f.mimeType })),
  });
  if (!hasTranscript) await uploadFile(cfg, `/api/jobs/${job.id}/audio`, recordingUri(lecture.id, lecture.audioUri), 'audio/mp4');
  for (let i = 0; i < files.length; i++) {
    await uploadFile(cfg, `/api/jobs/${job.id}/syllabus/${i + 1}`, files[i].uri, files[i].mimeType);
  }
  await startJob(cfg, job.id);
  return job.id;
}

/** applies what the server says. True when there is nothing left to wait for. */
async function follow(cfg: ServerConfig, lecture: Lecture, job: ServerJob) {
  const lang = store().settings.language;
  const id = lecture.id;

  // keeping the transcript means a retry doesn't have to upload the audio again
  if (job.has_transcript && !lecture.transcript?.length) update(id, { transcript: await getTranscript(cfg, job.id) });

  if (job.status === 'done') {
    const fresh = find(id);
    if (!fresh) return true;
    const parsed = NotesSchema.safeParse(job.result);
    if (parsed.success) saveNotes(fresh, toNotesResult(parsed.data), !!(job.result as { used_syllabus?: boolean }).used_syllabus);
    else update(id, { status: 'error', error: translate(lang, 'errors.notes', { detail: 'invalid response' }), serverJob: undefined, waiting: undefined });
    await deleteJob(cfg, job.id);
    return true;
  }
  if (job.status === 'error') {
    update(id, { status: 'error', error: translate(lang, 'errors.server', { detail: job.error ?? '' }), serverJob: undefined, waiting: undefined });
    await deleteJob(cfg, job.id);
    return true;
  }
  if (job.status === 'writing') update(id, { status: 'writing', progress: 0.5 + job.progress * 0.48, waiting: undefined });
  else update(id, { status: 'transcribing', progress: 0.06 + job.progress * 0.38, waiting: undefined });
  return false;
}

async function viaServer(lectureId: string, run: symbol) {
  const lang = store().settings.language;
  const fail = (error: string) => update(lectureId, { status: 'error', error, serverJob: undefined, waiting: undefined });

  const cfg = await serverConfig();
  if (!cfg) return fail(translate(lang, 'errors.noServer'));

  const first = find(lectureId);
  if (!first) return;
  const audioUri = recordingUri(first.id, first.audioUri);
  if (!first.transcript?.length && !first.serverJob && audioUri && fileSize(audioUri) === 0 && !audioUri.startsWith('blob:')) {
    return fail(translate(lang, 'errors.noAudio'));
  }
  update(lectureId, { status: first.status === 'writing' ? 'writing' : 'transcribing', progress: Math.max(first.progress, 0.03), error: undefined, serverJob: first.serverJob ?? PENDING });

  let handedOver = first.serverJob && first.serverJob !== PENDING ? first.serverJob : null;
  for (;;) {
    const lecture = find(lectureId);
    // deleted, or the student stopped waiting: the server can drop its copy
    if (!lecture || !lecture.serverJob || running.get(lectureId) !== run) {
      if (handedOver) await deleteJob(cfg, handedOver);
      return;
    }
    try {
      if (lecture.serverJob === PENDING) {
        handedOver = await submit(cfg, lecture);
        // stopped while it was uploading
        if (running.get(lectureId) !== run) continue;
        update(lectureId, { serverJob: handedOver, waiting: undefined, progress: 0.06 });
      } else if (await follow(cfg, lecture, await getJob(cfg, lecture.serverJob))) {
        return;
      }
      await sleep(POLL_MS);
    } catch (e) {
      const code = e instanceof ServerError ? e.code : 'server';
      if (code === 'unreachable') {
        // the computer is off or out of reach: the lecture waits for it
        update(lectureId, { waiting: true });
        await sleep(OFFLINE_MS);
      } else if (code === 'notFound') {
        update(lectureId, { serverJob: PENDING });
        await sleep(POLL_MS);
      } else if (code === 'auth') {
        return fail(translate(lang, 'errors.serverAuth'));
      } else {
        return fail(translate(lang, 'errors.server', { detail: e instanceof Error ? e.message : String(e) }));
      }
    }
  }
}
