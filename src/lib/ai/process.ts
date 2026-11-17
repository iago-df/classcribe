import Anthropic from '@anthropic-ai/sdk';
import { useStore, uid } from '../../store';
import { translate } from '../../i18n';
import { getKey } from '../keys';
import { fileSize } from '../files';
import { MAX_UPLOAD, TranscriptionError, transcribe } from './transcribe';
import { RefusalError, writeNotes } from './notes';
import type { Alert } from '../../types';

const running = new Set<string>();

/** recording -> transcript -> notes + alerts. Safe to call again to retry. */
export async function processLecture(lectureId: string) {
  if (running.has(lectureId)) return;
  running.add(lectureId);

  const store = useStore.getState;
  const lang = store().settings.language;
  const update = (patch: Parameters<ReturnType<typeof store>['updateLecture']>[1]) => store().updateLecture(lectureId, patch);
  const fail = (error: string) => update({ status: 'error', error });

  let ticker: ReturnType<typeof setInterval> | undefined;
  try {
    const lecture = store().lectures.find((l) => l.id === lectureId);
    if (!lecture) return;
    const subject = store().subjects.find((s) => s.id === lecture.subjectId);

    const [anthropicKey, openaiKey] = await Promise.all([getKey('anthropic_api_key'), getKey('openai_api_key')]);
    if (!anthropicKey || !openaiKey) return fail(translate(lang, 'errors.noKeys'));
    if (fileSize(lecture.audioUri) > MAX_UPLOAD) return fail(translate(lang, 'errors.tooLarge'));

    // 1. transcription (skipped on retry if we already have it)
    let segments = lecture.transcript;
    if (!segments?.length) {
      update({ status: 'transcribing', progress: 0.04, error: undefined });
      // whisper gives no progress, so ease towards 40% while we wait
      ticker = setInterval(() => {
        const p = store().lectures.find((l) => l.id === lectureId)?.progress ?? 0;
        update({ progress: p + (0.4 - p) * 0.04 });
      }, 1000);
      try {
        segments = await transcribe(lecture.audioUri, openaiKey);
      } catch (e) {
        const detail = e instanceof TranscriptionError ? e.message : String(e);
        return fail(translate(lang, 'errors.transcription', { detail }));
      } finally {
        clearInterval(ticker);
      }
      update({ transcript: segments });
    }

    // 2. notes
    update({ status: 'writing', progress: 0.45, error: undefined });
    const files = store().files.filter((f) => f.subjectId === lecture.subjectId);
    const current = files.filter((f) => f.current);
    let result;
    try {
      result = await writeNotes({
        apiKey: anthropicKey,
        subject: subject?.name ?? '',
        lectureDate: new Date(lecture.createdAt),
        segments,
        syllabus: current.length ? current : files,
        onPhase: (phase, p) => update({ progress: phase === 'reading' ? 0.48 : 0.5 + p * 0.48 }),
      });
    } catch (e) {
      if (e instanceof RefusalError) return fail(translate(lang, 'errors.refusal'));
      const detail = e instanceof Anthropic.APIError ? `${e.status ?? ''} ${e.message}`.trim() : String(e);
      return fail(translate(lang, 'errors.notes', { detail }));
    }

    const alerts: Alert[] = result.alerts.map((a) => ({
      id: uid(),
      lectureId,
      subjectId: lecture.subjectId,
      kind: a.kind,
      quote: a.quote,
      summary: a.summary,
      at: a.at,
      due: a.due && /^\d{4}-\d{2}-\d{2}$/.test(a.due) ? a.due : null,
      createdAt: Date.now(),
      done: false,
    }));
    store().setAlertsFor(lectureId, alerts);
    update({
      status: 'ready',
      progress: 1,
      title: result.title || lecture.title,
      unit: result.unit,
      notes: result.blocks,
      usedSyllabus: result.usedSyllabus,
      seen: false,
    });
  } finally {
    if (ticker) clearInterval(ticker);
    running.delete(lectureId);
  }
}
