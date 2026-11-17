import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { z } from 'zod';
import type { AlertKind, NoteBlock, Segment, SyllabusFile } from '../../types';
import { clock } from '../time';
import { readBase64, readText } from '../files';

export const MODEL = 'claude-opus-5-5';

const BlockSchema = z.object({
  type: z.enum(['heading', 'paragraph', 'bullets', 'formula', 'exam']),
  text: z.string().describe('Text of the block. Empty string for "bullets".'),
  items: z.array(z.string()).describe('Only for "bullets", otherwise an empty array.'),
  at: z.number().nullable().describe('Only for "exam": second in the recording where it was said, otherwise null.'),
});

const AlertSchema = z.object({
  kind: z.enum(['exam', 'homework', 'notice']),
  quote: z.string().describe("The professor's words, quoted from the transcript."),
  summary: z.string().describe('One short sentence with what the student has to know or do.'),
  at: z.number().nullable().describe('Second in the recording where it was said.'),
  due: z.string().nullable().describe('Due or event date as YYYY-MM-DD, or null if none was given.'),
});

const NotesSchema = z.object({
  title: z.string().describe('Short topic of the lecture, max 6 words.'),
  unit: z.string().nullable().describe('Syllabus unit this lecture covers, as named in the syllabus (e.g. "Unit 3"), or null.'),
  blocks: z.array(BlockSchema),
  alerts: z.array(AlertSchema),
});

export interface NotesResult {
  title: string;
  unit: string | null;
  blocks: NoteBlock[];
  alerts: { kind: AlertKind; quote: string; summary: string; at: number | null; due: string | null }[];
}

export class RefusalError extends Error {}

const SYSTEM = `You are Classcribe, an assistant that turns recorded university and school lectures into study notes.

You receive the transcript of one lecture (with [hh:mm:ss] timestamps) and, when available, the course syllabus the student uploaded.

Write the notes in the same language the lecture was given in. Write them the way a top student would: structured, faithful to what was taught, dense but easy to review. Use the syllabus to name concepts the way the course does, fill in obvious transcription mistakes in technical terms, and to say which unit the lecture covers. Do not add material that was not taught in the lecture.

Note blocks:
- "heading": a numbered section title, like "1. Definition".
- "paragraph": explanation in 1-4 sentences.
- "bullets": a list in "items" (leave "text" empty).
- "formula": a formula, definition or rule written in plain text (no LaTeX).
- "exam": only when the professor explicitly says something will be on the exam, or that a type of exercise will appear. Put what will be asked in "text" and the second it was said in "at".

Alerts are things the student must not miss. Only create one when the professor says it explicitly; never infer one. If you are unsure, leave it out.
- "exam": what is on the exam, its format, or its date.
- "homework": an assignment, exercises to hand in, reading to prepare.
- "notice": logistics, such as a cancelled class, a room change, a schedule change, or an extra session.
For each alert, quote the professor's actual words from the transcript in "quote", give the second it was said in "at" (the start of that transcript line), and resolve relative dates ("next Thursday", "el jueves") against the lecture date into "due" as YYYY-MM-DD.`;

function client(apiKey: string) {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    // expo/fetch supports streaming responses on native, the built-in RN fetch doesn't
    ...(Platform.OS === 'web' ? {} : { fetch: expoFetch as unknown as typeof globalThis.fetch }),
  });
}

async function syllabusBlocks(files: SyllabusFile[]): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  const out: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of files) {
    try {
      if (f.mimeType === 'application/pdf') {
        out.push({ type: 'document', title: f.name, source: { type: 'base64', media_type: 'application/pdf', data: await readBase64(f.uri) } });
      } else if (/^image\/(jpeg|png|webp|gif)$/.test(f.mimeType)) {
        out.push({ type: 'image', source: { type: 'base64', media_type: f.mimeType as 'image/png', data: await readBase64(f.uri) } });
      } else if (f.mimeType.startsWith('text/')) {
        out.push({ type: 'document', title: f.name, source: { type: 'text', media_type: 'text/plain', data: await readText(f.uri) } });
      }
    } catch {
      // an unreadable file shouldn't block the notes
    }
  }
  // the syllabus is the same for every lecture of a subject, so cache it
  const last = out[out.length - 1];
  if (last && (last.type === 'document' || last.type === 'image')) last.cache_control = { type: 'ephemeral' };
  return out;
}

export async function writeNotes(opts: {
  apiKey: string;
  subject: string;
  lectureDate: Date;
  segments: Segment[];
  syllabus: SyllabusFile[];
  onPhase: (phase: 'reading' | 'writing', progress: number) => void;
}): Promise<NotesResult & { usedSyllabus: boolean }> {
  const docs = await syllabusBlocks(opts.syllabus);
  const transcript = opts.segments.map((s) => `[${clock(s.start)}] ${s.text}`).join('\n');
  const d = opts.lectureDate;
  const dateLine = `${d.toISOString().slice(0, 10)} (${d.toLocaleDateString('en-US', { weekday: 'long' })})`;

  const stream = client(opts.apiKey).beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: betaZodOutputFormat(NotesSchema) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          ...docs,
          {
            type: 'text',
            text: `Subject: ${opts.subject}\nLecture date: ${dateLine}\n${docs.length ? 'The syllabus is attached above.' : 'No syllabus was uploaded for this subject.'}\n\n<transcript>\n${transcript}\n</transcript>`,
          },
        ],
      },
    ],
  });

  let chars = 0;
  opts.onPhase('reading', 0);
  stream.on('text', (delta) => {
    chars += delta.length;
    opts.onPhase('writing', Math.min(1, chars / 9000));
  });

  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new RefusalError(msg.stop_details?.explanation ?? 'refusal');

  const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const parsed = NotesSchema.parse(JSON.parse(text));

  const blocks: NoteBlock[] = parsed.blocks.map((b) => {
    switch (b.type) {
      case 'bullets':
        return { type: 'bullets', items: b.items };
      case 'exam':
        return { type: 'exam', text: b.text, at: b.at };
      default:
        return { type: b.type, text: b.text };
    }
  });

  return { title: parsed.title, unit: parsed.unit, blocks, alerts: parsed.alerts, usedSyllabus: docs.length > 0 };
}
