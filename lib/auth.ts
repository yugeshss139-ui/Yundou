import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let adminApp: App;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'yundo-b83a7';

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY_B64
    ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_B64, 'base64').toString('utf8')
    : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    try {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } catch {
      adminApp = initializeApp({
        projectId,
      });
    }
  }

  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export interface UserPermissions {
  manageUsers: boolean;
  managePlaylists: boolean;
  manageSongs: boolean;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  role: string;
  permissions?: UserPermissions;
}

export async function verifyAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ uid: string } | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const token = header.slice(7);
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}

export async function requirePermission(
  req: VercelRequest,
  res: VercelResponse,
  requireManageSongs: boolean,
): Promise<{ uid: string; profile: UserProfile } | null> {
  const auth = await verifyAuth(req, res);
  if (!auth) return null;

  const snap = await getAdminDb().collection('users').doc(auth.uid).get();
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

  if (requireManageSongs) {
    if (!isAdmin && !isSubAdminWithSongs) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
  }

  return { uid: auth.uid, profile };
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ uid: string; adminAuth: ReturnType<typeof getAdminAuth> } | null> {
  const auth = await verifyAuth(req, res);
  if (!auth) return null;

  const snap = await getAdminDb().collection('users').doc(auth.uid).get();
  if (!snap.exists || snap.data()?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return { uid: auth.uid, adminAuth: getAdminAuth() };
}

export function jsonError(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}
