// ============================================================
// Projects Module — Cashflow Engine
//
// Core three-scenario cashflow model for the RoseStack fleet.
// Produces a month-by-month projection incorporating G99 costs,
// CAPEX drawdowns, ongoing opex, facility interest, and
// best/likely/worst revenue with annual degradation.
// ============================================================

import type {
  CashflowProjectInput,
  CashflowSettings,
  CashflowMonth,
  CashflowResult,
  ScenarioTriple,
} from './types';

// Default annual degradation rate if not derivable from hardware data
const DEFAULT_DEGRADATION_RATE = 0.015; // 1.5% per year

type Scenario = 'best' | 'likely' | 'worst';
const SCENARIOS: Scenario[] = ['best', 'likely', 'worst'];

// ── Helpers ──────────────────────────────────────────────────

/** Parse ISO date string to year-month key (YYYY-MM) */
function toYearMonth(iso: string): string {
  return iso.slice(0, 7);
}

/** Add N months to a YYYY-MM string, returns YYYY-MM */
function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + n, 1);
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${yr}-${mo}`;
}

/** Compare YYYY-MM strings: <0 if a before b, 0 if equal, >0 if a after b */
function compareYM(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Count full months between two YYYY-MM strings (b - a) */
function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

function emptyTriple(): ScenarioTriple {
  return { best: 0, likely: 0, worst: 0 };
}

function addTriples(a: ScenarioTriple, b: ScenarioTriple): ScenarioTriple {
  return { best: a.best + b.best, likely: a.likely + b.likely, worst: a.worst + b.worst };
}

// ── Main Engine ──────────────────────────────────────────────

export function calculateCashflow(
  projects: CashflowProjectInput[],
  settings: CashflowSettings,
): CashflowResult {
  // Filter to projects with a target install date
  const validProjects = projects.filter(
    (p): p is CashflowProjectInput & { targetInstallDate: string } => p.targetInstallDate !== null,
  );

  // Edge case: no valid projects
  if (validProjects.length === 0) {
    return {
      months: [],
      peakBorrowing: emptyTriple(),
      breakEvenMonth: { best: null, likely: null, worst: null },
      totalCapexDeployed: 0,
      totalProjectCount: 0,
      liveProjectCount: 0,
      settings,
    };
  }

  // Determine timeline
  const today = new Date();
  const todayYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const installYMs = validProjects.map(p => toYearMonth(p.targetInstallDate));
  const earliestInstall = installYMs.reduce((a, b) => (compareYM(a, b) < 0 ? a : b));

  // Start 2 months before the earliest install (when G99 fees begin)
  const timelineStart = addMonths(earliestInstall, -2);
  const timelineEnd = addMonths(todayYM, settings.horizonMonths);
  const totalMonths = Math.max(0, monthsBetween(timelineStart, timelineEnd));

  // Pre-compute per-project schedule data
  const projectSchedules = validProjects.map(p => {
    const installYM = toYearMonth(p.targetInstallDate);
    const g99YM = addMonths(installYM, -2); // G99 application 2 months before install
    const operationalYM = addMonths(installYM, 1); // operational 1 month after install

    const maintenanceCostMonthly =
      (p.maintenanceCostOverride ?? settings.maintenanceDefault) / 12;
    const insuranceCostMonthly = p.insuranceCostAnnual / 12;
    const homeownerPayment = p.monthlyHomeownerPayment;

    const monthlyOngoing = maintenanceCostMonthly + insuranceCostMonthly + homeownerPayment;

    // CAPEX to charge at install month (total minus G99, which was charged earlier)
    const capexAtInstall = p.capex.totalCapex - p.capex.g99Application;

    return {
      project: p,
      installYM,
      g99YM,
      operationalYM,
      g99Cost: p.capex.g99Application,
      capexAtInstall,
      monthlyOngoing,
      monthlyRevenue: {
        best: p.annualRevenue.best / 12,
        likely: p.annualRevenue.likely / 12,
        worst: p.annualRevenue.worst / 12,
      } as ScenarioTriple,
    };
  });

  // Run three-scenario simulation
  const months: CashflowMonth[] = [];
  const facilityBalance: ScenarioTriple = emptyTriple();
  const cumulativeCashFlow: ScenarioTriple = emptyTriple();
  const peakBorrowing: ScenarioTriple = emptyTriple();
  const breakEvenMonth: { best: number | null; likely: number | null; worst: number | null } = {
    best: null,
    likely: null,
    worst: null,
  };
  let totalCapexDeployed = 0;

  for (let i = 0; i < totalMonths; i++) {
    const currentYM = addMonths(timelineStart, i);

    // Aggregate costs for this month
    let g99Costs = 0;
    let capexDrawdown = 0;
    let ongoingCosts = 0;
    const monthRevenue: ScenarioTriple = emptyTriple();
    let projectsInBuild = 0;
    let projectsLive = 0;

    for (const sched of projectSchedules) {
      // G99 application cost
      if (sched.g99YM === currentYM) {
        g99Costs += sched.g99Cost;
      }

      // CAPEX at installation month
      if (sched.installYM === currentYM) {
        capexDrawdown += sched.capexAtInstall;
        totalCapexDeployed += sched.project.capex.totalCapex;
      }

      // Count projects in build (between G99 submission and going operational)
      if (compareYM(currentYM, sched.g99YM) >= 0 && compareYM(currentYM, sched.operationalYM) < 0) {
        projectsInBuild++;
      }

      // Operational projects: revenue + ongoing costs
      if (compareYM(currentYM, sched.operationalYM) >= 0) {
        projectsLive++;

        // Calculate operational year (0-based) for degradation
        const operationalMonths = monthsBetween(sched.operationalYM, currentYM);
        const operationalYear = Math.floor(operationalMonths / 12);
        const degradationFactor = Math.pow(
          1 - DEFAULT_DEGRADATION_RATE,
          operationalYear,
        );

        // Add degraded revenue for each scenario
        for (const s of SCENARIOS) {
          monthRevenue[s] += sched.monthlyRevenue[s] * degradationFactor;
        }

        // Ongoing costs are the same across all scenarios
        ongoingCosts += sched.monthlyOngoing;
      }
    }

    // Total non-interest costs this month
    const baseCosts = g99Costs + capexDrawdown + ongoingCosts;

    // Calculate per-scenario: interest, net flow, facility mechanics
    const interestCharges: ScenarioTriple = emptyTriple();
    const netCashFlow: ScenarioTriple = emptyTriple();
    const drawdowns: ScenarioTriple = emptyTriple();
    const repayments: ScenarioTriple = emptyTriple();

    const monthlyInterestRate = settings.interestRatePercent / 100 / 12;

    for (const s of SCENARIOS) {
      // Interest on current facility balance for this scenario
      interestCharges[s] = facilityBalance[s] * monthlyInterestRate;

      const totalCostsForScenario = baseCosts + interestCharges[s];
      const netFlow = monthRevenue[s] - totalCostsForScenario;
      netCashFlow[s] = netFlow;

      if (netFlow < 0) {
        // Need to draw from facility
        const needed = Math.abs(netFlow);
        const available = Math.max(0, settings.facilitySize - facilityBalance[s]);
        const actualDrawdown = Math.min(needed, available);
        drawdowns[s] = actualDrawdown;
        facilityBalance[s] += actualDrawdown;
      } else {
        // Repay facility
        const repayment = Math.min(netFlow, facilityBalance[s]);
        repayments[s] = repayment;
        facilityBalance[s] -= repayment;
      }

      // Track peak borrowing
      if (facilityBalance[s] > peakBorrowing[s]) {
        peakBorrowing[s] = facilityBalance[s];
      }

      // Cumulative cash flow
      cumulativeCashFlow[s] += netCashFlow[s];

      // Break-even detection (first month cumulative > 0)
      if (breakEvenMonth[s] === null && cumulativeCashFlow[s] > 0) {
        breakEvenMonth[s] = i;
      }
    }

    // Use the likely-scenario interest for the reported single interestCharge field
    const reportedInterest = interestCharges.likely;
    const totalCosts = baseCosts + reportedInterest;

    months.push({
      month: currentYM,
      monthIndex: i,
      g99Costs,
      capexDrawdown,
      ongoingCosts,
      interestCharge: reportedInterest,
      totalCosts,
      revenue: { ...monthRevenue },
      drawdown: drawdowns.likely,
      repayment: repayments.likely,
      facilityBalance: facilityBalance.likely,
      netCashFlow: { ...netCashFlow },
      cumulativeCashFlow: { ...cumulativeCashFlow },
      projectsInBuild,
      projectsLive,
    });
  }

  // Count live projects at the end of the horizon
  const liveProjectCount = validProjects.filter(p => {
    const opYM = addMonths(toYearMonth(p.targetInstallDate), 1);
    const lastYM = totalMonths > 0 ? addMonths(timelineStart, totalMonths - 1) : timelineStart;
    return compareYM(lastYM, opYM) >= 0;
  }).length;

  return {
    months,
    peakBorrowing: {
      best: Math.round(peakBorrowing.best * 100) / 100,
      likely: Math.round(peakBorrowing.likely * 100) / 100,
      worst: Math.round(peakBorrowing.worst * 100) / 100,
    },
    breakEvenMonth,
    totalCapexDeployed: Math.round(totalCapexDeployed * 100) / 100,
    totalProjectCount: validProjects.length,
    liveProjectCount,
    settings,
  };
}
