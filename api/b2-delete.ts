import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requirePermission, jsonError } from '../lib/auth.js';
import { getB2Client, getBucketName } from '../lib/b2.js';

// ---------------------------------------------------------------------------
// DELETE /api/b2-delete
//
// Deletes an audio object from the private B2 bucket.
// Requires admin OR subadmin with manageSongs === true.
// ---------------------------------------------------------------------------

function hasPathTraversal(key: string): boolean {
  return key.includes('..') || key.includes('~') || key.startsWith('/');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  try {
    if (req.method !== 'DELETE') {
      return jsonError(res, 405, 'Method not allowed');
    }

    // Auth + permission check
    const auth = await requirePermission(req, res, true);
    if (!auth) return;

    const { objectKey } = req.body as Record<string, unknown>;

    if (!objectKey || typeof objectKey !== 'string') {
      return jsonError(res, 400, 'objectKey is required');
    }

    if (hasPathTraversal(objectKey)) {
      return jsonError(res, 400, 'Invalid objectKey');
    }

    if (!objectKey.startsWith('audio/')) {
      return jsonError(res, 403, 'Forbidden');
    }

    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: objectKey,
    });

    await getB2Client().send(command);

    return res.status(200).json({ deleted: true });
  } catch {
    if (res.headersSent) return;
    return jsonError(res, 500, 'Failed to delete audio file');
  }
}
