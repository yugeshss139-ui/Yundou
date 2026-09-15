import { v2 as cloudinary } from 'cloudinary';

function normalizeEnvValue(value: string | undefined): string {
  const trimmed = value?.trim() || '';
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const cloudName = normalizeEnvValue(process.env.CLOUDINARY_CLOUD_NAME) || 'deg9dfhfs';
const apiKey = normalizeEnvValue(process.env.CLOUDINARY_API_KEY);
const apiSecret = normalizeEnvValue(process.env.CLOUDINARY_API_SECRET);

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  signature_version: 1,
  secure: true,
});

export function getCloudinary() {
  return cloudinary;
}

export function getCloudName(): string {
  return cloudName;
}

export function getApiKey(): string {
  return apiKey;
}

export function getApiSecret(): string {
  return apiSecret;
}

export const CLOUDINARY_UPLOAD_PRESET = 'yundo_audio';
export const CLOUDINARY_RESOURCE_TYPE = 'video' as const;
export const CLOUDINARY_DELIVERY_TYPE = 'authenticated' as const;
