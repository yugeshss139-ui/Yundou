import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.E2E_BASE_URL || 'https://yundo-ada471hqu-yugeshss139-uis-projects.vercel.app';
const USERNAME = process.env.E2E_USERNAME || '';
const PASSWORD = process.env.E2E_PASSWORD || '';
const ADMIN_UID = process.env.E2E_ADMIN_UID || '10a7pcG65SPw5q1mO7ULSP9Hh6V2';

function ensureTinyWav() {
  const tmpWav = path.join(process.cwd(), 'tmp-e2e-tone.wav');
  if (fs.existsSync(tmpWav)) return tmpWav;

  const riff = Buffer.from(
    '524946462400000057415645666d74201000000001000100401f0000803e0000020010006461746120000000',
    'hex',
  );
  fs.writeFileSync(tmpWav, riff);
  return tmpWav;
}

test.describe('Yundo music E2E', () => {
  test('login -> add song -> save -> play -> refresh play', async ({ page }) => {
    test.skip(!USERNAME || !PASSWORD, 'Missing E2E_USERNAME/E2E_PASSWORD env');

    fs.mkdirSync('test-results', { recursive: true });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    const url = page.url();
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const visibleText = bodyText.slice(0, 1000);
    const inputCount = await page.locator('input').count();
    const buttonCount = await page.locator('button').count();

    console.log('[E2E debug] url:', url);
    console.log('[E2E debug] title:', title);
    console.log('[E2E debug] body.innerText(0..1000):', visibleText.replace(/\s+/g, ' ').trim());
    console.log('[E2E debug] input count:', inputCount);
    console.log('[E2E debug] button count:', buttonCount);

    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
    const html = await page.content();
    fs.writeFileSync('test-results/login-page.html', html);

    const usernameField = page.locator('input[aria-label="Username"], input#username, input[name="username"], input[placeholder*="username" i]').first();
    await expect(usernameField).toHaveCount(1, { timeout: 20000 });

    const passwordField = page.locator('input[aria-label="Password" i], input#password, input[name="password"], input[placeholder*="password" i]').first();
    await expect(passwordField).toHaveCount(1, { timeout: 20000 });

    await usernameField.fill(USERNAME);
    await passwordField.fill(PASSWORD);

    const loginButton = page.locator('button.login-btn, button[type="submit" i]').filter({ hasText: /login/i }).first();
    if (await loginButton.count()) {
      await loginButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await page.waitForURL('**/playlists**', { timeout: 30000 }).catch(() => {});

    await page.waitForTimeout(1500);

    // Prefer admin playlist page for adding songs
    await page.goto(`${BASE_URL}/admin/users/${ADMIN_UID}`, { waitUntil: 'networkidle' }).catch(() => {});

    await page.waitForTimeout(1500);

    const addBtn = page.locator('button:has-text("Add Song"), button:has-text("Add"), button:has-text("Upload")').first();
    if (await addBtn.count()) await addBtn.click();

    const fileInput = page.locator('input[type="file"][accept*="audio" i], input[type="file"]').first();
    await expect(fileInput).toHaveCount(1, { timeout: 20000 });

    const wavPath = ensureTinyWav();
    await fileInput.setInputFiles(wavPath);

    const titleInputs = page.locator('input[placeholder*="Song" i], input[placeholder*="title" i], input[name*="title" i]');
    if (await titleInputs.count()) await titleInputs.first().fill('E2E Song');

    const artistInputs = page.locator('input[placeholder*="Artist" i], input[name*="artist" i]');
    if (await artistInputs.count()) await artistInputs.first().fill('E2E Artist');

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Submit")').first();
    if (await saveBtn.count()) await saveBtn.click();

    await page.waitForTimeout(5000);

    const playBtn = page.locator('button.song-item-play-btn, button.song-item-play-side, button:has(svg), button:has-text("Play")').first();
    await playBtn.click();

    await page.waitForFunction(() => {
      const a = document.querySelector('audio');
      return a && !a.paused && a.currentTime >= 0;
    }, null, { timeout: 30000 });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const playBtn2 = page.locator('button.song-item-play-btn, button.song-item-play-side, button:has(svg), button:has-text("Play")').first();
    await playBtn2.click();

    await page.waitForFunction(() => {
      const a = document.querySelector('audio');
      return a && !a.paused;
    }, null, { timeout: 30000 });
  });
});
