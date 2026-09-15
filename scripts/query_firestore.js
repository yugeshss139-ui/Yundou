const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');

const sa = JSON.parse(readFileSync('D:/YNK/yundo-b83a7-firebase-adminsdk-fbsvc-7d1c0c4677.json', 'utf-8'));
const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const db = getFirestore(app);

async function main() {
  // Find users with playlists
  const usersSnap = await db.collection('users').limit(5).get();
  console.log('Total users found:', usersSnap.docs.length);
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    console.log('\n--- User:', uid, '---');
    const playlistsSnap = await db.collection('users').doc(uid).collection('playlists').limit(5).get();
    console.log('  Playlists found:', playlistsSnap.docs.length);
    for (const plDoc of playlistsSnap.docs) {
      const plId = plDoc.id;
      console.log('    Playlist:', plId, 'Data:', plDoc.data());
      const songsSnap = await db.collection('users').doc(uid).collection('playlists').doc(plId).collection('songs').limit(5).get();
      console.log('      Songs found:', songsSnap.docs.length);
      for (const songDoc of songsSnap.docs) {
        console.log('      Song:', songDoc.id, JSON.stringify(songDoc.data(), null, 2));
      }
    }
  }
}
main().catch(console.error);