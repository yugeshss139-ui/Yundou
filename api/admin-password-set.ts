import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, jsonError } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const auth = await requireAdmin(req, res);
    if (!auth) return;

    const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!uid || password.length < 8) {
      return jsonError(res, 400, 'User ID and a password of at least 8 characters are required');
    }

    await auth.adminAuth.updateUser(uid, { password });
    return res.status(204).end();
  } catch {
    if (res.headersSent) return;
    return jsonError(res, 500, 'Unable to set the user password');
  }
}
