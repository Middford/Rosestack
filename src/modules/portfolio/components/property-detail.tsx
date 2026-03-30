'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, SimpleStatCard, StatCard, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { ScenarioChart, TrafficLight } from '@/shared/ui';
import { formatGbp, formatPaybackRange, getDscrStatus } from '@/shared/utils/scenarios';
import { calculateFiveCostMetrics, calculateMonthlyPayback, calculateExportSensitivity } from '@/shared/utils/cost-metrics';
import type { PortfolioProperty } from '../types';
import type { HomeStatus } from '@/shared/types';
import { CostMetricCards } from './cost-metric-cards';
import { ExportSensitivityChart } from './export-sensitivity-chart';
import { MonthlyWaterfallChart } from './monthly-waterfall-chart';
import { PaybackProgressBar } from './payback-progress-bar';

interface PropertyDetailProps {
  property: PortfolioProperty;
}

const statusBadge: Record<HomeStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  live: { variant: 'success', label: 'Live' },
  installed: { variant: 'warning', label: 'Installed' },
  contracted: { variant: 'info', label: 'Contracted' },
  qualified: { variant: 'default', label: 'Qualified' },
  prospect: { variant: 'default', label: 'Prospect' },
  churned: { variant: 'danger', label: 'Churned' },
};

const TABS = ['Overview', 'Revenue', 'System Performance', 'Financial', 'Compliance', 'Timeline'] as const;
type Tab = typeof TABS[number];

export function PropertyDetail({ property: p }: PropertyDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const badge = statusBadge[p.status];

  const daysSinceInstall = p.installDate
    ? Math.floor((Date.now() - new Date(p.installDate).getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{p.address}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {p.postcode} | {daysSinceInstall > 0 ? `${daysSinceInstall} days since install` : 'Not yet installed'}
          </p>
        </div>
        <a href="/portfolio" className="text-sm text-rose hover:text-rose-light">
          Back to Portfolio
        </a>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-rose text-rose font-medium'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && <OverviewTab property={p} />}
      {activeTab === 'Revenue' && <RevenueTab property={p} />}
      {activeTab === 'System Performance' && <SystemPerformanceTab property={p} />}
      {activeTab === 'Financial' && <FinancialTab property={p} />}
      {activeTab === 'Compliance' && <ComplianceTab property={p} />}
      {activeTab === 'Timeline' && <TimelineTab property={p} />}
    </div>
  );
}

// --- Tab: Overview ---
function OverviewTab({ property: p }: { property: PortfolioProperty }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Monthly Revenue"
          value={formatGbp(p.summary.likely.annualNetRevenue / 12)}
          subtitle="Projected (likely)"
        />
        <SimpleStatCard
          label="Payback Progress"
          value={formatPaybackRange(p.summary)}
          subtitle={`${p.summary.likely.paybackMonths} months likely`}
        />
        <SimpleStatCard
          label="System Capacity"
          value={`${p.system.totalCapacityKwh} kWh`}
          subtitle={p.system.inverterModel}
        />
        <SimpleStatCard
          label="DSCR"
          value={p.summary.likely.dscr.toFixed(2)}
          subtitle={getDscrStatus(p.summary) === 'green' ? 'Healthy' : 'Review needed'}
          trend={getDscrStatus(p.summary) === 'green' ? 'up' : 'down'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>System Summary</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3 text-sm">
              <Row label="Inverter" value={p.system.inverterModel} />
              <Row label="Battery" value={`${p.system.totalCapacityKwh}kWh (${p.system.batteryModules} modules, ${p.system.batteryChemistry})`} />
              <Row label="Max Charge/Discharge" value={`${p.system.maxChargeRateKw}kW / ${p.system.maxDischargeRateKw}kW`} />
              <Row label="Round-Trip Efficiency" value={`${(p.system.roundTripEfficiency * 100).toFixed(0)}%`} />
              {p.solarKwp && <Row label="Solar PV" value={`${p.solarKwp}kWp (${p.solarPanelCount}x ${p.solarPanelModel})`} />}
              {p.system.heatPumpModel && <Row label="Heat Pump" value={p.system.heatPumpModel} />}
              <Row label="Tariff" value={p.tariff.name} />
              <Row label="Cycling Strategy" value={p.cyclingStrategy} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ESA & Homeowner</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3 text-sm">
              <Row label="Homeowner" value={p.homeownerName} />
              <Row label="Phone" value={p.homeownerPhone} />
              <Row label="Email" value={p.homeownerEmail} />
              <Row label="ESA Reference" value={p.esaContractRef} />
              <Row label="Contract Period" value={`${p.esaStartDate} to ${p.esaEndDate}`} />
              <Row label="Monthly Payment" value={formatGbp(p.monthlyHomeownerPayment)} />
              <Row label="Referral Source" value={p.referralSource} />
              {p.notes && <Row label="Notes" value={p.notes} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Tab: Revenue ---
function RevenueTab({ property: p }: { property: PortfolioProperty }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Annual Net Revenue"
          bestValue={formatGbp(p.summary.best.annualNetRevenue)}
          likelyValue={formatGbp(p.summary.likely.annualNetRevenue)}
          worstValue={formatGbp(p.summary.worst.annualNetRevenue)}
        />
        <StatCard
          label="10-Year NPV"
          bestValue={formatGbp(p.summary.best.tenYearNpv)}
          likelyValue={formatGbp(p.summary.likely.tenYearNpv)}
          worstValue={formatGbp(p.summary.worst.tenYearNpv)}
        />
        <StatCard
          label="10-Year IRR"
          bestValue={`${p.summary.best.tenYearIrr}%`}
          likelyValue={`${p.summary.likely.tenYearIrr}%`}
          worstValue={`${p.summary.worst.tenYearIrr}%`}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue Projection (10 Years)</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <ScenarioChart
            projection={p.projection}
            dataKey="netRevenue"
            height={350}
            formatValue={(v) => formatGbp(v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cumulative Revenue vs Cost (Payback Curve)</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <ScenarioChart
            projection={p.projection}
            dataKey="cumulativeRevenue"
            height={300}
            formatValue={(v) => formatGbp(v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Revenue Breakdown by Stream</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-3 text-sm">
            <Row label="Tariff Arbitrage" value={`${p.tariff.name} (${p.cyclingStrategy})`} />
            <Row label="Saving Sessions" value={p.savingSessionsParticipation ? `${p.estimatedSessionsPerYear} sessions/year` : 'Not participating'} />
            <Row label="Flexibility Market" value={p.flexibilityParticipation ? `${formatGbp(p.estimatedFlexRevenue)}/year est.` : 'Not participating'} />
            <Row label="SEG Export" value={p.segRegistered ? `${p.segRate}p/kWh` : 'Not registered'} />
            {p.solarKwp && <Row label="Solar Self-Consumption" value={`${p.solarSelfConsumptionEstimate}% of ${p.solarKwp}kWp`} />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Annual Summary</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Gross Revenue</TableHead>
                <TableHead>Costs</TableHead>
                <TableHead>Net Revenue</TableHead>
                <TableHead>Cumulative</TableHead>
                <TableHead>Battery Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.projection.likely.map(yr => (
                <TableRow key={yr.year}>
                  <TableCell>Year {yr.year}</TableCell>
                  <TableCell>{formatGbp(yr.grossRevenue)}</TableCell>
                  <TableCell>{formatGbp(yr.homeownerPayment + yr.maintenance + yr.insurance)}</TableCell>
                  <TableCell className="font-medium">{formatGbp(yr.netRevenue)}</TableCell>
                  <TableCell>{formatGbp(yr.cumulativeRevenue)}</TableCell>
                  <TableCell>{yr.batteryCapacityRemaining}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Tab: System Performance ---
function SystemPerformanceTab({ property: p }: { property: PortfolioProperty }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard label="Capacity" value={`${p.system.totalCapacityKwh} kWh`} subtitle={`${p.system.batteryModules} modules`} />
        <SimpleStatCard label="Chemistry" value={p.system.batteryChemistry} subtitle={`${p.system.warrantyYears}yr warranty`} />
        <SimpleStatCard label="Efficiency" value={`${(p.system.roundTripEfficiency * 100).toFixed(0)}%`} subtitle="Round-trip" />
        <SimpleStatCard label="Degradation" value={`${p.system.degradationRatePercent}%/yr`} subtitle="Manufacturer spec" />
      </div>

      <Card>
        <CardHeader><CardTitle>Battery Health Projection</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <ScenarioChart
            projection={p.projection}
            dataKey="batteryCapacityRemaining"
            height={280}
            formatValue={(v) => `${v}%`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cycling Data</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-3 text-sm">
            <Row label="Cycling Strategy" value={p.cyclingStrategy} />
            <Row label="Max Charge Rate" value={`${p.system.maxChargeRateKw}kW`} />
            <Row label="Max Discharge Rate" value={`${p.system.maxDischargeRateKw}kW`} />
            <Row label="Tariff" value={p.tariff.name} />
          </div>
        </CardContent>
      </Card>

      {p.solarKwp && (
        <Card>
          <CardHeader><CardTitle>Solar Generation</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3 text-sm">
              <Row label="Array Size" value={`${p.solarKwp}kWp`} />
              <Row label="Panels" value={`${p.solarPanelCount}x ${p.solarPanelModel}`} />
              <Row label="Orientation" value={p.solarOrientation || 'Not specified'} />
              <Row label="Tilt" value={p.solarTilt ? `${p.solarTilt} degrees` : 'Not specified'} />
              <Row label="Est. Annual Generation" value={`${Math.round(p.solarKwp * 900)} kWh`} />
              <Row label="Self-Consumption" value={`${p.solarSelfConsumptionEstimate}%`} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-info border opacity-70">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-text-secondary">
            Live monitoring integration (mySigen API, GivEnergy API) will be available when properties are connected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Tab: Financial ---
function FinancialTab({ property: p }: { property: PortfolioProperty }) {
  // Compute cost metrics from property data
  const costMetrics = useMemo(() => calculateFiveCostMetrics({
    batteryModuleCostGbp: p.system.installCost - 10500, // Estimate: total hardware minus inverter+gateway+ancillary
    inverterCostGbp: 9000,    // TODO: derive from hardware catalogue lookup
    gatewayCostGbp: 1500,
    ancillaryCostGbp: p.ancillaryCosts,
    labourCostGbp: p.installationCost,
    commissioningCostGbp: p.mcsCertificationCost,
    g99CostGbp: p.g99ApplicationCost,
    dnoCostGbp: 0,
    grossCapacityKwh: p.system.totalCapacityKwh,
    roundTripEfficiency: p.system.roundTripEfficiency,
    year1DegradationPercent: p.system.degradationRatePercent,
    annualOpexGbp: (p.system.annualMaintenanceCost || 400) + 500 + 300, // maintenance + insurance + compliance
    inflationPercent: 3,
    projectionYears: 10,
    cyclesPerDay: 2,
    degradationRatePercent: p.system.degradationRatePercent,
  }), [p]);

  // Monthly payback with seasonal weighting
  const monthlyPayback = useMemo(() => {
    const annualNetRevenue = p.summary.likely.annualNetRevenue;
    // Estimate revenue split from typical proportions
    const arbShare = 0.60, ssShare = 0.20, flexShare = 0.10, solarShare = 0.05, segShare = 0.05;
    return calculateMonthlyPayback({
      annualRevenueByStream: {
        arbitrage: annualNetRevenue * arbShare,
        savingSessions: annualNetRevenue * ssShare,
        flexibility: annualNetRevenue * flexShare,
        solar: annualNetRevenue * solarShare,
        seg: annualNetRevenue * segShare,
      },
      annualCostsGbp: 1200 + (p.system.annualMaintenanceCost || 400) + 500 + 300,
      installedCostGbp: p.totalCapitalCost,
      degradationRatePercent: p.system.degradationRatePercent,
    });
  }, [p]);

  // Export sensitivity analysis
  const exportSensitivity = useMemo(() => {
    const annualNetRevenue = p.summary.likely.annualNetRevenue;
    const arbShare = 0.60, ssShare = 0.20, flexShare = 0.10, solarShare = 0.05, segShare = 0.05;
    return calculateExportSensitivity({
      baseRevenueByStream: {
        arbitrage: annualNetRevenue * arbShare,
        savingSessions: annualNetRevenue * ssShare,
        flexibility: annualNetRevenue * flexShare,
        solar: annualNetRevenue * solarShare,
        seg: annualNetRevenue * segShare,
      },
      baseExportKw: p.system.maxDischargeRateKw,
      annualCostsGbp: 1200 + (p.system.annualMaintenanceCost || 400) + 500 + 300,
      installedCostGbp: p.totalCapitalCost,
      maxInverterKw: p.system.maxDischargeRateKw,
      degradationRatePercent: p.system.degradationRatePercent,
    });
  }, [p]);

  return (
    <div className="space-y-6">
      {/* Cost Metrics Cards */}
      <CostMetricCards metrics={costMetrics} />

      <Card>
        <CardHeader><CardTitle>Capital Cost Breakdown</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-3 text-sm">
            <Row label="Hardware (inverter + battery)" value={formatGbp(p.system.installCost)} />
            <Row label="Installation" value={formatGbp(p.installationCost)} />
            <Row label="G99 Application" value={formatGbp(p.g99ApplicationCost)} />
            <Row label="MCS Certification" value={formatGbp(p.mcsCertificationCost)} />
            <Row label="Ancillary (cabling, civils)" value={formatGbp(p.ancillaryCosts)} />
            <div className="pt-2 border-t border-border flex justify-between">
              <span className="font-semibold text-text-primary">Total Capital Cost</span>
              <span className="font-bold text-rose text-lg">{formatGbp(p.totalCapitalCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>10-Year Projection</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Gross (Best)</TableHead>
                <TableHead>Gross (Likely)</TableHead>
                <TableHead>Gross (Worst)</TableHead>
                <TableHead>Net (Likely)</TableHead>
                <TableHead>Cumulative</TableHead>
                <TableHead>ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.projection.likely.map((yr, i) => (
                <TableRow key={yr.year}>
                  <TableCell>Year {yr.year}</TableCell>
                  <TableCell className="text-scenario-best">{formatGbp(p.projection.best[i].grossRevenue)}</TableCell>
                  <TableCell className="text-scenario-likely font-medium">{formatGbp(yr.grossRevenue)}</TableCell>
                  <TableCell className="text-scenario-worst">{formatGbp(p.projection.worst[i].grossRevenue)}</TableCell>
                  <TableCell className="font-medium">{formatGbp(yr.netRevenue)}</TableCell>
                  <TableCell>{formatGbp(yr.cumulativeRevenue)}</TableCell>
                  <TableCell>{yr.roi.toFixed(0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Payback Period"
          bestValue={`${p.summary.best.paybackMonths}mo`}
          likelyValue={`${p.summary.likely.paybackMonths}mo`}
          worstValue={`${p.summary.worst.paybackMonths}mo`}
        />
        <StatCard
          label="DSCR"
          bestValue={p.summary.best.dscr.toFixed(2)}
          likelyValue={p.summary.likely.dscr.toFixed(2)}
          worstValue={p.summary.worst.dscr.toFixed(2)}
        />
        <Card className="p-4">
          <p className="text-sm font-medium text-text-secondary mb-2">DSCR Status</p>
          <TrafficLight
            status={getDscrStatus(p.summary)}
            label={getDscrStatus(p.summary) === 'green' ? 'All above covenant' : getDscrStatus(p.summary) === 'amber' ? 'Worst below covenant' : 'Likely below covenant'}
          />
        </Card>
      </div>

      {/* Export Sensitivity Chart */}
      <ExportSensitivityChart
        result={exportSensitivity}
        currentExportKw={p.system.dnoExportLimitKw}
      />

      {/* Monthly Revenue vs Cost Waterfall */}
      <MonthlyWaterfallChart paybackResult={monthlyPayback} />
    </div>
  );
}

// --- Tab: Compliance ---
function ComplianceTab({ property: p }: { property: PortfolioProperty }) {
  const g99Variant = p.g99Status === 'approved' ? 'success' : p.g99Status === 'submitted' ? 'warning' : p.g99Status === 'rejected' ? 'danger' : 'default';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>G99 / Grid Connection</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Status</span>
                <Badge variant={g99Variant}>{p.g99Status}</Badge>
              </div>
              <Row label="Reference" value={p.g99Reference || 'Not yet applied'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>MCS Certification</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Status</span>
                <Badge variant={p.mcsCertReference ? 'success' : 'default'}>
                  {p.mcsCertReference ? 'Certified' : 'Pending'}
                </Badge>
              </div>
              <Row label="Reference" value={p.mcsCertReference || 'Not yet certified'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>SEG Registration</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Status</span>
                <Badge variant={p.segRegistrationRef ? 'success' : 'default'}>
                  {p.segRegistered ? 'Registered' : 'Not registered'}
                </Badge>
              </div>
              <Row label="Reference" value={p.segRegistrationRef || '-'} />
              <Row label="SEG Rate" value={p.segRegistered ? `${p.segRate}p/kWh` : '-'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Insurance & Maintenance</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3 text-sm">
              <Row label="Insurance Policy" value={p.insurancePolicy || 'Not set'} />
              <Row label="Next Inspection" value={p.nextInspectionDate || 'Not scheduled'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-info border opacity-70">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-text-secondary">
            Document uploads (G99 approval letter, MCS cert, ESA signed copy, photos) coming in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Tab: Timeline ---
function TimelineTab({ property: p }: { property: PortfolioProperty }) {
  const typeColour: Record<string, string> = {
    'status-change': 'bg-info',
    maintenance: 'bg-warning',
    'tariff-change': 'bg-rose',
    milestone: 'bg-success',
    compliance: 'bg-violet-500',
    note: 'bg-bg-tertiary',
  };

  return (
    <div className="space-y-1">
      {p.timeline.map((event, i) => (
        <div key={event.id} className="flex gap-4 py-3">
          <div className="flex flex-col items-center">
            <span className={`w-3 h-3 rounded-full ${typeColour[event.type] || 'bg-bg-tertiary'}`} />
            {i < p.timeline.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{event.title}</span>
              <span className="text-xs text-text-tertiary">{event.date}</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Helper ---
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
