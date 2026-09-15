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
    if (!uid) return jsonError(res, 400, 'User ID is required');

    const target = await auth.adminAuth.getUser(uid);
    if (!target.email) return jsonError(res, 400, 'User has no email address');

    const resetLink = await auth.adminAuth.generatePasswordResetLink(target.email);
    return res.status(200).json({ resetLink });
  } catch {
    if (res.headersSent) return;
    return jsonError(res, 500, 'Unable to create password reset link');
  }
}
