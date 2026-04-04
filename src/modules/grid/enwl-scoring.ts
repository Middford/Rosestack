// ============================================================
// ENWL Real-Data Scoring Engine — Tiered Funnel Approach
//
// Properties are scored in a PRIORITY ORDER (not weighted average):
//
// Tier 1 (80-100): Already 3-phase + has solar + large property
//   → Walk up and knock. Best possible target.
//
// Tier 2 (60-79): Already 3-phase + has solar + smaller property
//   → Still great. Solar + 3-phase is the hard part.
//
// Tier 3 (45-59): Cheap 3-phase upgrade (415V on same feeder) + solar + large
//   → Viable with ~£2,500 upgrade. Check feeder data.
//
// Tier 4 (30-44): Cheap upgrade + smaller or no solar
//   → Needs more investment but still feasible.
//
// Tier 5 (<30): Complex upgrade needed or no solar nearby
//   → Deprioritise.
//
// Within each tier, properties are ranked by: generation headroom,
// property size, EPC rating, garden access, distance to substation.
// ============================================================

// ── Types ────────────────────────────────────────────────────

export interface SubstationData {
  substationNumber: string;
  substationGroup: string;
  outfeed: string | null;
  area: string | null;
  primaryFeeder: string | null;
  primaryNumberAlias: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LctData {
  distributionSubstation: string;
  totalCustomers: number | null;
  solarInstallations: number | null;
  solarCapacityKw: number | null;
  batteryInstallations: number | null;
  batteryCapacityKwh: number | null;
  heatPumpInstallations: number | null;
  heatPumpCapacityKw: number | null;
}

export interface CapacityData {
  firmCapacityKva: number | null;
  estimatedMaxLoadKva: number | null;
  headroomKva: number | null;
  loadUtilisation: number | null;
  loadUtilisationCategory: string | null;
}

export interface DistTxData {
  distributionNumber: string;
  ratingKva: number | null;
  loadKva: number | null;
  generationHeadroomKva: number | null;
  utilisationPercent: number | null;
  primaryFeeder: string | null;
}

export type PhaseStatus = 'already-3-phase' | 'cheap-upgrade' | 'complex-upgrade' | 'unknown';

export interface SubstationScoreBreakdown {
  solarDensity: number;
  batteryGap: number;
  threePhase: number;
  gridHeadroom: number;
  customerDensity: number;
  flexTender: number;
  heatPumpDensity: number;
}

export interface SubstationScore {
  substationNumber: string;
  latitude: number;
  longitude: number;
  outfeed: string;
  totalScore: number;
  breakdown: SubstationScoreBreakdown;
  solarInstallations: number;
  batteryInstallations: number;
  heatPumpInstallations: number;
  totalCustomers: number;
  headroomKva: number | null;
  loadUtilisation: number | null;
  loadCategory: string | null;
  generationHeadroomKva: number | null;
  hasFlexTender: boolean;
  grade: string;
  gradeColor: string;
}

export interface PropertyScoreBreakdown {
  tier: number;
  tierLabel: string;
  phaseStatus: PhaseStatus;
  phaseStatusLabel: string;
  hasSolar: boolean;
  propertySize: number;    // 0-15 within-tier ranking
  epcRating: number;       // 0-10
  gardenAccess: number;    // 0-10
  generationHeadroom: number; // 0-10
  distanceToSub: number;   // 0-5
}

export interface PropertyScore {
  propertyId: string;
  address: string;
  postcode: string;
  totalScore: number;
  breakdown: PropertyScoreBreakdown;
  bedrooms: number;
  propertyType: string;
  epcRating: string;
  gardenAccess: boolean;
  phaseStatus: PhaseStatus;
  phaseStatusLabel: string;
  nearestSubstationNumber: string | null;
  nearestSubstationOutfeed: string | null;
  distanceKm: number;
  generationHeadroomKva: number | null;
  grade: string;
  gradeColor: string;
}

// ── Helpers ──────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getGrade(score: number): { grade: string; gradeColor: string } {
  if (score >= 80) return { grade: 'Tier 1 — Prime', gradeColor: 'success' };
  if (score >= 60) return { grade: 'Tier 2 — Strong', gradeColor: 'info' };
  if (score >= 45) return { grade: 'Tier 3 — Viable', gradeColor: 'warning' };
  if (score >= 30) return { grade: 'Tier 4 — Possible', gradeColor: 'default' };
  return { grade: 'Tier 5 — Deprioritise', gradeColor: 'danger' };
}

// ── Level 1: Substation Scoring (unchanged — balanced weighting) ─────

export function scoreSubstation(
  sub: SubstationData,
  lct: LctData | null,
  capacity: CapacityData | null,
  distTx: DistTxData | null,
  hasFlexTender: boolean,
): SubstationScore {
  const solar = lct?.solarInstallations ?? 0;
  const batteries = lct?.batteryInstallations ?? 0;
  const customers = lct?.totalCustomers ?? 0;
  const heatPumps = lct?.heatPumpInstallations ?? 0;
  const loadUtil = capacity?.loadUtilisation ?? 0.5;

  let solarDensity: number;
  if (solar >= 20) solarDensity = 30;
  else if (solar >= 10) solarDensity = 22;
  else if (solar >= 5) solarDensity = 15;
  else if (solar >= 1) solarDensity = 8;
  else solarDensity = 2;

  let batteryGap = batteries === 0 ? 10 : batteries <= 3 ? 7 : 3;
  const threePhase = sub.outfeed === '415V' ? 15 : 3;

  let gridHeadroom: number;
  if (loadUtil < 0.3) gridHeadroom = 20;
  else if (loadUtil < 0.5) gridHeadroom = 16;
  else if (loadUtil < 0.7) gridHeadroom = 10;
  else if (loadUtil < 0.85) gridHeadroom = 5;
  else gridHeadroom = 1;

  let customerDensity = customers >= 200 ? 10 : customers >= 100 ? 7 : customers >= 50 ? 4 : 2;
  const flexTender = hasFlexTender ? 10 : 2;
  let heatPumpDensity = heatPumps >= 5 ? 5 : heatPumps >= 1 ? 3 : 1;

  const breakdown: SubstationScoreBreakdown = {
    solarDensity, batteryGap, threePhase, gridHeadroom,
    customerDensity, flexTender, heatPumpDensity,
  };
  const totalScore = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const { grade, gradeColor } = getGrade(totalScore);

  return {
    substationNumber: sub.substationNumber,
    latitude: sub.latitude ?? 0,
    longitude: sub.longitude ?? 0,
    outfeed: sub.outfeed ?? 'unknown',
    totalScore,
    breakdown,
    solarInstallations: solar,
    batteryInstallations: batteries,
    heatPumpInstallations: heatPumps,
    totalCustomers: customers,
    headroomKva: capacity?.headroomKva ?? null,
    loadUtilisation: loadUtil,
    loadCategory: capacity?.loadUtilisationCategory ?? null,
    generationHeadroomKva: distTx?.generationHeadroomKva ?? null,
    hasFlexTender,
    grade,
    gradeColor,
  };
}

export function rankSubstations(
  substations: SubstationData[],
  lctMap: Map<string, LctData>,
  capacityMap: Map<string, CapacityData>,
  distTxMap: Map<string, DistTxData>,
  flexZones: Set<string>,
): SubstationScore[] {
  return substations
    .map(sub => {
      const lct = lctMap.get(sub.substationNumber) ?? null;
      const capacity = capacityMap.get(sub.substationNumber) ?? null;
      const distTx = distTxMap.get(sub.substationNumber) ?? null;
      const hasFlexTender = flexZones.has(sub.primaryNumberAlias ?? '') || flexZones.has(sub.area ?? '');
      return scoreSubstation(sub, lct, capacity, distTx, hasFlexTender);
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

// ── Level 2: Property Scoring — Tiered Funnel ───────────────

/** Determine 3-phase status from real ENWL infrastructure data */
export function determine3PhaseStatus(
  nearestSub: SubstationData | null,
  /** All substations on the same primary feeder */
  feederSubstations: SubstationData[],
): { status: PhaseStatus; label: string } {
  if (!nearestSub) return { status: 'unknown', label: 'No substation data' };

  // Already 3-phase — substation serves 415V
  if (nearestSub.outfeed === '415V') {
    return { status: 'already-3-phase', label: 'Already 3-phase (415V substation)' };
  }

  // Check if same feeder has 415V substations nearby
  const feeder = nearestSub.primaryFeeder;
  if (feeder) {
    const threePhaseOnFeeder = feederSubstations.filter(
      s => s.primaryFeeder === feeder && s.outfeed === '415V',
    );
    if (threePhaseOnFeeder.length > 0) {
      // Check distance to nearest 415V substation on same feeder
      if (nearestSub.latitude != null && nearestSub.longitude != null) {
        let minDist = Infinity;
        for (const s3p of threePhaseOnFeeder) {
          if (s3p.latitude != null && s3p.longitude != null) {
            const d = haversineKm(nearestSub.latitude, nearestSub.longitude, s3p.latitude, s3p.longitude);
            if (d < minDist) minDist = d;
          }
        }
        if (minDist < 0.5) {
          return { status: 'cheap-upgrade', label: `Upgrade feasible (415V ${Math.round(minDist * 1000)}m away on same feeder)` };
        }
        if (minDist < 2) {
          return { status: 'cheap-upgrade', label: `Upgrade possible (415V ${minDist.toFixed(1)}km away on same feeder)` };
        }
      }
      return { status: 'cheap-upgrade', label: '415V exists on same feeder' };
    }
  }

  // No 415V on the same feeder — complex upgrade
  return { status: 'complex-upgrade', label: 'No 3-phase on feeder — requires TX upgrade' };
}

interface PropertyInput {
  id: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  epcRating: string;
  gardenAccess: boolean;
  threePhaseConfirmed: boolean;
  threePhaseScore: number;
  photoSupply?: number;
  solarWaterHeating?: boolean;
}

export function scorePropertyTiered(
  prop: PropertyInput,
  nearestSub: SubstationData | null,
  distTx: DistTxData | null,
  phaseStatus: PhaseStatus,
  phaseStatusLabel: string,
  isHighSolarSubstation: boolean,
): PropertyScore {
  const distKm = nearestSub?.latitude != null && nearestSub?.longitude != null
    ? haversineKm(prop.latitude, prop.longitude, nearestSub.latitude, nearestSub.longitude)
    : 5;

  // ── Determine if property has solar ──
  const hasSolar = (prop.photoSupply ?? 0) > 0
    || prop.solarWaterHeating === true
    || isHighSolarSubstation; // substation has 5+ solar = neighbourhood likely has panels

  // ── Determine property size category ──
  const isLarge = prop.bedrooms >= 4 && (prop.propertyType === 'detached' || prop.propertyType === 'farm');
  const isMedium = prop.bedrooms >= 3;

  // ── Assign TIER (determines base score range) ──
  let tier: number;
  let tierLabel: string;
  let baseScore: number;

  if (phaseStatus === 'already-3-phase' && hasSolar && isLarge) {
    tier = 1; tierLabel = 'Prime — 3-phase + solar + large'; baseScore = 85;
  } else if (phaseStatus === 'already-3-phase' && hasSolar) {
    tier = 2; tierLabel = 'Strong — 3-phase + solar'; baseScore = 68;
  } else if (phaseStatus === 'already-3-phase' && isLarge) {
    tier = 2; tierLabel = 'Strong — 3-phase + large (no solar)'; baseScore = 65;
  } else if (phaseStatus === 'cheap-upgrade' && hasSolar && isLarge) {
    tier = 3; tierLabel = 'Viable — cheap upgrade + solar + large'; baseScore = 52;
  } else if (phaseStatus === 'cheap-upgrade' && hasSolar) {
    tier = 3; tierLabel = 'Viable — cheap upgrade + solar'; baseScore = 48;
  } else if (phaseStatus === 'already-3-phase') {
    tier = 3; tierLabel = 'Viable — 3-phase but small/no solar'; baseScore = 46;
  } else if (phaseStatus === 'cheap-upgrade' && isLarge) {
    tier = 4; tierLabel = 'Possible — cheap upgrade + large'; baseScore = 38;
  } else if (phaseStatus === 'cheap-upgrade') {
    tier = 4; tierLabel = 'Possible — cheap upgrade'; baseScore = 32;
  } else {
    tier = 5; tierLabel = 'Deprioritise — complex upgrade'; baseScore = 15;
  }

  // ── Within-tier ranking (adds up to 15 points) ──

  // Property size (0-5)
  let propertySize = 0;
  if (prop.bedrooms >= 5 && (prop.propertyType === 'detached' || prop.propertyType === 'farm')) propertySize = 5;
  else if (prop.bedrooms >= 4) propertySize = 3;
  else if (prop.bedrooms >= 3) propertySize = 2;
  else propertySize = 1;

  // EPC rating (0-4) — D/E = best for arbitrage
  const epcScores: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 3, F: 2, G: 1 };
  const epcRating = epcScores[prop.epcRating?.charAt(0)?.toUpperCase() ?? 'D'] ?? 2;

  // Garden access (0-3)
  const gardenAccess = prop.gardenAccess ? 3 : 0;

  // Generation headroom at the transformer (0-2)
  const genHeadroom = distTx?.generationHeadroomKva;
  let generationHeadroom = 1;
  if (genHeadroom != null && genHeadroom >= 66) generationHeadroom = 2; // enough for full G99 export
  else if (genHeadroom != null && genHeadroom < 20) generationHeadroom = 0; // tight

  // Distance (0-1)
  const distanceToSub = distKm < 1 ? 1 : 0;

  const withinTierBonus = propertySize + epcRating + gardenAccess + generationHeadroom + distanceToSub;
  const totalScore = Math.min(100, baseScore + withinTierBonus);

  const breakdown: PropertyScoreBreakdown = {
    tier,
    tierLabel,
    phaseStatus,
    phaseStatusLabel,
    hasSolar,
    propertySize,
    epcRating,
    gardenAccess,
    generationHeadroom,
    distanceToSub,
  };
  const { grade, gradeColor } = getGrade(totalScore);

  return {
    propertyId: prop.id,
    address: prop.address,
    postcode: prop.postcode,
    totalScore,
    breakdown,
    bedrooms: prop.bedrooms,
    propertyType: prop.propertyType,
    epcRating: prop.epcRating,
    gardenAccess: prop.gardenAccess,
    phaseStatus,
    phaseStatusLabel,
    nearestSubstationNumber: nearestSub?.substationNumber ?? null,
    nearestSubstationOutfeed: nearestSub?.outfeed ?? null,
    distanceKm: Math.round(distKm * 100) / 100,
    generationHeadroomKva: genHeadroom ?? null,
    grade,
    gradeColor,
  };
}
