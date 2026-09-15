import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyAuth, getAdminDb, jsonError } from '../lib/auth.js';
import { getB2Client, getBucketName } from '../lib/b2.js';

// ---------------------------------------------------------------------------
// POST /api/b2-sign
//
// Returns a presigned GET URL for a private B2 audio object.
// Requires authentication. Normal users may only access songs that exist
// in their own playlists. Admins/subadmins with manageSongs get full access.
// ---------------------------------------------------------------------------

const EXPIRES_IN = 900; // 15 minutes

function hasPathTraversal(key: string): boolean {
  return key.includes('..') || key.includes('~') || key.startsWith('/');
}

/**
 * Check whether the requested objectKey is referenced by at least one song
 * in the given user's playlists.
 */
async function isKeyInUserPlaylists(
  uid: string,
  objectKey: string,
): Promise<boolean> {
  const db = getAdminDb();
  const playlistsSnap = await db
    .collection('users')
    .doc(uid)
    .collection('playlists')
    .get();

  for (const playlistDoc of playlistsSnap.docs) {
    const songsSnap = await db
      .collection('users')
      .doc(uid)
      .collection('playlists')
      .doc(playlistDoc.id)
      .collection('songs')
      .where('audioUrl', '==', objectKey)
      .limit(1)
      .get();

    if (!songsSnap.empty) return true;
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  try {
    if (req.method !== 'POST') {
      return jsonError(res, 405, 'Method not allowed');
    }

    // Auth check (no manageSongs requirement — normal users can read)
    const auth = await verifyAuth(req, res);
    if (!auth) return;

    const { objectKey } = req.body as Record<string, unknown>;

    if (!objectKey || typeof objectKey !== 'string') {
      return jsonError(res, 400, 'objectKey is required');
    }

    if (hasPathTraversal(objectKey)) {
      return jsonError(res, 400, 'Invalid objectKey');
    }

    // Only allow keys under the audio/ prefix
    if (!objectKey.startsWith('audio/')) {
      return jsonError(res, 403, 'Forbidden');
    }

    // Fetch user profile for role check
    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(auth.uid).get();
    if (!userSnap.exists) {
      return jsonError(res, 403, 'Forbidden');
    }

    const userData = userSnap.data()!;
    const role = userData.role || 'user';
    const permissions = userData.permissions || {};

    const isAdmin = role === 'admin';
    const isSubAdminWithSongs =
      role === 'subadmin' && permissions.manageSongs === true;

    // Authorization: admin/subadmin with manageSongs get full access.
    // Normal users may only access keys referenced in their own playlists.
    if (!isAdmin && !isSubAdminWithSongs) {
      const found = await isKeyInUserPlaylists(auth.uid, objectKey);
      if (!found) {
        return jsonError(res, 403, 'Forbidden');
      }
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(getB2Client(), command, {
      expiresIn: EXPIRES_IN,
    });

    return res.status(200).json({
      downloadUrl,
      expiresIn: EXPIRES_IN,
    });
  } catch {
    if (res.headersSent) return;
    return jsonError(res, 500, 'Failed to generate download URL');
  }
}
