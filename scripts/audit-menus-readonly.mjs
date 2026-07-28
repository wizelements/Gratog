import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME || 'taste_of_gratitude';

if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });

function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday.toISOString(), weekEnd: sunday.toISOString() };
}

function fmt(d) {
  if (!d) return null;
  return new Date(d).toISOString();
}

function sameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

try {
  await client.connect();
  const db = client.db(dbName);
  const menus = db.collection('menus');

  const all = await menus.find({}).sort({ weekStart: -1 }).toArray();
  const codeRange = getCurrentWeekRange();
  const now = new Date().toISOString();

  const discrepancies = [];
  const mappedMenus = all.map((m) => {
    const rec = {
      _id: m._id.toString(),
      title: m.title,
      isActive: !!m.isActive,
      isArchived: !!m.isArchived,
      marketId: m.marketId || null,
      weekStartDb: fmt(m.weekStart),
      weekEndDb: fmt(m.weekEnd),
      createdAt: fmt(m.createdAt),
      updatedAt: fmt(m.updatedAt),
      linkedProducts: Array.isArray(m.linkedProducts) ? m.linkedProducts.length : 0,
    };

    const issues = [];
    if (m.isActive && !sameDay(m.weekStart, codeRange.weekStart)) {
      issues.push(`active menu weekStart (${rec.weekStartDb}) does not match code current Monday (${codeRange.weekStart})`);
    }
    if (m.isActive && !sameDay(m.weekEnd, codeRange.weekEnd)) {
      issues.push(`active menu weekEnd (${rec.weekEndDb}) does not match code current Sunday (${codeRange.weekEnd})`);
    }
    if (m.isActive && m.isArchived) {
      issues.push('menu is both active and archived');
    }
    if (!m.weekStart || !m.weekEnd) {
      issues.push('missing weekStart or weekEnd');
    }
    if (issues.length) {
      discrepancies.push({ id: rec._id, title: rec.title, issues });
    }
    return rec;
  });

  const totalMenus = all.length;
  const activeMenus = all.filter((m) => m.isActive).length;
  const archivedMenus = all.filter((m) => m.isArchived).length;

  const outPath = join(__dirname, '..', 'TOG-MONGODB-VERIFICATION-2026-07-28.md');
  writeFileSync(outPath, `# MongoDB Menus Verification Report

**Generated:** ${now}
**Database:** ${dbName}
**Collection:** menus
**Read-only audit:** yes

## Code-derived current week range

- weekStart: \`${codeRange.weekStart}\`
- weekEnd: \`${codeRange.weekEnd}\`

## Collection summary

- Total menus: **${totalMenus}**
- Active menus: **${activeMenus}**
- Archived menus: **${archivedMenus}**

## Discrepancies

${discrepancies.length === 0 ? 'No discrepancies found.' : discrepancies.map(d => `- **${d.title}** (\`${d.id}\`)\n${d.issues.map(i => `  - ${i}`).join('\n')}`).join('\n\n')}

## All menus (most recent first)

| Title | Active | Archived | weekStart (DB) | weekEnd (DB) | marketId | Linked products |
|-------|--------|----------|----------------|--------------|----------|-----------------|
${mappedMenus.map(m => `| ${m.title} | ${m.isActive ? '✅' : '—'} | ${m.isArchived ? '📦' : '—'} | ${m.weekStartDb} | ${m.weekEndDb} | ${m.marketId || '—'} | ${m.linkedProducts} |`).join('\n')}

## Proposed fixes

${discrepancies.length === 0 ? 'No fixes required.' : 'See discrepancies above. If authorized, update the active menu document(s) so `weekStart` and `weekEnd` match the code-derived current week range, and ensure only one menu is active at a time.'}
`);

  console.log(`Report written to ${outPath}`);
  console.log(`Total menus: ${totalMenus}, Active: ${activeMenus}, Discrepancies: ${discrepancies.length}`);
} catch (err) {
  console.error('Audit failed:', err.message);
  process.exit(1);
} finally {
  await client.close();
}
