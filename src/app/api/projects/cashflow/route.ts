// ============================================================
// GET /api/projects/cashflow — Compute cashflow model on the fly
//
// Fetches all projects + cashflow settings, estimates per-project
// revenue based on tariff and system size, then runs the cashflow
// engine and returns the full CashflowResult.
// ============================================================

import { NextResponse } from 'next/server';
import { db } from '@/shared/db';
import { homes, batterySystems, projectCashflowSettings } from '@/shared/db/schema';
import { eq } from 'drizzle-orm';
import { calculateCashflow } from '@/modules/projects/cashflow-engine';
import { calculateProjectCapex } from '@/modules/projects/utils';
import type { CashflowProjectInput } from '@/modules/projects/types';

// Reference daily revenue per 322 kWh system (GBP)
const DAILY_REVENUE_PER_322_KWH: Record<string, number> = {
  iof: 45,
  flux: 30,
  agile: 11,
};

const SCENARIO_MULTIPLIERS = {
  best: 1.3,
  likely: 1.0,
  worst: 0.6,
} as const;

// Default cashflow settings (mirrors schema defaults)
const DEFAULT_SETTINGS = {
  facilitySize: 500_000,
  interestRatePercent: 6.0,
  g99FeeDefault: 350,
  insuranceDefault: 500,
  maintenanceDefault: 150,
  homeownerPaymentDefault: 100,
  horizonMonths: 96,
};

function estimateDailyRevenue(
  tariffName: string | null,
  totalCapacityKwh: number,
): { best: number; likely: number; worst: number } {
  const key = (tariffName ?? 'flux').toLowerCase();
  const baseDailyPer322 = DAILY_REVENUE_PER_322_KWH[key] ?? DAILY_REVENUE_PER_322_KWH.flux;
  const scaledDaily = baseDailyPer322 * (totalCapacityKwh / 322);

  return {
    best: scaledDaily * SCENARIO_MULTIPLIERS.best,
    likely: scaledDaily * SCENARIO_MULTIPLIERS.likely,
    worst: scaledDaily * SCENARIO_MULTIPLIERS.worst,
  };
}

export async function GET() {
  try {
    // Fetch all projects with their battery systems
    const rows = await db
      .select()
      .from(homes)
      .leftJoin(batterySystems, eq(homes.systemId, batterySystems.id));

    // Fetch cashflow settings (single row, or use defaults)
    const settingsRows = await db
      .select()
      .from(projectCashflowSettings)
      .limit(1);

    const settings = settingsRows.length > 0
      ? settingsRows[0]
      : DEFAULT_SETTINGS;

    // Build CashflowProjectInput objects for the engine
    const projects: CashflowProjectInput[] = rows.map((row) => {
      const home = row.homes;
      const system = row.battery_systems;
      const totalCapKwh = system?.totalCapacityKwh ?? 0;
      const dailyRevenue = estimateDailyRevenue(home.tariffName, totalCapKwh);

      // Build CAPEX — use stored install cost or compute from hardware data
      const capex = {
        batteryHardware: 0, // not broken down at query time — use total
        inverterHardware: 0,
        solarCost: home.solarCostOverride ?? (home.solarKwp ?? 0) * 400,
        installationLabour: home.installationCostOverride ?? (home.phase === '3-phase' ? 11500 : 4800),
        phaseUpgradeCost: 0, // already included in totalCapex at creation time
        g99Application: home.g99ApplicationCost ?? settings.g99FeeDefault ?? DEFAULT_SETTINGS.g99FeeDefault,
        contingency: 0,
        totalCapex: system?.installCost ?? 0, // stored at creation time
      };

      return {
        address: home.address,
        targetInstallDate: home.targetInstallDate
          ? home.targetInstallDate.toISOString().split('T')[0]
          : null,
        capex,
        annualRevenue: {
          best: dailyRevenue.best * 365,
          likely: dailyRevenue.likely * 365,
          worst: dailyRevenue.worst * 365,
        },
        monthlyHomeownerPayment: home.monthlyHomeownerPayment
          ?? settings.homeownerPaymentDefault ?? DEFAULT_SETTINGS.homeownerPaymentDefault,
        insuranceCostAnnual: home.insuranceCostAnnual
          ?? settings.insuranceDefault ?? DEFAULT_SETTINGS.insuranceDefault,
        maintenanceCostOverride: home.maintenanceCostOverride ?? null,
      };
    });

    const mergedSettings = {
      facilitySize: settings.facilitySize ?? DEFAULT_SETTINGS.facilitySize,
      interestRatePercent: settings.interestRatePercent ?? DEFAULT_SETTINGS.interestRatePercent,
      g99FeeDefault: (settings as any).g99FeeDefault ?? DEFAULT_SETTINGS.g99FeeDefault,
      insuranceDefault: (settings as any).insuranceDefault ?? DEFAULT_SETTINGS.insuranceDefault,
      maintenanceDefault: (settings as any).maintenanceDefault ?? DEFAULT_SETTINGS.maintenanceDefault,
      homeownerPaymentDefault: (settings as any).homeownerPaymentDefault ?? DEFAULT_SETTINGS.homeownerPaymentDefault,
      horizonMonths: (settings as any).horizonMonths ?? DEFAULT_SETTINGS.horizonMonths,
    };

    const result = calculateCashflow(projects, mergedSettings);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/projects/cashflow]', err);
    return NextResponse.json(
      { error: 'Failed to compute cashflow' },
      { status: 500 },
    );
  }
}
