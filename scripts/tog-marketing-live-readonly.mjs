#!/usr/bin/env node
/**
 * Taste of Gratitude marketing truth watch.
 * GET-only public checks, no credentials, customer records, marketing sends,
 * commerce mutations, automatic production deploys or inferred certification.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ORIGIN = 'https://tasteofgratitude.shop';
export const ROUTES = Object.freeze(['/api/markets', '/markets', '/m/serenbe', '/weekly-menu', '/about']);

async function readPublic(path, fetcher) {
  const response = await fetcher(ORIGIN + path, {
    method: 'GET',
    redirect: 'follow',
    headers: { Accept: path.startsWith('/api/') ? 'application/json' : 'text/html' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const body = await response.text();
  if (body.length > 900000) throw new Error('UNEXPECTED_RESPONSE_SIZE');
  return body;
}

export async function auditMarketingSite(fetcher = globalThis.fetch, clock = () => new Date()) {
  const checks = [];
  const capture = (id, passed, note) => checks.push({ id, passed: Boolean(passed), note });
  const resources = {};
  for (const path of ROUTES) {
    try {
      resources[path] = await readPublic(path, fetcher);
      capture(`http_${path.replace(/[^a-z0-9]/gi, '_')}`, true, 'Public GET returned HTTP 2xx');
    } catch (error) {
      resources[path] = null;
      capture(`http_${path.replace(/[^a-z0-9]/gi, '_')}`, false,
        'Public GET failed: ' + (error instanceof Error ? error.message : 'unknown'));
    }
  }

  try {
    const marketFeed = JSON.parse(resources['/api/markets'] || '{}');
    const active = Array.isArray(marketFeed.markets) ? marketFeed.markets : [];
    capture('single_active_market', marketFeed.count === 1 && active.length === 1 && active[0]?.id === 'serenbe',
      'Only Serenbe is currently offered for public market pickup');
    capture('approved_serenbe_window', active[0]?.hours === '09:00-12:00' && active[0]?.isActive === true,
      'Public API shows Saturday Serenbe pickup 9:00 AM–noon');
  } catch {
    capture('single_active_market', false, 'Market feed JSON could not be validated');
    capture('approved_serenbe_window', false, 'Market hours could not be validated');
  }

  const marketHtml = resources['/markets'] || '';
  capture('market_page_hours', /9:00 AM.{0,24}12:00 PM/s.test(marketHtml), 'Market page shows the approved noon end');
  const qrHtml = resources['/m/serenbe'] || '';
  capture('first_sip_visible', qrHtml.includes('Find a flavor to ask about'), 'First Sip is discoverable on Serenbe QR page');
  capture('allergy_guard_visible', qrHtml.includes('does not guarantee allergy safety'), 'Ingredient matching is not advertised as allergy-safe');
  capture('booth_checkout_only', qrHtml.includes('Nothing here is an online order'), 'QR menu explicitly remains informational');
  capture('approved_menu_price', qrHtml.includes('Kissed by Gods') && qrHtml.includes('11.99'), 'QR menu includes approved lemonade price');
  const weeklyHtml = resources['/weekly-menu'] || '';
  capture('weekly_menu_available', weeklyHtml.includes('Kissed by Gods'), 'Weekly menu contains current lemonade flavor');
  capture('founder_story', /Ted.s Gym/i.test(resources['/about'] || ''), 'Founder story retains Ted’s Gym origin');

  const failed = checks.filter(check => !check.passed).map(check => check.id);
  return {
    kind: 'tog_marketing_live_readonly',
    auditedAt: clock().toISOString(),
    origin: ORIGIN,
    result: failed.length === 0 ? 'PASS' : 'FAIL',
    checked: checks.length,
    passed: checks.length - failed.length,
    failed,
    checks,
    certified: false,
    certificationMeaning: 'Public GET checks are not evidence of payment, inventory, consent, deliverability, webhook or Grokbot routine certification.',
  };
}

async function main() {
  const report = await auditMarketingSite();
  await mkdir('test-results', { recursive: true });
  await writeFile('test-results/marketing-live-readonly.json', JSON.stringify(report, null, 2) + '\n');
  console.log(`TOG_MARKETING_LIVE_RESULT=${report.result} PASSED=${report.passed}/${report.checked} CERTIFIED=false`);
  if (report.failed.length) console.log('FAILED_CHECKS=' + report.failed.join(','));
  process.exitCode = report.result === 'PASS' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('Audit could not complete:', error instanceof Error ? error.message : 'unknown');
    process.exitCode = 1;
  });
}
