import { doc, getDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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
  createdAt?: Date | null;
}

/**
 * Fetch user profile from Firestore users/{uid}.
 * The profile is created by the admin script during user creation.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));

  if (!userDoc.exists()) {
    return null;
  }

  const data = userDoc.data();

  return {
    uid: userDoc.id,
    username: data.username || '',
    email: data.email || '',
    role: data.role || 'user',
    permissions: data.permissions || undefined,
    createdAt: data.createdAt?.toDate?.() || null,
  };
}

/**
 * Get a user by UID. Alias for getUserProfile.
 */
export async function getUser(uid: string): Promise<UserProfile | null> {
  return getUserProfile(uid);
}

/**
 * List all users from Firestore users collection, ordered by username.
 */
export async function listUsers(): Promise<UserProfile[]> {
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
