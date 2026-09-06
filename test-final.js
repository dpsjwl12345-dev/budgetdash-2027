import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1200 }
  });
  const page = await context.newPage();

  try {
    console.log('🎬 Starting Budget Explainer test...\n');

    // Step 1: Sync CSV data
    console.log('📋 Step 1: Syncing CSV data...');
    await page.request.post('http://localhost:3002/api/budget-explainer/sync');
    console.log('✅ CSV synced\n');

    // Step 2: Save test material
    console.log('📝 Step 2: Saving test material...');
    await page.request.post('http://localhost:3002/api/budget-explainer/save-material', {
      data: {
        department: '문화예술과',
        policy: '문화도시 조성',
        unit: '지역문화역량강화',
        detail: '문화관광재단 공연장 운영',
        level: '세부사업',
        explanation_text: '문화관광재단 공연장의 운영 및 유지보수',
        sections_json: JSON.stringify([
          {
            title: '예산총괄표',
            content: '예산총괄표\n' +
              '============================================\n\n' +
              '2026년 문화예술과 예산편성 현황\n\n' +
              '총 예산:        250,000,000원\n' +
              '중앙정부:       100,000,000원\n' +
              '광역자치단체:    75,000,000원\n' +
              '기초자치단체:    75,000,000원\n\n' +
              '주요 사업:\n' +
              '- 공연장 운영: 120,000,000원\n' +
              '- 문화행사:    80,000,000원\n' +
              '- 기금조성:    50,000,000원'
          },
          {
            title: '사업명세서',
            content: '사업명세서\n' +
              '============================================\n\n' +
              '사업명: 문화관광재단 공연장 운영\n' +
              '사업기간: 2026.01.01 ~ 2026.12.31\n' +
              '사업주체: 문화예술과\n\n' +
              '세부사업 내용:\n\n' +
              '1. 운영비\n' +
              '   - 인건비: 40,000,000원\n' +
              '   - 관리비: 30,000,000원\n' +
              '   - 공과금: 20,000,000원\n\n' +
              '2. 시설개선비\n' +
              '   - 무대시설 개선: 15,000,000원\n' +
              '   - 객석 리모델링: 12,000,000원\n' +
              '   - 안전점검 및 개선: 8,000,000원'
          },
          {
            title: '편성현황',
            content: '편성현황\n' +
              '============================================\n\n' +
              '예산편성 현황\n\n' +
              '항목별 세부내역:\n\n' +
              '[인건비]\n' +
              '  정규직:        30,000,000원 (직위 5명)\n' +
              '  비정규직:      10,000,000원 (직위 3명)\n\n' +
              '[시설관리비]\n' +
              '  유지보수:      20,000,000원\n' +
              '  장비임차:       8,000,000원\n' +
              '  보험료:         2,000,000원\n\n' +
              '[프로그램비]\n' +
              '  공연 개최:     15,000,000원\n' +
              '  교육프로그램:   5,000,000원'
          }
        ])
      }
    });
    console.log('✅ Test material saved\n');

    // Step 3: Navigate to test page
    console.log('🌐 Step 3: Navigating to test display page...');
    await page.goto('http://localhost:3000/test-display.html', {
      waitUntil: 'networkidle'
    });
    console.log('✅ Page loaded\n');

    // Step 4: Wait for department to auto-load
    await page.waitForTimeout(1500);

    // Step 5: Click load button
    console.log('🔄 Step 4: Clicking load data button...');
    await page.click('button:has-text("데이터 로드")');
    await page.waitForTimeout(2000);
    console.log('✅ Data button clicked\n');

    // Step 6: Capture full page screenshot
    console.log('📸 Step 5: Capturing full page screenshot...');
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/budget-test-full.png',
      fullPage: true
    });
    console.log('✅ Full page saved: budget-test-full.png\n');

    // Step 7: Capture viewport screenshot
    console.log('📸 Step 6: Capturing viewport screenshot...');
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/budget-test-viewport.png'
    });
    console.log('✅ Viewport saved: budget-test-viewport.png\n');

    // Step 8: Scroll down and capture
    console.log('📸 Step 7: Scrolling and capturing bottom view...');
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/budget-test-scrolled.png'
    });
    console.log('✅ Scrolled view saved: budget-test-scrolled.png\n');

    console.log('✨ Test complete!');
    console.log('📂 Screenshots saved to scratchpad directory:');
    console.log('   - budget-test-full.png');
    console.log('   - budget-test-viewport.png');
    console.log('   - budget-test-scrolled.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
})();
