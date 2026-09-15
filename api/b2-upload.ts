import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { requirePermission, jsonError } from '../lib/auth.js';
import { getB2Client, getBucketName } from '../lib/b2.js';

// ---------------------------------------------------------------------------
// POST /api/b2-upload
//
// Returns a presigned PUT URL so the browser can upload directly to B2.
// Requires admin OR subadmin with manageSongs === true.
// ---------------------------------------------------------------------------

const ALLOWED_PREFIXES = [
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
const EXPIRES_IN = 900; // 15 minutes

function sanitizeFileName(name: string): string {
  // Remove path separators, null bytes, and dangerous characters
  return name
    .replace(/[/\\]/g, '')
    .replace(/\0/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+/, '')
    .slice(0, 120);
}

function hasPathTraversal(name: string): boolean {
  return name.includes('..') || name.includes('~') || name.startsWith('/');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  console.log('[Production B2] request received', req.method, '/api/b2-upload');
  console.log('[Production B2] env check — B2_ENDPOINT:', process.env.B2_ENDPOINT ? 'present' : 'MISSING');
  console.log('[Production B2] env check — B2_KEY_ID:', process.env.B2_KEY_ID ? 'present' : 'MISSING');
  console.log('[Production B2] env check — B2_APP_KEY:', process.env.B2_APP_KEY ? 'present' : 'MISSING');
  console.log('[Production B2] env check — B2_BUCKET_NAME:', process.env.B2_BUCKET_NAME ? 'present' : 'MISSING');
  console.log('[Production B2] env check — FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'present' : 'MISSING');
  console.log('[Production B2] env check — FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'present' : 'MISSING');
  console.log('[Production B2] env check — FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'present' : 'MISSING');

  try {
    if (req.method !== 'POST') {
      return jsonError(res, 405, 'Method not allowed');
    }

    // Auth + permission check
    console.log('[Production B2] auth verification start');
    let auth;
    try {
      auth = await requirePermission(req, res, true);
    } catch (authErr) {
      const e = authErr as { code?: string; message?: string };
      console.error('[Production B2] ERROR during auth/permission check — code:', e.code, 'message:', e.message);
      if (!res.headersSent) return jsonError(res, 500, 'Auth initialization failed');
      return;
    }
    if (!auth) {
      console.log('[Production B2] auth/permission rejected (401/403 sent)');
      return;
    }
    console.log('[Production B2] permission check passed — role:', auth.profile.role);

    const { fileName, contentType } = req.body as Record<string, unknown>;

    // Validate fileName
    if (!fileName || typeof fileName !== 'string') {
      return jsonError(res, 400, 'fileName is required');
    }

    if (hasPathTraversal(fileName)) {
      return jsonError(res, 400, 'Invalid fileName');
    }

    // Validate contentType
    if (!contentType || typeof contentType !== 'string') {
      return jsonError(res, 400, 'contentType is required');
    }

    const isAudio = ALLOWED_PREFIXES.some((p) => contentType === p || contentType.startsWith(p + ';'));
    if (!isAudio) {
      return jsonError(res, 400, 'contentType must be an audio MIME type');
    }

    // Build safe object key
    const safeName = sanitizeFileName(fileName);
    if (!safeName) {
      return jsonError(res, 400, 'Invalid fileName');
    }

    const objectKey = `audio/${randomUUID()}-${safeName}`;
    console.log('[Production B2] B2 configuration — endpoint present:', Boolean(process.env.B2_ENDPOINT), 'bucket present:', Boolean(process.env.B2_BUCKET_NAME));

    console.log('[Production B2] presigned URL generation start');
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
      ContentType: contentType,
    });

    let uploadUrl: string;
    try {
      uploadUrl = await getSignedUrl(getB2Client(), command, {
        expiresIn: EXPIRES_IN,
      });
    } catch (b2Err) {
      const e = b2Err as { code?: string; message?: string; name?: string };
      console.error('[Production B2] ERROR during presigned URL generation — code:', e.code, 'name:', e.name, 'message:', e.message);
      if (!res.headersSent) return jsonError(res, 500, 'Failed to generate upload URL');
      return;
    }

    console.log('[Production B2] completed — presigned URL generated OK');
    return res.status(200).json({
      uploadUrl,
      objectKey,
      expiresIn: EXPIRES_IN,
    });
  } catch (topErr) {
    const e = topErr as { code?: string; message?: string; name?: string };
    console.error('[Production B2] ERROR (top-level catch) — code:', e.code, 'name:', e.name, 'message:', e.message);
    if (res.headersSent) return;
    return jsonError(res, 500, 'Failed to generate upload URL');
  }
}
