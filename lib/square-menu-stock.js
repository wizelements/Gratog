import { readSquareLiveInventory, inventoryForVariation } from './square-live-inventory';

export const CURRENT_MENU = Object.freeze([
  { slug: 'calm-waters', name: 'Calm Waters', aliases: ['calm waters'], kind: 'lemonade' },
  { slug: 'supplemint', name: 'SuppleMint', aliases: ['supplemint', 'supple mint'], kind: 'lemonade' },
  { slug: 'gracious-roots', name: 'Gracious Roots', aliases: ['gracious roots'], kind: 'lemonade' },
  { slug: 'kissed-by-gods', name: 'Kissed by Gods', aliases: ['kissed by gods'], kind: 'lemonade' },
  { slug: 'melon-rita', name: 'Melon Rita', aliases: ['melon rita'], kind: 'lemonade' },
  { slug: 'passion-guava-pineapple', name: 'Passion Guava Pineapple Lemonade',
    aliases: ['passion guava pineapple lemonade', 'passion fruit guava pineapple lemon', 'passion fruit guava pineapple lemonade'], kind: 'lemonade' },
  { slug: 'soursop-chai-gel', name: 'Soursop Chai Gel',
    aliases: ['soursop chai gel', 'soursop chai sea moss gel', 'soursop chai'], kind: 'gel' },
]);
export const RETIRED_MENU_ALIASES = Object.freeze([
  'healing harmony', 'healing harmony sea moss gel', 'soursop spice sea moss gel',
  'black minerals', 'black minerals lemonade', 'peach lemonade',
]);
const norm = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function readCatalog(env, fetcher) {
  const token = String(env.SQUARE_ACCESS_TOKEN || '').trim();
  const base = env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
  if (!token || !env.SQUARE_LOCATION_ID || !['production', 'sandbox'].includes(env.SQUARE_ENVIRONMENT)) {
    throw new Error('SQUARE_CONFIGURATION_REQUIRED');
  }
  const items = [];
  const seen = new Set();
  let cursor = null;
  for (let i = 0; i < 40; i++) {
    const url = base + '/v2/catalog/list?types=ITEM' +
      (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
    const response = await fetcher(url, {headers:{
      Authorization: 'Bearer ' + token, 'Square-Version': '2026-09-16',
    }, cache:'no-store'});
    if (!response.ok) throw new Error('SQUARE_CATALOG_READ_FAILED');
    const page = await response.json();
    items.push(...(page.objects || []).filter(item => item.type === 'ITEM' && !item.is_deleted));
    cursor = page.cursor || null;
    if (!cursor) return items;
    if (seen.has(cursor)) throw new Error('SQUARE_CATALOG_PAGINATION_ERROR');
    seen.add(cursor);
  }
  throw new Error('SQUARE_CATALOG_PAGINATION_ERROR');
}
function findSixteenOunceVariation(item) {
  const vars = (item?.item_data?.variations || []).filter(v => v?.id && !v?.is_deleted);
  const sixteen = vars.filter(v => /^(16\\s*oz|16\\s*ounce|16oz\\s*(bottle|jar))/i
    .test(String(v.item_variation_data?.name || '').trim()));
  if (sixteen.length === 1) return sixteen[0];
  if (vars.length === 1 && sixteen.length === 0) return vars[0];
  return null;
}

/** Read-only report: count=null means unknown, NOT zero. No stock writes. */
export async function readApprovedSquareMenuStock(options = {}) {
  const env = options.env || process.env;
  const fetcher = options.fetcher || fetch;
  const catalog = await readCatalog(env, fetcher);
  const report = CURRENT_MENU.map(target => {
    const found = catalog.filter(item => target.aliases.includes(norm(item.item_data?.name)));
    if (found.length !== 1) return {
      slug:target.slug, name:target.name, kind:target.kind,
      status:found.length ? 'duplicate' : 'missing', itemId:null,
      variationId:null, onHand:null, countStatus:'unknown',
    };
    const item = found[0];
    const variation = findSixteenOunceVariation(item);
    return {
      slug:target.slug, name:target.name, kind:target.kind,
      status:item.item_data?.is_archived ? 'archived' : variation ? 'found' : 'ambiguous_variation',
      itemId:item.id, variationId:variation?.id || null,
      variationName:variation?.item_variation_data?.name || null,
      onHand:null, countStatus:'unknown',
    };
  });
  const ids = report.map(row => row.variationId).filter(Boolean);
  const counts = await readSquareLiveInventory(ids, {env,fetcher});
  for (const row of report) {
    const squareVar = catalog.flatMap(item => item.item_data?.variations || [])
      .find(variation => variation.id === row.variationId);
    const converted = squareVar && {
      id: squareVar.id,
      itemVariationData: {trackInventory: squareVar.item_variation_data?.track_inventory},
    };
    const status = inventoryForVariation(counts,converted);
    row.onHand = status.quantity;
    row.countStatus = status.countStatus;
    row.calculatedAt = status.calculatedAt || null;
    if (row.status === 'found' && status.countStatus !== 'reported') row.status = 'unverified';
  }
  const retired = catalog.filter(item =>
    RETIRED_MENU_ALIASES.includes(norm(item.item_data?.name)))
    .map(item => ({
      name:item.item_data.name, itemId:item.id,
      archived:item.item_data?.is_archived === true,
    }));
  return {
    environment:env.SQUARE_ENVIRONMENT, locationId:env.SQUARE_LOCATION_ID,
    checkedAt:new Date().toISOString(), report, retired,
    fullyVerified:report.every(row => row.status === 'found' && row.countStatus === 'reported'),
  };
}
