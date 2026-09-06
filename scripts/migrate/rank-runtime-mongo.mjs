import { readFile } from 'node:fs/promises';

const report = JSON.parse(await readFile(new URL('../../migration-artifacts/runtime-mongo-paths.json', import.meta.url), 'utf8'));
const rows = report.paths ?? report.operations ?? report;
const groups = new Map();

for (const row of rows) {
  const key = row.file;
  const value = groups.get(key) ?? { file: key, total: 0, reads: 0, writes: 0, dynamic: 0 };
  value.total += 1;
  if (row.mode === 'READ') value.reads += 1;
  if (row.mode === 'WRITE') value.writes += 1;
  if (row.collection === 'DYNAMIC') value.dynamic += 1;
  groups.set(key, value);
}

const ranked = [...groups.values()].sort((a, b) => b.total - a.total);
const dynamicOnly = process.argv.includes('--dynamic');
console.log(JSON.stringify((dynamicOnly ? ranked.filter((row) => row.dynamic > 0) : ranked.slice(0, 30)), null, 2));
