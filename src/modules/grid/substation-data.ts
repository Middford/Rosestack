// ============================================================
// Seeded ENWL Substation Data -- East Lancashire (BB postcode areas)
// Based on Electricity North West primary substation locations
// Corrected postcode-to-town mappings (March 2026)
//
// BB Postcode Coverage:
//   BB1  = Blackburn (centre, north)
//   BB2  = Blackburn (south), Darwen (north)
//   BB3  = Darwen (south)
//   BB4  = Rossendale (Haslingden, Rawtenstall, Bacup)
//   BB5  = Accrington, Oswaldtwistle, Church
//   BB6  = Blackburn (Wilpshire, Langho, Mellor Brook)
//   BB7  = Clitheroe, Whalley, Ribble Valley
//   BB8  = Colne, Trawden
//   BB9  = Nelson, Brierfield
//   BB10 = Burnley (centre, south)
//   BB11 = Burnley (south, Rose Grove)
//   BB12 = Burnley (Padiham, Hapton, Read, Simonstone)
//   BB18 = Barnoldswick, Earby (Pendle)
//
// NOTE: Longridge is PR3, NOT BB. No BB substation for Longridge.
// ============================================================

import type { Substation } from '@/shared/types';

export interface PostcodeArea {
  prefix: string;
  coverage: string;
  lat: number;
  lng: number;
  affluenceIndex: number; // 1-10 IMD-derived
}

/**
 * Correct BB postcode area definitions with accurate centroids and
 * affluence indices derived from Index of Multiple Deprivation 2019.
 */
export const postcodeAreas: PostcodeArea[] = [
  { prefix: 'BB1', coverage: 'Blackburn (centre, north)', lat: 53.7488, lng: -2.4828, affluenceIndex: 4 },
  { prefix: 'BB2', coverage: 'Blackburn (south), Darwen (north)', lat: 53.7250, lng: -2.4700, affluenceIndex: 5 },
  { prefix: 'BB3', coverage: 'Darwen (south)', lat: 53.6950, lng: -2.4620, affluenceIndex: 4 },
  { prefix: 'BB4', coverage: 'Rossendale (Haslingden, Rawtenstall, Bacup)', lat: 53.7000, lng: -2.2900, affluenceIndex: 4 },
  { prefix: 'BB5', coverage: 'Accrington, Oswaldtwistle, Church', lat: 53.7536, lng: -2.3638, affluenceIndex: 4 },
  { prefix: 'BB6', coverage: 'Blackburn (Wilpshire, Langho, Mellor Brook)', lat: 53.7870, lng: -2.4400, affluenceIndex: 8 },
  { prefix: 'BB7', coverage: 'Clitheroe, Whalley, Ribble Valley', lat: 53.8710, lng: -2.3920, affluenceIndex: 8 },
  { prefix: 'BB8', coverage: 'Colne, Trawden', lat: 53.8550, lng: -2.1750, affluenceIndex: 5 },
  { prefix: 'BB9', coverage: 'Nelson, Brierfield', lat: 53.8350, lng: -2.2180, affluenceIndex: 3 },
  { prefix: 'BB10', coverage: 'Burnley (centre, south)', lat: 53.7890, lng: -2.2480, affluenceIndex: 3 },
  { prefix: 'BB11', coverage: 'Burnley (south, Rose Grove)', lat: 53.7750, lng: -2.2350, affluenceIndex: 3 },
  { prefix: 'BB12', coverage: 'Burnley (Padiham, Hapton, Read, Simonstone)', lat: 53.7970, lng: -2.3130, affluenceIndex: 6 },
  { prefix: 'BB18', coverage: 'Barnoldswick, Earby (Pendle)', lat: 53.9130, lng: -2.1890, affluenceIndex: 5 },
];

/**
 * ENWL primary substations serving East Lancashire BB postcode areas.
 * All substations listed here are 33/11kV primary substations.
 * (Previous data incorrectly labelled some as "11kV" with 10-16 MVA
 *  capacity -- those are 33/11kV primaries, not 11kV distribution.)
 */
export const substations: Substation[] = [
  // --- BB1: Blackburn centre/north ---
  {
    id: 'enwl-bb1-001',
    name: 'Blackburn Central 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7488,
    longitude: -2.4828,
    capacityMva: 45,
    currentLoadPercent: 78,
    constraintStatus: 'approaching',
    flexibilityTenderActive: true,
    connectedHomes: 3200,
    maxNewConnections: 120,
  },
  {
    id: 'enwl-bb1-002',
    name: 'Blackburn East 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7520,
    longitude: -2.4600,
    capacityMva: 30,
    currentLoadPercent: 62,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 2100,
    maxNewConnections: 280,
  },

  // --- BB2: Blackburn south, Darwen north ---
  {
    id: 'enwl-bb2-001',
    name: 'Darwen North 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7100,
    longitude: -2.4650,
    capacityMva: 25,
    currentLoadPercent: 71,
    constraintStatus: 'approaching',
    flexibilityTenderActive: true,
    connectedHomes: 1800,
    maxNewConnections: 90,
  },

  // --- BB3: Darwen south ---
  {
    id: 'enwl-bb3-001',
    name: 'Darwen South 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.6950,
    longitude: -2.4620,
    capacityMva: 20,
    currentLoadPercent: 55,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 1200,
    maxNewConnections: 300,
  },

  // --- BB4: Rossendale (Haslingden, Rawtenstall, Bacup) ---
  {
    id: 'enwl-bb4-001',
    name: 'Rawtenstall 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7010,
    longitude: -2.2880,
    capacityMva: 22,
    currentLoadPercent: 88,
    constraintStatus: 'constrained',
    flexibilityTenderActive: true,
    connectedHomes: 1500,
    maxNewConnections: 25,
  },
  {
    id: 'enwl-bb4-002',
    name: 'Haslingden 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7040,
    longitude: -2.3280,
    capacityMva: 15,
    currentLoadPercent: 76,
    constraintStatus: 'approaching',
    flexibilityTenderActive: false,
    connectedHomes: 850,
    maxNewConnections: 100,
  },

  // --- BB5: Accrington, Oswaldtwistle, Church ---
  {
    id: 'enwl-bb5-001',
    name: 'Accrington 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7536,
    longitude: -2.3638,
    capacityMva: 35,
    currentLoadPercent: 82,
    constraintStatus: 'approaching',
    flexibilityTenderActive: true,
    connectedHomes: 2400,
    maxNewConnections: 85,
  },
  {
    id: 'enwl-bb5-002',
    name: 'Oswaldtwistle 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7440,
    longitude: -2.3930,
    capacityMva: 15,
    currentLoadPercent: 45,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 900,
    maxNewConnections: 350,
  },

  // --- BB6: Wilpshire, Langho, Mellor Brook ---
  {
    id: 'enwl-bb6-001',
    name: 'Wilpshire 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7870,
    longitude: -2.4400,
    capacityMva: 18,
    currentLoadPercent: 42,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 800,
    maxNewConnections: 400,
  },

  // --- BB7: Clitheroe, Whalley, Ribble Valley ---
  {
    id: 'enwl-bb7-001',
    name: 'Clitheroe 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.8710,
    longitude: -2.3920,
    capacityMva: 18,
    currentLoadPercent: 42,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 800,
    maxNewConnections: 400,
  },
  {
    id: 'enwl-bb7-002',
    name: 'Whalley 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.8220,
    longitude: -2.4100,
    capacityMva: 12,
    currentLoadPercent: 38,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 500,
    maxNewConnections: 300,
  },

  // --- BB8: Colne, Trawden ---
  {
    id: 'enwl-bb8-001',
    name: 'Colne 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.8560,
    longitude: -2.1760,
    capacityMva: 20,
    currentLoadPercent: 68,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 1400,
    maxNewConnections: 200,
  },

  // --- BB9: Nelson, Brierfield ---
  {
    id: 'enwl-bb9-001',
    name: 'Nelson 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.8350,
    longitude: -2.2180,
    capacityMva: 28,
    currentLoadPercent: 85,
    constraintStatus: 'constrained',
    flexibilityTenderActive: true,
    connectedHomes: 1900,
    maxNewConnections: 20,
  },

  // --- BB10: Burnley centre/south ---
  {
    id: 'enwl-bb10-001',
    name: 'Burnley Central 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7890,
    longitude: -2.2480,
    capacityMva: 40,
    currentLoadPercent: 74,
    constraintStatus: 'approaching',
    flexibilityTenderActive: true,
    connectedHomes: 2800,
    maxNewConnections: 150,
  },

  // --- BB11: Burnley south, Rose Grove ---
  {
    id: 'enwl-bb11-001',
    name: 'Rose Grove 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7750,
    longitude: -2.2350,
    capacityMva: 16,
    currentLoadPercent: 72,
    constraintStatus: 'approaching',
    flexibilityTenderActive: false,
    connectedHomes: 1100,
    maxNewConnections: 80,
  },

  // --- BB12: Padiham, Hapton, Read, Simonstone ---
  {
    id: 'enwl-bb12-001',
    name: 'Padiham 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.7970,
    longitude: -2.3130,
    capacityMva: 14,
    currentLoadPercent: 91,
    constraintStatus: 'constrained',
    flexibilityTenderActive: true,
    connectedHomes: 700,
    maxNewConnections: 10,
  },

  // --- BB18: Barnoldswick, Earby ---
  {
    id: 'enwl-bb18-001',
    name: 'Barnoldswick 33/11kV',
    dnoRegion: 'ENWL',
    latitude: 53.9130,
    longitude: -2.1890,
    capacityMva: 12,
    currentLoadPercent: 48,
    constraintStatus: 'unconstrained',
    flexibilityTenderActive: false,
    connectedHomes: 600,
    maxNewConnections: 250,
  },
];

// Flexibility tender data keyed by substation ID
export const flexibilityTenders: Record<string, {
  tenderId: string;
  valuePerMwPerHour: number;
  totalAnnualValue: number;
  windowStart: string;
  windowEnd: string;
  seasonality: string;
  status: 'open' | 'awarded' | 'pending';
}> = {
  'enwl-bb1-001': {
    tenderId: 'FLEX-ENW-2026-001',
    valuePerMwPerHour: 85,
    totalAnnualValue: 42000,
    windowStart: '16:00',
    windowEnd: '19:00',
    seasonality: 'Winter peak',
    status: 'open',
  },
  'enwl-bb2-001': {
    tenderId: 'FLEX-ENW-2026-002',
    valuePerMwPerHour: 72,
    totalAnnualValue: 35000,
    windowStart: '16:30',
    windowEnd: '19:30',
    seasonality: 'Winter peak',
    status: 'open',
  },
  'enwl-bb4-001': {
    tenderId: 'FLEX-ENW-2026-003',
    valuePerMwPerHour: 110,
    totalAnnualValue: 58000,
    windowStart: '16:00',
    windowEnd: '20:00',
    seasonality: 'All year',
    status: 'open',
  },
  'enwl-bb5-001': {
    tenderId: 'FLEX-ENW-2026-004',
    valuePerMwPerHour: 95,
    totalAnnualValue: 48000,
    windowStart: '16:00',
    windowEnd: '19:00',
    seasonality: 'Winter peak',
    status: 'awarded',
  },
  'enwl-bb9-001': {
    tenderId: 'FLEX-ENW-2026-005',
    valuePerMwPerHour: 105,
    totalAnnualValue: 52000,
    windowStart: '16:00',
    windowEnd: '19:00',
    seasonality: 'Winter peak',
    status: 'pending',
  },
  'enwl-bb10-001': {
    tenderId: 'FLEX-ENW-2026-006',
    valuePerMwPerHour: 78,
    totalAnnualValue: 38000,
    windowStart: '17:00',
    windowEnd: '19:30',
    seasonality: 'Winter peak',
    status: 'open',
  },
  'enwl-bb12-001': {
    tenderId: 'FLEX-ENW-2026-007',
    valuePerMwPerHour: 120,
    totalAnnualValue: 65000,
    windowStart: '15:30',
    windowEnd: '20:00',
    seasonality: 'All year',
    status: 'open',
  },
};
