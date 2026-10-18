/* Read-only deployed-page browser audit. No orders, payments or messages. */
const fs = require('node:fs');
const path = require('node:path');
const engine = process.env.BROWSER_ENGINE || 'playwright';
if (!['playwright', 'puppeteer'].includes(engine)) throw new Error('UNSUPPORTED_BROWSER_ENGINE');
let driver;
const base = process.argv[2];
if (!/^https:\/\/(tasteofgratitude\.shop|gratog-[a-z0-9]+-theangelsilvers-projects\.vercel\.app)$/.test(base || '')) {
  throw new Error('EXPLICIT_APPROVED_SITE_REQUIRED');
}
const directory = path.resolve(process.env.AUDIT_OUTPUT || 'test-results/release-20261018/browser');
fs.mkdirSync(directory, { recursive: true });
const viewports = [['desktop', { width: 1440, height: 1000 }], ['galaxy-a16-sized', { width: 412, height: 915 }]];
const urls = ['/', '/catalog', '/product/strawberry-bliss', '/product/blue-lotus', '/product/calm-waters',
  '/markets', '/weekly-menu', '/preorder', '/cart', '/checkout', '/policies', '/contact'];
const expectedPages = viewports.length * urls.length;
const report = { kind: 'READ_ONLY_BROWSER_AUDIT', status: 'RUNNING', startedAt: new Date().toISOString(), base,
  expectedCommit: process.env.EXPECTED_SHA || null, engine,
  providerFinancialTest: false, expectedCommitVerifiedByBrowser: false,
  pages: [], errors: [], deliberatelyBlockedMutations: [] };
async function main() {
  fs.writeFileSync(path.join(directory, 'browser-readonly.json'), JSON.stringify(report, null, 2));
  if (engine === 'puppeteer') {
    const resolved = require.resolve(process.env.PUPPETEER_MODULE || 'puppeteer');
    const module = await import(require('node:url').pathToFileURL(resolved).href);
    driver = module.default || module;
  } else driver = require(process.env.PLAYWRIGHT_MODULE || 'playwright').chromium;
  report.requestedExecutable = process.env.BROWSER_EXECUTABLE || driver.executablePath();
  fs.writeFileSync(path.join(directory, 'browser-readonly.json'), JSON.stringify(report, null, 2));
  // GitHub-hosted Ubuntu disables Chromium's user-namespace sandbox. Only this
  // read-only ephemeral CI runner uses --no-sandbox; production browsers do not.
  const isolatedGitHubRunner = process.env.CI === 'true' && process.env.GITHUB_ACTIONS === 'true' && process.platform === 'linux';
  const browser = await driver.launch({ headless: true, timeout: 20000,
    ...(isolatedGitHubRunner ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] } : {}),
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  report.browserVersion = await browser.version();
  try {
    for (const [name, viewport] of viewports) {
      const context = engine === 'playwright'
        ? await browser.newContext({ viewport, isMobile: name !== 'desktop',
          hasTouch: name !== 'desktop', reducedMotion: 'reduce', serviceWorkers: 'block' })
        : await browser.createBrowserContext();
      const page = await context.newPage();
      if (engine === 'puppeteer') {
        await page.setViewport({ ...viewport, isMobile: name !== 'desktop', hasTouch: name !== 'desktop' });
        await page.setBypassServiceWorker(true);
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      }
      // Prevent any accidental order/payment/notification writes by this audit.
      const handleRequest = (request, control) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return control.continue();
        report.deliberatelyBlockedMutations.push({ viewport: name, method: request.method(),
          host: new URL(request.url()).host, path: new URL(request.url()).pathname });
        return control.abort('blockedbyclient');
      };
      if (engine === 'playwright') await context.route('**/*', route => handleRequest(route.request(), route));
      else {
        await page.setRequestInterception(true);
        page.on('request', request => {
          if (!request.isInterceptResolutionHandled()) handleRequest(request, request).catch(error => {
            report.errors.push('INTERCEPTION_FAILURE: ' + error.message.slice(0, 200));
          });
        });
      }
      const failures = [];
      page.on('pageerror', error => failures.push({ type: 'pageerror', message: error.message.slice(0, 250) }));
      page.on('response', response => {
        if (response.status() >= 400 && response.url().startsWith(base)) {
          failures.push({ type: 'http', status: response.status(), path: new URL(response.url()).pathname });
        }
      });
      page.on('requestfailed', request => {
        if (request.url().startsWith(base) && ['GET', 'HEAD'].includes(request.method())) {
          failures.push({ type: 'requestfailed', path: new URL(request.url()).pathname,
            message: request.failure()?.errorText || 'UNKNOWN_NETWORK_FAILURE' });
        }
      });
      for (const route of urls) {
        const first = failures.length;
        const entry = { viewport: name, route, checks: {} };
        try {
          const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const visibleBody = () => document.body && document.body.getBoundingClientRect().height > 0;
          if (engine === 'playwright') await page.waitForFunction(visibleBody, undefined, { timeout: 10000 });
          else await page.waitForFunction(visibleBody, { timeout: 10000 });
          await new Promise(resolve => setTimeout(resolve, 1200));
          entry.status = response?.status();
          entry.title = await page.title();
          entry.finalOrigin = new URL(page.url()).origin;
          entry.finalPath = new URL(page.url()).pathname;
          entry.checks.pageResponded = entry.status === 200;
          const bodyText = await page.evaluate(() => document.body.innerText);
          entry.checks.expectedOrigin = entry.finalOrigin === base;
          entry.checks.noDeploymentAuthentication = !/log in to vercel|authentication required|vercel authentication/i.test(bodyText) && !/vercel/i.test(entry.title);
          entry.checks.tasteOfGratitudeDocument = /taste|gratitude/i.test(entry.title);
          entry.checks.visibleBody = bodyText.trim().length > 100;
          entry.checks.noApplicationError = !/Application error:|a client-side exception|internal server error|an unexpected error occurred/i.test(bodyText);
          entry.checks.noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
          entry.checks.hasMain = await page.evaluate(() => document.querySelectorAll('main').length > 0);
          entry.checks.hasH1 = await page.evaluate(() => document.querySelectorAll('h1').length > 0);
          await page.keyboard.press('Tab');
          entry.checks.keyboardFocus = await page.evaluate(() => document.activeElement !== document.body);
          const filename = name + '-' + (route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')) + '.png';
          await page.screenshot({ path: path.join(directory, filename), fullPage: true });
          entry.screenshot = filename;
        } catch (error) { entry.error = error.message.slice(0, 300); }
        entry.failures = failures.slice(first);
        entry.checks.noFailureEvents = entry.failures.length === 0;
        entry.pass = !entry.error && Object.values(entry.checks).every(Boolean);
        report.pages.push(entry);
        fs.writeFileSync(path.join(directory, 'browser-readonly.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify({ viewport: name, route, status: entry.status, checks: entry.checks, failures: entry.failures.length, error: entry.error }));
        if (entry.checks.noDeploymentAuthentication === false || entry.checks.expectedOrigin === false) {
          report.errors.push('DEPLOYMENT_AUTHENTICATION_OR_UNEXPECTED_ORIGIN: protected login pages do not certify the storefront');
          return;
        }
      }
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { report.errors.push(error.message); process.exitCode = 1; })
  .finally(() => {
    report.finishedAt = new Date().toISOString();
    report.pass = report.errors.length === 0 && report.pages.length === expectedPages &&
      report.pages.every(entry => entry.pass && entry.failures.length === 0);
    report.totals = { expectedPages, executedPages: report.pages.length,
      passedPages: report.pages.filter(entry => entry.pass).length,
      failedPages: report.pages.filter(entry => !entry.pass).length,
      unexecutedPages: expectedPages - report.pages.length, topLevelErrors: report.errors.length };
    if (!report.pass) process.exitCode = 1;
    report.status = report.pass ? 'PASSED' : 'FAILED';
    fs.writeFileSync(path.join(directory, 'browser-readonly.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ complete: true, pass: report.pass, pages: report.pages.length, errors: report.errors }));
  });
