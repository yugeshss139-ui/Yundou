import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requirePermission, jsonError } from '../lib/auth.js';
import {
  getCloudinary,
  CLOUDINARY_RESOURCE_TYPE,
  CLOUDINARY_DELIVERY_TYPE,
} from '../lib/cloudinary.js';

import { getAdminDb } from '../lib/auth.js';

function hasPathTraversal(key: string): boolean {
  return key.includes('..') || key.includes('~') || key.startsWith('/');
}

async function isKeyInUserPlaylists(uid: string, publicId: string): Promise<boolean> {
  const db = getAdminDb();
  const playlistsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('playlists')
    .get();

  for (const playlistDoc of playlistsSnap.docs) {
    const songsByKeySnap = await db
      .collection('users')
      .doc(uid)
      .collection('playlists')
      .doc(playlistDoc.id)
      .collection('songs')
      .where('audioObjectKey', '==', publicId)
      .limit(1)
      .get();

    if (!songsByKeySnap.empty) return true;

    const songsByUrlSnap = await db
      .collection('users')
      .doc(uid)
      .collection('playlists')
      .doc(playlistDoc.id)
      .collection('songs')
      .where('audioUrl', '==', publicId)
      .limit(1)
      .get();

    if (!songsByUrlSnap.empty) return true;
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  try {
    if (req.method !== 'POST') {
      return jsonError(res, 405, 'Method not allowed');
    }

    const auth = await requirePermission(req, res, false);
    if (!auth) return;

    const body = (req.body || {}) as Record<string, unknown>;
    const publicId = (body.publicId || body.objectKey) as string;

    if (!publicId || typeof publicId !== 'string') {
      return jsonError(res, 400, 'publicId is required');
    }

    if (hasPathTraversal(publicId)) {
      return jsonError(res, 400, 'Invalid publicId');
    }

    if (!publicId.startsWith('audio/')) {
      return jsonError(res, 403, 'Forbidden');
    }

    const role = auth.profile.role || 'user';
  const permissions = auth.profile.permissions;

  const isAdmin = role === 'admin';
  const isSubAdminWithSongs =
    role === 'subadmin' && permissions?.manageSongs === true;

    if (!isAdmin && !isSubAdminWithSongs) {
      const found = await isKeyInUserPlaylists(auth.uid, publicId);
      if (!found) {
        return jsonError(res, 403, 'Forbidden');
      }
    }

    const playbackUrl = getCloudinary().url(publicId, {
      resource_type: CLOUDINARY_RESOURCE_TYPE,
      type: CLOUDINARY_DELIVERY_TYPE,
      sign_url: true,
      secure: true,
    });

    return res.status(200).json({
      playbackUrl,
      downloadUrl: playbackUrl,
      expiresIn: 900,
    });
  } catch {
    if (res.headersSent) return;
    return jsonError(res, 500, 'Failed to generate playback URL');
  }
}
