import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// --- Section 13: Pipeline Status Enum ---

export const pipelineStatusEnum = pgEnum('pipeline_status', [
  // Stage 0 - Free / No commitment
  'new_lead',
  'initial_contact',
  'interested',
  'property_assessed',
  // Stage 1 - Site visit scheduled
  'visit_scheduled',
  'visit_complete',
  // Stage 2 - Proposal
  'proposal_prepared',
  'proposal_sent',
  'proposal_reviewing',
  // Stage 3 - Contract
  'verbal_agreement',
  'contract_sent',
  'contracted',
  // Stage 4 - Installation
  'g99_submitted',
  'g99_approved',
  'installation_scheduled',
  // Stage 5 - Live
  'installed',
  'commissioned',
  'live',
  // Terminal states
  'on_hold',
  'lost',
]);

// --- Enums ---

export const homeStatusEnum = pgEnum('home_status', [
  'prospect', 'qualified', 'contracted', 'installed', 'live', 'churned',
]);

export const phaseTypeEnum = pgEnum('phase_type', ['1-phase', '3-phase']);

export const propertyTypeEnum = pgEnum('property_type', [
  'detached', 'semi', 'terrace', 'bungalow', 'farm', 'commercial',
]);

export const batteryChemistryEnum = pgEnum('battery_chemistry', [
  'LFP', 'NMC', 'NaIon', 'Other',
]);

export const tariffTypeEnum = pgEnum('tariff_type', [
  'fixed', 'variable', 'agile', 'flux', 'time-of-use',
]);

export const constraintStatusEnum = pgEnum('constraint_status', [
  'unconstrained', 'approaching', 'constrained',
]);

export const leadSourceEnum = pgEnum('lead_source', [
  'referral', 'door-knock', 'website', 'club', 'social', 'other',
]);

export const leadStatusEnum = pgEnum('lead_status', [
  'new', 'contacted', 'qualified', 'proposal-sent', 'contracted', 'lost',
]);

export const scenarioTypeEnum = pgEnum('scenario_type', ['best', 'likely', 'worst']);

export const riskCategoryEnum = pgEnum('risk_category', [
  'tariff', 'energy-market', 'regulatory', 'technology', 'operational', 'financial', 'competitive',
]);

export const opportunityCategoryEnum = pgEnum('opportunity_category', [
  'hardware-cost', 'revenue-enhancement', 'grid-flexibility', 'policy-tailwind', 'business-model', 'competitive-advantage',
]);

export const mitigationStatusEnum = pgEnum('mitigation_status', [
  'not-started', 'in-progress', 'implemented', 'tested',
]);

export const captureStatusEnum = pgEnum('capture_status', [
  'not-started', 'researching', 'in-progress', 'captured', 'missed',
]);

export const agentTriggerEnum = pgEnum('agent_trigger', [
  'manual', 'daily', 'weekly', 'monthly',
]);

// --- Tables ---

export const homes = pgTable('homes', {
  id: uuid('id').defaultRandom().primaryKey(),
  address: varchar('address', { length: 500 }).notNull(),
  postcode: varchar('postcode', { length: 10 }).notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  phase: phaseTypeEnum('phase').notNull(),
  substationId: uuid('substation_id'),
  systemId: uuid('system_id'),
  homeownerId: uuid('homeowner_id'),
  status: homeStatusEnum('status').notNull().default('prospect'),
  epcRating: varchar('epc_rating', { length: 5 }),
  propertyType: propertyTypeEnum('property_type'),
  gardenAccess: boolean('garden_access'),
  installDate: timestamp('install_date'),
  contractEndDate: timestamp('contract_end_date'),
  monthlyHomeownerPayment: real('monthly_homeowner_payment'),
  esaContractRef: varchar('esa_contract_ref', { length: 100 }),
  notes: text('notes'),
  // Section 13 additions
  bedrooms: integer('bedrooms'),
  floorAreaSqm: real('floor_area_sqm'),
  builtYear: integer('built_year'),
  heatingType: varchar('heating_type', { length: 50 }),
  exportLimitKw: real('export_limit_kw'),
  secondaryTransformerId: uuid('secondary_transformer_id'),
  propertyScore: integer('property_score'),
  g99Probability: real('g99_probability'),
  consumptionKwhPerYear: real('consumption_kwh_per_year'),
  solarKwp: real('solar_kwp'),
  referralSource: varchar('referral_source', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const batterySystems = pgTable('battery_systems', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id),
  inverterModel: varchar('inverter_model', { length: 200 }).notNull(),
  batteryModules: integer('battery_modules').notNull(),
  totalCapacityKwh: real('total_capacity_kwh').notNull(),
  batteryChemistry: batteryChemistryEnum('battery_chemistry').notNull(),
  solarPvKwp: real('solar_pv_kwp'),
  heatPumpModel: varchar('heat_pump_model', { length: 200 }),
  installCost: real('install_cost').notNull(),
  annualMaintenanceCost: real('annual_maintenance_cost').notNull(),
  warrantyYears: integer('warranty_years').notNull(),
  degradationRatePercent: real('degradation_rate_percent').notNull(),
  maxChargeRateKw: real('max_charge_rate_kw').notNull(),
  maxDischargeRateKw: real('max_discharge_rate_kw').notNull(),
  roundTripEfficiency: real('round_trip_efficiency').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tariffs = pgTable('tariffs', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplier: varchar('supplier', { length: 200 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  type: tariffTypeEnum('type').notNull(),
  importRates: jsonb('import_rates').notNull(),
  exportRates: jsonb('export_rates').notNull(),
  standingChargePencePerDay: real('standing_charge_pence_per_day').notNull(),
  validFrom: timestamp('valid_from').notNull(),
  validTo: timestamp('valid_to'),
  eligibilityRequirements: jsonb('eligibility_requirements'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const substations = pgTable('substations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 300 }).notNull(),
  dnoRegion: varchar('dno_region', { length: 100 }).notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  capacityMva: real('capacity_mva'),
  currentLoadPercent: real('current_load_percent'),
  constraintStatus: constraintStatusEnum('constraint_status').notNull().default('unconstrained'),
  flexibilityTenderActive: boolean('flexibility_tender_active').notNull().default(false),
  connectedHomes: integer('connected_homes'),
  maxNewConnections: integer('max_new_connections'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id),
  name: varchar('name', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  source: leadSourceEnum('source').notNull(),
  referredBy: varchar('referred_by', { length: 200 }),
  status: leadStatusEnum('status').notNull().default('new'),
  notes: jsonb('notes').default([]),
  // Section 13 additions
  pipelineStatus: pipelineStatusEnum('pipeline_status').default('new_lead'),
  g99SubmittedDate: timestamp('g99_submitted_date'),
  g99ApprovedDate: timestamp('g99_approved_date'),
  contractSignedDate: timestamp('contract_signed_date'),
  installDate: timestamp('install_date'),
  commissionedDate: timestamp('commissioned_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const financialScenarios = pgTable('financial_scenarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  systemConfigId: uuid('system_config_id').references(() => batterySystems.id),
  tariffId: uuid('tariff_id').references(() => tariffs.id),
  scenarioType: scenarioTypeEnum('scenario_type').notNull(),
  assumptions: jsonb('assumptions').notNull(),
  projections: jsonb('projections').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const hardwareCatalogue = pgTable('hardware_catalogue', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: varchar('category', { length: 50 }).notNull(), // battery, inverter, solar, heat-pump
  manufacturer: varchar('manufacturer', { length: 200 }).notNull(),
  model: varchar('model', { length: 300 }).notNull(),
  specs: jsonb('specs').notNull(),
  priceGbp: real('price_gbp'),
  mcsCertified: boolean('mcs_certified').default(false),
  iofCompatible: boolean('iof_compatible').default(false),
  threePhaseSupport: boolean('three_phase_support').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const riskRegister = pgTable('risk_register', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 300 }).notNull(),
  category: riskCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  probability: integer('probability').notNull(),
  impact: integer('impact').notNull(),
  score: integer('score').notNull(),
  mitigationStrategy: text('mitigation_strategy').notNull(),
  mitigationOwner: varchar('mitigation_owner', { length: 100 }).notNull(),
  mitigationStatus: mitigationStatusEnum('mitigation_status').notNull().default('not-started'),
  residualScore: integer('residual_score'),
  triggerThreshold: text('trigger_threshold'),
  contingencyPlan: text('contingency_plan'),
  lastReviewed: timestamp('last_reviewed').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const opportunityRegister = pgTable('opportunity_register', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 300 }).notNull(),
  category: opportunityCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  probability: integer('probability').notNull(),
  impact: integer('impact').notNull(),
  score: integer('score').notNull(),
  captureStrategy: text('capture_strategy').notNull(),
  captureOwner: varchar('capture_owner', { length: 100 }).notNull(),
  captureStatus: captureStatusEnum('capture_status').notNull().default('not-started'),
  expectedValue: real('expected_value'),
  triggerThreshold: text('trigger_threshold'),
  dependencies: jsonb('dependencies'),
  investmentRequired: text('investment_required'),
  lastReviewed: timestamp('last_reviewed').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agentConfigs = pgTable('agent_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  module: varchar('module', { length: 100 }).notNull(),
  trigger: agentTriggerEnum('trigger').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agentOutputs = pgTable('agent_outputs', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').references(() => agentConfigs.id).notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations').default([]),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const complianceItems = pgTable('compliance_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id),
  type: varchar('type', { length: 50 }).notNull(), // g99, mcs, seg, insurance
  status: varchar('status', { length: 50 }).notNull(), // pending, submitted, approved, expired
  referenceNumber: varchar('reference_number', { length: 200 }),
  submittedDate: timestamp('submitted_date'),
  approvedDate: timestamp('approved_date'),
  expiryDate: timestamp('expiry_date'),
  documents: jsonb('documents').default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const propertyTimeline = pgTable('property_timeline', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id).notNull(),
  event: varchar('event', { length: 200 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================
// Section 13 — New Tables
// ============================================================

// 1. Consumption profiles (output of the 17-input consumption model)
export const consumptionProfiles = pgTable('consumption_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id).notNull(),
  // 17 inputs stored as JSONB
  inputs: jsonb('inputs').notNull(),           // ConsumptionInputs object
  // 48×12 matrix stored as flat array [slot0_jan, slot0_feb, ... slot47_dec]
  matrixFlat: jsonb('matrix_flat').notNull(),  // 576 numbers
  annualTotalKwh: real('annual_total_kwh').notNull(),
  monthlyTotals: jsonb('monthly_totals').notNull(), // 12 numbers
  solarGenKwhAnnual: real('solar_gen_kwh_annual'),
  peakDemandKw: real('peak_demand_kw').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Secondary transformers (33/11kV primary -> 11kV -> LV secondary)
export const secondaryTransformers = pgTable('secondary_transformers', {
  id: uuid('id').defaultRandom().primaryKey(),
  primarySubstationId: uuid('primary_substation_id').references(() => substations.id),
  name: varchar('name', { length: 200 }).notNull(),
  dnoRef: varchar('dno_ref', { length: 100 }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  ratingKva: real('rating_kva'),
  currentLoadPercent: real('current_load_percent'),
  connectedPremises: integer('connected_premises'),
  lvFeederCount: integer('lv_feeder_count'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Street intelligence (substation -> street mapping for prospecting)
export const streetIntelligence = pgTable('street_intelligence', {
  id: uuid('id').defaultRandom().primaryKey(),
  transformerId: uuid('transformer_id').references(() => secondaryTransformers.id),
  postcode: varchar('postcode', { length: 10 }).notNull(),
  streetName: varchar('street_name', { length: 300 }),
  premiseCount: integer('premise_count'),
  threePhaseEstimate: integer('three_phase_estimate'),
  roseStackHomes: integer('rose_stack_homes').default(0),
  avgPropertyAge: integer('avg_property_age'),
  avgEpcRating: varchar('avg_epc_rating', { length: 5 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Dispatch slots (daily optimisation results — one row per half-hour slot per day per home)
export const dispatchSlots = pgTable('dispatch_slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id).notNull(),
  slotDate: varchar('slot_date', { length: 10 }).notNull(), // YYYY-MM-DD
  slotIndex: integer('slot_index').notNull(),               // 0-47
  importRatePence: real('import_rate_pence'),
  exportRatePence: real('export_rate_pence'),
  action: varchar('action', { length: 30 }).notNull(),      // charge/discharge/idle/solar_charge/saving_session
  socStart: real('soc_start'),
  socEnd: real('soc_end'),
  energyKwh: real('energy_kwh'),
  revenuePence: real('revenue_pence'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Dispatch daily summaries (one row per day per home)
export const dispatchDaily = pgTable('dispatch_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id).notNull(),
  dispatchDate: varchar('dispatch_date', { length: 10 }).notNull(), // YYYY-MM-DD
  totalChargeKwh: real('total_charge_kwh'),
  totalDischargeKwh: real('total_discharge_kwh'),
  totalImportCostPence: real('total_import_cost_pence'),
  totalExportRevenuePence: real('total_export_revenue_pence'),
  netRevenuePence: real('net_revenue_pence'),
  cyclesCompleted: real('cycles_completed'),
  savingSessionRevenuePence: real('saving_session_revenue_pence').default(0),
  agileImportRateSource: varchar('agile_import_rate_source', { length: 50 }), // 'live' | 'forecast' | 'historical'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Tariff comparison (historical record of tariff optimisation sweep results)
export const tariffComparison = pgTable('tariff_comparison', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id).notNull(),
  sweepDate: timestamp('sweep_date').defaultNow().notNull(),
  currentTariff: varchar('current_tariff', { length: 200 }).notNull(),
  recommendedTariff: varchar('recommended_tariff', { length: 200 }),
  currentAnnualRevenueLikely: real('current_annual_revenue_likely'),
  recommendedAnnualRevenueLikely: real('recommended_annual_revenue_likely'),
  upliftPercent: real('uplift_percent'),
  status: varchar('status', { length: 30 }).default('pending'), // 'pending' | 'approved' | 'rejected' | 'switched'
  approvedBy: varchar('approved_by', { length: 100 }),
  switchedDate: timestamp('switched_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Tariff availability (which tariffs are currently open/closed/paused)
export const tariffAvailability = pgTable('tariff_availability', {
  id: uuid('id').defaultRandom().primaryKey(),
  tariffName: varchar('tariff_name', { length: 200 }).notNull(),
  supplier: varchar('supplier', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).notNull(), // 'open' | 'paused' | 'closed' | 'waitlist'
  pauseReason: text('pause_reason'),
  availableFrom: timestamp('available_from'),
  availableTo: timestamp('available_to'),
  lastChecked: timestamp('last_checked').defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. Pipeline events (detailed status tracking for prospecting pipeline)
export const pipelineEvents = pgTable('pipeline_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  leadId: uuid('lead_id').references(() => leads.id).notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'status_change' | 'note' | 'meeting' | 'email' | 'call' | 'site_visit' | 'proposal' | 'contract' | 'g99_submitted' etc.
  fromStatus: varchar('from_status', { length: 50 }),
  toStatus: varchar('to_status', { length: 50 }),
  notes: text('notes'),
  performedBy: varchar('performed_by', { length: 100 }),
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Agile Rates (raw Octopus half-hourly rate cache — import + export) ---

export const agileRates = pgTable('agile_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** 'import' = AGILE-24-10-01-N, 'export' = AGILE-OUTGOING-19-05-13-N */
  type: varchar('type', { length: 10 }).notNull(),
  /** ISO 8601 UTC — start of the half-hour slot */
  validFrom: varchar('valid_from', { length: 30 }).notNull(),
  /** ISO 8601 UTC — end of the half-hour slot */
  validTo: varchar('valid_to', { length: 30 }).notNull(),
  /** Rate in pence/kWh inclusive of 5% VAT */
  valueIncVat: real('value_inc_vat').notNull(),
  /** Octopus region suffix, e.g. 'N' for ENWL */
  region: varchar('region', { length: 5 }).default('N').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Live Tariff Rates (raw Octopus API rate cache — Flux + IOF) ---

export const tariffRates = pgTable('tariff_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** e.g. 'FLUX-IMPORT-23-02-14', 'FLUX-EXPORT-23-02-14' */
  productCode: varchar('product_code', { length: 100 }).notNull(),
  /** e.g. 'E-1R-FLUX-IMPORT-23-02-14-G' */
  tariffCode: varchar('tariff_code', { length: 200 }).notNull(),
  /** 'import' | 'export' */
  direction: varchar('direction', { length: 10 }).notNull(),
  validFrom: timestamp('valid_from').notNull(),
  validTo: timestamp('valid_to'),
  valueExcVat: real('value_exc_vat').notNull(),
  valueIncVat: real('value_inc_vat').notNull(),
  /** Octopus region letter, e.g. 'G' for ENWL North West */
  region: varchar('region', { length: 5 }).notNull().default('G'),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
});

// --- Tariff Summary (pre-computed band rates for quick revenue calculations) ---

export const tariffSummary = pgTable('tariff_summary', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** 'flux' | 'iof' | 'agile' */
  tariffName: varchar('tariff_name', { length: 50 }).notNull(),
  /** Octopus region letter, e.g. 'G' for ENWL */
  region: varchar('region', { length: 5 }).notNull().default('G'),
  // Import rates (pence/kWh inc VAT)
  offPeakImport: real('off_peak_import'),   // 02:00–05:00
  dayImport: real('day_import'),            // 05:00–16:00 + 19:00–02:00
  peakImport: real('peak_import'),          // 16:00–19:00
  // Export rates (pence/kWh inc VAT)
  offPeakExport: real('off_peak_export'),
  dayExport: real('day_export'),
  peakExport: real('peak_export'),
  /** Standing charge in pence/day */
  standingCharge: real('standing_charge'),
  /** Best arbitrage spread: peakExport - offPeakImport */
  spread: real('spread'),
  validFrom: timestamp('valid_from').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Revenue Actuals (for payback tracking on live homes) ---

export const revenueActuals = pgTable('revenue_actuals', {
  id: uuid('id').defaultRandom().primaryKey(),
  homeId: uuid('home_id').references(() => homes.id).notNull(),
  /** Month index from install (1-indexed) */
  month: integer('month').notNull(),
  /** Calendar month 1-12 */
  calendarMonth: integer('calendar_month').notNull(),
  calendarYear: integer('calendar_year').notNull(),
  arbitrageRevenueGbp: real('arbitrage_revenue_gbp'),
  savingSessionsRevenueGbp: real('saving_sessions_revenue_gbp'),
  flexibilityRevenueGbp: real('flexibility_revenue_gbp'),
  solarRevenueGbp: real('solar_revenue_gbp'),
  segRevenueGbp: real('seg_revenue_gbp'),
  totalRevenueGbp: real('total_revenue_gbp').notNull(),
  costsGbp: real('costs_gbp').notNull(),
  netRevenueGbp: real('net_revenue_gbp').notNull(),
  cumulativeNetGbp: real('cumulative_net_gbp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
