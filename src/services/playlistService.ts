import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl?: string;
  audioObjectKey?: string;
  addedAt: Date | null;
}

function playlistsRef(uid: string) {
  return collection(db, 'users', uid, 'playlists');
}

function playlistRef(uid: string, playlistId: string) {
  return doc(db, 'users', uid, 'playlists', playlistId);
}

/**
 * Get a single playlist by ID.
 */
export async function getPlaylist(uid: string, playlistId: string): Promise<Playlist | null> {
  const snapshot = await getDoc(playlistRef(uid, playlistId));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name || '',
    songCount: data.songCount || 0,
    createdAt: data.createdAt?.toDate?.() || null,
    updatedAt: data.updatedAt?.toDate?.() || null,
  };
}

/**
 * Create a new playlist for the authenticated user.
 */
export async function createPlaylist(uid: string, name: string): Promise<string> {
  const docRef = await addDoc(playlistsRef(uid), {
    name: name.trim(),
    songCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * List all playlists for the authenticated user, ordered by creation date.
 */
export async function listPlaylists(uid: string): Promise<Playlist[]> {
  const q = query(playlistsRef(uid), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      songCount: data.songCount || 0,
      createdAt: data.createdAt?.toDate?.() || null,
      updatedAt: data.updatedAt?.toDate?.() || null,
    };
  });
}

function songsRef(uid: string, playlistId: string) {
  return collection(db, 'users', uid, 'playlists', playlistId, 'songs');
}

/**
 * List all songs in a playlist, ordered by when they were added.
 */
export async function listSongs(uid: string, playlistId: string): Promise<Song[]> {
  const q = query(songsRef(uid, playlistId), orderBy('addedAt', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((songDoc) => {
    const data = songDoc.data();
    return {
      id: songDoc.id,
      title: data.title || '',
      artist: data.artist || '',
      album: data.album || '',
      duration: data.duration || 0,
      audioUrl: data.audioUrl || undefined,
      audioObjectKey: data.audioObjectKey || undefined,
      addedAt: data.addedAt?.toDate?.() || null,
    };
  });
}

/**
 * Add a song to a playlist.
 * Handles only the Firestore document — no audio upload.
 */
export async function addSong(
  uid: string,
  playlistId: string,
  song: { title: string; artist: string; album: string; duration: number; audioUrl?: string; audioObjectKey?: string }
): Promise<string> {
  const songData: Record<string, unknown> = {
    title: song.title.trim(),
    artist: song.artist.trim(),
    album: song.album.trim(),
    duration: song.duration,
    addedAt: serverTimestamp(),
  };

  if (song.audioUrl && song.audioUrl.trim()) {
    songData.audioUrl = song.audioUrl.trim();
  }

  if (song.audioObjectKey && song.audioObjectKey.trim()) {
    songData.audioObjectKey = song.audioObjectKey.trim();
  }

  let docRef;
  try {
    docRef = await addDoc(songsRef(uid, playlistId), songData);
  } catch (err) {
    throw err;
  }

  // Update song count on the playlist
  const playlistDoc = await getDoc(playlistRef(uid, playlistId));
  if (playlistDoc.exists()) {
    const currentCount = playlistDoc.data().songCount || 0;
    await updateDoc(playlistRef(uid, playlistId), {
      songCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    });
  }

  return docRef.id;
}

/**
 * Update a song's metadata.
 */
export async function updateSong(
  uid: string,
  playlistId: string,
  songId: string,
  song: { title: string; artist: string; album: string; duration: number; audioUrl?: string; audioObjectKey?: string }
): Promise<void> {
  const songRef = doc(db, 'users', uid, 'playlists', playlistId, 'songs', songId);
  const songData: Record<string, unknown> = {
    title: song.title.trim(),
    artist: song.artist.trim(),
    album: song.album.trim(),
    duration: song.duration,
  };

  if (song.audioUrl && song.audioUrl.trim()) {
    songData.audioUrl = song.audioUrl.trim();
  } else {
    songData.audioUrl = null;
  }

  if (song.audioObjectKey && song.audioObjectKey.trim()) {
    songData.audioObjectKey = song.audioObjectKey.trim();
  } else {
    songData.audioObjectKey = null;
  }

  await updateDoc(songRef, songData);
}

/**
 * Delete a song from a playlist and update songCount.
 */
export async function deleteSong(
  uid: string,
  playlistId: string,
  songId: string
): Promise<void> {
  const songRef = doc(db, 'users', uid, 'playlists', playlistId, 'songs', songId);
  await deleteDoc(songRef);

  // Update song count on the playlist
  const playlistDoc = await getDoc(playlistRef(uid, playlistId));
  if (playlistDoc.exists()) {
    const currentCount = playlistDoc.data().songCount || 0;
    await updateDoc(playlistRef(uid, playlistId), {
      songCount: Math.max(0, currentCount - 1),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Rename a playlist.
 */
export async function renamePlaylist(
  uid: string,
  playlistId: string,
  newName: string
): Promise<void> {
  await updateDoc(playlistRef(uid, playlistId), {
    name: newName.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Search songs across all of a user's playlists.
 * Returns songs with their playlist info.
 */
export interface SongWithPlaylist extends Song {
  playlistId: string;
  playlistName: string;
}

export async function searchSongs(uid: string, query: string): Promise<SongWithPlaylist[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const playlists = await listPlaylists(uid);
  const results: SongWithPlaylist[] = [];

  for (const pl of playlists) {
    const songs = await listSongs(uid, pl.id);
    for (const song of songs) {
      if (
        song.title.toLowerCase().includes(trimmed) ||
        song.artist.toLowerCase().includes(trimmed) ||
        song.album.toLowerCase().includes(trimmed)
      ) {
        results.push({ ...song, playlistId: pl.id, playlistName: pl.name });
      }
    }
  }

  return results;
}

/**
 * Delete a playlist and all its songs.
 */
export async function deletePlaylist(uid: string, playlistId: string): Promise<void> {
  // Delete all songs in the playlist first
  const songsRef = collection(db, 'users', uid, 'playlists', playlistId, 'songs');
  const songsSnapshot = await getDocs(songsRef);
  const deletePromises = songsSnapshot.docs.map((songDoc) => deleteDoc(songDoc.ref));
  await Promise.all(deletePromises);

  // Delete the playlist itself
  await deleteDoc(playlistRef(uid, playlistId));
}
