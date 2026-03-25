'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import {
  modelTariffChange,
  modelTechnologyFailure,
  modelRegulatoryChange,
  modelHardwareCostReduction,
  modelRevenueEnhancement,
  modelMarketExpansion,
  runStressTest,
  ENERGY_PRICE_SCENARIOS,
  modelEnergyPriceScenario,
  type ModelOutput,
} from '../modelling';
import { formatGbp } from '@/shared/utils/scenarios';

// --- Shared slider component ---
function Slider({ label, value, onChange, min, max, step, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-text-tertiary">{label}</span>
        <span className="text-text-primary font-medium">{value}{suffix ?? ''}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer accent-rose"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-success' : 'bg-bg-tertiary border border-border'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-xs text-text-secondary">{label}</span>
    </label>
  );
}

function MetricBox({ label, value, variant }: { label: string; value: string; variant?: 'success' | 'danger' | 'default' }) {
  return (
    <div className="bg-bg-tertiary rounded-[var(--radius-md)] p-3">
      <p className="text-[10px] text-text-tertiary uppercase">{label}</p>
      <p className={`text-sm font-bold ${variant === 'success' ? 'text-success' : variant === 'danger' ? 'text-danger' : 'text-text-primary'}`}>
        {value}
      </p>
    </div>
  );
}

// ============================================================
// Risk Modelling Panels
// ============================================================

export function TariffChangeModeller() {
  const [spread, setSpread] = useState(0);
  const [ss, setSs] = useState(true);
  const [flex, setFlex] = useState(true);

  const result = modelTariffChange({ iofSpreadChangePercent: spread, savingSessionsActive: ss, flexibilityRevenueActive: flex });
  const variant = result.revenueChangePercent >= 0 ? 'success' as const : 'danger' as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tariff Change Modeller</CardTitle>
        <p className="text-xs text-text-tertiary">Model impact of IOF spread changes on revenue and payback</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Slider label="IOF Spread Change" value={spread} onChange={setSpread} min={-50} max={30} step={5} suffix="%" />
        <div className="flex gap-4">
          <Toggle label="Saving Sessions" checked={ss} onChange={setSs} />
          <Toggle label="Flexibility Revenue" checked={flex} onChange={setFlex} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricBox label="Per Home Revenue" value={formatGbp(result.perHomeRevenue)} variant={variant} />
          <MetricBox label="Portfolio Revenue" value={formatGbp(result.portfolioRevenue)} variant={variant} />
          <MetricBox label="Payback" value={`${result.paybackMonths} months`} />
          <MetricBox label="DSCR" value={`${result.dscr}x`} variant={result.dscr >= 1.2 ? 'success' : 'danger'} />
          <MetricBox label="Revenue Change" value={`${result.revenueChangePercent >= 0 ? '+' : ''}${result.revenueChangePercent}%`} variant={variant} />
          <MetricBox label="Abs Change" value={`${result.revenueChange >= 0 ? '+' : ''}${formatGbp(result.revenueChange)}`} variant={variant} />
        </div>
      </CardContent>
    </Card>
  );
}

export function EnergyPriceModeller() {
  const results = ENERGY_PRICE_SCENARIOS.map(s => ({
    ...s,
    result: modelEnergyPriceScenario(s),
  }));

  const chartData = results.map(r => ({
    name: r.name,
    revenue: r.result.perHomeRevenue,
    change: r.result.revenueChange,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Energy Price Scenario Modeller</CardTitle>
        <p className="text-xs text-text-tertiary">Impact of wholesale price trajectories on portfolio revenue</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} />
            <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
              formatter={(value: number) => [formatGbp(value), '']}
            />
            <Bar dataKey="revenue" name="Per Home Revenue" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.change >= 0 ? '#10B981' : entry.change > -5000 ? '#F59E0B' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {results.map(r => (
            <div key={r.name} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
              <div>
                <span className="text-text-primary font-medium">{r.name}</span>
                <span className="text-text-tertiary ml-2">{r.description}</span>
              </div>
              <span className={r.result.revenueChange >= 0 ? 'text-success' : 'text-danger'}>
                {r.result.revenueChange >= 0 ? '+' : ''}{formatGbp(r.result.revenueChange)}/home
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TechnologyFailureModeller() {
  const [degradation, setDegradation] = useState(2);
  const [failRate, setFailRate] = useState(2);
  const [replaceCost, setReplaceCost] = useState(5000);

  const result = modelTechnologyFailure({
    degradationRatePercent: degradation,
    failureProbabilityPercent: failRate,
    replacementCostPerUnit: replaceCost,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Technology Failure Modeller</CardTitle>
        <p className="text-xs text-text-tertiary">Model degradation, failure rates, and maintenance costs</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Slider label="Annual Degradation" value={degradation} onChange={setDegradation} min={1} max={5} step={0.5} suffix="%" />
        <Slider label="Failure Probability" value={failRate} onChange={setFailRate} min={0} max={10} step={1} suffix="%" />
        <Slider label="Replacement Cost" value={replaceCost} onChange={setReplaceCost} min={1000} max={15000} step={1000} suffix="" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricBox label="Year 5 Capacity" value={`${result.year5CapacityPercent}%`} variant={result.year5CapacityPercent >= 85 ? 'success' : 'danger'} />
          <MetricBox label="Year 10 Capacity" value={`${result.year10CapacityPercent}%`} variant={result.year10CapacityPercent >= 70 ? 'success' : 'danger'} />
          <MetricBox label="Annual Maintenance" value={formatGbp(result.annualMaintenanceCost)} />
          <MetricBox label="Warranty Claims (10yr)" value={`${result.warrantyClaimForecast} units`} />
          <MetricBox label="Revenue Loss (Yr 5)" value={formatGbp(result.revenueReductionYear5)} variant="danger" />
          <MetricBox label="Revenue Loss (Yr 10)" value={formatGbp(result.revenueReductionYear10)} variant="danger" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RegulatoryChangeModeller() {
  const [vat, setVat] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [fire, setFire] = useState(false);
  const [fca, setFca] = useState(false);
  const [mcs, setMcs] = useState(false);
  const [g99, setG99] = useState(false);

  const result = modelRegulatoryChange({
    vatReintroduced: vat, planningRequired: planning, fireSafetyUpgrade: fire,
    fcaRegulation: fca, mcsIncrease: mcs, g99Delays: g99,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Regulatory Change Modeller</CardTitle>
        <p className="text-xs text-text-tertiary">Toggle regulatory changes to see combined impact</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Toggle label="VAT reintroduced (20%)" checked={vat} onChange={setVat} />
          <Toggle label="Planning required" checked={planning} onChange={setPlanning} />
          <Toggle label="Fire safety upgrade" checked={fire} onChange={setFire} />
          <Toggle label="FCA regulation of ESA" checked={fca} onChange={setFca} />
          <Toggle label="MCS cost increase" checked={mcs} onChange={setMcs} />
          <Toggle label="G99 processing delays" checked={g99} onChange={setG99} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricBox label="Additional Capex/Home" value={formatGbp(result.additionalCapexPerHome)} variant={result.additionalCapexPerHome > 0 ? 'danger' : 'success'} />
          <MetricBox label="Annual Compliance" value={formatGbp(result.annualComplianceCost)} variant={result.annualComplianceCost > 0 ? 'danger' : 'success'} />
          <MetricBox label="Deployment Delay" value={`${result.deploymentDelayWeeks} weeks`} variant={result.deploymentDelayWeeks > 0 ? 'danger' : 'success'} />
          <MetricBox label="Total Portfolio Impact" value={formatGbp(result.totalPortfolioImpact)} variant="danger" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Opportunity Modelling Panels
// ============================================================

export function HardwareCostModeller() {
  const [reduction, setReduction] = useState(20);
  const result = modelHardwareCostReduction({ costReductionPercent: reduction });

  const chartData = [10, 20, 30, 50].map(r => {
    const res = modelHardwareCostReduction({ costReductionPercent: r });
    return { name: `-${r}%`, payback: res.paybackMonths, homes: res.additionalHomesFundable };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hardware Cost Reduction Modeller</CardTitle>
        <p className="text-xs text-text-tertiary">Model how falling battery prices improve the business case</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Slider label="Cost Reduction" value={reduction} onChange={setReduction} min={5} max={60} step={5} suffix="%" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricBox label="New Capex/Home" value={formatGbp(result.newCapexPerHome)} variant="success" />
          <MetricBox label="Payback" value={`${result.paybackMonths} months`} variant="success" />
          <MetricBox label="10-Year ROI" value={`${result.roi10Year}%`} variant="success" />
          <MetricBox label="Extra Homes Fundable" value={`+${result.additionalHomesFundable}`} variant="success" />
          <MetricBox label="Portfolio NPV Uplift" value={formatGbp(result.portfolioNpvUplift)} variant="success" />
        </div>
        <div className="mt-2">
          <p className="text-xs text-text-tertiary mb-2">Payback comparison at different reduction levels</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} />
              <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} />
              <Bar dataKey="payback" name="Payback (months)" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueEnhancementModeller() {
  const [ssDoubled, setSsDoubled] = useState(false);
  const [iofWiden, setIofWiden] = useState(0);
  const [flexUnlocked, setFlexUnlocked] = useState(false);
  const [triple, setTriple] = useState(false);

  const result = modelRevenueEnhancement({
    savingSessionsDoubled: ssDoubled,
    iofSpreadWidenPercent: iofWiden,
    flexibilityUnlocked: flexUnlocked,
    tripleCycling: triple,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue Enhancement Modeller</CardTitle>
        <p className="text-xs text-text-tertiary">Toggle revenue uplifts to model total impact</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Toggle label="Saving Sessions doubled" checked={ssDoubled} onChange={setSsDoubled} />
          <Toggle label="Flexibility revenue unlocked" checked={flexUnlocked} onChange={setFlexUnlocked} />
          <Toggle label="Triple cycling enabled" checked={triple} onChange={setTriple} />
        </div>
        <Slider label="IOF Spread Widening" value={iofWiden} onChange={setIofWiden} min={0} max={40} step={5} suffix="%" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricBox label="Per Home Revenue" value={formatGbp(result.perHomeRevenue)} variant="success" />
          <MetricBox label="Portfolio Revenue" value={formatGbp(result.portfolioRevenue)} variant="success" />
          <MetricBox label="Revenue Uplift" value={`+${formatGbp(result.revenueUplift)}/home`} variant="success" />
          <MetricBox label="DSCR" value={`${result.newDscr}x`} variant="success" />
          <MetricBox label="Payback" value={`${result.acceleratedPaybackMonths} months`} variant="success" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketExpansionModeller() {
  const [commercial, setCommercial] = useState(10);
  const [newBuild, setNewBuild] = useState(20);
  const [social, setSocial] = useState(15);
  const [commRevenue, setCommRevenue] = useState(12000);

  const result = modelMarketExpansion({
    commercialSites: commercial,
    commercialRevenuePerSite: commRevenue,
    newBuildHomes: newBuild,
    socialHousing: social,
  });

  const chartData = result.revenueBySegment.map(s => ({
    name: s.segment,
    revenue: s.revenue,
    homes: s.homes,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Market Expansion Modeller</CardTitle>
        <p className="text-xs text-text-tertiary">Model growth through new market segments</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Commercial Sites" value={commercial} onChange={setCommercial} min={0} max={50} step={5} />
          <Slider label="Commercial Rev/Site" value={commRevenue} onChange={setCommRevenue} min={5000} max={20000} step={1000} suffix="" />
          <Slider label="New Build Homes" value={newBuild} onChange={setNewBuild} min={0} max={100} step={10} />
          <Slider label="Social Housing" value={social} onChange={setSocial} min={0} max={50} step={5} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MetricBox label="Total Portfolio" value={`${result.totalPortfolioSize} sites`} variant="success" />
          <MetricBox label="Annual Revenue" value={formatGbp(result.totalAnnualRevenue)} variant="success" />
          <MetricBox label="Additional Capex" value={formatGbp(result.additionalCapexRequired)} />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 9 }} axisLine={{ stroke: 'var(--color-border)' }} />
            <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--color-border)' }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }} formatter={(v: number) => [formatGbp(v), '']} />
            <Bar dataKey="revenue" name="Annual Revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Combined Stress Test
// ============================================================

export function CombinedStressTest() {
  const [iof, setIof] = useState(-20);
  const [deg, setDeg] = useState(3);
  const [ir, setIr] = useState(2);
  const [ssCancelled, setSsCancelled] = useState(true);

  const result = runStressTest(iof, deg, ir, ssCancelled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Combined Stress Test — &quot;Perfect Storm&quot;</CardTitle>
        <p className="text-xs text-text-tertiary">What happens if multiple risks hit simultaneously?</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Slider label="IOF Rate Change" value={iof} onChange={setIof} min={-50} max={20} step={5} suffix="%" />
        <Slider label="Battery Degradation" value={deg} onChange={setDeg} min={1} max={5} step={0.5} suffix="%/yr" />
        <Slider label="Interest Rate Increase" value={ir} onChange={setIr} min={0} max={5} step={0.5} suffix="%" />
        <Toggle label="Saving Sessions cancelled" checked={ssCancelled} onChange={setSsCancelled} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <MetricBox label="Adjusted Revenue/Home" value={formatGbp(result.adjustedRevenue)} variant={result.adjustedRevenue >= 25000 ? 'success' : 'danger'} />
          <MetricBox label="DSCR" value={`${result.adjustedDscr}x`} variant={result.adjustedDscr >= 1.2 ? 'success' : 'danger'} />
          <MetricBox label="Payback" value={`${result.adjustedPayback} months`} />
          <MetricBox label="Break-Even Homes" value={`${result.breakEvenHomes}`} />
          <MetricBox
            label="Business Survives?"
            value={result.businessSurvives ? 'YES' : 'NO'}
            variant={result.businessSurvives ? 'success' : 'danger'}
          />
        </div>

        {!result.businessSurvives && (
          <div className="bg-danger-subtle border border-danger/30 rounded-[var(--radius-md)] p-3">
            <p className="text-xs text-danger font-medium">
              DSCR below 1.0x — business cannot service debt under this scenario. Mitigation actions required.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
