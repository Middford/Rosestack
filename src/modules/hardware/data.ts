// ============================================================
// Hardware Module — Seeded Data
//
// Slimmed to RoseStack-relevant products only:
//   Batteries:  Fogstar (48.3 & 64.4kWh), SigenStor (residential), SigenStack (C&I)
//   Inverters:  Deye 20K, Sigenergy M1 100kW, Fox ESS H3 12kW, Solis S6 30kW
//
// Compatibility notes:
//   IOF approved: Sigenergy (battery + inverter), Fox ESS
//   Axle VPP:     Sigenergy, Fox ESS, Solis (Deye coming)
//   Flux/Agile:   All (you control the battery)
// ============================================================

import type {
  BatterySpec,
  InverterSpec,
  SolarPanelSpec,
  HeatPumpSpec,
  CompatibilityEntry,
} from './types';

// --- Batteries ---

export const batteries: BatterySpec[] = [
  // ── Fogstar — best £/kWh, LV, no IOF but great for Flux/Agile + Axle ──
  {
    id: 'bat-fogstar',
    manufacturer: 'Fogstar',
    model: 'Fogstar Energy 48.3kWh Stack (3 × 16.1kWh)',
    category: 'battery',
    capacityPerModuleKwh: 48.3,
    maxModulesPerString: 1,         // each "stack" is 3 modules pre-wired
    chemistry: 'LFP',
    cycleLife: 8000,
    degradationRatePercent: 1.5,
    roundTripEfficiency: 93,
    chargeRateKw: 7.5,             // per stack (150A × 51.2V)
    dischargeRateKw: 7.5,
    ipRating: 'IP21',
    weightKg: 135,
    operatingTempMin: -15,          // integrated heating
    operatingTempMax: 50,
    warrantyYears: 10,
    wholesalePriceGbp: 4999,        // 3-module stack
    mcsCertified: true,
    iofCompatible: false,
    axleVppCompatible: false,       // Deye cloud integration pending
    compatibleInverters: ['inv-deye-20k', 'inv-solis-30k'],
    notes: '314Ah LiFePO4. JK 2A active balancing. Built-in aerosol fire suppression. Integrated heating for charging to -15°C. 150A SEPLOS BMS. 350A breaker. LCD touchscreen. CAN/RS485 comms. Scales to 1.23MWh in parallel.',
  },
  {
    id: 'bat-fogstar-64',
    manufacturer: 'Fogstar',
    model: 'Fogstar Energy 64.4kWh Stack (4 × 16.1kWh)',
    category: 'battery',
    capacityPerModuleKwh: 64.4,
    maxModulesPerString: 1,         // each "stack" is 4 modules pre-wired
    chemistry: 'LFP',
    cycleLife: 8000,
    degradationRatePercent: 1.5,
    roundTripEfficiency: 93,
    chargeRateKw: 7.5,
    dischargeRateKw: 7.5,
    ipRating: 'IP21',
    weightKg: 180,
    operatingTempMin: -15,
    operatingTempMax: 50,
    warrantyYears: 10,
    wholesalePriceGbp: 5999,        // 4-module stack
    mcsCertified: true,
    iofCompatible: false,
    axleVppCompatible: false,       // Deye cloud integration pending
    compatibleInverters: ['inv-deye-20k', 'inv-solis-30k'],
    notes: '314Ah LiFePO4. JK 2A active balancing. Built-in aerosol fire suppression. Integrated heating. 150A SEPLOS BMS. 350A breaker. Scales to 1.23MWh in parallel.',
  },

  // ── SigenStor — residential, IOF approved, up to 54kWh per controller ──
  {
    id: 'bat-sigenstor',
    manufacturer: 'Sigenergy',
    model: 'SigenStor 9kWh Module',
    category: 'battery',
    capacityPerModuleKwh: 9,        // BAT-9.0 module (usable ~8.76kWh)
    maxModulesPerString: 6,         // 6 modules per energy controller = 54kWh
    chemistry: 'LFP',
    cycleLife: 8000,
    degradationRatePercent: 1.5,
    roundTripEfficiency: 96,
    chargeRateKw: 6,                // per controller, not per module
    dischargeRateKw: 6,
    ipRating: 'IP65',
    weightKg: 65,                   // per module
    operatingTempMin: -10,
    operatingTempMax: 50,
    warrantyYears: 15,              // 70% capacity guaranteed at 10yr
    wholesalePriceGbp: 3500,        // per 9kWh module
    mcsCertified: true,
    iofCompatible: true,            // Official Octopus IOF approved list
    axleVppCompatible: true,        // Sigenergy confirmed on Axle VPP
    compatibleInverters: ['inv-sigenergy-m1'],
    notes: 'Residential all-in-one. Up to 5 SigenStor systems in parallel = 270kWh max. mySigen app with 10s refresh. Octopus Agile API auto-sync. UK retail from £6,000 (6kW + 1 module).',
  },

  // ── SigenStack — C&I, IOF approved, scales to MWh+ ──
  {
    id: 'bat-sigenstack',
    manufacturer: 'Sigenergy',
    model: 'SigenStack 12kWh Module (BAT-12.0)',
    category: 'battery',
    capacityPerModuleKwh: 12.06,    // BAT-12.0 per module
    maxModulesPerString: 21,        // 7 per stack × 3 stacks = 21 modules = 253kWh per inverter
    chemistry: 'LFP',
    cycleLife: 8000,
    degradationRatePercent: 1.5,
    roundTripEfficiency: 96,
    chargeRateKw: 19.6,             // per stack of 7 (137.5kW / 7 stacks-ish — scales with modules)
    dischargeRateKw: 19.6,
    ipRating: 'IP66',               // outdoor rated
    weightKg: 125,                  // per module
    operatingTempMin: -10,
    operatingTempMax: 50,
    warrantyYears: 15,
    wholesalePriceGbp: 3542,        // per 12kWh module (Powerland UK price)
    mcsCertified: true,
    iofCompatible: true,            // Sigenergy on Octopus IOF approved list
    axleVppCompatible: true,        // Sigenergy confirmed on Axle VPP
    compatibleInverters: ['inv-sigenergy-m1'],
    notes: 'C&I modular BESS. 7 modules per stack (84kWh), 3 stacks per inverter (253kWh), 100 stacks in parallel for MW-scale. DC-coupled with HYA inverter. Active balancing. Pack-level fire safety. Bulgarian 10MW/20MWh project uses 90 SigenStacks.',
  },
];

// --- Inverters ---

export const inverters: InverterSpec[] = [
  // ── Sigenergy M1 100kW — pairs with SigenStor + SigenStack, IOF approved ──
  {
    id: 'inv-sigenergy-m1',
    manufacturer: 'Sigenergy',
    model: 'M1 HYA 100kW 3-Phase Hybrid',
    category: 'inverter',
    maxPvInputKw: 200,              // 2× rated
    maxBatteryCapacityKwh: 253,     // 21 × 12kWh SigenStack modules (3 stacks of 7)
    mpptTrackers: 6,
    hybrid: true,
    threePhase: true,
    g99Compliant: true,
    iofCompatible: true,
    axleVppCompatible: true,
    octopusApiIntegration: true,    // Native mySigen → Octopus API sync
    homeAssistantCompatible: true,
    priceGbp: 8000,                 // estimated from Solareon package pricing
    warrantyYears: 10,
    maxOutputKw: 100,
  },

  // ── Deye 20K — pairs with Fogstar, budget champion ──
  {
    id: 'inv-deye-20k',
    manufacturer: 'Deye',
    model: 'SUN-20K-SG05LP3-EU-SM2 20kW 3-Phase Hybrid LV',
    category: 'inverter',
    maxPvInputKw: 40,               // 2× oversize
    maxBatteryCapacityKwh: 500,     // LV — limited by BMS, not inverter
    mpptTrackers: 2,
    hybrid: true,
    threePhase: true,
    g99Compliant: true,             // VDE 4105, EN 50549, IEC 62109
    iofCompatible: false,           // Not on Octopus IOF list
    axleVppCompatible: false,       // Deye listed on Axle homepage but not live yet
    octopusApiIntegration: false,
    homeAssistantCompatible: true,  // Via Modbus / SolarAssistant
    priceGbp: 1748,                 // Alibaba Greensun (1-9 units, European warehouse)
    warrantyYears: 10,
    maxOutputKw: 20,
    imageUrl: undefined,
  },

  // ── Fox ESS H3 12kW — IOF approved, Axle VPP confirmed ──
  {
    id: 'inv-fox-ess',
    manufacturer: 'Fox ESS',
    model: 'H3 12kW 3-Phase Hybrid',
    category: 'inverter',
    maxPvInputKw: 24,
    maxBatteryCapacityKwh: 41.6,    // 4 × 10.4kWh Fox ESS batteries
    mpptTrackers: 2,
    hybrid: true,
    threePhase: true,
    g99Compliant: true,
    iofCompatible: true,            // On Octopus IOF approved list
    axleVppCompatible: true,        // Fox ESS confirmed Axle VPP partner
    octopusApiIntegration: false,
    homeAssistantCompatible: true,
    priceGbp: 2800,
    warrantyYears: 10,
    maxOutputKw: 12,
  },

  // ── Solis S6 30kW — powerful 3-phase, Axle VPP, no IOF ──
  {
    id: 'inv-solis-30k',
    manufacturer: 'Solis',
    model: 'S6-EH3P30K-H-LV 30kW 3-Phase Hybrid',
    category: 'inverter',
    maxPvInputKw: 60,               // 2× rated PV
    maxBatteryCapacityKwh: 500,     // LV — limited by batteries, not inverter
    mpptTrackers: 3,
    hybrid: true,
    threePhase: true,
    g99Compliant: true,             // EN 50549, G99 compliant
    iofCompatible: false,           // Not on Octopus IOF list
    axleVppCompatible: true,        // Solis confirmed Axle VPP partner
    octopusApiIntegration: false,
    homeAssistantCompatible: true,  // Via SolisCloud API
    priceGbp: 3604,                 // Alibaba Greensun (1-19 units). UK wholesale ~£2,611 ex-VAT via Solareon
    warrantyYears: 10,
    maxOutputKw: 30,
  },
];

// --- Solar Panels ---

export const solarPanels: SolarPanelSpec[] = [
  {
    id: 'sol-longi-himo7',
    manufacturer: 'LONGi',
    model: 'Hi-MO 7 580W',
    category: 'solar',
    wattage: 580,
    efficiency: 22.5,
    panelType: 'monocrystalline',
    warrantyYears: 30,
    degradationRatePercent: 0.4,
    dimensions: '2278x1134x30mm',
    weightKg: 28.5,
    priceGbp: 195,
    tempCoefficientPercent: -0.29,
  },
  {
    id: 'sol-jinko-tiger-neo',
    manufacturer: 'JinkoSolar',
    model: 'Tiger Neo 570W',
    category: 'solar',
    wattage: 570,
    efficiency: 22.3,
    panelType: 'monocrystalline',
    warrantyYears: 30,
    degradationRatePercent: 0.4,
    dimensions: '2278x1134x30mm',
    weightKg: 28.2,
    priceGbp: 185,
    tempCoefficientPercent: -0.30,
  },
  {
    id: 'sol-canadian-topbihiku',
    manufacturer: 'Canadian Solar',
    model: 'TOPBiHiKu7 585W',
    category: 'solar',
    wattage: 585,
    efficiency: 22.8,
    panelType: 'monocrystalline',
    warrantyYears: 25,
    degradationRatePercent: 0.45,
    dimensions: '2278x1134x35mm',
    weightKg: 29.0,
    priceGbp: 200,
    tempCoefficientPercent: -0.29,
  },
  {
    id: 'sol-trina-vertex-s',
    manufacturer: 'Trina Solar',
    model: 'Vertex S+ 445W',
    category: 'solar',
    wattage: 445,
    efficiency: 22.2,
    panelType: 'monocrystalline',
    warrantyYears: 25,
    degradationRatePercent: 0.45,
    dimensions: '1762x1134x30mm',
    weightKg: 21.8,
    priceGbp: 155,
    tempCoefficientPercent: -0.29,
  },
  {
    id: 'sol-sunpower-maxeon',
    manufacturer: 'SunPower',
    model: 'Maxeon 7 430W',
    category: 'solar',
    wattage: 430,
    efficiency: 24.1,
    panelType: 'monocrystalline',
    warrantyYears: 40,
    degradationRatePercent: 0.25,
    dimensions: '1872x1032x40mm',
    weightKg: 22.0,
    priceGbp: 350,
    tempCoefficientPercent: -0.27,
  },
  {
    id: 'sol-rec-alpha-pure',
    manufacturer: 'REC',
    model: 'Alpha Pure-RX 470W',
    category: 'solar',
    wattage: 470,
    efficiency: 22.6,
    panelType: 'monocrystalline',
    warrantyYears: 25,
    degradationRatePercent: 0.25,
    dimensions: '2056x1032x30mm',
    weightKg: 22.5,
    priceGbp: 280,
    tempCoefficientPercent: -0.26,
  },
];

// --- Heat Pumps ---

export const heatPumps: HeatPumpSpec[] = [
  {
    id: 'hp-mitsubishi-ecodan',
    manufacturer: 'Mitsubishi',
    model: 'Ecodan R290 PUZ-WZ 8.5kW',
    category: 'heat-pump',
    copRating: 4.2,
    copAtMinus5: 2.8,
    heatingCapacityKw: 8.5,
    noiseDb: 45,
    refrigerant: 'R290',
    mcsCertified: true,
    priceGbp: 6500,
    warrantyYears: 7,
    suitableForLancashire: true,
    smartTariffIntegration: true,
  },
  {
    id: 'hp-daikin-altherma',
    manufacturer: 'Daikin',
    model: 'Altherma 3 H HT 9kW',
    category: 'heat-pump',
    copRating: 4.0,
    copAtMinus5: 2.6,
    heatingCapacityKw: 9,
    noiseDb: 47,
    refrigerant: 'R290',
    mcsCertified: true,
    priceGbp: 7200,
    warrantyYears: 5,
    suitableForLancashire: true,
    smartTariffIntegration: true,
  },
  {
    id: 'hp-vaillant-arotherm',
    manufacturer: 'Vaillant',
    model: 'aroTHERM plus 7kW',
    category: 'heat-pump',
    copRating: 5.4,
    copAtMinus5: 3.0,
    heatingCapacityKw: 7,
    noiseDb: 42,
    refrigerant: 'R290',
    mcsCertified: true,
    priceGbp: 7800,
    warrantyYears: 7,
    suitableForLancashire: true,
    smartTariffIntegration: true,
  },
];

// --- Compatibility Matrix ---

export const compatibilityMatrix: CompatibilityEntry[] = [
  // Fogstar 48.3kWh — LV batteries, pair with Deye or Solis
  { batteryId: 'bat-fogstar', inverterId: 'inv-deye-20k', compatible: true, iofEligible: false, notes: 'RoseStack primary config — best £/kWh' },
  { batteryId: 'bat-fogstar', inverterId: 'inv-solis-30k', compatible: true, iofEligible: false, notes: 'LV compatible, 30kW per inverter' },
  { batteryId: 'bat-fogstar', inverterId: 'inv-sigenergy-m1', compatible: false, iofEligible: false, notes: 'Sigenergy M1 requires SigenStack/SigenStor batteries' },
  { batteryId: 'bat-fogstar', inverterId: 'inv-fox-ess', compatible: false, iofEligible: false, notes: 'Fox ESS uses proprietary battery interface' },

  // Fogstar 64.4kWh — same compatibility as 48.3
  { batteryId: 'bat-fogstar-64', inverterId: 'inv-deye-20k', compatible: true, iofEligible: false, notes: 'RoseStack primary config — 5 stacks × 64.4kWh = 322kWh' },
  { batteryId: 'bat-fogstar-64', inverterId: 'inv-solis-30k', compatible: true, iofEligible: false, notes: 'LV compatible, higher power per inverter than Deye' },
  { batteryId: 'bat-fogstar-64', inverterId: 'inv-sigenergy-m1', compatible: false, iofEligible: false },
  { batteryId: 'bat-fogstar-64', inverterId: 'inv-fox-ess', compatible: false, iofEligible: false },

  // SigenStor — residential, pairs with Sigenergy M1 only
  { batteryId: 'bat-sigenstor', inverterId: 'inv-sigenergy-m1', compatible: true, iofEligible: true, notes: 'Native pairing — residential IOF approved. Up to 5 parallel = 270kWh' },
  { batteryId: 'bat-sigenstor', inverterId: 'inv-deye-20k', compatible: false, iofEligible: false },
  { batteryId: 'bat-sigenstor', inverterId: 'inv-solis-30k', compatible: false, iofEligible: false },
  { batteryId: 'bat-sigenstor', inverterId: 'inv-fox-ess', compatible: false, iofEligible: false },

  // SigenStack — C&I, pairs with Sigenergy M1 HYA only
  { batteryId: 'bat-sigenstack', inverterId: 'inv-sigenergy-m1', compatible: true, iofEligible: true, notes: 'DC-coupled. 21 modules (253kWh) per inverter. 100 stacks parallel for MW-scale.' },
  { batteryId: 'bat-sigenstack', inverterId: 'inv-deye-20k', compatible: false, iofEligible: false },
  { batteryId: 'bat-sigenstack', inverterId: 'inv-solis-30k', compatible: false, iofEligible: false },
  { batteryId: 'bat-sigenstack', inverterId: 'inv-fox-ess', compatible: false, iofEligible: false },
];
