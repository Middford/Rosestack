// ============================================================
// RoseStack Platform — Database Seed Script
// Migrates static .data.ts files into Neon PostgreSQL via Drizzle ORM
// Usage: npx tsx src/scripts/seed.ts
// Requires: DATABASE_URL set in .env.local
// ============================================================

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/db/schema';
import { ALL_TARIFFS } from '../modules/tariffs/data';
import { batteries, inverters, solarPanels, heatPumps } from '../modules/hardware/data';
import { SEEDED_RISKS, SEEDED_OPPORTUNITIES } from '../modules/risk/data';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ============================================================
// Seed Tariffs
// ============================================================
async function seedTariffs() {
  console.log('Seeding tariffs...');
  let count = 0;
  for (const tariff of ALL_TARIFFS) {
    await db
      .insert(schema.tariffs)
      .values({
        supplier: tariff.supplier,
        name: tariff.name,
        type: tariff.type,
        importRates: tariff.importRates,
        exportRates: tariff.exportRates,
        standingChargePencePerDay: tariff.standingChargePencePerDay,
        validFrom: tariff.validFrom,
        validTo: tariff.validTo ?? null,
        eligibilityRequirements: tariff.eligibilityRequirements ?? null,
      })
      .onConflictDoNothing();
    count++;
  }
  console.log(`  ✓ ${count} tariffs seeded`);
}

// ============================================================
// Seed Hardware Catalogue
// ============================================================
async function seedHardware() {
  console.log('Seeding hardware catalogue...');
  let count = 0;

  for (const bat of batteries) {
    await db
      .insert(schema.hardwareCatalogue)
      .values({
        category: 'battery',
        manufacturer: bat.manufacturer,
        model: bat.model,
        specs: {
          capacityPerModuleKwh: bat.capacityPerModuleKwh,
          maxModulesPerString: bat.maxModulesPerString,
          chemistry: bat.chemistry,
          cycleLife: bat.cycleLife,
          degradationRatePercent: bat.degradationRatePercent,
          roundTripEfficiency: bat.roundTripEfficiency,
          chargeRateKw: bat.chargeRateKw,
          dischargeRateKw: bat.dischargeRateKw,
          ipRating: bat.ipRating,
          weightKg: bat.weightKg,
          operatingTempMin: bat.operatingTempMin,
          operatingTempMax: bat.operatingTempMax,
          warrantyYears: bat.warrantyYears,
          compatibleInverters: bat.compatibleInverters,
        },
        priceGbp: bat.wholesalePriceGbp,
        mcsCertified: bat.mcsCertified,
        iofCompatible: bat.iofCompatible,
        threePhaseSupport: false,
        notes: 'notes' in bat ? (bat as { notes?: string }).notes ?? null : null,
      })
      .onConflictDoNothing();
    count++;
  }

  for (const inv of inverters) {
    await db
      .insert(schema.hardwareCatalogue)
      .values({
        category: 'inverter',
        manufacturer: inv.manufacturer,
        model: inv.model,
        specs: {
          maxOutputKw: inv.maxOutputKw,
          maxPvInputKw: inv.maxPvInputKw,
          maxBatteryCapacityKwh: inv.maxBatteryCapacityKwh,
          threePhase: inv.threePhase,
          hybrid: inv.hybrid,
          g99Compliant: inv.g99Compliant,
          warrantyYears: inv.warrantyYears,
        },
        priceGbp: inv.priceGbp,
        mcsCertified: true,
        iofCompatible: inv.iofCompatible ?? false,
        threePhaseSupport: inv.threePhase ?? false,
      })
      .onConflictDoNothing();
    count++;
  }

  for (const panel of solarPanels) {
    await db
      .insert(schema.hardwareCatalogue)
      .values({
        category: 'solar',
        manufacturer: panel.manufacturer,
        model: panel.model,
        specs: {
          wattage: panel.wattage,
          efficiency: panel.efficiency,
          warrantyYears: panel.warrantyYears,
          degradationRatePercent: panel.degradationRatePercent,
          panelType: panel.panelType,
        },
        priceGbp: panel.priceGbp,
        mcsCertified: true,
        iofCompatible: false,
        threePhaseSupport: false,
      })
      .onConflictDoNothing();
    count++;
  }

  for (const pump of heatPumps) {
    await db
      .insert(schema.hardwareCatalogue)
      .values({
        category: 'heat-pump',
        manufacturer: pump.manufacturer,
        model: pump.model,
        specs: {
          heatingCapacityKw: pump.heatingCapacityKw,
          copRating: pump.copRating,
          copAtMinus5: pump.copAtMinus5,
          noiseDb: pump.noiseDb,
          refrigerant: pump.refrigerant,
          warrantyYears: pump.warrantyYears,
        },
        priceGbp: pump.priceGbp,
        mcsCertified: pump.mcsCertified ?? false,
        iofCompatible: false,
        threePhaseSupport: false,
      })
      .onConflictDoNothing();
    count++;
  }

  console.log(`  ✓ ${count} hardware items seeded (batteries, inverters, solar panels, heat pumps)`);
}

// ============================================================
// Seed Risk Register
// ============================================================
async function seedRisks() {
  console.log('Seeding risk register...');
  let count = 0;
  for (const risk of SEEDED_RISKS) {
    await db
      .insert(schema.riskRegister)
      .values({
        name: risk.name,
        category: risk.category,
        description: risk.description,
        probability: risk.probability,
        impact: risk.impact,
        score: risk.score,
        mitigationStrategy: risk.mitigationStrategy,
        mitigationOwner: risk.mitigationOwner,
        mitigationStatus: risk.mitigationStatus,
        residualScore: risk.residualScore ?? null,
        triggerThreshold: risk.triggerThreshold ?? null,
        contingencyPlan: risk.contingencyPlan ?? null,
        lastReviewed: risk.lastReviewed,
      })
      .onConflictDoNothing();
    count++;
  }
  console.log(`  ✓ ${count} risks seeded`);
}

// ============================================================
// Seed Opportunities
// ============================================================
async function seedOpportunities() {
  console.log('Seeding opportunity register...');
  let count = 0;
  for (const opp of SEEDED_OPPORTUNITIES) {
    await db
      .insert(schema.opportunityRegister)
      .values({
        name: opp.name,
        category: opp.category,
        description: opp.description,
        probability: opp.probability,
        impact: opp.impact,
        score: opp.score,
        captureStrategy: opp.captureStrategy,
        captureOwner: opp.captureOwner,
        captureStatus: opp.captureStatus,
        expectedValue: opp.expectedValue ?? null,
        triggerThreshold: opp.triggerThreshold ?? null,
        dependencies: opp.dependencies ?? null,
        investmentRequired: opp.investmentRequired ?? null,
        lastReviewed: opp.lastReviewed,
      })
      .onConflictDoNothing();
    count++;
  }
  console.log(`  ✓ ${count} opportunities seeded`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set. Add it to .env.local and retry.');
    process.exit(1);
  }

  console.log('RoseStack DB Seed — starting...\n');

  try {
    await seedTariffs();
    await seedHardware();
    await seedRisks();
    await seedOpportunities();
    console.log('\n✅ Seed complete.');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
