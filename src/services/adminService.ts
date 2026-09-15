import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { getIdToken } from 'firebase/auth';
import { auth, db } from '../firebase';
import type { UserPermissions } from './userService';

/**
 * List all users. Requires admin Firestore rules.
 */
export async function listAllUsers() {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('username', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      uid: doc.id,
      username: data.username || '',
      email: data.email || '',
      role: data.role || 'user',
      permissions: data.permissions || undefined,
      createdAt: data.createdAt?.toDate?.() || null,
    };
  });
}

/**
 * Create a playlist for a specific user. Requires admin Firestore rules.
 */
export async function createPlaylistForUser(uid: string, name: string): Promise<string> {
  const playlistsRef = collection(db, 'users', uid, 'playlists');
  const docRef = await addDoc(playlistsRef, {
    name: name.trim(),
    songCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Promote a user to subadmin with specified permissions.
 * Only the original admin can perform this operation.
 */
export async function promoteToSubAdmin(
  uid: string,
  permissions: UserPermissions
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: 'subadmin',
    permissions: permissions,
  });
}

/**
 * Demote a subadmin back to user.
 * Only the original admin can perform this operation.
 */
export async function demoteToUser(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: 'user',
    permissions: null,
  });
}

/**
 * Update subadmin permissions.
 * Only the original admin can perform this operation.
 */
export async function updateSubAdminPermissions(
  uid: string,
  permissions: UserPermissions
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    permissions: permissions,
  });
}

export async function createPasswordResetLink(uid: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in.');

  const token = await getIdToken(user);
  const response = await fetch('/api/admin-password-reset', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid }),
  });

  const data = (await response.json().catch(() => ({}))) as { resetLink?: string; error?: string };
  if (!response.ok || !data.resetLink) {
    throw new Error(data.error || `Password reset failed (${response.status})`);
  }

  return data.resetLink;
}

export async function setUserPassword(uid: string, password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in.');

  const token = await getIdToken(user);
  const response = await fetch('/api/admin-password-set', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uid, password }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Password update failed (${response.status})`);
  }
}
