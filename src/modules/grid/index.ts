export { substations, flexibilityTenders } from './substation-data';

// Consumption model — 48×12 half-hour slot matrix
export { buildConsumptionProfile, getNetDemandAfterSolar, estimateAnnualBillWithoutBattery } from './consumption-model';
export type { ConsumptionInputs, ConsumptionProfile, ConsumptionMatrix, SolarProfile } from './consumption-model';

// AAF — Arbitrage Availability Factor
export { calculateAaf, calculateAafForTariff } from './aaf';
export type { AafInputs, AafResult } from './aaf';

// Sizing engine — battery system recommendations
export { sizeBatterySystem, calculateG99Probability } from './sizing-engine';
export type { SizingInputs, SizingOption, SizingResult } from './sizing-engine';
export { targetProperties, getPropertiesByPostcode, getPropertiesBySubstation } from './property-data';
export type { TargetProperty } from './property-data';
// Real EPC data — 390 properties from the EPC API (March 2026)
export {
  EPC_TARGET_PROPERTIES,
  getEpcPropertiesByPostcode,
  getEpcPropertiesBySubstation,
  getTopEpcProspects,
} from './property-data';
export type { EpcTargetProperty } from './property-data';
export { scoreProperty, scoreAndRankProperties, getScoreGrade } from './scoring';
export type { PropertyScore, ScoreBreakdown } from './scoring';
export { generateDeploymentPlan } from './deployment-planner';
export type { DeploymentPlan, DeploymentPhase } from './deployment-planner';
