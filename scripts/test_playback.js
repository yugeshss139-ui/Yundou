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
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  
  // Login via username/password
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  console.log('Initial URL:', page.url());
  
  await page.fill('input#username', 'sample1');
  await page.fill('input#password', 'testpassword123');
  await page.click('button.login-btn');
  
  // Wait for navigation to home
  await page.waitForURL('**/', { timeout: 15000 });
  await page.waitForTimeout(2000);
  
  console.log('After login URL:', page.url());
  
  // Navigate to playlist detail
  await page.goto('http://localhost:5173/playlists/RSuwc9Bs804Vblr9JHXk', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('Playlist URL:', page.url());
  
  let html = await page.content();
  console.log('Playlist page - login-page present:', html.includes('login-page'));
  console.log('Playlist page - main-layout present:', html.includes('main-layout'));
  console.log('Playlist page - playlist-page present:', html.includes('playlist-page'));
  console.log('Playlist page - song-item present:', html.includes('song-item'));
  console.log('Playlist page - song-item-play present:', html.includes('song-item-play'));
  
  // Check if songs are rendered
  const songItems = await page.locator('.song-item').count();
  console.log('Song items count:', songItems);
  
  // Check play buttons
  const playBtns = await page.locator('.song-item-play-btn').count();
  const playSideBtns = await page.locator('.song-item-play-side').count();
  console.log('Play buttons (number):', playBtns);
  console.log('Play buttons (side):', playSideBtns);
  
  // Click first play button
  if (playBtns > 0) {
    console.log('Clicking first play button...');
    await page.locator('.song-item-play-btn').first().click();
    await page.waitForTimeout(3000);
    
    html = await page.content();
    console.log('After play click - player present:', html.includes('player'));
    console.log('After play click - is-playing class:', html.includes('is-playing') || html.includes('player-empty') === false);
    
    // Check if audio is playing
    const isPlaying = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { playing: !audio.paused, src: audio.src?.substring(0, 80), currentTime: audio.currentTime, duration: audio.duration } : null;
    });
    console.log('Audio element state:', isPlaying);
  }
  
  // Try second play button (side)
  if (playSideBtns > 0) {
    console.log('Clicking first play-side button...');
    await page.locator('.song-item-play-side').first().click();
    await page.waitForTimeout(3000);
    
    html = await page.content();
    console.log('After side play click - player present:', html.includes('player'));
    
    const isPlaying = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return audio ? { playing: !audio.paused, src: audio.src?.substring(0, 80), currentTime: audio.currentTime, duration: audio.duration } : null;
    });
    console.log('Audio element state:', isPlaying);
  }
  
  await browser.close();
})().catch(console.error);