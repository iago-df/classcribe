import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const isWeb = Platform.OS === 'web';

function dir(name: string) {
  const d = new Directory(Paths.document, name);
  d.create({ idempotent: true, intermediates: true });
  return d;
}

/** moves a fresh recording out of the cache into documents so the OS doesn't purge it */
export async function keepRecording(uri: string, id: string) {
  if (isWeb) return uri;
  const src = new File(uri);
  const dst = new File(dir('recordings'), `${id}${src.extension || '.m4a'}`);
  await src.move(dst);
  return src.uri;
}

export async function keepSyllabusFile(uri: string, id: string, name: string) {
  if (isWeb) return uri;
  const src = new File(uri);
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : src.extension;
  const dst = new File(dir('syllabus'), `${id}${ext}`);
  await src.copy(dst, { overwrite: true });
  return dst.uri;
}

export function removeFile(uri: string) {
  if (isWeb) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}

export function fileSize(uri: string): number {
  if (isWeb) return 0;
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

export async function readBase64(uri: string): Promise<string> {
  if (!isWeb) return new File(uri).base64();
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function readText(uri: string): Promise<string> {
  if (!isWeb) return new File(uri).text();
  return (await fetch(uri)).text();
}

export function wipeFiles() {
  if (isWeb) return;
  for (const name of ['recordings', 'syllabus']) {
    try {
      const d = new Directory(Paths.document, name);
      if (d.exists) d.delete();
    } catch {}
  }
}
