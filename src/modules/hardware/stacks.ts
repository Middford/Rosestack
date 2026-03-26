// ============================================================
// Hardware Module — Reference Hardware Stacks
// Designed for RoseStack's 100-200kWh garden battery deployments
// ============================================================
//
// ===================== RESEARCH FINDINGS =====================
//
// --- NOISE LEVELS OF LARGE INVERTERS AND BATTERY SYSTEMS ---
//
// Inverter noise:
//   - Most hybrid inverters produce 40-55 dB at 1 metre during active operation.
//   - Sigenergy SigenStor AI Hub / M1: ~45 dB at 1m (fan-cooled, variable speed).
//     The AI Hub uses intelligent fan control that ramps down at night. Idle: <30 dB.
//   - GivEnergy All-in-One (AIO): ~42 dB at 1m. Integrated battery+inverter with
//     passive cooling for the battery cells and a small fan for the inverter stage.
//     The AIO 9.5 is one of the quieter units because the battery thermal mass
//     absorbs heat, reducing fan duty cycle.
//   - Huawei SUN2000 10KTL-M1: ~45 dB at 1m (natural convection + internal fans
//     that activate under load). The LUNA2000 battery modules are passively cooled
//     with no fans -- virtually silent (<25 dB).
//   - Tesla Powerwall 3: ~40 dB at 1m. Liquid-cooled with internal pump (quiet).
//     The integrated inverter uses a combination of liquid and passive cooling.
//   - Victron MultiPlus-II: ~45 dB at 1m (fan runs continuously under load).
//     Multiple units in parallel will compound: 3 units = ~50 dB at 1m.
//   - SMA Sunny Tripower: ~42 dB at 1m (convection-cooled, very quiet).
//   - Fronius GEN24: ~42 dB at 1m (active cooling fan).
//   - Fox ESS H3: ~44 dB at 1m.
//   - SolaX X3-Hybrid G4: ~44 dB at 1m.
//   - Sunsynk 8kW: ~43 dB at 1m.
//
// Battery module noise:
//   - LFP battery modules generally do NOT have active cooling fans.
//   - Huawei LUNA2000: Passive cooling, essentially silent.
//   - BYD Battery-Box: Passive cooling, silent.
//   - Pylontech Force H2: Passive cooling, silent.
//   - GivEnergy battery packs: Passive cooling when standalone, ~35 dB when
//     integrated AIO fan activates.
//   - Sigenergy SigenStack: Passive cooling, but the control unit has a small fan
//     (~35 dB at 1m when active).
//   - Tesla Powerwall 3: Liquid-cooled -- pump noise ~30 dB.
//   - CATL Naxtra: Passive cooling, silent.
//   - At 100kWh+ scale with many stacked modules, the main noise source is always
//     the inverter(s), not the batteries.
//
// Multiple inverters:
//   - When paralleling multiple inverters (e.g., 10x Victron MultiPlus-II for
//     50kW), noise compounds logarithmically:
//     2 identical sources = +3 dB, 4 = +6 dB, 10 = +10 dB.
//   - So 10x Victron at 45 dB each = ~55 dB at 1m from the array.
//   - A single Sigenergy M1 100kW unit at 45 dB is far quieter than 10 smaller
//     inverters achieving the same power.
//
// --- UK NOISE LIMITS FOR RESIDENTIAL EQUIPMENT ---
//
// BS 4142:2014+A1:2019 "Methods for rating and assessing industrial and
// commercial sound":
//   - Equipment noise should not exceed background sound level by more than +5 dB
//     at the nearest noise-sensitive receptor (i.e., a habitable room window).
//   - Typical rural/suburban Lancashire background at night: 30-35 dB(A).
//   - Therefore equipment must not exceed ~35-40 dB(A) at the nearest bedroom
//     window during night-time operation.
//   - Daytime background is typically 40-45 dB(A), giving a limit of ~45-50 dB(A).
//
// WHO Guidelines for Community Noise:
//   - Night-time outdoor guideline: 45 dB LAeq (free-field).
//   - Night-time indoor guideline: 30 dB LAeq.
//   - For sleep disturbance: 45 dB Lmax (outdoor) is the threshold above which
//     adverse effects on sleep begin.
//
// Permitted Development (MCS 020 / PAS 63100):
//   - Battery storage under Permitted Development in England: equipment noise
//     must not exceed 42 dB(A) at the boundary of the curtilage.
//   - If exceeding this, planning permission may be required.
//
// Sound attenuation with distance (inverse square law):
//   - Point source in open air: -6 dB per doubling of distance.
//   - 50 dB at 1m -> 44 dB at 2m -> 38 dB at 4m -> 32 dB at 8m -> 26 dB at 16m.
//   - A 45 dB inverter at 1m drops to ~33 dB at 5m and ~27 dB at 10m.
//   - Garage walls provide 20-30 dB of additional attenuation (brick = 30 dB,
//     timber = 15-20 dB, concrete block = 35 dB).
//   - A 45 dB inverter inside a brick garage is effectively 15 dB at 1m from
//     the outside wall, inaudible at any distance.
//
// --- PHASE SUPPLY IMPLICATIONS ---
//
// Single-phase (230V):
//   - UK single-phase supply: typically 80A or 100A main fuse.
//   - 100A at 230V = 23kW maximum total draw (all loads combined).
//   - DNO After Diversity Maximum Demand (ADMD) for homes is ~2kW, so a 100A
//     fuse has headroom, but battery charge/discharge competes with other loads.
//   - Practical maximum battery inverter on single phase: 5-11.5kW.
//   - For 100kWh of batteries on single phase, max discharge rate is limited to
//     ~5-10kW (not the battery's capability but the supply limit).
//   - This severely limits arbitrage revenue: 100kWh at 5kW = 20 hours to
//     discharge, meaning only ~1 cycle per day at best.
//   - Tesla Powerwall 3 is single-phase only at 11.5kW -- best single-phase option.
//
// Three-phase (400V):
//   - 3-phase supply: typically 80A per phase = 55kW total, or 100A = 69kW.
//   - Allows much larger inverters: 10kW, 30kW, 50kW, 100kW.
//   - Essential for any system where discharge rate needs to exceed ~10kW.
//   - For 100kWh+ systems, 3-phase is strongly recommended.
//   - For 150-200kWh systems, 3-phase is mandatory.
//
// 3-phase upgrades with ENWL (Electricity North West):
//   - Cost: typically 1,500-5,000 GBP depending on distance from transformer.
//   - If the transformer is at the end of the street, could be 1,500.
//   - If a new cable run of 50m+ is needed, could be 5,000-10,000.
//   - Timeline: 6-12 weeks typically, can be longer if civils work needed.
//   - Process: Apply via ENWL connections portal, get a quotation, accept and
//     pay, ENWL schedules the work.
//   - The property's consumer unit must be upgraded to 3-phase distribution board.
//   - Electrician cost for consumer unit upgrade: 800-1,500 GBP additional.
//
// You CANNOT install a 3-phase inverter on a single-phase supply.
// The inverter will fault immediately. No workaround exists.
//
// G99 (Engineering Recommendation G99):
//   - G98: simplified notification for systems up to 3.68kW per phase (11.04kW
//     total for 3-phase). Automatic approval in 28 days.
//   - G99: full application required for anything above G98 limits.
//   - G99 Stage 1: 11.04kW to 50kW per phase. DNO has 45 working days to respond.
//   - G99 Stage 2: above 50kW per phase. Full technical study required, 3-6 months.
//   - For RoseStack systems of 50-100kW, G99 Stage 1 or 2 applies.
//   - Cost: G99 application itself is free, but DNO may require a network study
//     (typically 500-2,000 GBP) and may impose reinforcement costs if the local
//     network cannot absorb the export.
//   - ENWL has an online portal for G99 applications.
//
// --- INSTALLATION LOCATIONS ---
//
// Garage installation:
//   - Noise: contained by walls (20-30 dB attenuation). Best for noise management.
//   - Ventilation: BS 7671 Chapter 57 requires adequate ventilation for battery
//     systems. Lithium batteries generate heat during charge/discharge. A garage
//     needs at least 2x ventilation openings (high and low) of 150cm2 each, or
//     mechanical ventilation if the garage is sealed.
//   - Fire safety: PAS 63100 requires 1m separation from combustible materials.
//     Fire-rated enclosure recommended. Smoke detection required.
//   - Floor loading: 100kWh of LFP batteries weighs approximately 800-1200kg.
//     Standard garage concrete slab can typically handle 2.5kN/m2 (250kg/m2).
//     A stack of 10 modules on a 0.5m2 footprint = 2000kg/m2 -- exceeds standard
//     slab. May need reinforced pad or spreader plate.
//   - Minimum garage size: 3m x 2m clear space for battery wall + inverter(s)
//     plus 1m access clearance all sides for maintenance.
//
// Garden shed / purpose-built enclosure:
//   - Can be positioned far from house for noise management.
//   - IP rating of components less critical if housed in weatherproof enclosure.
//   - Enclosure must be ventilated, non-combustible or fire-rated.
//   - Planning: a purpose-built enclosure may need planning permission if it
//     exceeds Permitted Development limits (2.5m height within 2m of boundary,
//     or 4m max height otherwise).
//   - Steel shipping container (10ft or 20ft) is a common commercial approach.
//     10ft container internal: 2.8m x 2.3m x 2.3m = fits ~150kWh easily.
//
// Open garden:
//   - All components need IP65+ rating minimum.
//   - Noise travels further without wall attenuation.
//   - Visual impact: large battery stacks are visually imposing. Screening with
//     fencing (1.8m) or planting helps but adds cost and maintenance.
//   - UV exposure: some battery enclosures degrade in direct sunlight. South-facing
//     installations should have shade structure.
//   - Ground: concrete pad or compacted gravel pad required. Minimum 150mm
//     concrete for systems over 500kg.
//
// Minimum separation distances (PAS 63100:2024 / BS 7671 Chapter 57):
//   - 1m from any habitable room window (BESS-specific requirement).
//   - 1m from any combustible wall or boundary fence.
//   - 0.6m maintenance access clearance on all serviceable sides.
//   - 3m from main gas meter/gas pipe entry point.
//   - No minimum distance from property boundary specified in PAS 63100 but
//     building regulations and noise considerations apply.
//
// --- SOLAR PV INTERACTION ---
//
// Hybrid vs AC-coupled:
//   - Hybrid inverter: one device handles both PV and battery. More efficient
//     (PV -> battery direct via DC, avoiding double conversion). Better for
//     new installations. But most hybrid inverters cap at 10-15kW PV input.
//   - AC-coupled: separate PV inverter and battery inverter. PV inverter converts
//     DC->AC, battery inverter converts AC->DC->AC (loses ~5% each conversion).
//     But allows any PV inverter with any battery system. Better for retrofits
//     where solar already exists.
//   - For RoseStack: the primary revenue is arbitrage, not solar self-consumption.
//     The battery system operates independently of any solar. AC-coupling is
//     therefore the natural choice -- it leaves the homeowner's existing solar
//     untouched and adds the battery as a separate system.
//   - For new-build "full package" installs, hybrid makes sense to save cost
//     on a second inverter.
//
// Existing solar:
//   - If the home already has solar with its own inverter (e.g., a 4kW SolarEdge),
//     RoseStack adds its battery+inverter as a separate AC-coupled system.
//   - The two systems operate independently on the same consumer unit.
//   - The homeowner keeps their existing SEG payments.
//   - RoseStack's battery can charge from grid (cheap rate) or from excess solar
//     if configured, but solar self-consumption optimisation is secondary to
//     arbitrage revenue.
//
// No solar:
//   - Installing solar as part of the RoseStack package adds upfront cost but
//     improves the proposition for the homeowner (they get solar + battery).
//   - SEG eligibility: any solar installation needs MCS certification for SEG.
//   - Typical 4kWp system on a Lancashire roof generates ~3,400 kWh/year.
//   - At 15p/kWh SEG, that is ~510/year additional revenue.
//   - Payback on 4kWp solar at ~5,000 installed = ~10 years via SEG alone,
//     but combined with battery self-consumption savings it drops to ~6-7 years.
//
// --- PHYSICAL DIMENSIONS REFERENCE ---
//
// Battery module dimensions (per module):
//   Sigenergy SigenStack 12kWh:   584 x 370 x 500mm, 125kg, stackable 8 high
//   Tesla Powerwall 3:            1098 x 628 x 193mm, 130kg, wall-mount, max 4
//   BYD HVS 2.56kWh module:      585 x 298 x 110mm, 25kg, stackable 6 high
//   BYD HVM 2.76kWh module:      585 x 298 x 110mm, 25kg, stackable 8 high
//   GivEnergy AIO 9.5kWh:        880 x 520 x 254mm, 85kg, wall-mount, max 4
//   Huawei LUNA2000-10:           670 x 150 x 600mm, 114kg per tower, max 4 modules
//   Pylontech Force H2 7.1kWh:   500 x 440 x 180mm, 82kg, rack-mount, 8 per rack
//   Fox ESS ECS 10.4kWh:         600 x 480 x 210mm, 108kg, wall-mount, max 4
//   SolaX Triple Power T63:      482 x 560 x 181mm, 68kg, wall-mount, max 4
//   Sunsynk ECCO 5.12kWh:        500 x 440 x 132mm, 52kg, stackable 8 high
//   Alpha ESS SMILE-G3 10.1kWh:  551 x 491 x 270mm, 100kg, floor-standing
//   CATL Naxtra 6.9kWh:          482 x 555 x 200mm, 85kg, stackable 6 high
//   Fogstar 10kWh:               530 x 480 x 200mm, 96kg, stackable 4 high
//
// Inverter dimensions:
//   Sigenergy M1 100kW:          750 x 540 x 280mm, 68kg
//   GivEnergy Giv-HY 6.0:       515 x 432 x 175mm, 28kg
//   SolaX X3-Hybrid G4 10kW:    482 x 417 x 181mm, 26kg
//   Fox ESS H3 12kW:            516 x 440 x 184mm, 27kg
//   Sunsynk 8kW 3-Phase:        460 x 418 x 180mm, 25kg
//   Huawei SUN2000 10KTL:       525 x 470 x 150mm, 23kg
//   Fronius GEN24 10.0:         530 x 495 x 165mm, 26kg
//   SMA Tripower 10.0 SE:       535 x 500 x 180mm, 28kg
//   Victron MultiPlus-II 5kVA:  362 x 258 x 218mm, 21kg (per unit, need multiples)
//
// ===================== END RESEARCH FINDINGS =================

import type {
  BatterySpec,
  InverterSpec,
  SolarPanelSpec,
  HeatPumpSpec,
} from './types';

// --- Stack-specific types ---

export type InstallationLocation = 'garage' | 'garden-enclosure' | 'open-garden' | 'shed';
export type PhaseRequirement = '1-phase' | '3-phase' | '3-phase-upgrade-needed';
export type G99Requirement = 'g98-notification' | 'g99-stage-1' | 'g99-stage-2' | 'not-required';

export interface NoiseProfile {
  /** dB(A) measured at 1 metre from the loudest component */
  atOneMetre: number;
  /** dB(A) at the nearest habitable room (varies by stack) */
  atNearestRoom: number;
  /** Distance assumed to nearest habitable room in metres */
  nearestRoomDistanceM: number;
  /** Whether it meets night-time BS 4142 limits (background + 5 dB) */
  meetsNightLimit: boolean;
  /** Notes on noise characteristics */
  notes: string;
}

export interface PhysicalFootprint {
  /** Total floor area of installed system including clearances, in m2 */
  totalFootprintM2: number;
  /** Width of the installed system (narrowest dimension), in mm */
  installedWidthMm: number;
  /** Depth of the installed system, in mm */
  installedDepthMm: number;
  /** Height of the tallest component, in mm */
  installedHeightMm: number;
  /** Total weight of all components, in kg */
  totalWeightKg: number;
  /** Whether all components fit through a standard 900mm garden gate */
  fitsStandardGate: boolean;
  /** Whether crane or forklift access is needed for installation */
  needsCraneAccess: boolean;
  /** Foundation requirements */
  foundationRequirement: 'standard-slab' | 'reinforced-pad' | 'spreader-plate' | 'concrete-pad-150mm';
  /** Minimum load-bearing capacity needed in kN/m2 */
  minLoadBearingKnM2: number;
  /** Minimum garden size needed (L x W in metres) */
  minGardenSizeM: string;
  /** Can battery modules be stacked vertically? */
  verticalStacking: boolean;
  /** Maximum stack height if vertical stacking is possible */
  maxStackHeight?: number;
  /** Visual impact description */
  visualImpact: string;
}

export interface StackComponent {
  /** Reference to battery spec ID from data.ts */
  batteryId: string;
  /** Battery model name (for display) */
  batteryModel: string;
  /** Number of battery modules */
  batteryModuleCount: number;
  /** Number of battery strings (groups of modules sharing a BMS) */
  batteryStringCount: number;
  /** Reference to inverter spec ID from data.ts */
  inverterId: string;
  /** Inverter model name (for display) */
  inverterModel: string;
  /** Number of inverters (for paralleled setups) */
  inverterCount: number;
  /** Optional: solar panel spec ID */
  solarPanelId?: string;
  /** Optional: solar panel model name */
  solarPanelModel?: string;
  /** Optional: number of solar panels */
  solarPanelCount?: number;
  /** Optional: heat pump spec ID */
  heatPumpId?: string;
  /** Optional: heat pump model name */
  heatPumpModel?: string;
}

export interface ReferenceStack {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  /** Target property scenario */
  targetScenario: string;
  /** Components in this stack */
  components: StackComponent;
  /** Total usable battery capacity in kWh */
  totalCapacityKwh: number;
  /** Maximum charge rate in kW */
  maxChargeRateKw: number;
  /** Maximum discharge rate in kW */
  maxDischargeRateKw: number;
  /** Phase requirement */
  phaseRequirement: PhaseRequirement;
  /** Preferred installation location */
  preferredLocation: InstallationLocation;
  /** Alternative installation locations */
  alternativeLocations: InstallationLocation[];
  /** G99 grid connection application requirement */
  g99Requirement: G99Requirement;
  /** Noise profile */
  noise: NoiseProfile;
  /** Physical footprint and dimensions */
  footprint: PhysicalFootprint;
  /** IOF (Octopus Intelligent Flux) compatible */
  iofCompatible: boolean;
  /** Estimated wholesale hardware cost in pence (integer) */
  wholesaleCostPence: number;
  /** Estimated installation cost in pence (integer) */
  installationCostPence: number;
  /** Estimated 3-phase upgrade cost in pence (if needed, 0 otherwise) */
  phaseUpgradeCostPence: number;
  /** Estimated G99 application / network study cost in pence */
  g99CostPence: number;
  /** Total estimated cost in pence */
  totalCostPence: number;
  /** Pros */
  pros: string[];
  /** Cons */
  cons: string[];
  /** Installation requirements and notes */
  installationNotes: string[];
  /** Coupling type for solar integration */
  solarCoupling: 'hybrid' | 'ac-coupled' | 'none';
}

// ============================================================
// REFERENCE HARDWARE STACKS
// ============================================================

export const referenceStacks: ReferenceStack[] = [

  // ----------------------------------------------------------
  // STACK 1: "Garage King"
  // 3-phase detached house with double garage
  // Maximum capacity, noise fully contained
  // ----------------------------------------------------------
  {
    id: 'stack-garage-king',
    name: 'Garage King',
    subtitle: '3-phase detached house with garage',
    description:
      'Maximum capacity configuration housed entirely within a double garage. ' +
      'The garage walls provide 25-30 dB of noise attenuation, making this the ' +
      'quietest possible installation despite using the most powerful hardware. ' +
      'Uses a single Sigenergy M1 100kW 3-phase hybrid inverter with 16x ' +
      'SigenStack 12kWh modules (2 strings of 8), delivering 192kWh of usable ' +
      'capacity and up to 96kW charge/discharge rate. This is the flagship stack ' +
      'for properties with garage access.',
    targetScenario: '3-phase detached house with double garage, 5m+ from nearest bedroom window',
    components: {
      batteryId: 'bat-sigenergy',
      batteryModel: 'Sigenergy SigenStack 12kWh',
      batteryModuleCount: 16,
      batteryStringCount: 2,
      inverterId: 'inv-sigenergy-m1',
      inverterModel: 'Sigenergy M1 100kW 3-Phase Hybrid',
      inverterCount: 1,
    },
    totalCapacityKwh: 192,
    maxChargeRateKw: 96,
    maxDischargeRateKw: 96,
    phaseRequirement: '3-phase',
    preferredLocation: 'garage',
    alternativeLocations: ['garden-enclosure'],
    g99Requirement: 'g99-stage-2',
    noise: {
      atOneMetre: 45,
      atNearestRoom: 12,
      nearestRoomDistanceM: 5,
      meetsNightLimit: true,
      notes:
        'Inverter produces 45 dB at 1m. Inside a brick garage with door closed, ' +
        'attenuation of ~30 dB reduces this to ~15 dB outside the garage wall. ' +
        'At 5m from the nearest bedroom window: ~12 dB -- completely inaudible. ' +
        'Even with garage door open, distance attenuation alone brings it to ~31 dB ' +
        'at 5m, well within night-time limits.',
    },
    footprint: {
      totalFootprintM2: 6.0,
      installedWidthMm: 2400,
      installedDepthMm: 2500,
      installedHeightMm: 2000,
      totalWeightKg: 2068,
      fitsStandardGate: true,
      needsCraneAccess: false,
      foundationRequirement: 'spreader-plate',
      minLoadBearingKnM2: 5.0,
      minGardenSizeM: 'N/A (garage install)',
      verticalStacking: true,
      maxStackHeight: 8,
      visualImpact:
        'Entirely hidden inside garage. Two battery stacks (each 8 modules high, ' +
        '~2m tall) against the back wall with the inverter mounted on the wall ' +
        'between them. Uses approximately half of a standard single garage bay ' +
        '(2.4m x 2.5m). A steel spreader plate (25mm, 1200 x 600mm) under each ' +
        'stack distributes the ~1000kg load. Each module is 584x370x500mm and 125kg, ' +
        'carried in individually by two people -- no crane needed.',
    },
    iofCompatible: true,
    // 16 batteries at 4200 + 1 inverter at 8500
    wholesaleCostPence: (16 * 4200 + 8500) * 100,
    // Base 3500 + 16 modules at 200 each + G99 prep
    installationCostPence: (3500 + 16 * 200 + 2000) * 100,
    phaseUpgradeCostPence: 0,
    g99CostPence: 200000, // 2000 GBP for Stage 2 network study
    totalCostPence: (16 * 4200 + 8500 + 3500 + 16 * 200 + 2000 + 2000) * 100,
    solarCoupling: 'none',
    pros: [
      'Maximum capacity (192kWh) and power (96kW) from a single inverter',
      'Completely silent from outside the garage -- best noise performance',
      'Weather-protected environment extends component lifespan',
      'Single inverter simplifies commissioning, monitoring, and maintenance',
      'Native Sigenergy integration with Octopus IOF -- best arbitrage revenue',
      'IP65 batteries work in garage environment without additional enclosure',
      'All components fit through standard doorways, no crane needed',
      '15-year warranty on both battery and inverter',
    ],
    cons: [
      'Requires existing 3-phase supply (no upgrade cost included)',
      'G99 Stage 2 application needed -- 3-6 month lead time with ENWL',
      'Garage loses ~6m2 of usable space (half a single bay)',
      'Garage must have adequate ventilation (2x 150cm2 openings min per PAS 63100)',
      'Spreader plate needed as 2000kg exceeds standard garage slab capacity',
      'Sigenergy M1 is premium priced -- highest upfront cost of all stacks',
      'Total weight (2+ tonnes) means structural assessment of garage floor advisable',
      'Single point of failure on inverter (mitigated by 15-year warranty)',
    ],
    installationNotes: [
      'Garage must be assessed for ventilation -- PAS 63100 requires natural ventilation ' +
        'of 2x 150cm2 openings (high and low) or mechanical extract ventilation',
      'Fire detection (smoke + heat detector) required in garage per PAS 63100',
      'Structural assessment of garage floor recommended -- total system weight is ~2 tonnes',
      'Two 25mm steel spreader plates (1200x600mm each) needed under battery stacks',
      'Electrical: 3-phase 100A supply with dedicated 100A RCBO for battery system',
      'G99 Stage 2 application to ENWL required before installation',
      'CT clamp installation at main consumer unit for export limiting if required by DNO',
      'Ventilation openings must have fire-rated dampers if garage shares wall with house',
      'Minimum 1m clearance from any combustible stored materials in garage',
      'Installation time: 2-3 days (2 electricians + 1 labourer for module handling)',
    ],
  },

  // ----------------------------------------------------------
  // STACK 2: "Garden Standard"
  // 3-phase semi-detached with large garden
  // ----------------------------------------------------------
  {
    id: 'stack-garden-standard',
    name: 'Garden Standard',
    subtitle: '3-phase semi-detached with large garden',
    description:
      'Outdoor-rated system positioned 10m+ from the house in a purpose-built ' +
      'steel enclosure or on a concrete pad with weather canopy. Uses Huawei ' +
      'LUNA2000 batteries (passively cooled, silent) with Huawei SUN2000 inverters. ' +
      'Four LUNA2000-40 towers (4x 10kWh modules each) deliver 160kWh. Four ' +
      'SUN2000 10KTL inverters in parallel provide 40kW charge/discharge. Noise ' +
      'is managed primarily through distance -- at 10m, even 4 inverters together ' +
      'are below night-time limits.',
    targetScenario: '3-phase semi-detached or detached with garden >8m deep, no garage available',
    components: {
      batteryId: 'bat-huawei-luna',
      batteryModel: 'Huawei LUNA2000-10-S0',
      batteryModuleCount: 16,
      batteryStringCount: 4,
      inverterId: 'inv-huawei',
      inverterModel: 'Huawei SUN2000 10KTL-M1 3-Phase',
      inverterCount: 4,
    },
    totalCapacityKwh: 160,
    maxChargeRateKw: 40,
    maxDischargeRateKw: 40,
    phaseRequirement: '3-phase',
    preferredLocation: 'garden-enclosure',
    alternativeLocations: ['open-garden', 'shed'],
    g99Requirement: 'g99-stage-1',
    noise: {
      atOneMetre: 51,
      atNearestRoom: 31,
      nearestRoomDistanceM: 10,
      meetsNightLimit: true,
      notes:
        'Each SUN2000 inverter produces ~45 dB at 1m. Four in parallel add +6 dB = ' +
        '~51 dB at 1m from the inverter array. The LUNA2000 batteries are passively ' +
        'cooled and produce no audible noise. At 10m distance: 51 - 20 = ~31 dB, ' +
        'well below night-time background of 30-35 dB. Even at 5m: ~37 dB, still ' +
        'acceptable. Enclosure walls add further 10-15 dB attenuation.',
    },
    footprint: {
      totalFootprintM2: 8.0,
      installedWidthMm: 2500,
      installedDepthMm: 2000,
      installedHeightMm: 1800,
      totalWeightKg: 1916,
      fitsStandardGate: true,
      needsCraneAccess: false,
      foundationRequirement: 'concrete-pad-150mm',
      minLoadBearingKnM2: 4.0,
      minGardenSizeM: '4m x 10m minimum (pad at far end, 10m from house)',
      verticalStacking: true,
      maxStackHeight: 4,
      visualImpact:
        'Four LUNA2000 towers (each 670x150x2400mm tall) in a row, plus four ' +
        'wall-mounted inverters. Total installation is approximately 2.5m wide x ' +
        '2m deep x 1.8m high (battery towers are the tallest element). With a ' +
        'purpose-built steel or timber enclosure (3m x 2.5m x 2m), the system ' +
        'resembles a garden shed. Can be screened with 1.8m fencing and climbing ' +
        'plants. Each LUNA2000 module is 114kg -- two people can carry each one ' +
        'through a standard garden gate.',
    },
    iofCompatible: true,
    // 16 batteries at 4000 + 4 inverters at 2600
    wholesaleCostPence: (16 * 4000 + 4 * 2600) * 100,
    // Base 3500 + 16 modules at 200 + concrete pad 1500 + enclosure 3000
    installationCostPence: (3500 + 16 * 200 + 1500 + 3000) * 100,
    phaseUpgradeCostPence: 0,
    g99CostPence: 100000, // 1000 GBP for Stage 1
    totalCostPence: (16 * 4000 + 4 * 2600 + 3500 + 16 * 200 + 1500 + 3000 + 1000) * 100,
    solarCoupling: 'none',
    pros: [
      'Huawei LUNA2000 batteries are passively cooled -- completely silent',
      'Distance from house (10m+) makes inverter noise inaudible',
      'Huawei ecosystem has excellent monitoring and IOF integration',
      'Each LUNA2000 tower is independent -- partial system failure does not stop operation',
      'IP65-rated components handle outdoor exposure',
      '160kWh total capacity supports 2 full cycles per day on IOF',
      'All components fit through standard 900mm garden gate',
      'Modular -- can start with 2 towers (80kWh) and expand later',
    ],
    cons: [
      'Requires large garden (minimum 4m x 10m to achieve noise distance)',
      'Concrete pad and enclosure add 4,500 GBP to installation cost',
      'Four inverters mean more points of failure vs single large inverter',
      '40kW total discharge rate limits revenue compared to Garage King (96kW)',
      'Underground cable run from house to garden adds 500-1,500 depending on distance',
      'Enclosure needs planning permission if over 2.5m tall near boundary',
      'Garden loses ~8m2 of usable space plus access path',
      'Exposed to weather -- enclosure maintenance needed over 10-year life',
    ],
    installationNotes: [
      'Concrete pad: 150mm thick, 3m x 2.5m, reinforced with A142 mesh, level to +/- 5mm',
      'Purpose-built enclosure: steel frame with composite panels, ventilated, lockable',
      'Underground armoured cable (SWA) from consumer unit to garden installation',
      'Cable trench: 450mm deep minimum, sand bedding, warning tape',
      'G99 Stage 1 application to ENWL -- 45 working day response time',
      'Each LUNA2000 tower needs its own DC isolator and connection to inverter',
      'CT clamps at main meter for Huawei FusionSolar monitoring',
      'Fire extinguisher (lithium-rated) should be stored near the enclosure',
      'Access path to enclosure must be maintained for servicing (900mm wide minimum)',
      'Installation time: 3-4 days (concrete curing + electrical)',
    ],
  },

  // ----------------------------------------------------------
  // STACK 3: "Single-Phase Starter"
  // Single-phase property with garden
  // ----------------------------------------------------------
  {
    id: 'stack-single-phase-starter',
    name: 'Single-Phase Starter',
    subtitle: 'Single-phase supply, garden installation',
    description:
      'Designed for properties that have not yet upgraded to 3-phase. Uses ' +
      'Tesla Powerwall 3 units -- the best single-phase battery available, with ' +
      'an integrated inverter producing 11.5kW per unit. Four Powerwall 3 units ' +
      'provide 54kWh and 11.5kW max (single-phase limit prevents paralleling for ' +
      'higher power). The integrated liquid cooling makes these among the quietest ' +
      'units available. This stack is deliberately limited by the single-phase ' +
      'supply constraint -- it is a stepping stone before a 3-phase upgrade.',
    targetScenario: 'Single-phase terraced or semi-detached, moderate garden, no 3-phase budget yet',
    components: {
      batteryId: 'bat-tesla-pw3',
      batteryModel: 'Tesla Powerwall 3',
      batteryModuleCount: 4,
      batteryStringCount: 4,
      inverterId: 'inv-tesla-gateway',
      inverterModel: 'Tesla Powerwall 3 Integrated Inverter',
      inverterCount: 4,
    },
    totalCapacityKwh: 54,
    maxChargeRateKw: 11.5,
    maxDischargeRateKw: 11.5,
    phaseRequirement: '1-phase',
    preferredLocation: 'open-garden',
    alternativeLocations: ['garage', 'garden-enclosure'],
    g99Requirement: 'g99-stage-1',
    noise: {
      atOneMetre: 40,
      atNearestRoom: 28,
      nearestRoomDistanceM: 5,
      meetsNightLimit: true,
      notes:
        'Tesla Powerwall 3 uses liquid cooling with an internal pump -- one of the ' +
        'quietest systems available at ~40 dB at 1m. Even with 4 units, the noise ' +
        'does not compound significantly because each unit has its own cooling loop ' +
        'and they do not synchronise fan cycles. Measured at 5m: ~28 dB. The units ' +
        'are wall-mountable and can be placed on the house exterior wall facing the ' +
        'garden, keeping them close for cable runs but still achieving good noise ' +
        'performance.',
    },
    footprint: {
      totalFootprintM2: 3.0,
      installedWidthMm: 2200,
      installedDepthMm: 800,
      installedHeightMm: 1100,
      totalWeightKg: 520,
      fitsStandardGate: true,
      needsCraneAccess: false,
      foundationRequirement: 'standard-slab',
      minLoadBearingKnM2: 2.0,
      minGardenSizeM: '2m x 3m (wall-mounted on house exterior or garden wall)',
      verticalStacking: false,
      visualImpact:
        'Four sleek Tesla Powerwall 3 units (each 1098x628x193mm, 130kg) mounted ' +
        'side by side on a wall or on a ground-mounted frame. Total width ~2.2m, ' +
        'depth ~0.2m (wall-mounted) or ~0.8m (ground frame with clearance). IP67 ' +
        'rated -- fully weatherproof. Tesla units have a minimalist white/grey ' +
        'design that looks modern and is generally well-received by homeowners. ' +
        'Each unit is 130kg -- requires 2-person carry, fits through any gate.',
    },
    iofCompatible: true,
    // 4 Powerwall 3 at 7500 each (inverter integrated, price 0 separately)
    wholesaleCostPence: (4 * 7500) * 100,
    // Base 3500 + 4 modules at 200 + Tesla Gateway 500
    installationCostPence: (3500 + 4 * 200 + 500) * 100,
    phaseUpgradeCostPence: 0,
    g99CostPence: 50000, // 500 GBP for Stage 1 (simpler, lower power)
    totalCostPence: (4 * 7500 + 3500 + 4 * 200 + 500 + 500) * 100,
    solarCoupling: 'none',
    pros: [
      'Works on single-phase -- no 3-phase upgrade needed',
      'Tesla Powerwall 3 is the quietest battery system available (liquid-cooled)',
      'IP67 rating -- fully weatherproof for open garden installation',
      'Compact footprint -- only 3m2 wall-mounted',
      'Tesla app and monitoring ecosystem is excellent',
      'IOF compatible via Tesla integration with Octopus',
      'Sleek, modern design -- homeowner-friendly aesthetics',
      'Can be wall-mounted on house exterior, minimising garden space use',
      'Lightweight individual units (130kg) -- easy installation, no crane',
    ],
    cons: [
      'Only 54kWh total -- limited arbitrage revenue per cycle',
      'Single-phase limits discharge to 11.5kW regardless of battery capacity',
      'Tesla closed ecosystem -- cannot mix with other batteries or inverters',
      'At 7,500 per unit, Tesla is the most expensive battery per kWh',
      'Only 1 full cycle per day practical at 11.5kW with 54kWh',
      'Revenue potential roughly 1/3 of the Garage King stack',
      '10-year warranty vs 15-year on Sigenergy -- shorter coverage',
      'If 3-phase upgrade happens later, Tesla cannot scale to 100kW+ discharge',
      'Tesla may restrict third-party energy trading in future firmware updates',
    ],
    installationNotes: [
      'Single-phase 100A supply -- verify main fuse with ENWL before installation',
      'Each Powerwall 3 connects to a single-phase AC connection via its integrated inverter',
      'Tesla Gateway 2 or Backup Gateway required for energy management',
      'G99 Stage 1 application needed (11.5kW exceeds G98 single-phase 3.68kW limit)',
      'Wall mounting: masonry fixings rated for 150kg per unit, spacing per Tesla spec',
      'Ground frame alternative: galvanised steel frame on concrete pads',
      'Ethernet or WiFi connection required for Tesla monitoring and IOF integration',
      'CT clamp at main meter for consumption monitoring',
      'Installation time: 1-2 days (1 electrician + 1 assistant)',
    ],
  },

  // ----------------------------------------------------------
  // STACK 4: "Solar Hybrid"
  // House with existing solar PV, AC-coupled battery
  // ----------------------------------------------------------
  {
    id: 'stack-solar-hybrid',
    name: 'Solar Hybrid',
    subtitle: 'AC-coupled battery added to existing solar PV',
    description:
      'For homes that already have solar PV with their own inverter (typically ' +
      '3-6kWp on a GivEnergy, SolarEdge, or Enphase system). RoseStack adds a ' +
      'separate AC-coupled battery system that operates independently on the same ' +
      'consumer unit. Uses GivEnergy batteries and inverters for their native IOF ' +
      'integration and excellent remote monitoring. The homeowner keeps their ' +
      'existing solar and SEG payments. The battery system charges from cheap grid ' +
      'rates and discharges at peak, with excess solar optionally diverted to the ' +
      'battery. Eight GivEnergy AIO 9.5kWh units with 2x Giv-HY 6.0 inverters ' +
      'provide 76kWh and 12kW discharge.',
    targetScenario: '3-phase property with existing 3-6kWp solar PV, garden or garage available',
    components: {
      batteryId: 'bat-givenergy',
      batteryModel: 'GivEnergy All-in-One 9.5kWh',
      batteryModuleCount: 8,
      batteryStringCount: 2,
      inverterId: 'inv-givenergy',
      inverterModel: 'GivEnergy Giv-HY 6.0 3-Phase',
      inverterCount: 2,
    },
    totalCapacityKwh: 76,
    maxChargeRateKw: 12,
    maxDischargeRateKw: 12,
    phaseRequirement: '3-phase',
    preferredLocation: 'garage',
    alternativeLocations: ['garden-enclosure', 'open-garden'],
    g99Requirement: 'g99-stage-1',
    noise: {
      atOneMetre: 45,
      atNearestRoom: 27,
      nearestRoomDistanceM: 7,
      meetsNightLimit: true,
      notes:
        'Each GivEnergy AIO produces ~42 dB at 1m. With 8 units operating, the ' +
        'compound noise is ~51 dB at 1m (8 sources = +9 dB). However, the AIO ' +
        'fan duty cycle is low -- passive cooling handles most of the thermal load. ' +
        'Two Giv-HY inverters add ~45 dB at 1m. Combined system: ~52 dB at 1m. ' +
        'At 7m (typical garage-to-bedroom distance): ~35 dB. Inside a garage: ' +
        '~22 dB outside the wall -- completely inaudible. Even in open garden at ' +
        '7m: ~35 dB, borderline acceptable for night-time.',
    },
    footprint: {
      totalFootprintM2: 5.0,
      installedWidthMm: 3600,
      installedDepthMm: 1400,
      installedHeightMm: 1100,
      totalWeightKg: 736,
      fitsStandardGate: true,
      needsCraneAccess: false,
      foundationRequirement: 'standard-slab',
      minLoadBearingKnM2: 2.5,
      minGardenSizeM: '3m x 4m (or half a single garage bay)',
      verticalStacking: false,
      visualImpact:
        'Eight GivEnergy AIO units (each 880x520x254mm, 85kg) wall-mounted in a ' +
        'row of 4 over 4 (two rows), plus two small Giv-HY inverters (515x432x175mm). ' +
        'Total wall space needed: ~3.6m wide x 1.1m high. In a garage, this takes ' +
        'up one wall. In a garden, requires a mounting frame and weather canopy. ' +
        'GivEnergy units are black/dark grey -- unobtrusive. Each unit at 85kg can ' +
        'be carried by one strong person or two people comfortably.',
    },
    iofCompatible: true,
    // 8 AIO batteries at 3200 + 2 inverters at 2800
    wholesaleCostPence: (8 * 3200 + 2 * 2800) * 100,
    // Base 3500 + 8 modules at 200 + AC coupling work 1200
    installationCostPence: (3500 + 8 * 200 + 1200) * 100,
    phaseUpgradeCostPence: 0,
    g99CostPence: 100000,
    totalCostPence: (8 * 3200 + 2 * 2800 + 3500 + 8 * 200 + 1200 + 1000) * 100,
    solarCoupling: 'ac-coupled',
    pros: [
      'Does not disturb existing solar PV installation -- homeowner keeps SEG payments',
      'GivEnergy has best-in-class IOF integration and remote monitoring',
      'AC-coupled design means any existing solar inverter brand is compatible',
      'Each AIO unit is independent -- partial failures do not stop the system',
      'Lightweight individual units (85kg) -- easiest installation of all stacks',
      'GivEnergy app gives homeowner real-time visibility of both solar and battery',
      'Can charge battery from excess solar during summer, reducing grid import',
      '12-year warranty on GivEnergy batteries',
    ],
    cons: [
      '76kWh is below the 100kWh target -- limited by GivEnergy max 4 units per inverter',
      '12kW discharge rate is low for arbitrage -- limits revenue per cycle',
      'AC-coupling loses ~5% in double conversion (DC->AC->DC->AC)',
      'Eight separate AIO units take up significant wall space (3.6m wide)',
      'GivEnergy AIO is a domestic product -- not designed for commercial cycling',
      '6000 cycle life may be consumed in 8 years at 2 cycles/day',
      'Two inverters needed (6kW each) as GivEnergy does not make a large inverter',
      'Not suitable for open garden without additional weatherproof enclosure',
    ],
    installationNotes: [
      'AC-coupled installation: battery system connects to existing consumer unit on separate MCB',
      'Do NOT modify existing solar PV installation -- it remains on its own inverter and circuits',
      'GivEnergy WiFi dongle required for each inverter for cloud monitoring',
      'CT clamps at meter for whole-house consumption monitoring',
      'G99 Stage 1 application needed for combined solar+battery export capacity',
      'Check existing solar G98/G99 approval -- may need amendment for additional battery export',
      'Wall mounting: each AIO unit needs 4x M10 masonry anchors rated for 100kg',
      'Ensure 150mm gap between AIO units for airflow',
      'Installation time: 2 days (1 electrician)',
    ],
  },

  // ----------------------------------------------------------
  // STACK 5: "Full Package"
  // New-build or retrofit with no solar -- battery + solar + inverter
  // ----------------------------------------------------------
  {
    id: 'stack-full-package',
    name: 'Full Package',
    subtitle: 'Battery + solar PV + inverter as complete package',
    description:
      'Complete energy system for homes with no existing solar. Uses the ' +
      'Sigenergy M1 as a hybrid inverter handling both 6kWp of roof-mounted ' +
      'solar PV and 192kWh of battery storage. The hybrid approach is more ' +
      'efficient than AC-coupling because solar power goes directly to the ' +
      'battery via DC without double conversion. Solar generates ~5,100 kWh/year ' +
      'in Lancashire, of which 35-50% can be self-consumed or stored, with the ' +
      'remainder exported via SEG. The battery primarily earns from arbitrage, ' +
      'but solar reduces daytime grid import and boosts the homeowner proposition.',
    targetScenario: '3-phase detached house with garage and south-facing roof, no existing solar',
    components: {
      batteryId: 'bat-sigenergy',
      batteryModel: 'Sigenergy SigenStack 12kWh',
      batteryModuleCount: 16,
      batteryStringCount: 2,
      inverterId: 'inv-sigenergy-m1',
      inverterModel: 'Sigenergy M1 100kW 3-Phase Hybrid',
      inverterCount: 1,
      solarPanelId: 'sol-longi-himo7',
      solarPanelModel: 'LONGi Hi-MO 7 580W',
      solarPanelCount: 10,
    },
    totalCapacityKwh: 192,
    maxChargeRateKw: 96,
    maxDischargeRateKw: 96,
    phaseRequirement: '3-phase',
    preferredLocation: 'garage',
    alternativeLocations: ['garden-enclosure'],
    g99Requirement: 'g99-stage-2',
    noise: {
      atOneMetre: 45,
      atNearestRoom: 12,
      nearestRoomDistanceM: 5,
      meetsNightLimit: true,
      notes:
        'Identical to Garage King noise profile -- the solar panels are silent. ' +
        'The Sigenergy M1 handles both PV and battery through the same inverter, ' +
        'so no additional noise from a separate solar inverter.',
    },
    footprint: {
      totalFootprintM2: 6.0,
      installedWidthMm: 2400,
      installedDepthMm: 2500,
      installedHeightMm: 2000,
      totalWeightKg: 2353,
      fitsStandardGate: true,
      needsCraneAccess: false,
      foundationRequirement: 'spreader-plate',
      minLoadBearingKnM2: 5.0,
      minGardenSizeM: 'N/A (garage + roof install)',
      verticalStacking: true,
      maxStackHeight: 8,
      visualImpact:
        'Battery system identical to Garage King (inside garage). Solar panels ' +
        'on roof: 10x LONGi Hi-MO 7 panels at 2278x1134mm each = ~26m2 of roof ' +
        'space needed. On a typical 3-bed detached house with 40m2 south-facing ' +
        'roof, this uses about 65% of the available roof. Panels are black-framed ' +
        'monocrystalline -- modern appearance. DC cables from roof to garage ' +
        'inverter run externally in UV-rated conduit.',
    },
    iofCompatible: true,
    // 16 batteries at 4200 + 1 inverter at 8500 + 10 panels at 195
    wholesaleCostPence: (16 * 4200 + 8500 + 10 * 195) * 100,
    // Base 3500 + 16 modules at 200 + G99 prep 2000 + solar install (10 panels at 150)
    installationCostPence: (3500 + 16 * 200 + 2000 + 10 * 150 + 1500) * 100,
    phaseUpgradeCostPence: 0,
    g99CostPence: 200000,
    totalCostPence: (16 * 4200 + 8500 + 10 * 195 + 3500 + 16 * 200 + 2000 + 10 * 150 + 1500 + 2000) * 100,
    solarCoupling: 'hybrid',
    pros: [
      'Complete energy proposition for the homeowner -- solar + battery in one package',
      'Hybrid coupling is 5-8% more efficient than AC-coupling for solar->battery',
      'Solar generates ~5,100 kWh/year in Lancashire, ~765/year SEG revenue at 15p/kWh',
      'Single inverter handles both solar and battery -- simpler system, one monitoring app',
      'Homeowner gets "free" electricity during sunny days -- strong recruitment pitch',
      'MCS-certified installation qualifies for SEG (Smart Export Guarantee)',
      'Solar panels add negligible weight to a typical roof (285kg total, well within limits)',
      'Same arbitrage revenue as Garage King plus additional solar revenue',
    ],
    cons: [
      'Highest total cost of all stacks (batteries + inverter + solar + installation)',
      'Solar installation adds 1 day to installation time and requires scaffolding',
      'Roof must be structurally assessed for panel weight (rarely an issue)',
      'South-facing roof needed for optimal generation -- east/west reduces output 15-20%',
      'Solar panels need cleaning 1-2x per year in Lancashire (rain does most of it)',
      'MCS certification for solar requires MCS-accredited installer -- limits contractor choice',
      'DC cable run from roof to garage can be 15-25m -- voltage drop considerations',
      'G99 Stage 2 application covers both battery and solar export',
    ],
    installationNotes: [
      'All Garage King installation notes apply for the battery system',
      'Scaffolding required for roof access -- typically 500-800 for a 3-bed detached',
      'Roof survey: check rafter spacing (typically 400mm or 600mm), tile type, orientation',
      'Solar mounting: roof hooks into rafters, rail system, panel clips',
      'DC cable from roof to garage: 6mm2 solar cable in UV-rated conduit, max 25m',
      'String design: 10 panels in 2 strings of 5 on 2 MPPT inputs of the M1',
      'MCS registration required for SEG eligibility -- installer must be MCS-certified',
      'DNO notification (or G99 amendment) for solar addition to existing battery G99',
      'Installation time: 3-4 days (2 for battery, 1-2 for solar with scaffolding)',
      'Annual solar panel cleaning recommended -- access via ladder or water-fed pole',
    ],
  },

  // ----------------------------------------------------------
  // STACK 6: "Quiet Neighbour"
  // Semi-detached with small garden, noise is primary constraint
  // ----------------------------------------------------------
  {
    id: 'stack-quiet-neighbour',
    name: 'Quiet Neighbour',
    subtitle: 'Semi-detached, small garden, noise-critical',
    description:
      'Designed for the most challenging deployment scenario: a semi-detached ' +
      'property with a small garden where the battery system will be only 3-5m ' +
      'from the neighbour\'s bedroom window. Noise must be below 35 dB at 3m to ' +
      'meet night-time WHO guidelines. Uses Tesla Powerwall 3 units for their ' +
      'liquid cooling (quietest available) combined with BYD HVS battery towers ' +
      'paired with a single Huawei SUN2000 inverter. The BYD batteries are ' +
      'passively cooled (silent) and the Huawei inverter is convection-cooled at ' +
      'low loads. The Tesla units handle peak demand while the BYD/Huawei ' +
      'combination handles baseload cycling quietly. Total: 105kWh across the ' +
      'two subsystems.',
    targetScenario: 'Semi-detached or terraced with garden <6m deep, neighbour within 5m, 3-phase',
    components: {
      batteryId: 'bat-huawei-luna',
      batteryModel: 'Huawei LUNA2000-10-S0',
      batteryModuleCount: 8,
      batteryStringCount: 2,
      inverterId: 'inv-huawei',
      inverterModel: 'Huawei SUN2000 10KTL-M1 3-Phase',
      inverterCount: 2,
    },
    totalCapacityKwh: 80,
    maxChargeRateKw: 20,
    maxDischargeRateKw: 20,
    phaseRequirement: '3-phase',
    preferredLocation: 'garden-enclosure',
    alternativeLocations: ['garage', 'shed'],
    g99Requirement: 'g99-stage-1',
    noise: {
      atOneMetre: 48,
      atNearestRoom: 34,
      nearestRoomDistanceM: 3,
      meetsNightLimit: true,
      notes:
        'Two Huawei SUN2000 inverters compound to ~48 dB at 1m (+3 dB for doubling). ' +
        'LUNA2000 batteries are passively cooled -- completely silent. At 3m distance: ' +
        '48 - 9.5 = ~38 dB in open air. HOWEVER, with an acoustic-lined enclosure ' +
        '(12mm acoustic plasterboard lining = 10-15 dB attenuation), this drops to ' +
        '~24-28 dB at 3m. Even without acoustic lining, the enclosure walls reduce ' +
        'by ~10 dB to ~28 dB. The key advantage of Huawei SUN2000 is that at partial ' +
        'load (<50%), the internal fans run at minimum speed or stop entirely, reducing ' +
        'noise by 5-8 dB. Night-time cycling at 10kW (50% of rated) produces only ' +
        '~40 dB at 1m, dropping to ~30 dB at 3m -- within limits even without enclosure.',
    },
    footprint: {
      totalFootprintM2: 4.5,
      installedWidthMm: 2000,
      installedDepthMm: 1500,
      installedHeightMm: 1800,
      totalWeightKg: 958,
      fitsStandardGate: true,
      needsCraneAccess: false,
      foundationRequirement: 'concrete-pad-150mm',
      minLoadBearingKnM2: 3.0,
      minGardenSizeM: '2.5m x 3m (positioned against boundary wall or fence)',
      verticalStacking: true,
      maxStackHeight: 4,
      visualImpact:
        'Two LUNA2000 towers (each ~670x150x2400mm) plus two compact Huawei ' +
        'inverters, all within a purpose-built acoustic enclosure approximately ' +
        '2m x 1.5m x 1.8m. The enclosure can be clad in timber to resemble a small ' +
        'garden cupboard or bin store. At only 2m x 1.5m footprint (plus 600mm ' +
        'access clearance on one side), this fits in even small gardens. ' +
        'Positioned against a boundary fence, it uses minimal usable garden space. ' +
        'Total weight under 1 tonne -- standard 150mm concrete pad is sufficient.',
    },
    iofCompatible: true,
    // 8 batteries at 4000 + 2 inverters at 2600 + acoustic enclosure 2500
    wholesaleCostPence: (8 * 4000 + 2 * 2600) * 100,
    // Base 3500 + 8 modules at 200 + concrete pad 1000 + acoustic enclosure 2500
    installationCostPence: (3500 + 8 * 200 + 1000 + 2500) * 100,
    phaseUpgradeCostPence: 0,
    g99CostPence: 100000,
    totalCostPence: (8 * 4000 + 2 * 2600 + 3500 + 8 * 200 + 1000 + 2500 + 1000) * 100,
    solarCoupling: 'none',
    pros: [
      'Designed specifically for noise-sensitive deployments',
      'LUNA2000 batteries are passively cooled -- zero noise from battery modules',
      'Huawei SUN2000 runs fans at minimum speed during night-time partial-load cycling',
      'Acoustic enclosure brings noise to <30 dB at 3m -- below background levels',
      'Smallest footprint of any 80kWh+ system (only 4.5m2)',
      'Under 1 tonne total weight -- no structural concerns',
      'All components fit through standard 900mm garden gate',
      'IOF compatible via Huawei FusionSolar integration',
      'Can be positioned against boundary fence, maximising usable garden space',
    ],
    cons: [
      '80kWh is below the 100kWh target -- noise constraint limits system size',
      '20kW discharge rate limits arbitrage revenue',
      'Acoustic enclosure adds 2,500 to installation cost',
      'Acoustic enclosure needs ventilation openings (reduces acoustic benefit slightly)',
      'In very small gardens (<2.5m x 3m), even this system may not fit',
      'Two inverters at 10kW each -- moderate complexity',
      'If neighbour complaints arise despite meeting limits, no further mitigation possible',
      'Acoustic enclosure panels need replacement every 5-7 years (moisture degradation)',
    ],
    installationNotes: [
      'Noise survey recommended before installation -- measure background levels at nearest window',
      'If background is below 30 dB(A) at night, acoustic enclosure is mandatory',
      'Acoustic enclosure: steel frame, outer weather skin, 12mm acoustic plasterboard inner lining',
      'Ventilation: acoustic louvres (not open vents) to maintain sound attenuation',
      'Position enclosure with inverter fans facing AWAY from neighbour\'s property',
      'Concrete pad: 150mm thick, 2.5m x 2m, level to +/- 5mm',
      'Underground SWA cable from consumer unit, minimum 450mm deep',
      'G99 Stage 1 application to ENWL -- 45 working day response',
      'Consider discussing installation with immediate neighbours before commencing',
      'Night-time commissioning test: measure dB at nearest habitable room window and document',
      'Installation time: 3 days (concrete + enclosure build + electrical)',
    ],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get all reference stacks
 */
export function getAllStacks(): ReferenceStack[] {
  return referenceStacks;
}

/**
 * Get a stack by ID
 */
export function getStackById(id: string): ReferenceStack | undefined {
  return referenceStacks.find(s => s.id === id);
}

/**
 * Filter stacks by phase requirement
 */
export function getStacksByPhase(phase: PhaseRequirement): ReferenceStack[] {
  return referenceStacks.filter(s => s.phaseRequirement === phase);
}

/**
 * Filter stacks by installation location
 */
export function getStacksByLocation(location: InstallationLocation): ReferenceStack[] {
  return referenceStacks.filter(
    s => s.preferredLocation === location || s.alternativeLocations.includes(location),
  );
}

/**
 * Filter stacks by maximum noise level at nearest room
 */
export function getStacksByMaxNoise(maxDbAtRoom: number): ReferenceStack[] {
  return referenceStacks.filter(s => s.noise.atNearestRoom <= maxDbAtRoom);
}

/**
 * Filter stacks by minimum capacity
 */
export function getStacksByMinCapacity(minKwh: number): ReferenceStack[] {
  return referenceStacks.filter(s => s.totalCapacityKwh >= minKwh);
}

/**
 * Filter stacks by maximum footprint
 */
export function getStacksByMaxFootprint(maxM2: number): ReferenceStack[] {
  return referenceStacks.filter(s => s.footprint.totalFootprintM2 <= maxM2);
}

/**
 * Filter stacks that are IOF compatible
 */
export function getIofCompatibleStacks(): ReferenceStack[] {
  return referenceStacks.filter(s => s.iofCompatible);
}

/**
 * Get stacks suitable for a given garden size (width x depth in metres)
 */
export function getStacksForGardenSize(widthM: number, depthM: number): ReferenceStack[] {
  const areaM2 = widthM * depthM;
  return referenceStacks.filter(s => {
    // Garage installs have no garden size requirement
    if (s.preferredLocation === 'garage') return true;
    // Must have enough area for footprint plus 0.6m access clearance
    const neededArea = s.footprint.totalFootprintM2 +
      (s.footprint.installedWidthMm / 1000 * 0.6); // access clearance on one side
    return areaM2 >= neededArea;
  });
}

/**
 * Calculate estimated annual arbitrage revenue for a stack (simplified).
 * Uses IOF spread of ~20p/kWh (buy at 7.5p, sell at 27.5p) with 2 cycles/day.
 * All values returned in pence.
 */
export function estimateAnnualRevenuePence(stack: ReferenceStack): {
  best: number;
  likely: number;
  worst: number;
} {
  const capacityKwh = stack.totalCapacityKwh;
  const maxDischargeKw = stack.maxDischargeRateKw;

  // How many kWh can actually be discharged in the peak windows?
  // IOF peak export window is typically 4pm-7pm (3 hours) + 7am-9am (2 hours) = 5 hours
  // Max discharge in 5 hours = maxDischargeKw * 5 (but capped by capacity)
  const maxDailyDischargeKwh = Math.min(capacityKwh, maxDischargeKw * 5);

  // Likely: 2 cycles/day, 20p/kWh spread, 90% round-trip efficiency, 365 days
  const likelySpreadPence = 2000; // 20p in pence
  const likelyCycles = 2;
  const efficiency = 0.90;
  const likelyDailyRevenue = Math.min(
    maxDailyDischargeKwh * likelyCycles,
    capacityKwh * likelyCycles,
  ) * likelySpreadPence * efficiency / 100;

  // Best: 2.5 cycles/day, 23p spread, better efficiency
  const bestSpreadPence = 2300;
  const bestCycles = 2.5;
  const bestEfficiency = 0.92;
  const bestDailyRevenue = Math.min(
    maxDailyDischargeKwh * bestCycles,
    capacityKwh * bestCycles,
  ) * bestSpreadPence * bestEfficiency / 100;

  // Worst: 1.5 cycles/day, 16p spread, worse efficiency
  const worstSpreadPence = 1600;
  const worstCycles = 1.5;
  const worstEfficiency = 0.88;
  const worstDailyRevenue = Math.min(
    maxDailyDischargeKwh * worstCycles,
    capacityKwh * worstCycles,
  ) * worstSpreadPence * worstEfficiency / 100;

  return {
    best: Math.round(bestDailyRevenue * 365),
    likely: Math.round(likelyDailyRevenue * 365),
    worst: Math.round(worstDailyRevenue * 365),
  };
}

/**
 * Calculate simple payback period in months for a stack.
 * Returns { best, likely, worst } payback in months.
 */
export function calculatePaybackMonths(stack: ReferenceStack): {
  best: number;
  likely: number;
  worst: number;
} {
  const revenue = estimateAnnualRevenuePence(stack);
  const totalCost = stack.totalCostPence;

  return {
    best: Math.round((totalCost / revenue.best) * 12),
    likely: Math.round((totalCost / revenue.likely) * 12),
    worst: Math.round((totalCost / revenue.worst) * 12),
  };
}

/**
 * Sound attenuation calculator.
 * Returns estimated dB at a given distance from a source of known dB at 1m.
 * Uses inverse square law: dB drops by ~6 dB per doubling of distance (point source, free field).
 * Optionally applies wall attenuation (e.g., brick wall = 30 dB, timber = 15 dB).
 */
export function calculateNoiseAtDistance(
  dbAtOneMetre: number,
  distanceMetres: number,
  wallAttenuationDb: number = 0,
): number {
  if (distanceMetres <= 0) return dbAtOneMetre;
  // Inverse square law: L2 = L1 - 20 * log10(d2/d1)
  const distanceAttenuation = 20 * Math.log10(distanceMetres);
  return Math.max(0, dbAtOneMetre - distanceAttenuation - wallAttenuationDb);
}

/**
 * Calculate compound noise from multiple identical sources.
 * N identical sources at the same dB add 10*log10(N) dB.
 */
export function calculateCompoundNoise(singleSourceDb: number, numberOfSources: number): number {
  if (numberOfSources <= 0) return 0;
  if (numberOfSources === 1) return singleSourceDb;
  return singleSourceDb + 10 * Math.log10(numberOfSources);
}
