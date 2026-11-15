#!/usr/bin/env node
/**
 * OPEE MAX — Taste of Gratitude evidence-first marketing operator.
 *
 * Public GETs only; outputs non-personal draft ideas, blocked prerequisites,
 * verification receipts and a value-first action queue. It NEVER emails,
 * posts, changes products, deploys, spends or reads customer/order records.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { auditMarketingSite } from './tog-marketing-live-readonly.mjs';

const REQUIRED_FACTS = [
  'single_active_market', 'approved_serenbe_window', 'market_page_hours',
  'first_sip_visible', 'allergy_guard_visible', 'booth_checkout_only',
  'approved_menu_price', 'founder_story',
];
const NEVER_AUTO = Object.freeze([
  'email', 'sms', 'dm', 'social_post', 'paid_ad', 'customer_import',
  'live_price_change', 'inventory_change', 'square_payment', 'production_deploy',
]);

export function buildOpeeGrowthBrief(audit, clock = () => new Date()) {
  if (!audit || audit.kind !== 'tog_marketing_live_readonly' ||
      !Array.isArray(audit.checks) || audit.certified !== false) {
    throw new Error('VERIFIED_PUBLIC_AUDIT_REQUIRED');
  }
  const checks = new Map(audit.checks.map(check => [check.id, check.passed === true]));
  const evidencePasses = audit.result === 'PASS' &&
    REQUIRED_FACTS.every(key => checks.get(key) === true);
  const missingTruth = REQUIRED_FACTS.filter(key => checks.get(key) !== true);
  const now = clock().toISOString();

  // A good promotional idea is never proof of stock, margin, consent or delivery.
  const opportunities = [
    {
      id: 'serenbe_first_sip',
      stage: 'acquire_in_person',
      priority: 1,
      strategy: 'Reduce choice overload with a brief, ingredient-led discovery experience at the market',
      nextSafeAction: evidencePasses
        ? 'Have a staff member show the existing First Sip QR page to willing visitors and tally anonymous scans/conversations on a paper sheet'
        : 'Restore approved public market facts and First Sip/QR disclaimers before directing new shoppers to the flow',
      dependencies: evidencePasses ? [] : missingTruth,
      measurement: ['anonymous_visitor_conversations', 'sampled_visitors', 'purchases_after_conversation'],
      state: evidencePasses ? 'READY_FOR_OWNER_MANUAL_PILOT' : 'BLOCKED',
      estimatedRevenue: null,
    },
    {
      id: 'price_and_inventory_truth',
      stage: 'protect_conversion',
      priority: 2,
      strategy: 'Prevent unavailable flavor promises, price differences and incorrect purchase expectations',
      nextSafeAction: 'Reconcile current approved site prices, real Square catalog/variants, batch stock, pickup capacity and one actual completed checkout receipt before claiming digital availability',
      dependencies: ['current_square_catalog_receipt', 'actual_stock_evidence', 'sandbox_checkout_webhook_refund_and_recovery_tests'],
      measurement: ['price_mismatches', 'unfulfilled_requests', 'failed_checkouts'],
      state: 'BLOCKED_PENDING_MERCHANT_EVIDENCE',
      estimatedRevenue: null,
    },
    {
      id: 'consent_safe_repeat_purchase',
      stage: 'retain',
      priority: 3,
      strategy: 'Build repeat purchase through helpful, specifically opted-in weekly updates',
      nextSafeAction: 'Independently verify signup, consent provenance, suppression, unsubscribe, Resend signed delivery/bounce/complaint webhook handling and Turso migration plan',
      dependencies: ['consent_ledger', 'provider_webhook_certification', 'suppression_negative_tests', 'approved_recipient_sample'],
      measurement: ['verified_opt_ins', 'eligible_repeat_buyers', 'suppression_errors'],
      state: 'BLOCKED_NO_SEND',
      estimatedRevenue: null,
    },
    {
      id: 'unit_economics_baseline',
      stage: 'measure_profit',
      priority: 4,
      strategy: 'Measure contribution profit and first-to-second purchase instead of guessing from clicks',
      nextSafeAction: 'Record merchant-approved aggregate weekly net sales, ingredient/packaging/payment/labor/market expenses, spoilage and repeat transactions; never import private customer data into public CI',
      dependencies: ['aggregate_margin_receipts', 'anonymized_repeat_purchase_definition'],
      measurement: ['contribution_profit', 'profit_per_market_hour', 'first_to_second_purchase_rate'],
      state: 'UNKNOWN_BASELINE',
      estimatedRevenue: null,
    },
  ];

  const copy = evidencePasses
    ? {
        id: 'serenbe_discovery_sample',
        status: 'DRAFT_OWNER_REVIEW_ONLY',
        channel: 'organic_social_or_market_signage',
        copy: 'Find your first sip at Taste of Gratitude. Visit our Serenbe booth Saturday, 9 a.m.–noon, to explore bright citrus, herbal and tropical lemonade flavors. Ask us what’s available today and about any ingredients or allergens.',
        safeguards: ['No scarcity claims', 'No medical claims', 'No promise of stock or digital checkout', 'No unverifiable testimonials'],
        publicationAuthorized: false,
      }
    : null;

  return {
    system: 'OPEE_MAX_TOG_MARKETING_OPERATOR',
    executedAt: now,
    auditAt: audit.auditedAt,
    evidence: {
      origin: audit.origin,
      auditResult: audit.result,
      checksPassed: audit.passed,
      checksTotal: audit.checked,
      missingTruth,
    },
    state: evidencePasses ? 'SAFE_OWNER_REVIEW_READY' : 'STOP_PUBLIC_TRUTH_FAILED',
    successCondition: 'Verified incremental contribution profit and satisfied repeat purchases, without consent, pricing or availability violations',
    metrics: {
      contributionProfit: null,
      contributionProfitPerMarketHour: null,
      thirtyDayRepeatCustomerRate: null,
      acquisitionCost: null,
      paidOrdersFromMarketing: null,
      status: 'UNKNOWN_NO_PRIVATE_COMMERCE_EXPORT',
    },
    actions: opportunities,
    draft: copy,
    permissions: {
      publicGetOnly: true,
      automatedCustomerCommunication: false,
      automatedPublication: false,
      automatedPaidSpend: false,
      automatedLiveCommerceChanges: false,
      disallowedActions: NEVER_AUTO,
    },
    independentCertification: false,
    certificationNote: 'Public website and CI checks do not prove Square transactions, merchant margins, marketing consent, Resend delivery or device-based OPEE dispatch.',
  };
}

export function growthBriefMarkdown(brief) {
  const lines = [
    '# OPEE MAX — Taste of Gratitude marketing execution brief',
    '',
    `**Observed:** ${brief.executedAt}`,
    `**Status:** ${brief.state}`,
    `**Public evidence:** ${brief.evidence.auditResult}; ${brief.evidence.checksPassed}/${brief.evidence.checksTotal} checks`,
    '**Independent commerce and campaign certification:** NOT ESTABLISHED',
    '',
    '## Business success',
    brief.successCondition,
    '',
    '## Next revenue actions (ranked; no fabricated ROI)',
  ];
  for (const item of brief.actions) {
    lines.push('', `### ${item.priority}. ${item.id} — ${item.state}`,
      item.strategy, `**Next safe action:** ${item.nextSafeAction}`,
      `**Evidence needed:** ${item.dependencies.join(', ') || 'public market audit only'}`,
      `**Measure:** ${item.measurement.join(', ')}`);
  }
  lines.push('', '## Organic copy — unapproved draft',
    brief.draft?.copy || 'Held because public truth verification failed.',
    '', '## Fail-closed boundaries',
    'No automated emails, texts, posts, paid ads, Square actions, customer-list exports, price/stock changes or production deployments.',
    'No contribution profit or repeat-rate estimates until merchant-backed aggregate evidence exists.',
    '');
  return lines.join('\n');
}

export async function loadCurrentPublicAudit(file, clock = () => new Date()) {
  const content = await readFile(file, 'utf8');
  const audit = JSON.parse(content);
  const at = Date.parse(audit?.auditedAt || '');
  const ageMs = clock().getTime() - at;
  if (!Number.isFinite(at) || ageMs < 0 || ageMs > 10 * 60 * 1000) {
    throw new Error('STALE_PUBLIC_AUDIT');
  }
  return audit;
}

async function main() {
  const fromFile = process.argv[2] === '--audit-file' ? process.argv[3] : null;
  const audit = fromFile ? await loadCurrentPublicAudit(fromFile) : await auditMarketingSite();
  const brief = buildOpeeGrowthBrief(audit);
  await mkdir('test-results', { recursive: true });
  await Promise.all([
    writeFile('test-results/opee-tog-growth-brief.json', JSON.stringify(brief, null, 2) + '\n'),
    writeFile('test-results/opee-tog-growth-brief.md', growthBriefMarkdown(brief)),
  ]);
  console.log(`OPEE_GROWTH_STATE=${brief.state} CHECKS=${brief.evidence.checksPassed}/${brief.evidence.checksTotal} COMMUNICATIONS_SENT=0 CERTIFIED=false`);
  process.exitCode = brief.state === 'SAFE_OWNER_REVIEW_READY' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('OPEE marketing operator failed closed:', error instanceof Error ? error.message : 'unknown');
    process.exitCode = 1;
  });
}
