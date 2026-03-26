export * from './types';
export * from './service';
export { batteries, inverters, solarPanels, heatPumps, compatibilityMatrix } from './data';
export {
  referenceStacks,
  getAllStacks,
  getStackById,
  getStacksByPhase,
  getStacksByLocation,
  getStacksByMaxNoise,
  getStacksByMinCapacity,
  getStacksByMaxFootprint,
  getIofCompatibleStacks,
  getStacksForGardenSize,
  estimateAnnualRevenuePence,
  calculatePaybackMonths,
  calculateNoiseAtDistance,
  calculateCompoundNoise,
} from './stacks';
export type {
  ReferenceStack,
  StackComponent,
  NoiseProfile,
  PhysicalFootprint,
  InstallationLocation,
  PhaseRequirement,
  G99Requirement,
} from './stacks';
