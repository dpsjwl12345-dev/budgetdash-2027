import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Set longer timeout for navigation
    page.setDefaultNavigationTimeout(15000);
    page.setDefaultTimeout(15000);

    console.log('🌐 Navigating...');
    await page.goto('http://localhost:3000/budget-explainer?dept=문화예술과', {
      waitUntil: 'load'
    });

    // Wait for content to render
    await page.waitForTimeout(5000);

    // Check for errors
    console.log('🔍 Checking for console errors...');
    page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));

    // Get page HTML
    const html = await page.content();
    console.log('📄 HTML length:', html.length);

    // Save HTML for inspection
    const fs = await import('fs');
    await fs.promises.writeFile('/tmp/debug-page.html', html);
    console.log('✅ Saved HTML to /tmp/debug-page.html');

    // Check for React app div
    const appDiv = await page.locator('#app').count();
    console.log('🎯 Found #app div:', appDiv);

    // Check for main content
    const main = await page.locator('main').count();
    console.log('📦 Found main element:', main);

    // List all h1, h2 elements
    const headers = await page.locator('h1, h2, h3').allTextContents();
    console.log('📝 Headers:', headers);

    // Check for buttons
    const buttons = await page.locator('button').count();
    console.log('🔘 Found buttons:', buttons);

    // Get rendered text
    const text = await page.textContent('body');
    console.log('✅ Body text length:', text?.length);
    console.log('📄 First 500 chars:', text?.substring(0, 500));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await context.close();
    await browser.close();
  }
})();
