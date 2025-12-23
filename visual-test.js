const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  
  console.log('🎥 Visual Test - tasteofgratitude.shop\n');

  // Test 1: Desktop homepage
  console.log('📸 Desktop homepage...');
  const desktopPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await desktopPage.goto('https://tasteofgratitude.shop', { waitUntil: 'networkidle' });
  await desktopPage.screenshot({ path: '/tmp/homepage-desktop.png', fullPage: true });
  console.log('✅ Desktop screenshot saved');

  // Test 2: Mobile homepage
  console.log('📱 Mobile homepage...');
  const mobilePage = await browser.newPage({ 
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)'
  });
  await mobilePage.goto('https://tasteofgratitude.shop', { waitUntil: 'networkidle' });
  await mobilePage.screenshot({ path: '/tmp/homepage-mobile.png', fullPage: true });
  console.log('✅ Mobile screenshot saved');

  // Test 3: Catalog page
  console.log('📦 Catalog page...');
  const catalogPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await catalogPage.goto('https://tasteofgratitude.shop/catalog', { waitUntil: 'networkidle' });
  await catalogPage.screenshot({ path: '/tmp/catalog-page.png', fullPage: true });
  console.log('✅ Catalog screenshot saved');

  // Test 4: Collect metrics
  console.log('\n⏱️  Performance Metrics:');
  const metrics = await desktopPage.evaluate(() => {
    const perf = performance.timing;
    const navigation = performance.getEntriesByType('navigation')[0] || {};
    return {
      'DNS Lookup': perf.domainLookupEnd - perf.domainLookupStart,
      'TCP Connection': perf.connectEnd - perf.connectStart,
      'Total Load Time': perf.loadEventEnd - perf.fetchStart,
      'DCP (DOM Complete)': perf.domComplete - perf.fetchStart,
      'First Paint': navigation.duration || 'N/A'
    };
  });
  Object.entries(metrics).forEach(([key, val]) => {
    if (typeof val === 'number') {
      console.log(`  ${key}: ${val}ms`);
    } else {
      console.log(`  ${key}: ${val}`);
    }
  });

  // Test 5: SEO elements
  console.log('\n🔍 SEO Elements:');
  const seoChecks = await desktopPage.evaluate(() => ({
    title: document.title,
    hasDescription: !!document.querySelector('meta[name="description"]'),
    hasOG: !!document.querySelector('meta[property="og:image"]'),
    hasCanonical: !!document.querySelector('link[rel="canonical"]'),
    structuredData: document.querySelectorAll('script[type="application/ld+json"]').length,
    h1Count: document.querySelectorAll('h1').length,
    h2Count: document.querySelectorAll('h2').length
  }));
  console.log(`  Page Title: ✅ "${seoChecks.title}"`);
  console.log(`  Meta Description: ${seoChecks.hasDescription ? '✅' : '❌'}`);
  console.log(`  OG Image: ${seoChecks.hasOG ? '✅' : '❌'}`);
  console.log(`  Canonical URL: ${seoChecks.hasCanonical ? '✅' : '❌'}`);
  console.log(`  Structured Data: ${seoChecks.structuredData} schema(s)`);
  console.log(`  H1 Tags: ${seoChecks.h1Count}`);
  console.log(`  H2 Tags: ${seoChecks.h2Count}`);

  // Test 6: Accessibility
  console.log('\n♿ Accessibility:');
  const a11y = await desktopPage.evaluate(() => ({
    imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
    buttonsWithoutLabel: document.querySelectorAll('button:not([aria-label]):not([title])').length,
    linksWithoutLabel: document.querySelectorAll('a:not([aria-label]):not(:has(>*)):empty').length,
    inputsWithLabel: document.querySelectorAll('input[id]').length,
    totalInputs: document.querySelectorAll('input').length
  }));
  console.log(`  Images without alt text: ${a11y.imagesWithoutAlt}`);
  console.log(`  Buttons without label: ${a11y.buttonsWithoutLabel}`);
  console.log(`  Inputs with labels: ${a11y.inputsWithLabel}/${a11y.totalInputs}`);

  // Test 7: Page content
  console.log('\n📄 Page Content:');
  const content = await desktopPage.evaluate(() => ({
    paragraphs: document.querySelectorAll('p').length,
    buttons: document.querySelectorAll('button').length,
    links: document.querySelectorAll('a').length,
    images: document.querySelectorAll('img').length,
    sections: document.querySelectorAll('section').length
  }));
  console.log(`  Paragraphs: ${content.paragraphs}`);
  console.log(`  Buttons: ${content.buttons}`);
  console.log(`  Links: ${content.links}`);
  console.log(`  Images: ${content.images}`);
  console.log(`  Sections: ${content.sections}`);

  // Test 8: Responsive design check
  console.log('\n📐 Responsive Design:');
  const breakpoints = [375, 768, 1024, 1280];
  for (const width of breakpoints) {
    const testPage = await browser.newPage({ viewport: { width, height: 720 } });
    await testPage.goto('https://tasteofgratitude.shop', { waitUntil: 'load' });
    const hasScroll = await testPage.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`  ${width}px: ${hasScroll ? '⚠️ horizontal scroll' : '✅'}`);
    await testPage.close();
  }

  // Test 9: Interactive elements
  console.log('\n🎯 Interactive Elements:');
  const btnTest = await desktopPage.evaluate(() => {
    const btn = document.querySelector('a[href="/catalog"]');
    return {
      exists: !!btn,
      text: btn?.textContent?.trim(),
      visible: btn?.offsetParent !== null
    };
  });
  console.log(`  "Shop" CTA: ${btnTest.exists && btnTest.visible ? '✅ visible' : '❌'}`);

  await desktopPage.close();
  await mobilePage.close();
  await catalogPage.close();
  await browser.close();

  console.log('\n✅ Visual tests complete!');
  console.log('📸 Screenshots saved to /tmp/');
})();
