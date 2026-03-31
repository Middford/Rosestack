export {
  ALL_TARIFFS,
  GRID_SERVICES,
  HISTORICAL_RATES,
  TARIFF_ALERTS,
  PORTFOLIO_SWEEP_DATA,
  DEFAULT_BATTERY_SYSTEM,
} from './data';

export {
  fetchAgileRates,
  getDailySlots,
  getStatistics,
  getAverageProfileByHalfHour,
} from './agile-api';

export type { AgileSlot, AgileStatistics } from './agile-api';

export {
  buildDayDispatchPlan,
  calculateAnnualDispatchRevenue,
  calculateDaysWithNegativePricing,
  getOptimalChargeWindows,
} from './dispatch-matrix';

export type {
  SlotAction,
  DispatchSlot,
  DayDispatchPlan,
  SystemParams,
  SavingSession,
} from './dispatch-matrix';

export type {
  TariffWithMeta,
  GridService,
  HistoricalRate,
  TariffAlert,
  PropertyTariffSweep,
} from './data';

export {
  calculateRevenueBreakdown,
  calculateThreeScenarioRevenue,
  compareTariffs,
  calculateFullProjection,
} from './calculator';

export type {
  RevenueBreakdown,
  ThreeScenarioRevenue,
  TariffComparison,
} from './calculator';
