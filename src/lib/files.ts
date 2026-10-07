import { Directory, File, Paths } from 'expo-file-system';

function recordsDir(): Directory {
  const dir = new Directory(Paths.document, 'records');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Copies a picked/captured image into app-private storage so it survives cache clears. */
export function persistImage(sourceUri: string, id: string): string {
  const src = new File(sourceUri);
  const ext = (src.extension || '.jpg').startsWith('.') ? src.extension || '.jpg' : `.${src.extension}`;
  const dest = new File(recordsDir(), `${id}${ext}`);
  if (dest.exists) dest.delete();
  src.copy(dest);
  return dest.uri;
}

export function deleteImage(uri: string | undefined) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // ignore
  }
}

export function deleteAllImages() {
  try {
    const dir = new Directory(Paths.document, 'records');
    if (dir.exists) dir.delete();
  } catch {
    // ignore
  }
}

/** Writes text to a cache file and returns its URI (for sharing exports). */
export function writeCacheFile(name: string, contents: string): string {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(contents);
  return f.uri;
}
