import { Platform } from 'react-native';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';
import { useStore } from '../../store';
import { getKey } from '../keys';
import type { Segment } from '../../types';

/** the version of the server api this build of the app speaks */
const API = 1;

export interface ServerConfig {
  url: string;
  token: string;
}

export interface ServerStatus {
  name: string;
  claude: boolean;
  claude_model: string;
  whisper: boolean;
  whisper_model: string;
}

export interface ServerJob {
  id: string;
  status: 'uploading' | 'queued' | 'transcribing' | 'writing' | 'done' | 'error';
  progress: number;
  error: string | null;
  has_transcript: boolean;
  result?: unknown;
}

export type ServerErrorCode = 'unreachable' | 'auth' | 'notFound' | 'notClasscribe' | 'outdated' | 'server';

export class ServerError extends Error {
  constructor(
    public code: ServerErrorCode,
    message: string = code,
  ) {
    super(message);
  }
}

function isPrivateHost(host: string) {
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '[::1]' || h.startsWith('[fd')) return true;
  // tailscale names and single word names, like http://laptop:8788
  if (h.endsWith('.ts.net') || h.endsWith('.local') || /^[a-z0-9-]+$/.test(h)) return true;
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!ip) return false;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127);
}

/**
 * cleans what the student typed, or returns null when it can't be used.
 * the token and the lectures travel with every request, so plain http stays inside private networks.
 */
export function parseServerUrl(raw: string): string | null {
  const text = raw.trim().replace(/\/+$/, '');
  if (!text) return null;
  const full = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `http://${text}`;
  const m = full.match(/^(https?):\/\/(\[[0-9a-f:]+\]|[^\s/:?#@[\]]+)(:\d{1,5})?$/i);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  if (scheme === 'http' && !isPrivateHost(m[2])) return null;
  return `${scheme}://${m[2]}${m[3] ?? ''}`;
}

export async function serverConfig(): Promise<ServerConfig | null> {
  const url = parseServerUrl(useStore.getState().settings.serverUrl ?? '');
  const token = await getKey('server_token');
  return url && token ? { url, token } : null;
}

async function failure(res: Response) {
  if (res.status === 401 || res.status === 403) return new ServerError('auth');
  if (res.status === 404) return new ServerError('notFound');
  let detail = `${res.status}`;
  try {
    detail = (await res.json())?.error ?? detail;
  } catch {}
  return new ServerError('server', detail);
}

async function send(cfg: ServerConfig, method: string, path: string, body?: unknown, timeoutMs = 20000) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(cfg.url + path, {
      method,
      signal: abort.signal,
      headers: { Authorization: `Bearer ${cfg.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ServerError('unreachable');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw await failure(res);
  return res;
}

const json = async <R>(res: Response) => {
  try {
    return (await res.json()) as R;
  } catch {
    throw new ServerError('notClasscribe');
  }
};

/** checks the address, the token and that this really is a classcribe server */
export async function testServer(cfg: ServerConfig): Promise<ServerStatus> {
  const health = await json<{ app?: string; api?: number }>(await send(cfg, 'GET', '/api/health'));
  if (health.app !== 'classcribe-server') throw new ServerError('notClasscribe');
  if (health.api !== API) throw new ServerError('outdated');
  return json<ServerStatus>(await send(cfg, 'GET', '/api/status'));
}

export async function createJob(
  cfg: ServerConfig,
  job: {
    subject: string;
    lecture_date: string;
    weekday: string;
    units: string[];
    transcript: Segment[] | null;
    syllabus: { name: string; mime: string }[];
  },
) {
  return json<ServerJob>(await send(cfg, 'POST', '/api/jobs', job, 60000));
}

/** sends a file from disk without loading it in memory, recordings can be large */
export async function uploadFile(cfg: ServerConfig, path: string, uri: string, mime: string) {
  const url = cfg.url + path;
  const headers = { Authorization: `Bearer ${cfg.token}`, 'Content-Type': mime };
  if (Platform.OS === 'web') {
    let res: Response;
    try {
      res = await fetch(url, { method: 'PUT', headers, body: await (await fetch(uri)).blob() });
    } catch {
      throw new ServerError('unreachable');
    }
    if (!res.ok) throw await failure(res);
    return;
  }
  let status: number;
  let body = '';
  try {
    const res = await uploadAsync(url, uri, { httpMethod: 'PUT', uploadType: FileSystemUploadType.BINARY_CONTENT, headers });
    status = res.status;
    body = res.body;
  } catch {
    throw new ServerError('unreachable');
  }
  if (status >= 200 && status < 300) return;
  if (status === 401 || status === 403) throw new ServerError('auth');
  if (status === 404) throw new ServerError('notFound');
  let detail = `${status}`;
  try {
    detail = JSON.parse(body)?.error ?? detail;
  } catch {}
  throw new ServerError('server', detail);
}

export async function startJob(cfg: ServerConfig, id: string) {
  await send(cfg, 'POST', `/api/jobs/${id}/start`);
}

export async function getJob(cfg: ServerConfig, id: string) {
  return json<ServerJob>(await send(cfg, 'GET', `/api/jobs/${id}`, undefined, 30000));
}

export async function getTranscript(cfg: ServerConfig, id: string) {
  return (await json<{ segments: Segment[] }>(await send(cfg, 'GET', `/api/jobs/${id}/transcript`, undefined, 60000))).segments;
}

/** the server keeps a lecture until the phone says it has it */
export async function deleteJob(cfg: ServerConfig, id: string) {
  await send(cfg, 'DELETE', `/api/jobs/${id}`).catch(() => {});
}
