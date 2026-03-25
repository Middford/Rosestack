export { substations, flexibilityTenders } from './substation-data';
export { targetProperties, getPropertiesByPostcode, getPropertiesBySubstation } from './property-data';
export type { TargetProperty } from './property-data';
export { scoreProperty, scoreAndRankProperties, getScoreGrade } from './scoring';
export type { PropertyScore, ScoreBreakdown } from './scoring';
export { generateDeploymentPlan } from './deployment-planner';
export type { DeploymentPlan, DeploymentPhase } from './deployment-planner';
