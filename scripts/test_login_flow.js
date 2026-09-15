const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Navigate to the login page
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  console.log('Initial URL:', page.url());
  
  // Fill in login credentials
  await page.fill('input#username', 'sample1');
  await page.fill('input#password', 'password123');  // need to know the password
  
  // Submit
  await page.click('button.login-btn');
  
  // Wait for navigation
  await page.waitForURL('**/playlists**', { timeout: 10000 }).catch(() => {});
  console.log('After login URL:', page.url());
  
  // Check if we see the playlist page
  const html = await page.content();
  if (html.includes('playlist-page') || html.includes('playlist-detail')) {
    console.log('SUCCESS: Reached playlist page');
  } else if (html.includes('login-page')) {
    console.log('FAILED: Still on login page');
    // Check for error message
    const errorText = await page.locator('.login-error').textContent().catch(() => '');
    console.log('Error:', errorText);
  }
  
  await browser.close();
})().catch(console.error);