const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync } = require('fs');

const sa = JSON.parse(readFileSync('D:/YNK/yundo-b83a7-firebase-adminsdk-fbsvc-7d1c0c4677.json', 'utf-8'));
const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const db = getFirestore(app);

async function main() {
  // Get the playlist ID
  const userSnap = await db.collection('users').doc('IqODTXit0PPIEx6DSmdiqV035RL2').collection('playlists').limit(1).get();
  if (userSnap.empty) {
    console.log('No playlists found');
    return;
  }
  const playlistId = userSnap.docs[0].id;
  console.log('Playlist ID:', playlistId);
  
  // Get songs
  const songsSnap = await db.collection('users').doc('IqODTXit0PPIEx6DSmdiqV035RL2').collection('playlists').doc(playlistId).collection('songs').get();
  console.log('Songs:', songsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
}

main().catch(console.error);