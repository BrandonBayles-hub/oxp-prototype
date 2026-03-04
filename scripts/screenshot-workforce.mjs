#!/usr/bin/env node
/**
 * One-off script to capture a screenshot of /workforce
 * Run: npx playwright install chromium && node scripts/screenshot-workforce.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const URL = 'http://localhost:3000/workforce';
const OUT = join(process.cwd(), 'workforce-screenshot.png');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const response = await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
    if (!response || !response.ok()) {
      console.error('Page failed to load:', response?.status(), response?.statusText());
      process.exit(1);
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: OUT, fullPage: true });
    console.log('Screenshot saved to:', OUT);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
