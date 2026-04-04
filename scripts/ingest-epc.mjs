// ============================================================
// EPC Data Ingestion — Pull target properties from DLUHC API
//
// Fetches owner-occupied detached/semi houses from all ENWL-region
// local authorities and stores them in the epc_properties table.
//
// Usage: EPC_EMAIL=... EPC_API_KEY=... DATABASE_URL=... node scripts/ingest-epc.mjs
// ============================================================

import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const EPC_EMAIL = process.env.EPC_EMAIL;
const EPC_API_KEY = process.env.EPC_API_KEY;

if (!EPC_EMAIL || !EPC_API_KEY) {
  console.error('EPC_EMAIL and EPC_API_KEY required');
  process.exit(1);
}

const AUTH = Buffer.from(`${EPC_EMAIL}:${EPC_API_KEY}`).toString('base64');

// ENWL-region local authorities (East Lancashire focus first, then expand)
const LOCAL_AUTHORITIES = [
  // East Lancashire (core target area)
  'E06000008', // Blackburn with Darwen
  'E07000117', // Burnley
  'E07000120', // Hyndburn
  'E07000122', // Pendle
  'E07000124', // Ribble Valley
  'E07000125', // Rossendale
  // Central Lancashire
  'E07000118', // Chorley
  'E07000123', // Preston
  'E07000126', // South Ribble
  // West Lancashire & Fylde
  'E07000127', // West Lancashire
  'E07000119', // Fylde
  'E07000128', // Wyre
  // Lancaster & Morecambe
  'E07000121', // Lancaster
  // Greater Manchester (ENWL area)
  'E08000001', // Bolton
  'E08000002', // Bury
  'E08000003', // Manchester
  'E08000004', // Oldham
  'E08000005', // Rochdale
  'E08000006', // Salford
  'E08000007', // Stockport
  'E08000008', // Tameside
  'E08000009', // Trafford
  'E08000010', // Wigan
];

async function fetchEpcProperties(localAuthority, builtForm = 'Detached') {
  const properties = [];
  let from = 0;
  const pageSize = 5000;
  let hasMore = true;

  while (hasMore) {
    const url = `https://epc.opendatacommunities.org/api/v1/domestic/search?` +
      `local-authority=${localAuthority}` +
      `&property-type=house` +
      `&built-form=${builtForm}` +
      `&size=${pageSize}` +
      `&from=${from}`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Basic ${AUTH}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`  Error ${res.status} for ${localAuthority} from=${from}`);
      break;
    }

    const data = await res.json();
    const rows = data.rows || [];
    properties.push(...rows);
    from += rows.length;

    if (rows.length < pageSize) {
      hasMore = false;
    }

    // Rate limiting — be nice to the API
    await new Promise(r => setTimeout(r, 200));
  }

  return properties;
}

async function main() {
  console.log('EPC Property Ingestion');
  console.log('======================');
  console.log(`Pulling detached houses from ${LOCAL_AUTHORITIES.length} local authorities`);

  // Create table if not exists
  await sql`CREATE TABLE IF NOT EXISTS epc_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lmk_key TEXT UNIQUE,
    address TEXT,
    address1 TEXT,
    address2 TEXT,
    postcode TEXT,
    uprn TEXT,
    local_authority TEXT,
    local_authority_label TEXT,
    property_type TEXT,
    built_form TEXT,
    construction_age TEXT,
    total_floor_area REAL,
    number_habitable_rooms INTEGER,
    number_heated_rooms INTEGER,
    current_energy_rating TEXT,
    current_energy_efficiency INTEGER,
    potential_energy_rating TEXT,
    epc_score INTEGER,
    mains_gas TEXT,
    main_fuel TEXT,
    mainheat_description TEXT,
    hotwater_description TEXT,
    walls_description TEXT,
    roof_description TEXT,
    floor_description TEXT,
    windows_description TEXT,
    secondheat_description TEXT,
    photo_supply REAL,
    solar_water_heating TEXT,
    wind_turbine_count INTEGER,
    tenure TEXT,
    transaction_type TEXT,
    inspection_date TEXT,
    latitude REAL,
    longitude REAL,
    fetched_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;
  console.log('Table epc_properties ready');

  let totalInserted = 0;
  const start = Date.now();

  for (const la of LOCAL_AUTHORITIES) {
    process.stdout.write(`\n${la}: fetching... `);
    const props = await fetchEpcProperties(la, 'Detached');
    process.stdout.write(`${props.length} detached`);

    // Also get semi-detached (these are viable targets too)
    const semiProps = await fetchEpcProperties(la, 'Semi-Detached');
    process.stdout.write(` + ${semiProps.length} semi`);

    const allProps = [...props, ...semiProps];

    // Filter: owner-occupied, 3+ bedrooms
    const filtered = allProps.filter(p => {
      const rooms = parseInt(p['number-habitable-rooms']) || 0;
      return rooms >= 3 && (p.tenure === 'Owner-occupied' || p.tenure === 'owner-occupied');
    });
    process.stdout.write(` → ${filtered.length} targets`);

    // Geocode via postcode (batch — use postcodes.io bulk API)
    const postcodes = [...new Set(filtered.map(p => p.postcode).filter(Boolean))];
    const geoMap = new Map();

    // Batch geocode in chunks of 100
    for (let i = 0; i < postcodes.length; i += 100) {
      const batch = postcodes.slice(i, i + 100);
      try {
        const geoRes = await fetch('https://api.postcodes.io/postcodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcodes: batch }),
        });
        const geoData = await geoRes.json();
        for (const r of geoData.result || []) {
          if (r.result) {
            geoMap.set(r.query, { lat: r.result.latitude, lng: r.result.longitude });
          }
        }
      } catch (e) {
        // Skip geocoding errors
      }
      await new Promise(r => setTimeout(r, 100));
    }
    process.stdout.write(` (${geoMap.size} geocoded)`);

    // Insert in batches
    const batchSize = 200;
    let inserted = 0;
    for (let i = 0; i < filtered.length; i += batchSize) {
      const batch = filtered.slice(i, i + batchSize).map(p => {
        const geo = geoMap.get(p.postcode);
        return {
          lmk_key: p['lmk-key'],
          address: p.address || `${p.address1}, ${p.address2}`.replace(/, $/, ''),
          address1: p.address1 || null,
          address2: p.address2 || null,
          postcode: p.postcode || null,
          uprn: p.uprn || null,
          local_authority: p['local-authority'] || null,
          local_authority_label: p['local-authority-label'] || null,
          property_type: p['property-type'] || null,
          built_form: p['built-form'] || null,
          construction_age: p['construction-age-band'] || null,
          total_floor_area: parseFloat(p['total-floor-area']) || null,
          number_habitable_rooms: parseInt(p['number-habitable-rooms']) || null,
          number_heated_rooms: parseInt(p['number-heated-rooms']) || null,
          current_energy_rating: p['current-energy-rating'] || null,
          current_energy_efficiency: parseInt(p['current-energy-efficiency']) || null,
          potential_energy_rating: p['potential-energy-rating'] || null,
          epc_score: parseInt(p['current-energy-efficiency']) || null,
          mains_gas: p['mains-gas-flag'] || null,
          main_fuel: p['main-fuel'] || null,
          mainheat_description: p['mainheat-description'] || null,
          hotwater_description: p['hotwater-description'] || null,
          walls_description: p['walls-description'] || null,
          roof_description: p['roof-description'] || null,
          floor_description: p['floor-description'] || null,
          windows_description: p['windows-description'] || null,
          secondheat_description: p['secondheat-description'] || null,
          photo_supply: parseFloat(p['photo-supply']) || null,
          solar_water_heating: p['solar-water-heating-flag'] || null,
          wind_turbine_count: parseInt(p['wind-turbine-count']) || 0,
          tenure: p.tenure || null,
          transaction_type: p['transaction-type'] || null,
          inspection_date: p['inspection-date'] || null,
          latitude: geo?.lat ?? null,
          longitude: geo?.lng ?? null,
        };
      });

      try {
        await sql`INSERT INTO epc_properties ${sql(batch,
          'lmk_key', 'address', 'address1', 'address2', 'postcode', 'uprn',
          'local_authority', 'local_authority_label', 'property_type', 'built_form',
          'construction_age', 'total_floor_area', 'number_habitable_rooms', 'number_heated_rooms',
          'current_energy_rating', 'current_energy_efficiency', 'potential_energy_rating', 'epc_score',
          'mains_gas', 'main_fuel', 'mainheat_description', 'hotwater_description',
          'walls_description', 'roof_description', 'floor_description', 'windows_description',
          'secondheat_description', 'photo_supply', 'solar_water_heating', 'wind_turbine_count',
          'tenure', 'transaction_type', 'inspection_date', 'latitude', 'longitude'
        )} ON CONFLICT (lmk_key) DO NOTHING`;
        inserted += batch.length;
      } catch (e) {
        console.error(`\n  Insert error: ${e.message}`);
      }
    }
    totalInserted += inserted;
    process.stdout.write(` → ${inserted} inserted`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n\nDone in ${elapsed}s — ${totalInserted} total properties ingested`);

  // Summary
  const counts = await sql`SELECT local_authority_label, COUNT(*) as c FROM epc_properties GROUP BY local_authority_label ORDER BY c DESC`;
  console.log('\nProperties by local authority:');
  counts.forEach(r => console.log(`  ${r.local_authority_label}: ${r.c}`));

  const solarCount = await sql`SELECT COUNT(*) as c FROM epc_properties WHERE photo_supply > 0`;
  console.log(`\nWith solar panels: ${solarCount[0].c}`);

  await sql.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
