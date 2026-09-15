import type { VercelRequest, VercelResponse } from '@vercel/node';

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

async function makeTinyWavDataUri(): Promise<string> {
  const base64Wav =
    'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  return `data:audio/wav;base64,${base64Wav}`;
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

    const cloud_name = getCloudName();
    const api_key = getApiKey();
    const api_secret = getApiSecret();

    if (!cloud_name || !api_key || !api_secret) {
      return jsonError(res, 500, 'Cloudinary server configuration missing');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const public_id = `audio/test-diagnostic`;

    if (hasPathTraversal(public_id) || !public_id.startsWith('audio/')) {
      return jsonError(res, 400, 'Invalid publicId');
    }

    const paramsToSign = {
      public_id,
      timestamp,
      type: CLOUDINARY_DELIVERY_TYPE,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
    };

    const signature = getCloudinary().utils.api_sign_request(paramsToSign, api_secret);

    const tinyDataUri = await makeTinyWavDataUri();

    const uploadResponse = await getCloudinary().uploader.upload(tinyDataUri, {
      public_id,
      resource_type: CLOUDINARY_RESOURCE_TYPE,
      type: CLOUDINARY_DELIVERY_TYPE,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      signature,
      timestamp,
      use_filename: false,
      unique_filename: false,
      overwrite: true,
    });

    const cloudinary_result = {
      result: (uploadResponse as any)?.result,
      public_id: (uploadResponse as any)?.public_id,
      resource_type: (uploadResponse as any)?.resource_type,
      secure_url: (uploadResponse as any)?.secure_url,
      http_code: (uploadResponse as any)?.http_code,
    };

    let cleanup_ok = false;
    let cleanup_error: string | undefined;
    try {
      const destroyRes = await getCloudinary().uploader.destroy(public_id, {
        resource_type: CLOUDINARY_RESOURCE_TYPE,
        type: CLOUDINARY_DELIVERY_TYPE,
        invalidate: true,
      });
      cleanup_ok = !!destroyRes;
      if ((destroyRes as any)?.result === 'ok' || (destroyRes as any)?.result === 'deleted') cleanup_ok = true;
      if ((destroyRes as any)?.result === 'not_found') cleanup_ok = true;
    } catch (e) {
      const msg = (e as any)?.message ? String((e as any).message) : undefined;
      cleanup_error = msg?.slice(0, 200);
      cleanup_ok = false;
    }

    return res.status(200).json({
      ok: true,
      step: 'temp-signed-upload',
      upload: {
        accepted: true,
        http_status: (uploadResponse as any)?.http_code,
        cloudinary_result,
        public_id,
        resource_type: CLOUDINARY_RESOURCE_TYPE,
      },
      cleanup: {
        ok: cleanup_ok,
        error: cleanup_error,
      },
      diagnostic: {
        params: {
          public_id,
          timestamp,
          type: CLOUDINARY_DELIVERY_TYPE,
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
        },
        signature_length: signature ? String(signature).length : 0,
      },
      note: 'Temporary endpoint. Does not expose any secret.'
    });
  } catch (err) {
    const e = err as any;
    const status = e?.http_code || e?.response?.status;
    const message = e?.message ? String(e.message).slice(0, 300) : undefined;

    return res.status(200).json({
      ok: false,
      step: 'temp-signed-upload',
      upload: {
        accepted: false,
        http_status: status,
        error: {
          name: e?.name,
          code: e?.code,
          message,
          raw: e?.error || undefined,
        },
        public_id: `audio/test-diagnostic`,
        resource_type: CLOUDINARY_RESOURCE_TYPE,
      },
      cleanup: {
        ok: false,
        error: 'Upload failed; cleanup not attempted',
      },
    });
  }
}
