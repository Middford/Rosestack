export { substations, flexibilityTenders } from './substation-data';
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
