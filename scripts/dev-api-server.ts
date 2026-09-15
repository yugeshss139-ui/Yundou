import 'dotenv/config';
import express from 'express';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v2 as cloudinary } from 'cloudinary';

// ---------------------------------------------------------------------------
// Load .env (already loaded by dotenv/config import)
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.API_PORT || '3001', 10);

// ---------------------------------------------------------------------------
// Firebase Admin
// ---------------------------------------------------------------------------

function loadServiceAccount(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    join(process.cwd(), 'service-account.json'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      const raw = readFileSync(p, 'utf-8');
      const sa = JSON.parse(raw) as Record<string, string>;
      if (sa.client_email && sa.private_key) {
        return { projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key };
      }
    } catch { /* not found or invalid, try next */ }
  }
  return null;
}

function initFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'yundo-b83a7';

  // 1. Explicit env vars
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    console.log('[API] Firebase Admin: using env var credentials');
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  // 2. Service account JSON file
  const sa = loadServiceAccount();
  if (sa) {
    console.log('[API] Firebase Admin: using service-account.json');
    return initializeApp({
      credential: cert({ projectId: sa.projectId, clientEmail: sa.clientEmail, privateKey: sa.privateKey }),
    });
  }

  // 3. Application default credentials
  try {
    console.log('[API] Firebase Admin: trying applicationDefault()');
    return initializeApp({ credential: applicationDefault(), projectId });
  } catch {
    console.log('[API] Firebase Admin: falling back to projectId only');
    return initializeApp({ projectId });
  }
}

const adminApp = initFirebaseAdmin();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

// ---------------------------------------------------------------------------
// B2 S3 Client
// ---------------------------------------------------------------------------

const b2Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: 'us-west-004',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID ?? '',
    secretAccessKey: process.env.B2_APP_KEY ?? '',
  },
});

function getBucketName(): string {
  return process.env.B2_BUCKET_NAME ?? '';
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'deg9dfhfs',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
});

const CLOUDINARY_UPLOAD_PRESET =
  process.env.CLOUDINARY_UPLOAD_PRESET || 'yundo_audio';
const CLOUDINARY_RESOURCE_TYPE = 'video' as const;
const CLOUDINARY_DELIVERY_TYPE = 'authenticated' as const;

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

interface UserProfile {
  uid: string;
  username: string;
  email: string;
  role: string;
  permissions?: {
    manageUsers: boolean;
    managePlaylists: boolean;
    manageSongs: boolean;
  };
}

async function verifyAuth(
  req: express.Request,
  res: express.Response,
): Promise<{ uid: string } | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const token = header.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}

async function requirePermission(
  req: express.Request,
  res: express.Response,
  requireManageSongs: boolean,
): Promise<{ uid: string; profile: UserProfile } | null> {
  const auth = await verifyAuth(req, res);
  if (!auth) return null;

  const snap = await adminDb.collection('users').doc(auth.uid).get();
  if (!snap.exists) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  const data = snap.data()!;
  const profile: UserProfile = {
    uid: snap.id,
    username: data.username || '',
    email: data.email || '',
    role: data.role || 'user',
    permissions: data.permissions || undefined,
  };

  const isAdmin = profile.role === 'admin';
  const isSubAdminWithSongs =
    profile.role === 'subadmin' &&
    profile.permissions?.manageSongs === true;

  if (requireManageSongs && !isAdmin && !isSubAdminWithSongs) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return { uid: auth.uid, profile };
}

async function requireAdmin(
  req: express.Request,
  res: express.Response,
): Promise<{ uid: string } | null> {
  const auth = await verifyAuth(req, res);
  if (!auth) return null;

  const snap = await adminDb.collection('users').doc(auth.uid).get();
  if (!snap.exists || snap.data()?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return auth;
}

// ---------------------------------------------------------------------------
// B2 helpers
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
const EXPIRES_IN = 900;

function sanitizeFileName(name: string): string {
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

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// CORS for proxy (safe for local dev)
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
  next();
});

// ---------------------------------------------------------------------------
// Logging middleware
// ---------------------------------------------------------------------------

app.use((req, res, next) => {
  const hasAuth = Boolean(req.headers.authorization);
  console.log(`[API] ${req.method} ${req.path} received (Auth header present: ${hasAuth})`);
  res.on('finish', () => {
    console.log(`[API] ${req.method} ${req.path} completed with status ${res.statusCode}`);
  });
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  console.log('[API] health check OK');
  res.json({ status: 'ok' });
});

// b2-upload — POST
app.post('/api/b2-upload', async (req, res) => {
  console.log('[API] handler started: b2-upload');
  try {
    const auth = await requirePermission(req, res, true);
    if (!auth) {
      console.log('[API] handler completed with status 401/403');
      return;
    }

    const { fileName, contentType } = req.body as Record<string, unknown>;

    if (!fileName || typeof fileName !== 'string') {
      console.log('[API] handler completed with status 400 (fileName missing)');
      return res.status(400).json({ error: 'fileName is required' });
    }

    if (hasPathTraversal(fileName)) {
      console.log('[API] handler completed with status 400 (path traversal)');
      return res.status(400).json({ error: 'Invalid fileName' });
    }

    if (!contentType || typeof contentType !== 'string') {
      console.log('[API] handler completed with status 400 (contentType missing)');
      return res.status(400).json({ error: 'contentType is required' });
    }

    const isAudio = ALLOWED_PREFIXES.some(
      (p) => contentType === p || contentType.startsWith(p + ';'),
    );
    if (!isAudio) {
      console.log('[API] handler completed with status 400 (invalid audio type)');
      return res.status(400).json({ error: 'contentType must be an audio MIME type' });
    }

    const safeName = sanitizeFileName(fileName);
    if (!safeName) {
      console.log('[API] handler completed with status 400 (empty safeName)');
      return res.status(400).json({ error: 'Invalid fileName' });
    }

    const objectKey = `audio/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(b2Client, command, { expiresIn: EXPIRES_IN });

    console.log('[API] handler completed with status 200');
    return res.status(200).json({ uploadUrl, objectKey, expiresIn: EXPIRES_IN });
  } catch (err) {
    console.error('[API] error details:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }
});

// b2-sign — POST
app.post('/api/b2-sign', async (req, res) => {
  console.log('[API] handler started: b2-sign');
  try {
    const auth = await verifyAuth(req, res);
    if (!auth) {
      console.log('[API] handler completed with status 401');
      return;
    }

    const { objectKey } = req.body as Record<string, unknown>;

    if (!objectKey || typeof objectKey !== 'string') {
      console.log('[API] handler completed with status 400 (objectKey missing)');
      return res.status(400).json({ error: 'objectKey is required' });
    }

    if (hasPathTraversal(objectKey)) {
      console.log('[API] handler completed with status 400 (path traversal)');
      return res.status(400).json({ error: 'Invalid objectKey' });
    }

    if (!objectKey.startsWith('audio/')) {
      console.log('[API] handler completed with status 403 (not audio/ prefix)');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const db = adminDb;
    const userSnap = await db.collection('users').doc(auth.uid).get();
    if (!userSnap.exists) {
      console.log('[API] handler completed with status 403 (user not found)');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userData = userSnap.data()!;
    const role = userData.role || 'user';
    const permissions = userData.permissions || {};
    const isAdmin = role === 'admin';
    const isSubAdminWithSongs = role === 'subadmin' && permissions.manageSongs === true;

    if (!isAdmin && !isSubAdminWithSongs) {
      const playlistsSnap = await db
        .collection('users')
        .doc(auth.uid)
        .collection('playlists')
        .get();

      let found = false;
      for (const playlistDoc of playlistsSnap.docs) {
        const songsSnap = await db
          .collection('users')
          .doc(auth.uid)
          .collection('playlists')
          .doc(playlistDoc.id)
          .collection('songs')
          .where('audioUrl', '==', objectKey)
          .limit(1)
          .get();
        if (!songsSnap.empty) {
          found = true;
          break;
        }
      }

      if (!found) {
        console.log('[API] handler completed with status 403 (key not in user playlists)');
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(b2Client, command, { expiresIn: EXPIRES_IN });

    console.log('[API] handler completed with status 200');
    return res.status(200).json({ downloadUrl, expiresIn: EXPIRES_IN });
  } catch (err) {
    console.error('[API] error details:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate download URL' });
    }
  }
});

// b2-delete — DELETE
app.delete('/api/b2-delete', async (req, res) => {
  console.log('[API] handler started: b2-delete');
  try {
    const auth = await requirePermission(req, res, true);
    if (!auth) {
      console.log('[API] handler completed with status 401/403');
      return;
    }

    const { objectKey } = req.body as Record<string, unknown>;

    if (!objectKey || typeof objectKey !== 'string') {
      console.log('[API] handler completed with status 400 (objectKey missing)');
      return res.status(400).json({ error: 'objectKey is required' });
    }

    if (hasPathTraversal(objectKey)) {
      console.log('[API] handler completed with status 400 (path traversal)');
      return res.status(400).json({ error: 'Invalid objectKey' });
    }

    if (!objectKey.startsWith('audio/')) {
      console.log('[API] handler completed with status 403 (not audio/ prefix)');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
    });

    await b2Client.send(command);

    console.log('[API] handler completed with status 200');
    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('[API] error details:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to delete audio file' });
    }
  }
});

app.post('/api/admin-password-reset', async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim() : '';
    if (!uid) return res.status(400).json({ error: 'User ID is required' });

    const target = await adminAuth.getUser(uid);
    if (!target.email) return res.status(400).json({ error: 'User has no email address' });

    const resetLink = await adminAuth.generatePasswordResetLink(target.email);
    return res.status(200).json({ resetLink });
  } catch {
    if (!res.headersSent) return res.status(500).json({ error: 'Unable to create password reset link' });
  }
});

app.post('/api/admin-password-set', async (req, res) => {
  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!uid || password.length < 8) {
      return res.status(400).json({ error: 'User ID and a password of at least 8 characters are required' });
    }

    await adminAuth.updateUser(uid, { password });
    return res.status(204).end();
  } catch {
    if (!res.headersSent) return res.status(500).json({ error: 'Unable to set the user password' });
  }
});

app.post('/api/cloudinary-sign-upload', async (req, res) => {
  console.log('[API] handler started: cloudinary-sign-upload');
  try {
    console.log('[API] cloudinary-sign-upload request body fields:', Object.keys(req.body || {}));
    const auth = await requirePermission(req, res, true);
    if (!auth) {
      console.log('[API] cloudinary-sign-upload authentication/permission rejected');
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'deg9dfhfs';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('[API] cloudinary-sign-upload missing server configuration');
      return res.status(500).json({ error: 'Cloudinary server configuration missing' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `audio/${randomUUID()}`;

    const paramsToSign = {
      public_id: publicId,
      timestamp,
      type: CLOUDINARY_DELIVERY_TYPE,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    console.log('[API] cloudinary-sign-upload authorized; generated unique public ID');
    return res.status(200).json({
      cloudName,
      apiKey,
      publicId,
      timestamp,
      signature,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      type: CLOUDINARY_DELIVERY_TYPE,
      resourceType: CLOUDINARY_RESOURCE_TYPE,
    });
  } catch (err) {
    const details = err as { name?: string; message?: string; code?: string };
    console.error('[API] cloudinary-sign-upload failed:', {
      name: details.name,
      code: details.code,
      message: details.message,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate upload signature' });
    }
  }
});

app.post('/api/cloudinary-sign-playback', async (req, res) => {
  console.log('[API] handler started: cloudinary-sign-playback');
  try {
    const auth = await verifyAuth(req, res);
    if (!auth) {
      console.log('[API] handler completed with status 401');
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const publicId = (body.publicId || body.objectKey) as string;

    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ error: 'publicId is required' });
    }

    if (hasPathTraversal(publicId)) {
      return res.status(400).json({ error: 'Invalid publicId' });
    }

    if (!publicId.startsWith('audio/')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userSnap = await adminDb.collection('users').doc(auth.uid).get();
    if (!userSnap.exists) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const userData = userSnap.data()!;
    const role = userData.role || 'user';
    const permissions = userData.permissions || {};
    const isAdmin = role === 'admin';
    const isSubAdminWithSongs = role === 'subadmin' && permissions.manageSongs === true;

    if (!isAdmin && !isSubAdminWithSongs) {
      const playlistsSnap = await adminDb
        .collection('users')
        .doc(auth.uid)
        .collection('playlists')
        .get();

      let found = false;
      for (const playlistDoc of playlistsSnap.docs) {
        const songsByKeySnap = await adminDb
          .collection('users')
          .doc(auth.uid)
          .collection('playlists')
          .doc(playlistDoc.id)
          .collection('songs')
          .where('audioObjectKey', '==', publicId)
          .limit(1)
          .get();

        if (!songsByKeySnap.empty) {
          found = true;
          break;
        }

        const songsByUrlSnap = await adminDb
          .collection('users')
          .doc(auth.uid)
          .collection('playlists')
          .doc(playlistDoc.id)
          .collection('songs')
          .where('audioUrl', '==', publicId)
          .limit(1)
          .get();

        if (!songsByUrlSnap.empty) {
          found = true;
          break;
        }
      }

      if (!found) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const playbackUrl = cloudinary.url(publicId, {
      resource_type: CLOUDINARY_RESOURCE_TYPE,
      type: CLOUDINARY_DELIVERY_TYPE,
      sign_url: true,
      secure: true,
    });

    console.log('[API] handler completed with status 200');
    return res.status(200).json({
      playbackUrl,
      downloadUrl: playbackUrl,
      expiresIn: 900,
    });
  } catch (err) {
    console.error('[API] error details:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate playback URL' });
    }
  }
});

app.delete('/api/cloudinary-delete', async (req, res) => {
  console.log('[API] handler started: cloudinary-delete');
  try {
    const auth = await requirePermission(req, res, true);
    if (!auth) {
      console.log('[API] handler completed with status 401/403');
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const publicId = (body.publicId || body.objectKey) as string;

    if (!publicId || typeof publicId !== 'string') {
      return res.status(400).json({ error: 'publicId is required' });
    }

    if (hasPathTraversal(publicId)) {
      return res.status(400).json({ error: 'Invalid publicId' });
    }

    if (!publicId.startsWith('audio/')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const destroyResult = await cloudinary.uploader.destroy(publicId, {
      resource_type: CLOUDINARY_RESOURCE_TYPE,
      type: CLOUDINARY_DELIVERY_TYPE,
      invalidate: true,
    });

    console.log('[API] cloudinary-delete Cloudinary result:', destroyResult.result);
    return res.status(200).json({ deleted: true });
  } catch (err) {
    const details = err as { name?: string; message?: string; code?: string };
    console.error('[API] cloudinary-delete failed:', {
      name: details.name,
      code: details.code,
      message: details.message,
    });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to delete audio file' });
    }
  }
});

const server = app.listen(PORT, () => {
  console.log(`[API] Development API server running on http://localhost:${PORT}`);
  console.log('[API] Routes: /api/health, /api/admin-password-reset, /api/admin-password-set, /api/cloudinary-sign-upload, /api/cloudinary-sign-playback, /api/cloudinary-delete, /api/b2-upload, /api/b2-sign, /api/b2-delete');
});

server.on('error', (err) => {
  console.error('[API] HTTP server error:', err.message);
});
