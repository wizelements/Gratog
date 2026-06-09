#!/usr/bin/env node

/**
 * Upsert the June 8, 2026 Taste of Gratitude menu record.
 *
 * Safe default: dry-run only. Deploy the static assets first, then run:
 *   node scripts/upsert-menu080626.js --execute
 *
 * Optional overrides:
 *   MENU_PUBLIC_BASE_URL=https://tasteofgratitude.shop
 *   MENU_CANVA_URL=https://www.canva.com/design/...
 *   MENU_MARKET_ID=<market-id>
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');

for (const envFile of ['.env.local', '.env', '.env.production']) {
  const envPath = path.join(projectRoot, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const args = new Set(process.argv.slice(2));
const shouldExecute = args.has('--execute');
const baseUrl = normalizeBaseUrl(
  process.env.MENU_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://tasteofgratitude.shop'
);

const assetPaths = {
  source: path.join(projectRoot, 'public/images/menus/menu080626.png'),
  image: '/images/menus/menu080626.webp',
  thumbnail: '/images/menus/menu080626-thumb.webp',
  print: '/images/menus/menu080626.png',
};

const expectedSourceSha256 = '2cb16ba264da8bb147d14feafa48748894677be51ce80e5588fb9e3511ecb5f7';
const actualSourceSha256 = sha256File(assetPaths.source);

if (actualSourceSha256 !== expectedSourceSha256) {
  throw new Error(
    `Menu source asset checksum mismatch. Expected ${expectedSourceSha256}, got ${actualSourceSha256}`
  );
}

const canvaUrl = optionalUrl(process.env.MENU_CANVA_URL || '');
const menuDocument = {
  title: 'June 8, 2026 Market Menu',
  description:
    "This week's Taste of Gratitude menu featuring sea moss refreshers, sea moss gels, and market-made wellness favorites.",
  imageUrl: absoluteUrl(baseUrl, assetPaths.image),
  thumbnailUrl: absoluteUrl(baseUrl, assetPaths.thumbnail),
  canvaUrl,
  printUrl: absoluteUrl(baseUrl, assetPaths.print),
  marketId: process.env.MENU_MARKET_ID || '',
  weekStart: dateAtNoonUtc('2026-06-08'),
  weekEnd: dateAtNoonUtc('2026-06-14'),
  isActive: true,
  isArchived: false,
  linkedProducts: [],
  seasonalTags: ['weekly menu', 'sea moss refreshers', 'sea moss gel'],
};

async function main() {
  printPlan();

  if (!shouldExecute) {
    console.log('\nDry run only. Pass --execute after the menu assets are deployed.');
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to execute the menu upsert.');
  }

  const mongoTarget = describeMongoTarget(process.env.MONGODB_URI);
  console.log(`\nConnecting to MongoDB host=${mongoTarget.host} db=${mongoTarget.dbName}`);

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(process.env.DB_NAME || mongoTarget.dbName || undefined);
    const collection = db.collection('menus');
    const now = new Date();

    const upsertResult = await collection.findOneAndUpdate(
      { imageUrl: menuDocument.imageUrl },
      {
        $set: {
          ...menuDocument,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
      }
    );

    const menuId = upsertResult?._id;
    if (!menuId) {
      throw new Error('Menu upsert did not return a document id.');
    }

    await collection.updateMany(
      { _id: { $ne: menuId }, isActive: true },
      { $set: { isActive: false, updatedAt: now } }
    );

    await collection.updateOne(
      { _id: menuId },
      { $set: { isActive: true, updatedAt: now } }
    );

    console.log(`\nUpdated active menu: ${menuId.toString()}`);
    console.log('Verify: curl https://tasteofgratitude.shop/api/menus/current');
  } finally {
    await client.close();
  }
}

function printPlan() {
  const printable = {
    ...menuDocument,
    weekStart: menuDocument.weekStart.toISOString(),
    weekEnd: menuDocument.weekEnd.toISOString(),
    sourceSha256: actualSourceSha256,
  };

  console.log('Menu upsert plan:');
  console.log(JSON.stringify(printable, null, 2));
}

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required asset missing: ${path.relative(projectRoot, filePath)}`);
  }

  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  return parsed.origin;
}

function absoluteUrl(origin, pathname) {
  return new URL(pathname, origin).toString();
}

function optionalUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return new URL(trimmed).toString();
}

function dateAtNoonUtc(date) {
  return new Date(`${date}T12:00:00.000Z`);
}

function describeMongoTarget(uri) {
  const parsed = new URL(uri);
  return {
    host: parsed.host,
    dbName: parsed.pathname.replace(/^\//, ''),
  };
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
