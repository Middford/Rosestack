// ============================================================
// Seeded Property Data — East Lancashire BB postcodes
// Real EPC data is in epc-seed.ts (390 properties from the EPC API, March 2026).
// This file provides the TargetProperty interface used by the grid UI and scoring.
// The generated properties below are kept as fallback/scaffold.
// Use EPC_TARGET_PROPERTIES from epc-seed.ts for prospecting and map displays.
// ============================================================

import type { PropertyType } from '@/shared/types';

export {
  EPC_TARGET_PROPERTIES,
  getEpcPropertiesByPostcode,
  getEpcPropertiesBySubstation,
  getTopEpcProspects,
} from './epc-seed';
export type { EpcTargetProperty } from './epc-seed';

export interface TargetProperty {
  id: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  bedrooms: number;
  builtYear: number;
  epcRating: string;
  epcScore: number;
  currentHeating: string;
  gardenAccess: boolean;
  threePhaseConfirmed: boolean;
  threePhaseScore: number; // 0-100 likelihood
  nearestSubstationId: string;
  distanceToSubstationKm: number;
  affluenceIndex: number; // 1-10 (10 = most affluent)
  clusterCount: number; // existing RoseStack homes within 500m
}

// Seeded deterministic data generator for BB postcodes
const postcodeAreas = [
  { prefix: 'BB1', lat: 53.748, lng: -2.483, affluence: 5 },
  { prefix: 'BB2', lat: 53.698, lng: -2.460, affluence: 6 },
  { prefix: 'BB3', lat: 53.787, lng: -2.407, affluence: 5 },
  { prefix: 'BB4', lat: 53.687, lng: -2.275, affluence: 4 },
  { prefix: 'BB5', lat: 53.754, lng: -2.364, affluence: 5 },
  { prefix: 'BB6', lat: 53.789, lng: -2.248, affluence: 4 },
  { prefix: 'BB7', lat: 53.871, lng: -2.392, affluence: 8 },
  { prefix: 'BB8', lat: 53.797, lng: -2.313, affluence: 5 },
  { prefix: 'BB9', lat: 53.855, lng: -2.165, affluence: 4 },
  { prefix: 'BB10', lat: 53.822, lng: -2.410, affluence: 7 },
  { prefix: 'BB11', lat: 53.831, lng: -2.597, affluence: 7 },
  { prefix: 'BB12', lat: 53.704, lng: -2.328, affluence: 5 },
];

const streetNames = [
  'Whalley Road', 'Preston New Road', 'Bolton Road', 'Burnley Road',
  'Blackburn Road', 'Accrington Road', 'Haslingden Road', 'Padiham Road',
  'Clitheroe Road', 'Ribble Valley Way', 'Pendle View', 'Calder Close',
  'Rossendale Drive', 'Hyndburn Avenue', 'Ribchester Lane', 'Longridge Road',
  'Mellor Lane', 'Wilpshire Drive', 'Langho Close', 'Read Lane',
];

const propertyTypes: PropertyType[] = ['detached', 'semi', 'terrace', 'bungalow', 'farm'];
const epcRatings = ['A', 'B', 'C', 'D', 'E'];
const heatingTypes = ['gas boiler', 'oil boiler', 'electric storage', 'heat pump', 'LPG boiler'];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function findNearestSubstation(lat: number, lng: number): { id: string; distance: number } {
  const substationCoords = [
    { id: 'enwl-bb1-001', lat: 53.7488, lng: -2.4828 },
    { id: 'enwl-bb1-002', lat: 53.7520, lng: -2.4600 },
    { id: 'enwl-bb2-001', lat: 53.6980, lng: -2.4600 },
    { id: 'enwl-bb3-001', lat: 53.7870, lng: -2.4070 },
    { id: 'enwl-bb4-001', lat: 53.6870, lng: -2.2750 },
    { id: 'enwl-bb5-001', lat: 53.7536, lng: -2.3638 },
    { id: 'enwl-bb5-002', lat: 53.7440, lng: -2.3930 },
    { id: 'enwl-bb6-001', lat: 53.7890, lng: -2.2480 },
    { id: 'enwl-bb7-001', lat: 53.8710, lng: -2.3920 },
    { id: 'enwl-bb8-001', lat: 53.7970, lng: -2.3130 },
    { id: 'enwl-bb9-001', lat: 53.8550, lng: -2.1650 },
    { id: 'enwl-bb9-002', lat: 53.8350, lng: -2.2180 },
    { id: 'enwl-bb10-001', lat: 53.8220, lng: -2.4100 },
    { id: 'enwl-bb11-001', lat: 53.8310, lng: -2.5970 },
    { id: 'enwl-bb12-001', lat: 53.7040, lng: -2.3280 },
  ];

  let nearest = substationCoords[0];
  let minDist = Infinity;
  for (const s of substationCoords) {
    const dlat = (s.lat - lat) * 111;
    const dlng = (s.lng - lng) * 111 * Math.cos(lat * Math.PI / 180);
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    if (dist < minDist) {
      minDist = dist;
      nearest = s;
    }
  }
  return { id: nearest.id, distance: Math.round(minDist * 100) / 100 };
}

function generateProperties(): TargetProperty[] {
  const properties: TargetProperty[] = [];
  let id = 1;

  for (const area of postcodeAreas) {
    const count = 8 + Math.floor(seededRandom(id * 17) * 7); // 8-14 properties per area
    for (let i = 0; i < count; i++) {
      const seed = id * 31 + i * 7;
      const r = (n: number) => seededRandom(seed + n);

      const lat = area.lat + (r(1) - 0.5) * 0.03;
      const lng = area.lng + (r(2) - 0.5) * 0.04;
      const propType = propertyTypes[Math.floor(r(3) * propertyTypes.length)];
      const bedrooms = propType === 'detached' || propType === 'farm' ? 4 + Math.floor(r(4) * 3) : 2 + Math.floor(r(4) * 3);
      const builtYear = 1920 + Math.floor(r(5) * 90);
      const epcIdx = Math.floor(r(6) * epcRatings.length);
      const epcRating = epcRatings[epcIdx];
      const heating = heatingTypes[Math.floor(r(7) * heatingTypes.length)];
      const garden = r(8) > 0.2;
      const street = streetNames[Math.floor(r(9) * streetNames.length)];
      const houseNum = 1 + Math.floor(r(10) * 120);
      const suffix = Math.floor(r(11) * 9) + 1;
      const postcode = `${area.prefix} ${suffix}${['AA', 'AB', 'BA', 'BB', 'DA', 'EA', 'HA', 'LA'][Math.floor(r(12) * 8)]}`;

      const isLargeOld = (propType === 'detached' || propType === 'farm') && builtYear < 1970;
      const threePhaseConfirmed = r(13) > 0.85 && isLargeOld;
      const threePhaseScore = threePhaseConfirmed
        ? 95
        : isLargeOld
          ? 60 + Math.floor(r(14) * 30)
          : propType === 'detached'
            ? 30 + Math.floor(r(14) * 25)
            : 10 + Math.floor(r(14) * 20);

      const nearest = findNearestSubstation(lat, lng);
      const affluence = Math.max(1, Math.min(10, area.affluence + Math.floor((r(15) - 0.5) * 4)));
      const cluster = Math.floor(r(16) * 4);

      properties.push({
        id: `prop-${String(id).padStart(4, '0')}`,
        address: `${houseNum} ${street}`,
        postcode,
        latitude: lat,
        longitude: lng,
        propertyType: propType,
        bedrooms,
        builtYear,
        epcRating,
        epcScore: 100 - epcIdx * 20,
        currentHeating: heating,
        gardenAccess: garden,
        threePhaseConfirmed,
        threePhaseScore,
        nearestSubstationId: nearest.id,
        distanceToSubstationKm: nearest.distance,
        affluenceIndex: affluence,
        clusterCount: cluster,
      });

      id++;
    }
  }

  return properties;
}

// Real EPC data replaces the generated properties.
// Adapts EpcTargetProperty → TargetProperty so all existing consumers work unchanged.
import { EPC_TARGET_PROPERTIES } from './epc-seed';
import type { EpcTargetProperty } from './epc-seed';

function adaptEpcToTargetProperty(epc: EpcTargetProperty): TargetProperty {
  return {
    id: epc.id,
    address: epc.address,
    postcode: epc.postcode,
    latitude: epc.latitude,
    longitude: epc.longitude,
    propertyType: epc.propertyType,
    bedrooms: epc.bedrooms,
    builtYear: epc.builtYear,
    epcRating: epc.epcRating,
    epcScore: epc.epcSapScore,
    currentHeating: epc.currentHeating,
    gardenAccess: epc.gardenAccess,
    threePhaseConfirmed: epc.threePhaseConfirmed,
    threePhaseScore: epc.threePhaseScore,
    nearestSubstationId: epc.nearestSubstationId,
    distanceToSubstationKm: epc.distanceToSubstationKm,
    affluenceIndex: epc.affluenceIndex,
    clusterCount: 0, // No existing clusters yet — updated as fleet grows
  };
}

export const targetProperties: TargetProperty[] = EPC_TARGET_PROPERTIES.map(adaptEpcToTargetProperty);

export function getPropertiesByPostcode(prefix: string): TargetProperty[] {
  const upper = prefix.toUpperCase().trim();
  return targetProperties.filter(p => p.postcode.startsWith(upper));
}

export function getPropertiesBySubstation(substationId: string): TargetProperty[] {
  return targetProperties.filter(p => p.nearestSubstationId === substationId);
}
