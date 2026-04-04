// ============================================================
// ENWL Real-Data Scoring Engine
//
// Two-level scoring matrix using live ENWL Open Data:
//   Level 1: Substation Score (0-100) — "Where to deploy"
//   Level 2: Property Score (0-100) — "Which doors to knock"
//
// Data sources:
//   enwl_substations (41,868) — voltage, hierarchy, location
//   enwl_capacity (111,015) — headroom per 11kV section
//   enwl_lct (13,996) — MCS solar/battery/HP per substation
//   enwl_flex_tenders (476) — active flexibility tenders
// ============================================================

// ── Types ────────────────────────────────────────────────────

export interface SubstationData {
  substationNumber: string;
  substationGroup: string;
  outfeed: string | null;
  area: string | null;
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

export interface FlexTenderData {
  constraintManagementZone: string | null;
  utilisationPrice: number | null;
  bidOutcome: string | null;
  deliveryYear: string | null;
}

export interface SubstationScoreBreakdown {
  solarDensity: number;       // 0-30
  batteryGap: number;         // 0-10
  threePhase: number;         // 0-15
  gridHeadroom: number;       // 0-20
  customerDensity: number;    // 0-10
  flexTender: number;         // 0-10
  heatPumpDensity: number;    // 0-5
}

export interface SubstationScore {
  substationNumber: string;
  latitude: number;
  longitude: number;
  outfeed: string;
  totalScore: number;
  breakdown: SubstationScoreBreakdown;
  // Context data for display
  solarInstallations: number;
  batteryInstallations: number;
  heatPumpInstallations: number;
  totalCustomers: number;
  headroomKva: number | null;
  loadUtilisation: number | null;
  loadCategory: string | null;
  hasFlexTender: boolean;
  grade: string;
  gradeColor: string;
}

export interface PropertyScoreBreakdown {
  threePhaseSubstation: number; // 0-20
  solarPresence: number;       // 0-20
  substationHeadroom: number;  // 0-15
  gardenAccess: number;        // 0-10
  propertySize: number;        // 0-10
  epcRating: number;           // 0-10
  distanceToSubstation: number; // 0-10
  clusterPotential: number;    // 0-5
}

export interface PropertyScore {
  propertyId: string;
  address: string;
  postcode: string;
  totalScore: number;
  breakdown: PropertyScoreBreakdown;
  // Context
  bedrooms: number;
  propertyType: string;
  epcRating: string;
  threePhaseScore: number;
  gardenAccess: boolean;
  nearestSubstationNumber: string | null;
  distanceKm: number;
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
  if (score >= 75) return { grade: 'Excellent', gradeColor: 'success' };
  if (score >= 55) return { grade: 'Good', gradeColor: 'info' };
  if (score >= 35) return { grade: 'Fair', gradeColor: 'warning' };
  return { grade: 'Low', gradeColor: 'danger' };
}

// ── Level 1: Substation Scoring ─────────────────────────────

export function scoreSubstation(
  sub: SubstationData,
  lct: LctData | null,
  capacity: CapacityData | null,
  hasFlexTender: boolean,
): SubstationScore {
  const solar = lct?.solarInstallations ?? 0;
  const batteries = lct?.batteryInstallations ?? 0;
  const customers = lct?.totalCustomers ?? 0;
  const heatPumps = lct?.heatPumpInstallations ?? 0;
  const loadUtil = capacity?.loadUtilisation ?? 0.5;

  // Solar density (30 pts)
  let solarDensity: number;
  if (solar >= 20) solarDensity = 30;
  else if (solar >= 10) solarDensity = 22;
  else if (solar >= 5) solarDensity = 15;
  else if (solar >= 1) solarDensity = 8;
  else solarDensity = 2;

  // Battery gap (10 pts) — fewer batteries = bigger opportunity
  let batteryGap: number;
  if (batteries === 0) batteryGap = 10;
  else if (batteries <= 3) batteryGap = 7;
  else batteryGap = 3;

  // 3-phase supply (15 pts)
  const threePhase = sub.outfeed === '415V' ? 15 : 3;

  // Grid headroom (20 pts)
  let gridHeadroom: number;
  if (loadUtil < 0.3) gridHeadroom = 20;
  else if (loadUtil < 0.5) gridHeadroom = 16;
  else if (loadUtil < 0.7) gridHeadroom = 10;
  else if (loadUtil < 0.85) gridHeadroom = 5;
  else gridHeadroom = 1;

  // Customer density (10 pts)
  let customerDensity: number;
  if (customers >= 200) customerDensity = 10;
  else if (customers >= 100) customerDensity = 7;
  else if (customers >= 50) customerDensity = 4;
  else customerDensity = 2;

  // Flex tender (10 pts)
  const flexTender = hasFlexTender ? 10 : 2;

  // Heat pump density (5 pts)
  let heatPumpDensity: number;
  if (heatPumps >= 5) heatPumpDensity = 5;
  else if (heatPumps >= 1) heatPumpDensity = 3;
  else heatPumpDensity = 1;

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
    hasFlexTender,
    grade,
    gradeColor,
  };
}

export function rankSubstations(
  substations: SubstationData[],
  lctMap: Map<string, LctData>,
  capacityMap: Map<string, CapacityData>,
  flexZones: Set<string>,
): SubstationScore[] {
  return substations
    .map(sub => {
      const lct = lctMap.get(sub.substationNumber) ?? null;
      const capacity = capacityMap.get(sub.substationNumber) ?? null;
      // Check if any flex tender is in this substation's primary group area
      const hasFlexTender = flexZones.has(sub.primaryNumberAlias ?? '') || flexZones.has(sub.area ?? '');
      return scoreSubstation(sub, lct, capacity, hasFlexTender);
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

// ── Level 2: Property Scoring ───────────────────────────────

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

export function scorePropertyWithEnwl(
  prop: PropertyInput,
  nearestSub: SubstationData | null,
  nearestCapacity: CapacityData | null,
  isHighSolarSubstation: boolean,
  nearbyPropertyCount: number,
): PropertyScore {
  const distKm = nearestSub?.latitude != null && nearestSub?.longitude != null
    ? haversineKm(prop.latitude, prop.longitude, nearestSub.latitude, nearestSub.longitude)
    : 5;

  // 3-phase substation (20 pts)
  const threePhaseSubstation = nearestSub?.outfeed === '415V' ? 20 : 5;

  // Solar presence (20 pts)
  let solarPresence: number;
  if ((prop.photoSupply ?? 0) > 0) solarPresence = 20;
  else if (prop.solarWaterHeating) solarPresence = 12;
  else if (isHighSolarSubstation) solarPresence = 12; // substation has lots of solar = likely neighbourhood
  else if (prop.propertyType === 'detached' || prop.propertyType === 'farm') solarPresence = 5;
  else solarPresence = 2;

  // Substation headroom (15 pts)
  const loadUtil = nearestCapacity?.loadUtilisation ?? 0.5;
  let substationHeadroom: number;
  if (loadUtil < 0.3) substationHeadroom = 15;
  else if (loadUtil < 0.5) substationHeadroom = 12;
  else if (loadUtil < 0.7) substationHeadroom = 8;
  else if (loadUtil < 0.85) substationHeadroom = 4;
  else substationHeadroom = 1;

  // Garden access (10 pts)
  const gardenAccess = prop.gardenAccess ? 10 : 0;

  // Property size (10 pts)
  let propertySize = 0;
  if (prop.bedrooms >= 5) propertySize += 6;
  else if (prop.bedrooms >= 4) propertySize += 4;
  else if (prop.bedrooms >= 3) propertySize += 2;
  else propertySize += 1;
  if (prop.propertyType === 'detached' || prop.propertyType === 'farm') propertySize += 4;
  else if (prop.propertyType === 'bungalow' || prop.propertyType === 'semi') propertySize += 2;
  propertySize = Math.min(10, propertySize);

  // EPC rating (10 pts)
  const epcScores: Record<string, number> = { A: 3, B: 5, C: 7, D: 10, E: 8, F: 4, G: 2 };
  const epcRating = epcScores[prop.epcRating?.charAt(0)?.toUpperCase() ?? 'D'] ?? 5;

  // Distance to substation (10 pts)
  let distanceToSubstation: number;
  if (distKm < 0.5) distanceToSubstation = 10;
  else if (distKm < 1) distanceToSubstation = 7;
  else if (distKm < 2) distanceToSubstation = 4;
  else distanceToSubstation = 2;

  // Cluster potential (5 pts)
  let clusterPotential: number;
  if (nearbyPropertyCount >= 5) clusterPotential = 5;
  else if (nearbyPropertyCount >= 2) clusterPotential = 3;
  else clusterPotential = 1;

  const breakdown: PropertyScoreBreakdown = {
    threePhaseSubstation, solarPresence, substationHeadroom,
    gardenAccess, propertySize, epcRating, distanceToSubstation, clusterPotential,
  };
  const totalScore = Object.values(breakdown).reduce((s, v) => s + v, 0);
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
    threePhaseScore: prop.threePhaseConfirmed ? 100 : prop.threePhaseScore,
    gardenAccess: prop.gardenAccess,
    nearestSubstationNumber: nearestSub?.substationNumber ?? null,
    distanceKm: Math.round(distKm * 100) / 100,
    grade,
    gradeColor,
  };
}
