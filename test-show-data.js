import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 }
  });
  const page = await context.newPage();

  try {
    console.log('🎬 Capturing data display...\n');

    // Step 1: Sync data
    console.log('1️⃣ Syncing data...');
    await page.request.post('http://localhost:3002/api/budget-explainer/sync');
    console.log('✅\n');

    // Step 2: Save test data
    console.log('2️⃣ Saving test material with 3 sections...');
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
            content: `예산총괄표
═══════════════════════════════════════

2026년 문화예술과 예산편성 현황

총 예산          :  250,000,000원
중앙정부         :  100,000,000원
광역자치단체     :   75,000,000원
기초자치단체     :   75,000,000원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
주요 사업별 예산
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

공연장 운영      :  120,000,000원 (48%)
문화행사         :   80,000,000원 (32%)
기금조성         :   50,000,000원 (20%)`
          },
          {
            title: '사업명세서',
            content: `사업명세서
═══════════════════════════════════════

사업명    : 문화관광재단 공연장 운영
기간      : 2026.01.01 ~ 2026.12.31
담당부서  : 문화예술과 문화관광담당관

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
세부사업 내용
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] 운영비 : 90,000,000원
   - 인건비       40,000,000원
   - 관리비       30,000,000원
   - 공과금       20,000,000원

[2] 시설개선비 : 25,000,000원
   - 무대시설     15,000,000원
   - 객석개선     10,000,000원

[3] 프로그램비 : 15,000,000원
   - 공연개최     10,000,000원
   - 마케팅        5,000,000원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
합계 : 130,000,000원`
          },
          {
            title: '편성현황',
            content: `편성현황
═══════════════════════════════════════

예산편성 현황 상세 내역

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[인건비] 40,000,000원
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  정규직(5명)      30,000,000원
  비정규직(3명)    10,000,000원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[시설관리비] 30,000,000원
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  유지보수        20,000,000원
  장비임차         8,000,000원
  보험료           2,000,000원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[프로그램비] 15,000,000원
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  공연 개최       10,000,000원
  교육프로그램     5,000,000원

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
예산 변경 사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ 2025년 대비 8% 증가
  ✓ 시설개선에 중점 투자
  ✓ 문화 접근성 강화`
          }
        ])
      }
    });
    console.log('✅\n');

    // Step 3: Navigate to test display page
    console.log('3️⃣ Loading test display page...');
    await page.goto('http://localhost:3000/test-display.html', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    console.log('✅\n');

    // Step 4: Click load button
    console.log('4️⃣ Loading and displaying data...');
    await page.click('button:has-text("데이터 로드")');
    await page.waitForTimeout(2000);
    console.log('✅\n');

    // Step 5: Take screenshots
    console.log('5️⃣ Capturing screenshots...');

    // Full page
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/data-display-full.png',
      fullPage: true
    });
    console.log('   ✅ Full page saved');

    // Viewport
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/data-display-viewport.png'
    });
    console.log('   ✅ Viewport saved');

    // Scroll to show more
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: '/tmp/claude-0/-home-user-budgetdash-2027/df0e0e71-ed7a-515a-b0e5-86aa44ea7954/scratchpad/data-display-scrolled.png'
    });
    console.log('   ✅ Scrolled view saved\n');

    console.log('✨ Complete! 3-section display with actual data ready.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
})();
