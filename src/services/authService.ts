import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Spark-compatible username login.
 *
 * Architecture:
 *   1. Client queries Firestore `usernames/{username}` to get the email
 *   2. Client calls Firebase Auth signInWithEmailAndPassword(email, password)
 *   3. Firebase Auth verifies the password on its servers (never in browser JS)
 *
 * Firestore document: usernames/{username}
 * Fields: email (minimal — only what login needs)
 *
 * Security:
 *   - Passwords are NEVER stored in Firestore (Firebase Auth handles hashing)
 *   - Passwords are NEVER in frontend code, localStorage, or sessionStorage
 *   - The email is just an identifier, not a secret
 *   - Firebase Auth does the actual authentication server-side
 */
export async function loginWithUsername(
  username: string,
  password: string
): Promise<User> {
  const normalizedUsername = username.trim().toLowerCase();

  // 1. Look up the email for this username in Firestore
  const usernameRef = doc(db, 'usernames', normalizedUsername);
  const usernameDoc = await getDoc(usernameRef);

  if (!usernameDoc.exists()) {
    throw new Error('Invalid username or password');
  }

  const { email } = usernameDoc.data();

  if (!email) {
    throw new Error('Invalid username or password');
  }

  // 2. Authenticate with Firebase Auth using email + password
  //    Firebase Auth verifies the password hash on its servers.
  //    The password never touches Firestore or our code.
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch {
    // Generic error — do not reveal whether username or password was wrong
    throw new Error('Invalid username or password');
  }
}

/**
 * Logout the current user.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to Firebase authentication state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}
