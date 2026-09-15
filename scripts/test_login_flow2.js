const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs from the browser
  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));
  
  // Navigate to the login page
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  console.log('Initial URL:', page.url());
  
  // Fill in login credentials
  await page.fill('input#username', 'sample1');
  await page.fill('input#password', 'password123');
  
  // Submit
  await page.click('button.login-btn');
  
  // Wait for navigation
  await page.waitForURL('**/playlists**', { timeout: 15000 }).catch(() => {});
  console.log('After login URL:', page.url());
  
  // Get full HTML
  const html = await page.content();
  
  // Check what's actually rendered
  console.log('=== HTML LENGTH:', html.length);
  
  if (html.includes('login-page')) {
    console.log('Still on login page');
    // Check for error
    const error = await page.locator('.login-error').textContent().catch(() => '');
    console.log('Error message:', error);
  }
  
  if (html.includes('playlist-page') || html.includes('playlist-detail')) {
    console.log('On playlist page');
  }
  
  if (html.includes('main-layout')) {
    console.log('MainLayout rendered');
  }
  
  if (html.includes('home-page')) {
    console.log('HomePage rendered');
  }
  
  // Check for songs
  if (html.includes('song-item')) {
    console.log('Song items found in DOM');
  }
  
  if (html.includes('song-item-play')) {
    console.log('Play buttons found in DOM');
  }
  
  // Try to wait for playlist detail page
  await page.waitForURL('**/playlists/RSuwc9Bs804Vblr9JHXk', { timeout: 10000 }).catch(() => {});
  console.log('Final URL:', page.url());
  
  const finalHtml = await page.content();
  if (finalHtml.includes('song-item')) {
    console.log('Song items in final DOM');
  }
  if (finalHtml.includes('song-item-play')) {
    console.log('Play buttons in final DOM');
  }
  
  await browser.close();
})().catch(console.error);