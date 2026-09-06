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
    console.log('🎬 Starting automation test...');

    // First, let's insert test data into the database via API
    const testDepartment = '문화예술과';
    const testData = {
      department: testDepartment,
      policy: '공연예술지원',
      unit: '공연장운영',
      detail: '시립극장운영',
      level: '세부사업',
      explanation_text: '시립극장의 운영 및 유지보수',
      sections_json: JSON.stringify([
        {
          title: '예산총괄표',
          content: '예산총괄표\n============================================\n\n2026년 문화예술과 예산편성 현황\n\n총 예산:        250,000,000원\n중앙정부:       100,000,000원\n광역자치단체:   75,000,000원\n기초자치단체:   75,000,000원\n\n주요 사업:\n- 공연장 운영: 120,000,000원\n- 문화행사:    80,000,000원\n- 기금조성:    50,000,000원'
        },
        {
          title: '사업명세서',
          content: '사업명세서\n============================================\n\n사업명: 시립극장 운영 및 개선\n사업기간: 2026.01.01 ~ 2026.12.31\n사업주체: 문화예술과\n\n세부사업 내용:\n\n1. 운영비\n   - 인건비: 40,000,000원\n   - 관리비: 30,000,000원\n   - 공과금: 20,000,000원\n\n2. 시설개선비\n   - 무대시설 개선: 15,000,000원\n   - 객석 리모델링: 12,000,000원\n   - 안전점검 및 개선: 8,000,000원\n\n3. 프로그램 개발비\n   - 공연작품 개발: 10,000,000원\n   - 마케팅: 5,000,000원'
        },
        {
          title: '편성현황',
          content: '편성현황\n============================================\n\n예산편성 현황\n\n항목별 세부내역:\n\n[인건비]\n  정규직:        30,000,000원 (직위 5명)\n  비정규직:      10,000,000원 (직위 3명)\n\n[시설관리비]\n  유지보수:      20,000,000원\n  장비임차:       8,000,000원\n  보험료:         2,000,000원\n\n[프로그램비]\n  공연 개최:     15,000,000원\n  교육프로그램:   5,000,000원\n\n예산 변경 사항:\n- 2024년 대비 8% 증가\n- 시설개선에 중점 투자\n- 문화 접근성 강화'
        }
      ])
    };

    // Save test data via API
    console.log('📤 Saving test data to API...');
    const saveResponse = await page.request.post('http://localhost:3002/api/budget-explainer/save-material', {
      data: testData
    });
    console.log('✅ Save response:', saveResponse.status());

    // Now navigate to the explainer page
    console.log('🌐 Navigating to budget explainer page...');
    await page.goto(`http://localhost:3002/budget-explainer?dept=${encodeURIComponent(testDepartment)}`, {
      waitUntil: 'networkidle'
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    console.log('🔍 Looking for the detail item to click...');

    // Try to find and click the detail item in the tree
    const detailButtons = await page.locator('button, div, span').filter({ hasText: /시립극장운영/ }).all();
    console.log(`Found ${detailButtons.length} elements with text containing '시립극장운영'`);

    if (detailButtons.length > 0) {
      await detailButtons[0].click();
      await page.waitForTimeout(1000);
      console.log('✅ Clicked on the detail item');
    } else {
      console.log('⚠️  Could not find the detail item, but continuing...');
    }

    // Wait a bit and then take screenshots
    await page.waitForTimeout(1500);

    // Capture full page screenshot
    console.log('📸 Capturing full page screenshot...');
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/budget-explainer-full.png',
      fullPage: true
    });
    console.log('✅ Saved: budget-explainer-full.png');

    // Capture viewport screenshot
    console.log('📸 Capturing viewport screenshot...');
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/budget-explainer-viewport.png'
    });
    console.log('✅ Saved: budget-explainer-viewport.png');

    // Try to scroll down and capture more
    console.log('📜 Scrolling and capturing additional views...');
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/budget-explainer-scrolled.png'
    });
    console.log('✅ Saved: budget-explainer-scrolled.png');

    console.log('\n✨ Test automation complete!');
    console.log('📂 Screenshots saved to scratchpad directory');

  } catch (error) {
    console.error('❌ Error during automation:', error);
  } finally {
    await context.close();
    await browser.close();
  }
})();
