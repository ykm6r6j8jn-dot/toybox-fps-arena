import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const { chromium } = createRequire(resolve(process.env.MOCHI_QA_ROOT, 'check.cjs'))('playwright');
const url = process.env.MOCHI_PUBLIC_URL;
async function openContent(page) {
  if ((await page.title()).includes('External Content Notice')) {
    await page.getByRole('button', {name: 'Open the page'}).click();
    await page.waitForFunction(() => document.title.includes('MOCHI TYPE'));
    await page.waitForLoadState('networkidle');
  }
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 1536, height: 1024}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
  await page.clock.install();
  const response = await page.goto(url, {waitUntil: 'networkidle', timeout: 120000});
  assert.equal(response.status(), 200);
  await openContent(page);
  assert.match(await page.title(), /MOCHI TYPE/);
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.locator('#mascot').evaluate(image => image.complete && image.naturalWidth > 0));
  await page.locator('[data-difficulty="easy"]').click();
  await page.locator('#startButton').click();
  await page.clock.runFor(2700);
  for (let word = 0; word < 10; word++) {
    const remaining = await page.locator('#remaining').textContent();
    assert.ok(remaining.length > 0);
    await page.keyboard.type(remaining);
  }
  assert.equal(await page.locator('#combo').textContent(), '10');
  assert.ok(await page.locator('#feverBadge').isVisible());
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#pauseDialog').evaluate(dialog => dialog.open));
  const paused = await page.locator('#time').textContent();
  await page.clock.fastForward(4000);
  assert.equal(await page.locator('#time').textContent(), paused);
  await page.locator('#resumeButton').click();
  await page.clock.fastForward(61000);
  await page.waitForFunction(() => document.querySelector('#resultDialog').open);
  assert.equal(await page.locator('#resultWords').textContent(), '10こ');
  const score = await page.locator('#resultScore').textContent();
  await page.reload({waitUntil: 'networkidle'});
  await openContent(page);
  assert.equal(await page.locator('#bestScore').textContent(), score);
  await page.setViewportSize({width: 390, height: 844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#startButton').click();
  await page.clock.runFor(2700);
  await page.locator('#typingCapture').fill(await page.locator('#remaining').textContent());
  assert.equal(await page.locator('#combo').textContent(), '1');
  assert.deepEqual(errors, []);
  console.log('PUBLIC_MOCHI_TYPE_VERIFIED: HTTPS page, assets/fonts, combo/fever, pause, results, saved score, mobile input.');
  console.log('PUBLIC_URL=' + url);
} finally {
  await browser.close();
}
