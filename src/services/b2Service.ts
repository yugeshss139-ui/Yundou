import { auth } from '../firebase';

const AUDIO_MIME_PREFIXES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/x-mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
];

const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'mp4', 'webm'];

function isAudioFile(file: File): boolean {
  if (AUDIO_MIME_PREFIXES.some((prefix) => file.type === prefix || file.type.startsWith(prefix + ';'))) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return AUDIO_EXTENSIONS.includes(ext);
}

function getAudioMimeType(file: File): string {
  if (file.type && AUDIO_MIME_PREFIXES.some((p) => file.type === p || file.type.startsWith(p + ';'))) {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'flac': return 'audio/flac';
    case 'aac': return 'audio/aac';
    case 'm4a': return 'audio/x-m4a';
    case 'mp4': return 'audio/mp4';
    case 'webm': return 'audio/webm';
    default: return file.type || 'audio/mpeg';
  }
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
}

async function apiRequest<T>(
  path: string,
  method: string,
  body?: unknown
): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  let data: Record<string, unknown>;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `API ${method} ${path} returned ${res.status} ${res.status === 204 ? 'No Content' : res.statusText} (non-JSON): ${text.slice(0, 200)}`
    );
  }

  if (!res.ok) {
    const msg = (data.error as string) || `Request failed (${res.status})`;
    throw new Error(`${msg} [${res.status}]`);
  }

  return data as T;
}

interface UploadResponse {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
}

interface SignResponse {
  downloadUrl: string;
  expiresIn: number;
}

/**
 * Validate, upload audio to B2, and return the object key.
 * Steps:
 * 1. Validate file client-side
 * 2. Request presigned upload URL from /api/b2-upload
 * 3. PUT file directly to B2
 */
export async function uploadAudio(
  file: File,
  onProgress?: (status: string) => void
): Promise<string> {
  // Step 1: Validate
  if (!isAudioFile(file)) {
    throw new Error('Invalid file type. Please select an audio file.');
  }

  // Step 2: Get presigned URL
  const contentType = getAudioMimeType(file);
  onProgress?.('Requesting upload URL...');
  const { uploadUrl, objectKey } = await apiRequest<UploadResponse>(
    '/api/b2-upload',
    'POST',
    { fileName: file.name, contentType }
  );

  // Step 3: Upload directly to B2
  onProgress?.('Uploading audio file...');
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!putRes.ok) {
    // B2 upload failed — try to clean up the presigned URL entry
    // (The objectKey won't exist yet, but attempt anyway)
    throw new Error('Upload to storage failed. Please try again.');
  }

  onProgress?.('Upload complete');
  return objectKey;
}

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedUrl>();
const REFRESH_BUFFER_MS = 60_000; // Refresh 1 minute before expiry

/**
 * Get a temporary signed download URL for an audio object.
 * Caches URLs and reuses them until near expiry.
 */
export async function signAudioUrl(objectKey: string): Promise<string> {
  const cached = signedUrlCache.get(objectKey);
  if (cached && Date.now() < cached.expiresAt - REFRESH_BUFFER_MS) {
    return cached.url;
  }

  const { downloadUrl, expiresIn } = await apiRequest<SignResponse>(
    '/api/b2-sign',
    'POST',
    { objectKey }
  );

  signedUrlCache.set(objectKey, {
    url: downloadUrl,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return downloadUrl;
}

/**
 * Delete an audio object from B2.
 */
export async function deleteAudio(objectKey: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>('/api/b2-delete', 'DELETE', {
    objectKey,
  });
}
