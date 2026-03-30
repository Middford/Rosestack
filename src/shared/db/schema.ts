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
