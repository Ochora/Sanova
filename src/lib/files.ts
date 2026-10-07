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

/** Adds record photos (base64) to a bundle, writes it to a .sanova file and returns its URI. */
export async function writeBundleFile(
  bundle: import('./portable').SanovaBundle,
  imageUris: Record<string, string | undefined>,
): Promise<string> {
  const records = await Promise.all(
    bundle.records.map(async (r) => {
      const uri = imageUris[r.id];
      if (!uri) return r;
      try {
        const f = new File(uri);
        if (!f.exists) return r;
        return { ...r, imageBase64: await f.base64(), imageExt: f.extension || '.jpg' };
      } catch {
        return r;
      }
    }),
  );
  const safe = bundle.member.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'profile';
  return writeCacheFile(`${safe}.sanova.json`, JSON.stringify({ ...bundle, records }));
}

/** Lets the user pick a .sanova file and returns its text, or null if cancelled. */
export async function pickBundleText(): Promise<string | null> {
  const res = await File.pickFileAsync({ mimeTypes: ['application/json', 'application/octet-stream', 'text/plain', '*/*'] });
  if (res.canceled || !res.result) return null;
  return res.result.text();
}

/** Writes imported record photos into private storage; returns recordId → uri. */
export function writeImportedPhotos(photos: { recordId: string; base64: string; ext: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of photos) {
    try {
      const ext = p.ext.startsWith('.') ? p.ext : `.${p.ext}`;
      const f = new File(recordsDir(), `${p.recordId}${ext}`);
      if (f.exists) f.delete();
      f.create();
      f.write(p.base64, { encoding: 'base64' });
      out[p.recordId] = f.uri;
    } catch {
      // skip a photo that can't be written
    }
  }
  return out;
}
