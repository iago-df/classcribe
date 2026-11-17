import { Platform } from 'react-native';
import type { Segment } from '../../types';

const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
export const MAX_UPLOAD = 25 * 1024 * 1024;

export class TranscriptionError extends Error {}

/**
 * whisper-1 is used on purpose: it's the model that returns segment timestamps,
 * which is what lets every alert link back to the exact minute in the recording.
 */
export async function transcribe(audioUri: string, apiKey: string): Promise<Segment[]> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(audioUri)).blob();
    form.append('file', blob, 'lecture.webm');
  } else {
    // react-native's FormData accepts a file descriptor object
    form.append('file', { uri: audioUri, name: 'lecture.m4a', type: 'audio/m4a' } as unknown as Blob);
  }
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');

  const res = await fetch(ENDPOINT, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = await res.json();
      detail = body?.error?.message ?? detail;
    } catch {}
    throw new TranscriptionError(detail);
  }
  const data = (await res.json()) as { text?: string; segments?: { start: number; end: number; text: string }[] };
  const segments = (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim() })).filter((s) => s.text);
  if (!segments.length && data.text) return [{ start: 0, end: 0, text: data.text.trim() }];
  return segments;
}
