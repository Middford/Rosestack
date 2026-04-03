// ============================================================
// Solar Generation Model — Lancashire (53.8°N)
//
// Simple sinusoidal seasonal model parameterised by kWp.
// Returns 48-slot array of solar generation kWh per half-hour
// for a given day-of-year and system size.
//
// Extracted from the Beeches backtest and generalised for
// any solar capacity. Uses south-facing 35° tilt assumptions
// typical of Lancashire residential installations.
// ============================================================

/**
 * Estimate solar PV generation for a single day.
 *
 * @param dayOfYear  1–365 (Jan 1 = 1, Dec 31 = 365)
 * @param solarKwp   PV array size in kWp (0 = no solar)
 * @returns          48-element array of kWh per half-hour slot
 */
export function estimateSolarGeneration(
  dayOfYear: number,
  solarKwp: number,
): number[] {
  const slots = new Array<number>(48).fill(0);
  if (solarKwp <= 0) return slots;

  // Seasonal factor: peaks at summer solstice (~day 172), near-zero in deep winter
  // Offset by 80 days so the sine wave starts rising around March equinox
  const seasonalFactor = Math.max(0, Math.sin((dayOfYear - 80) * (Math.PI / 185)));

  // Peak daily yield for south-facing 35° tilt at UK latitude:
  // ~4.8 kWh/kWp/day at summer peak, scaling by seasonal factor
  const dailyKwh = solarKwp * 4.8 * seasonalFactor;
  if (dailyKwh <= 0) return slots;

  // Distribute across daylight slots using Gaussian bell curve
  // Peak at slot 26 (13:00 UK local), spread of 10 half-hour slots either side
  const peakSlot = 26;
  const spread = 10;
  let total = 0;

  for (let i = 0; i < 48; i++) {
    const dist = Math.abs(i - peakSlot);
    if (dist <= spread) {
      slots[i] = Math.exp(-0.5 * Math.pow(dist / (spread * 0.5), 2));
      total += slots[i]!;
    }
  }

  // Normalise so sum = dailyKwh, cap each slot at realistic PV output
  // Max single-slot output = kWp × 0.85 (inverter clipping) × 0.5 (half hour)
  const maxSlotKwh = solarKwp * 0.85 * 0.5;
  const scale = total > 0 ? dailyKwh / total : 0;

  return slots.map(v => Math.min(v * scale, maxSlotKwh));
}

/**
 * Get the day-of-year (1-365) from a YYYY-MM-DD date string.
 */
export function getDayOfYear(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00Z');
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
