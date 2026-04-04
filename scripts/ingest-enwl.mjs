// ============================================================
// ENWL Open Data Ingestion Script
//
// Pulls 4 key datasets from electricitynorthwest.opendatasoft.com:
// 1. Substation hierarchy (41,868 records)
// 2. 11kV network capacity (111,015 records)
// 3. MCS LCT per substation (13,996 records)
// 4. Flexibility procurement tenders (476 records)
//
// Usage: DATABASE_URL=... ENWL_API_KEY=... node scripts/ingest-enwl.mjs
// ============================================================

import postgres from 'postgres';

const ENWL_API = 'https://electricitynorthwest.opendatasoft.com/api/explore/v2.1';
const API_KEY = process.env.ENWL_API_KEY;
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

if (!API_KEY) {
  console.error('ENWL_API_KEY environment variable required');
  process.exit(1);
}

const headers = { Authorization: `Apikey ${API_KEY}` };

async function fetchAllRecords(datasetId, pageSize = 100) {
  const records = [];
  let offset = 0;
  let total = null;

  while (total === null || offset < total) {
    const url = `${ENWL_API}/catalog/datasets/${datasetId}/records?limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`  ERROR ${res.status} at offset ${offset}`);
      break;
    }
    const data = await res.json();
    if (total === null) total = data.total_count;
    const batch = data.results || [];
    records.push(...batch);
    offset += batch.length;
    if (batch.length === 0) break;
    if (offset % 1000 === 0 || offset >= total) {
      process.stdout.write(`\r  ${offset}/${total} records fetched`);
    }
  }
  console.log(`\r  ${records.length}/${total} records fetched — done`);
  return records;
}

// ── 1. Substation Hierarchy ──────────────────────────────────
async function ingestSubstations() {
  console.log('\n1. Substation Hierarchy...');
  const records = await fetchAllRecords('sp-enw-substation-hierarchy', 100);

  // Clear existing
  await sql`DELETE FROM enwl_substations`;

  // Batch insert
  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize).map(r => ({
      substation_number: r.substation_number || '',
      substation_group: r.substation_group || 'UNKNOWN',
      infeed: r.infeed || null,
      outfeed: r.outfeed || null,
      area: r.area || null,
      primary_feeder: r.primary_feeder || null,
      primary_number_alias: r.primary_number_alias || null,
      bsp_number_alias: r.bsp_number_alias || null,
      latitude: r.geopoint?.lat ?? null,
      longitude: r.geopoint?.lon ?? null,
    }));
    await sql`INSERT INTO enwl_substations ${sql(batch, 'substation_number', 'substation_group', 'infeed', 'outfeed', 'area', 'primary_feeder', 'primary_number_alias', 'bsp_number_alias', 'latitude', 'longitude')}`;
    inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} substations`);
}

// ── 2. 11kV Network Capacity ─────────────────────────────────
async function ingestCapacity() {
  console.log('\n2. 11kV Network Capacity...');
  const records = await fetchAllRecords('sp-enw-capacity-11kv-network', 100);

  await sql`DELETE FROM enwl_capacity`;

  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize).map(r => ({
      section_feature_id: r.section_feature_id || '',
      section_voltage: r.section_voltage_kv || null,
      section_circuit_category: r.section_circuit_category || null,
      firm_capacity_kva: parseFloat(r.section_firm_capacity_kva) || null,
      estimated_max_load_kva: parseFloat(r.section_estimated_max_load_kva) || null,
      headroom_kva: parseFloat(r.section_headroom_kva) || null,
      load_utilisation: parseFloat(r.section_load_utilisation) || null,
      load_utilisation_category: r.section_load_utilisation_category || null,
      latitude: r.geo_point_2d?.lat ?? null,
      longitude: r.geo_point_2d?.lon ?? null,
    }));
    await sql`INSERT INTO enwl_capacity ${sql(batch, 'section_feature_id', 'section_voltage', 'section_circuit_category', 'firm_capacity_kva', 'estimated_max_load_kva', 'headroom_kva', 'load_utilisation', 'load_utilisation_category', 'latitude', 'longitude')}`;
    inserted += batch.length;
    if (inserted % 5000 === 0) process.stdout.write(`\r  ${inserted} inserted`);
  }
  console.log(`\r  Inserted ${inserted} capacity records`);
}

// ── 3. MCS LCT per Substation ────────────────────────────────
async function ingestLct() {
  console.log('\n3. MCS LCT per Substation...');
  const records = await fetchAllRecords('mcs-lct-per-enwl-substation', 100);

  await sql`DELETE FROM enwl_lct`;

  const batchSize = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize).map(r => ({
      distribution_substation: r.distribution_substation || '',
      total_customers: r.total_customers ?? null,
      solar_installations: r.solar_photovoltaic_spv_installations ?? null,
      solar_capacity_kw: r.spv_installed_capacity_sum_kw ?? null,
      battery_installations: r.total_battery_installations ?? null,
      battery_capacity_kwh: r.total_battery_storage_nominal_storage_capacity_kwh ?? null,
      heat_pump_installations: r.total_heat_pump_installations ?? null,
      heat_pump_capacity_kw: r.total_heat_pump_installed_capacity_kw ?? null,
      total_lct_installations: r.total_lct_generation_installations ?? null,
      total_lct_capacity_kw: r.total_lct_generation_installed_capacity_kw ?? null,
      latitude: r.geopoint?.lat ?? null,
      longitude: r.geopoint?.lon ?? null,
    }));
    await sql`INSERT INTO enwl_lct ${sql(batch, 'distribution_substation', 'total_customers', 'solar_installations', 'solar_capacity_kw', 'battery_installations', 'battery_capacity_kwh', 'heat_pump_installations', 'heat_pump_capacity_kw', 'total_lct_installations', 'total_lct_capacity_kw', 'latitude', 'longitude')}`;
    inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} LCT records`);
}

// ── 4. Flexibility Procurement Tenders ───────────────────────
async function ingestFlexTenders() {
  console.log('\n4. Flexibility Procurement Tenders...');
  const records = await fetchAllRecords('slc31e-procurement-march-2026', 100);

  await sql`DELETE FROM enwl_flex_tenders`;

  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize).map(r => ({
      tender_reference: r.tender_reference || null,
      product: r.product || null,
      constraint_management_zone: r.constraint_management_zone_name || null,
      service_provider: r.service_provider || null,
      main_technology: r.main_technology || null,
      bid_outcome: r.bid_outcome || null,
      peak_flex_capacity_mw: r.peak_flexible_capacity_in_mw ?? null,
      max_run_time: r.maximum_run_time_hh_mm || null,
      connection_voltage_kv: r.connection_voltage_in_kv || null,
      delivery_year: r.delivery_year || null,
      delivery_start_date: r.tendered_delivery_start_date || null,
      delivery_end_date: r.tendered_delivery_end_date || null,
      availability_fee: r.agreed_availability_fee_where_applicable_in_ps_mw_hr ?? null,
      utilisation_price: r.agreed_utilisation_price_in_ps_mwh ?? null,
      service_fee: r.service_fee_in_ps_mwh ?? null,
      constraint_trigger: r.constraint_trigger || null,
    }));
    await sql`INSERT INTO enwl_flex_tenders ${sql(batch, 'tender_reference', 'product', 'constraint_management_zone', 'service_provider', 'main_technology', 'bid_outcome', 'peak_flex_capacity_mw', 'max_run_time', 'connection_voltage_kv', 'delivery_year', 'delivery_start_date', 'delivery_end_date', 'availability_fee', 'utilisation_price', 'service_fee', 'constraint_trigger')}`;
    inserted += batch.length;
  }
  console.log(`  Inserted ${inserted} flex tender records`);
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('ENWL Open Data Ingestion');
  console.log('========================');

  const start = Date.now();

  await ingestSubstations();
  await ingestLct();
  await ingestFlexTenders();
  // Capacity is the big one (111K) — do last
  await ingestCapacity();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);

  await sql.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
