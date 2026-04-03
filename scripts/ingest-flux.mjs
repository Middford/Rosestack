// Ingest all historical Flux rates into Railway DB
// Flux uses time-of-use bands (not half-hourly like Agile)
// We store each band period as a row in a new flux_rates table
// or reuse agile_rates with product_code prefix

import postgres from 'postgres';

const DB = 'postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway';
const sql = postgres(DB, { ssl: 'require' });

const PRODUCTS = [
  { code: 'FLUX-IMPORT-23-02-14', type: 'import', region: 'N' },
  { code: 'FLUX-EXPORT-23-02-14', type: 'export', region: 'N' },
];

const PAGE_SIZE = 1500;

async function ingestProduct(product) {
  console.log(`\nIngesting ${product.code} (${product.type})...`);
  const tariff = `E-1R-${product.code}-${product.region}`;
  let url = `https://api.octopus.energy/v1/products/${product.code}/electricity-tariffs/${tariff}/standard-unit-rates/?page_size=${PAGE_SIZE}`;
  let totalFetched = 0, totalInserted = 0, page = 0;

  while (url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    page++;

    for (const r of data.results) {
      try {
        await sql`
          INSERT INTO agile_rates (type, product_code, valid_from, valid_to, value_inc_vat, region)
          VALUES (${product.type}, ${product.code}, ${r.valid_from}, ${r.valid_to}, ${Math.round(r.value_inc_vat * 100) / 100}, ${product.region})
          ON CONFLICT (type, valid_from, region) DO UPDATE SET
            value_inc_vat = ${Math.round(r.value_inc_vat * 100) / 100},
            product_code = ${product.code}
        `;
        totalInserted++;
      } catch (e) {
        // Flux bands overlap with Agile half-hourly on the same valid_from
        // Use DO UPDATE to overwrite with Flux data when needed
      }
      totalFetched++;
    }

    process.stdout.write(`  Page ${page}: ${totalFetched} entries\r`);
    url = data.next;
    if (url) await new Promise(r => setTimeout(r, 200));
  }

  console.log(`  Done: ${totalFetched} fetched, ${totalInserted} inserted/updated`);
  return { totalFetched, totalInserted };
}

async function main() {
  console.log('Ingesting Flux rates from Octopus API...');

  // First, let's create a dedicated table for Flux rates since they're banded not half-hourly
  await sql`
    CREATE TABLE IF NOT EXISTS flux_rates (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      type VARCHAR(10) NOT NULL,
      product_code VARCHAR(50),
      valid_from VARCHAR(30) NOT NULL,
      valid_to VARCHAR(30),
      value_inc_vat REAL NOT NULL,
      region VARCHAR(5) DEFAULT 'N' NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(type, valid_from, region)
    )
  `;
  console.log('Created flux_rates table');

  for (const product of PRODUCTS) {
    const tariff = `E-1R-${product.code}-${product.region}`;
    let url = `https://api.octopus.energy/v1/products/${product.code}/electricity-tariffs/${tariff}/standard-unit-rates/?page_size=${PAGE_SIZE}`;
    let totalFetched = 0, page = 0;

    while (url) {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      page++;

      for (const r of data.results) {
        await sql`
          INSERT INTO flux_rates (type, product_code, valid_from, valid_to, value_inc_vat, region)
          VALUES (${product.type}, ${product.code}, ${r.valid_from}, ${r.valid_to || null}, ${Math.round(r.value_inc_vat * 100) / 100}, ${product.region})
          ON CONFLICT (type, valid_from, region) DO UPDATE SET
            value_inc_vat = EXCLUDED.value_inc_vat,
            valid_to = EXCLUDED.valid_to,
            product_code = EXCLUDED.product_code
        `;
        totalFetched++;
      }

      process.stdout.write(`  Page ${page}: ${totalFetched} entries\r`);
      url = data.next;
      if (url) await new Promise(r => setTimeout(r, 200));
    }
    console.log(`  ${product.code}: ${totalFetched} entries`);
  }

  // Show what we have
  const impStats = await sql`
    SELECT COUNT(*)::int as cnt, MIN(valid_from) as earliest, MAX(valid_from) as latest
    FROM flux_rates WHERE type = 'import'
  `;
  const expStats = await sql`
    SELECT COUNT(*)::int as cnt, MIN(valid_from) as earliest, MAX(valid_from) as latest
    FROM flux_rates WHERE type = 'export'
  `;
  console.log(`\nFLUX RATES IN DB:`);
  console.log(`  Import: ${impStats[0].cnt} entries (${impStats[0].earliest?.slice(0,10)} -> ${impStats[0].latest?.slice(0,10)})`);
  console.log(`  Export: ${expStats[0].cnt} entries (${expStats[0].earliest?.slice(0,10)} -> ${expStats[0].latest?.slice(0,10)})`);

  // Show rate trend
  console.log(`\nRATE TREND (quarterly):`);
  const trend = await sql`
    WITH imp AS (
      SELECT
        DATE_TRUNC('quarter', TO_TIMESTAMP(valid_from, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::date as q,
        MIN(value_inc_vat) as off_peak,
        MAX(value_inc_vat) as peak,
        ROUND(AVG(value_inc_vat)::numeric, 2) as avg_rate
      FROM flux_rates WHERE type = 'import'
      GROUP BY q ORDER BY q
    ),
    exp AS (
      SELECT
        DATE_TRUNC('quarter', TO_TIMESTAMP(valid_from, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))::date as q,
        MIN(value_inc_vat) as off_peak,
        MAX(value_inc_vat) as peak,
        ROUND(AVG(value_inc_vat)::numeric, 2) as avg_rate
      FROM flux_rates WHERE type = 'export'
      GROUP BY q ORDER BY q
    )
    SELECT i.q, i.off_peak as imp_offpk, i.peak as imp_peak, i.avg_rate as imp_avg,
           e.off_peak as exp_offpk, e.peak as exp_peak, e.avg_rate as exp_avg,
           ROUND((e.peak - i.off_peak)::numeric, 2) as spread
    FROM imp i JOIN exp e ON i.q = e.q
    ORDER BY i.q
  `;

  console.log('Quarter     Imp Off-pk  Imp Peak  Imp Avg   Exp Off-pk  Exp Peak  Exp Avg   Spread');
  for (const r of trend) {
    console.log(
      String(r.q).slice(0,10).padEnd(12) +
      (r.imp_offpk + 'p').padStart(8) + '  ' +
      (r.imp_peak + 'p').padStart(8) + '  ' +
      (r.imp_avg + 'p').padStart(7) + '   ' +
      (r.exp_offpk + 'p').padStart(8) + '    ' +
      (r.exp_peak + 'p').padStart(7) + '  ' +
      (r.exp_avg + 'p').padStart(7) + '   ' +
      (r.spread + 'p').padStart(7)
    );
  }

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
