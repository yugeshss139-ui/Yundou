import type { VercelRequest, VercelResponse } from '@vercel/node';

import { requirePermission, jsonError } from '../lib/auth.js';
import {
  getCloudinary,
  CLOUDINARY_RESOURCE_TYPE,
  CLOUDINARY_DELIVERY_TYPE,
} from '../lib/cloudinary.js';

function hasPathTraversal(key: string): boolean {
  return key.includes('..') || key.includes('~') || key.startsWith('/');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  try {
    if (req.method !== 'DELETE') {
      return jsonError(res, 405, 'Method not allowed');
    }

    const auth = await requirePermission(req, res, true);
    if (!auth) return;

    const body = (req.body || {}) as Record<string, unknown>;
    const publicId = (body.publicId || body.objectKey) as unknown;

    if (!publicId || typeof publicId !== 'string') {
      return jsonError(res, 400, 'publicId is required');
    }

    if (hasPathTraversal(publicId)) {
      return jsonError(res, 400, 'Invalid publicId');
    }

    if (!publicId.startsWith('audio/')) {
      return jsonError(res, 403, 'Forbidden');
    }

    await getCloudinary().uploader.destroy(publicId, {
      resource_type: CLOUDINARY_RESOURCE_TYPE,
      type: CLOUDINARY_DELIVERY_TYPE,
      invalidate: true,
    });

    return res.status(200).json({ deleted: true });
  } catch {
    if (res.headersSent) return;
    return jsonError(res, 500, 'Failed to delete audio file');
  }
}
