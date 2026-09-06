import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';
import { join } from 'path';

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
    console.log('\n🎬 Starting BudgetExplainer Upload Test\n');

    // Step 1: Sync data
    console.log('📋 Step 1: Syncing CSV data...');
    await page.request.post('http://localhost:3002/api/budget-explainer/sync');
    console.log('✅ Data synced\n');

    // Step 2: Navigate to BudgetExplainer
    console.log('🌐 Step 2: Navigating to BudgetExplainer page...');
    await page.goto('http://localhost:3000/budget-explainer?dept=문화예술과', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    // Step 3: Expand tree and find detail item
    console.log('🌳 Step 3: Expanding tree to find detail item...');

    // Look for policy button
    const policyButton = await page.locator('button').filter({ hasText: '문화도시 조성' }).first();
    if (await policyButton.isVisible()) {
      await policyButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Policy expanded');
    }

    // Look for unit button
    const unitButton = await page.locator('button').filter({ hasText: '지역문화역량강화' }).first();
    if (await unitButton.isVisible()) {
      await unitButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Unit expanded');
    }

    // Look for detail button
    const detailButton = await page.locator('button').filter({ hasText: '문화관광재단 공연장 운영' }).first();
    if (await detailButton.isVisible()) {
      await detailButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Detail item selected\n');
    } else {
      console.log('⚠️  Could not find detail item');
    }

    // Step 4: Check upload button
    console.log('🔘 Step 4: Checking upload button...');
    const uploadInput = await page.locator('input[type="file"]').first();
    const isVisible = await uploadInput.isVisible();
    console.log(`Upload input visible: ${isVisible}`);

    // Check if button is disabled
    const isDisabled = await uploadInput.isDisabled();
    console.log(`Upload input disabled: ${isDisabled}\n`);

    // Step 5: Create a test PDF (simple one)
    console.log('📄 Step 5: Creating test PDF...');
    const pdfPath = '/tmp/test.pdf';
    // We'll use a simple approach - create a minimal PDF
    const pdfContent = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
      0x0a, 0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, // 1 0 obj
      0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, // <</Type
      0x20, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, // /Catalo
      0x67, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, // g/Pages
      0x32, 0x20, 0x30, 0x52, 0x3e, 0x3e, 0x0a, 0x65, // 2 0 R>>
      0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x32, 0x20, // endobj 2
      0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, // 0 obj <<
      0x2f, 0x54, 0x79, 0x70, 0x65, 0x20, 0x2f, 0x50, // /Type /P
      0x61, 0x67, 0x65, 0x73, 0x2f, 0x4b, 0x69, 0x64, // ages/Kid
      0x73, 0x20, 0x5b, 0x33, 0x20, 0x30, 0x52, 0x5d, // s [3 0 R]
      0x2f, 0x43, 0x6f, 0x75, 0x6e, 0x74, 0x20, 0x31, // /Count 1
      0x3e, 0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, // >> endob
      0x6a, 0x0a, 0x78, 0x72, 0x65, 0x66, 0x0a, 0x30, // j xref 0
      0x20, 0x33, 0x0a, 0x30, 0x30, 0x30, 0x30, 0x30, // 3 00000
      0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, // 0000 65 5
      0x33, 0x35, 0x20, 0x66, 0x0a, 0x74, 0x72, 0x61, // 35 f tra
      0x69, 0x6c, 0x65, 0x72, 0x0a, 0x3c, 0x3c, 0x2f, // iler <</
      0x53, 0x69, 0x7a, 0x65, 0x20, 0x33, 0x3e, 0x3e, // Size 3>>
      0x0a, 0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, // startxr
      0x65, 0x66, 0x0a, 0x30, 0x0a, 0x25, 0x25, 0x45, // ef 0 %%E
      0x4f, 0x46, 0x0a                                // OF
    ]);
    writeFileSync(pdfPath, pdfContent);
    console.log(`✅ Test PDF created at ${pdfPath}\n`);

    // Step 6: Upload the file
    console.log('📤 Step 6: Uploading PDF file...');
    await uploadInput.setInputFiles(pdfPath);
    await page.waitForTimeout(2000);
    console.log('✅ File uploaded\n');

    // Step 7: Capture screenshots
    console.log('📸 Step 7: Capturing screenshots...');
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/upload-test-1.png',
      fullPage: true
    });
    console.log('✅ Screenshot 1 saved');

    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/upload-test-2.png'
    });
    console.log('✅ Screenshot 2 saved');

    console.log('\n✨ Upload test complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
})();
