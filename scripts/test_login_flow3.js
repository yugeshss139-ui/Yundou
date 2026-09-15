const { chromium } = require('playwright');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { readFileSync } = require('fs');

const sa = JSON.parse(readFileSync('D:/YNK/yundo-b83a7-firebase-adminsdk-fbsvc-7d1c0c4677.json', 'utf-8'));
const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const auth = getAuth(app);

async function getIdToken(uid) {
  const customToken = await auth.createCustomToken(uid);
  const apiKey = 'AIzaSyDRBtkKREVIVqNGfdh9-ojx5DrLSCWy3Bw';
  const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  const data = await resp.json();
  return data.idToken;
}

(async () => {
  // Get a real ID token for the sample1 user
  const uid = 'IqODTXit0PPIEx6DSmdiqV035RL2'; // sample1 user
  const idToken = await getIdToken(uid);
  console.log('Got ID token, length:', idToken.length);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  
  // Navigate to the login page
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  console.log('Initial URL:', page.url());
  
  // Inject the ID token into localStorage to simulate logged-in state
  await page.evaluate((token) => {
    localStorage.setItem('firebase:authUser:AIzaSyDRBtkKREVIVqNGfdh9-ojx5DrLSCWy3Bw:[DEFAULT]', JSON.stringify({
      apiKey: 'AIzaSyDRBtkKREVIVqNGfdh9-ojx5DrLSCWy3Bw',
      authDomain: 'yundo-b83a7.firebaseapp.com',
      currentUser: {
        uid: 'IqODTXit0PPIEx6DSmdiqV035RL2',
        email: 'sample1@yundo.app',
        displayName: 'sample1',
        stsTokenManager: {
          accessToken: token,
          expirationTime: Date.now() + 3600000,
          refreshToken: 'dummy'
        }
      }
    }));
  }, idToken);
  
  // Reload the page to trigger auth state
  await page.reload({ waitUntil: 'networkidle' });
  console.log('After reload URL:', page.url());
  
  // Wait for auth to resolve
  await page.waitForTimeout(2000);
  
  // Check if we're on an authenticated page
  let html = await page.content();
  console.log('After reload - login-page present:', html.includes('login-page'));
  console.log('After reload - main-layout present:', html.includes('main-layout'));
  console.log('After reload - playlist-page present:', html.includes('playlist-page'));
  
  // Try to navigate to the playlist
  await page.goto('http://localhost:5173/playlists/RSuwc9Bs804Vblr9JHXk', { waitUntil: 'networkidle' });
  console.log('Navigated to playlist URL:', page.url());
  
  await page.waitForTimeout(3000);
  
  html = await page.content();
  console.log('Playlist page - login-page present:', html.includes('login-page'));
  console.log('Playlist page - main-layout present:', html.includes('main-layout'));
  console.log('Playlist page - playlist-page present:', html.includes('playlist-page'));
  console.log('Playlist page - song-item present:', html.includes('song-item'));
  console.log('Playlist page - song-item-play present:', html.includes('song-item-play'));
  
  // Try clicking play button if it exists
  const playBtn = await page.locator('.song-item-play-btn').first();
  if (await playBtn.count() > 0) {
    console.log('Play button found, clicking...');
    await playBtn.click();
    await page.waitForTimeout(2000);
    
    // Check if player appears
    html = await page.content();
    console.log('After play click - music-player present:', html.includes('player'));
    console.log('After play click - is-playing present:', html.includes('is-playing') || html.includes('player-empty') === false);
  }
  
  await browser.close();
})().catch(console.error);