import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

import { requirePermission, jsonError } from '../lib/auth.js';
import {
  getCloudinary,
  getCloudName,
  getApiKey,
  getApiSecret,
  CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_RESOURCE_TYPE,
  CLOUDINARY_DELIVERY_TYPE,
} from '../lib/cloudinary.js';

function hasPathTraversal(key: string): boolean {
  return key.includes('..') || key.includes('~') || key.startsWith('/');
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

    const auth = await requirePermission(req, res, true);
    if (!auth) return;

    const apiKey = getApiKey();
    const apiSecret = getApiSecret();
    const cloudName = getCloudName();

    if (!apiKey || !apiSecret || !cloudName) {
      return jsonError(res, 500, 'Cloudinary server configuration missing');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `audio/${randomUUID()}`;

    if (hasPathTraversal(publicId) || !publicId.startsWith('audio/')) {
      return jsonError(res, 400, 'Invalid publicId');
    }

    const paramsToSign = {
      public_id: publicId,
      timestamp,
      type: CLOUDINARY_DELIVERY_TYPE,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
    };

    const signature = getCloudinary().utils.api_sign_request(paramsToSign, apiSecret);

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
  } catch {
    if (res.headersSent) return;
    return jsonError(res, 500, 'Failed to generate upload signature');
  }
}
