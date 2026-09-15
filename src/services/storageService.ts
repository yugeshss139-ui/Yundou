import { auth } from '../firebase';

const ALLOWED_MIME_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/x-mp3', 'audio/mpg',
  'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave',
  'audio/x-pn-wav', 'audio/flac', 'audio/x-flac', 'audio/m4a',
  'audio/x-m4a', 'audio/mp4', 'audio/x-mp4', 'audio/aac',
];

const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'flac'];

export function isAudioFile(file: File): boolean {
  if (file.type && ALLOWED_MIME_TYPES.some((mime) => file.type === mime || file.type.startsWith(mime + ';'))) {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.includes(ext);
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function apiRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = await getIdToken();
  let res: Response | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    res = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (![502, 503, 504].includes(res.status) || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  if (!res) throw new Error(`${method} ${path} failed without a response`);
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`API ${method} ${path} returned ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = (data.error as string) || `Request failed (${res.status})`;
    throw new Error(`${method} ${path} failed: ${msg} [${res.status}]`);
  }
  return data as T;
}

interface SignUploadResponse {
  cloudName: string;
  apiKey: string;
  publicId: string;
  timestamp: number;
  signature: string;
  uploadPreset: string;
  type: string;
  resourceType: string;
}

interface SignPlaybackResponse {
  playbackUrl?: string;
  downloadUrl?: string;
  expiresIn: number;
}

export async function uploadAudio(file: File, onProgress?: (status: string) => void): Promise<string> {
  if (!isAudioFile(file)) {
    throw new Error('Invalid file type. Please select an mp3, wav, m4a, or flac audio file.');
  }

  onProgress?.('Requesting upload authorization...');
  const signData = await apiRequest<SignUploadResponse>(
    '/api/cloudinary-sign-upload',
    'POST',
    { fileName: file.name },
  );

  onProgress?.('Uploading audio directly to storage...');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signData.apiKey);
  formData.append('timestamp', String(signData.timestamp));
  formData.append('public_id', signData.publicId);
  formData.append('upload_preset', signData.uploadPreset);
  formData.append('type', signData.type);
  formData.append('signature', signData.signature);

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${signData.cloudName}/${signData.resourceType || 'video'}/upload`;
  const uploadRes = await fetch(uploadEndpoint, { method: 'POST', body: formData });
  const uploadText = await uploadRes.text();
  let uploadJson: { public_id?: string; error?: { message?: string } } = {};
  try {
    uploadJson = uploadText ? JSON.parse(uploadText) : {};
  } catch {
    throw new Error(`Cloudinary upload returned invalid JSON [${uploadRes.status}]`);
  }
  if (!uploadRes.ok) {
    throw new Error(`Cloudinary upload failed [${uploadRes.status}]: ${uploadJson.error?.message || 'Upload to storage failed'}`);
  }

  const finalPublicId = typeof uploadJson.public_id === 'string' && uploadJson.public_id.trim()
    ? uploadJson.public_id
    : undefined;

  if (!finalPublicId) {
    throw new Error('Cloudinary upload succeeded but response public_id was missing');
  }

  onProgress?.('Upload complete');
  return finalPublicId;
}

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedUrl>();
const REFRESH_BUFFER_MS = 60_000;

export async function signAudioUrl(publicId: string): Promise<string> {
  const cached = signedUrlCache.get(publicId);
  if (cached && Date.now() < cached.expiresAt - REFRESH_BUFFER_MS) return cached.url;

  const data = await apiRequest<SignPlaybackResponse>(
    '/api/cloudinary-sign-playback',
    'POST',
    { publicId },
  );
  const url = data.playbackUrl || data.downloadUrl;
  if (!url) throw new Error('Failed to obtain playback URL');

  signedUrlCache.set(publicId, {
    url,
    expiresAt: Date.now() + (data.expiresIn || 900) * 1000,
  });
  return url;
}

export async function deleteAudio(publicId: string): Promise<void> {
  signedUrlCache.delete(publicId);
  await apiRequest<{ deleted: boolean }>('/api/cloudinary-delete', 'DELETE', { publicId });
}
