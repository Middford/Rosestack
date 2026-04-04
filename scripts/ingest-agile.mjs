// Quick script to ingest historical Agile rates into Railway PostgreSQL
// Run: node scripts/ingest-agile.mjs

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway';
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const PRODUCTS = [
  { code: 'AGILE-24-10-01', type: 'import', priority: 1, desc: 'Current import (Oct 2024+)' },
  { code: 'AGILE-FLEX-22-11-25', type: 'import', priority: 2, desc: 'Previous import (2022-2024)' },
  { code: 'AGILE-18-02-21', type: 'import', priority: 3, desc: 'Original import (2018-2022)' },
  { code: 'AGILE-OUTGOING-19-05-13', type: 'export', priority: 1, desc: 'Export (2019+)' },
];

const PAGE_SIZE = 1500;

function buildUrl(product) {
  const tariff = `E-1R-${product.code}-N`;
  return `https://api.octopus.energy/v1/products/${product.code}/electricity-tariffs/${tariff}/standard-unit-rates/`;
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function ingestProduct(product) {
  console.log(`\n📥 Ingesting ${product.code} (${product.desc})...`);
  const baseUrl = `${buildUrl(product)}?page_size=${PAGE_SIZE}`;
  let url = baseUrl;
  let totalFetched = 0;
  let totalInserted = 0;
  let page = 0;

  while (url) {
    const data = await fetchPage(url);
    page++;
    const batch = data.results.map(r => ({
      type: product.type,
      product_code: product.code,
      valid_from: r.valid_from,
      valid_to: r.valid_to,
      value_inc_vat: Math.round(r.value_inc_vat * 100) / 100,
      region: 'N',
    }));

    totalFetched += batch.length;

    if (batch.length > 0) {
      const result = await sql`
        INSERT INTO agile_rates (type, product_code, valid_from, valid_to, value_inc_vat, region)
        SELECT * FROM ${sql(batch.map(b => [b.type, b.product_code, b.valid_from, b.valid_to, b.value_inc_vat, b.region]))}
        ON CONFLICT (type, valid_from, region) DO NOTHING
      `.catch(async () => {
        // Fallback: insert one by one
        let inserted = 0;
        for (const b of batch) {
          try {
            await sql`
              INSERT INTO agile_rates (type, product_code, valid_from, valid_to, value_inc_vat, region)
              VALUES (${b.type}, ${b.product_code}, ${b.valid_from}, ${b.valid_to}, ${b.value_inc_vat}, ${b.region})
              ON CONFLICT (type, valid_from, region) DO NOTHING
            `;
            inserted++;
          } catch {}
        }
        return { count: inserted };
      });

      totalInserted += (result?.count || batch.length);
    }

    process.stdout.write(`  Page ${page}: ${totalFetched} slots fetched\r`);

    url = data.next;
    if (url) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`  ✅ ${product.code}: ${totalFetched} fetched, inserted into DB`);
  return totalFetched;
}

async function main() {
  console.log('🔌 Connected to Railway PostgreSQL');

  // Check current state
  const [{ cnt }] = await sql`SELECT COUNT(*)::int as cnt FROM agile_rates`;
  console.log(`📊 Current rows in agile_rates: ${cnt}`);

  // Sort by priority (highest priority = lowest number = ingested first to win dedup)
  const sorted = [...PRODUCTS].sort((a, b) => a.priority - b.priority);

  let grandTotal = 0;
  for (const product of sorted) {
    const count = await ingestProduct(product);
    grandTotal += count;
  }

  // Final count
  const [{ cnt: finalCnt }] = await sql`SELECT COUNT(*)::int as cnt FROM agile_rates`;
  const [importStats] = await sql`SELECT COUNT(*)::int as cnt, MIN(valid_from) as earliest, MAX(valid_from) as latest FROM agile_rates WHERE type = 'import'`;
  const [exportStats] = await sql`SELECT COUNT(*)::int as cnt, MIN(valid_from) as earliest, MAX(valid_from) as latest FROM agile_rates WHERE type = 'export'`;

  console.log(`\n📊 FINAL STATE:`);
  console.log(`  Total rows: ${finalCnt}`);
  console.log(`  Import: ${importStats.cnt} slots (${importStats.earliest?.slice(0,10)} → ${importStats.latest?.slice(0,10)})`);
  console.log(`  Export: ${exportStats.cnt} slots (${exportStats.earliest?.slice(0,10)} → ${exportStats.latest?.slice(0,10)})`);

  await sql.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
