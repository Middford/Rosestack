// ============================================================
// DNO Export Limit Utilities
// G98/G99 compliance and effective export rate calculations
// ============================================================

import type { BatterySystem, PhaseType } from '@/shared/types';

/**
 * G98 export limits by phase type.
 * G98 (simple notification): no DNO application required below these limits.
 * - Single-phase: 16A x 230V = 3.68 kW
 * - Three-phase: 16A x 3 x 230V = 11.04 kW
 */
export const G98_LIMITS: Record<PhaseType, number> = {
  '1-phase': 3.68,
  '3-phase': 11.04,
};

/**
 * Get the DNO export limit for a given phase type and optional G99 approval.
 *
 * If a G99 approval has been granted, that approved capacity is used.
 * Otherwise, the G98 limit for the phase type applies.
 */
export function getDnoExportLimit(
  phase: PhaseType,
  g99ApprovedKw?: number,
): number {
  if (g99ApprovedKw !== undefined && g99ApprovedKw > 0) {
    return g99ApprovedKw;
  }
  return G98_LIMITS[phase];
}

/**
 * Determine whether a G99 application is required.
 * G99 is needed when the system's max discharge rate exceeds the G98 limit
 * for the given phase type.
 */
export function isG99Required(
  systemDischargeKw: number,
  phase: PhaseType,
): boolean {
  return systemDischargeKw > G98_LIMITS[phase];
}

/**
 * Get the effective export rate in kW, constrained by the DNO export limit.
 *
 * This is the single source of truth for how much power the system can
 * actually export to the grid. It is the minimum of:
 * - The inverter's max discharge rate
 * - The DNO-approved (or G98 default) export limit
 *
 * ALL revenue calculations that depend on grid export must use this value
 * instead of raw `maxDischargeRateKw`.
 */
export function getEffectiveExportKw(system: BatterySystem): number {
  const dnoLimit = system.dnoExportLimitKw ?? system.maxDischargeRateKw;
  return Math.min(system.maxDischargeRateKw, dnoLimit);
}
