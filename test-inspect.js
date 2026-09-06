import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 }
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/budget-explainer?dept=문화예술과', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);

    // Find all labels
    const labels = await page.locator('label').allTextContents();
    console.log('All labels on page:');
    labels.forEach((label, i) => console.log(`  ${i}: ${label.substring(0, 80)}`));

    // Find buttons with Upload icon
    const buttons = await page.locator('button').count();
    console.log(`\nTotal buttons: ${buttons}`);

    // Check for Upload icon
    const uploadIcons = await page.locator('svg').all();
    console.log(`\nTotal SVG icons: ${uploadIcons.length}`);

    // Search for file inputs
    const fileInputs = await page.locator('input[type="file"]').count();
    console.log(`File inputs: ${fileInputs}`);

    // Get all file input parents
    const fileInputs2 = await page.locator('input[type="file"]').all();
    for (let i = 0; i < fileInputs2.length; i++) {
      const parent = await fileInputs2[i].evaluate(el => {
        return {
          tag: el.parentElement?.tagName,
          class: el.parentElement?.className,
          visible: el.offsetParent !== null
        };
      });
      console.log(`  Input ${i}:`, parent);
    }

    // Check page content
    const content = await page.content();
    const hasUploadClass = content.includes('upload-input');
    const hasIconStackBtn = content.includes('icon-stack-btn');
    console.log(`\nHTML contains 'upload-input': ${hasUploadClass}`);
    console.log(`HTML contains 'icon-stack-btn': ${hasIconStackBtn}`);

    // Try to find the upload button area
    const headerArea = await page.locator('.page-heading').evaluate(el => ({
      visible: el.offsetParent !== null,
      height: el.offsetHeight
    }));
    console.log(`\nPage heading visible:`, headerArea);

  } finally {
    await context.close();
    await browser.close();
  }
})();
