'use client';

import { useState, useMemo } from 'react';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Card } from '@/shared/ui/card';
import { batteries } from '@/modules/hardware/data';
import { inverters } from '@/modules/hardware/data';
import { runIofModel, type IofModelConfig } from '@/modules/tariffs/iof-model';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart, Cell,
} from 'recharts';
import { Zap, Battery, Sun, Car, Home, TrendingUp } from 'lucide-react';

// --- Constants ---

const INSTALL_COSTS = {
  single: { labour: 2000, slab: 800, cabling: 500, metering: 1500, contingencyPct: 0.10 },
  three: { labour: 4000, slab: 2500, cabling: 1500, metering: 3500, contingencyPct: 0.10 },
};

const COLORS = {
  rose: '#B91C4D',
  blue: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  violet: '#8B5CF6',
  cyan: '#06B6D4',
  muted: '#6B7280',
};

const tooltipStyle = {
  backgroundColor: '#1A1D2E',
  border: '1px solid #2A2D3E',
  borderRadius: '8px',
  color: '#F0F1F5',
  fontSize: '12px',
};

// --- Component ---

export function IofModeller() {
  // Hardware selections
  const [batteryId, setBatteryId] = useState('bat-sigenstack');
  const [stacks, setStacks] = useState(21);
  const [inverterId, setInverterId] = useState('inv-sigenergy-m1');
  const [inverterCount, setInverterCount] = useState(1);
  const [solarKwp, setSolarKwp] = useState(25);
  const [exportLimitKw, setExportLimitKw] = useState(66);

  // Household settings
  const [houseKwh, setHouseKwh] = useState(24);
  const [hasHeatPump, setHasHeatPump] = useState(true);
  const [evCount, setEvCount] = useState(2);
  const [evMilesPerYear, setEvMilesPerYear] = useState(10000); // per EV

  // Convert miles/year to kWh/day: typical EV = 3.5 miles/kWh
  const evKwhPerDay = Math.round((evMilesPerYear / 365 / 3.5) * 10) / 10;

  // Look up selected hardware
  const battery = batteries.find(b => b.id === batteryId) ?? batteries[0]!;
  const inverter = inverters.find(i => i.id === inverterId) ?? inverters[0]!;

  // Derived system specs
  const totalCapKwh = stacks * battery.capacityPerModuleKwh * battery.maxModulesPerString;
  const totalInverterKw = inverterCount * inverter.maxOutputKw;
  const phaseType = inverter.threePhase ? 'three' as const : 'single' as const;
  const defaultExportKw = phaseType === 'three' ? 66 : 22;
  const effectiveChargeKw = Math.min(totalInverterKw, stacks * battery.chargeRateKw * battery.maxModulesPerString);
  const batteryDischargeKw = stacks * battery.dischargeRateKw * battery.maxModulesPerString;
  const usableKwh = totalCapKwh * 0.80; // 20% floor
  const maxDischargeIn3hrs = usableKwh / 3; // kW needed to empty usable in peak window

  // Determine limiting factor for peak export
  const limits = [
    { id: 'inverter', label: 'Inverter Output', kw: totalInverterKw },
    { id: 'export', label: 'Export Limit (G99)', kw: exportLimitKw },
    { id: 'battery-rate', label: 'Battery Discharge Rate', kw: batteryDischargeKw },
    { id: 'battery-cap', label: 'Battery Capacity (3hr drain)', kw: maxDischargeIn3hrs },
  ];
  const effectiveExportKw = Math.min(...limits.map(l => l.kw));
  const limitingFactor = limits.find(l => l.kw === effectiveExportKw)!;

  // CAPEX calculation
  const capex = useMemo(() => {
    const batteryGbp = stacks * battery.wholesalePriceGbp * battery.maxModulesPerString;
    const inverterGbp = inverterCount * inverter.priceGbp;
    const solarGbp = solarKwp * 400;
    const install = INSTALL_COSTS[phaseType];
    const installGbp = install.labour + install.slab + install.cabling + install.metering;
    const subtotal = batteryGbp + inverterGbp + solarGbp + installGbp;
    const contingency = Math.round(subtotal * install.contingencyPct);
    return {
      battery: batteryGbp,
      inverter: inverterGbp,
      solar: solarGbp,
      install: installGbp,
      contingency,
      total: subtotal + contingency,
    };
  }, [stacks, battery, inverterCount, inverter, solarKwp, phaseType]);

  // Run the IOF model
  const result = useMemo(() => {
    const config: IofModelConfig = {
      batteryCapKwh: totalCapKwh,
      inverterKw: totalInverterKw,
      exportLimitKw: effectiveExportKw, // use actual bottleneck, not just G99
      solarKwp,
      efficiency: battery.roundTripEfficiency / 100,
      houseKwhPerDay: houseKwh,
      hasHeatPump,
      evCount,
      evKwhPerDay,
    };
    const r = runIofModel(config);
    // Calculate payback
    const annualGbp = r.annual.netGbp;
    const paybackYears = annualGbp > 0 ? capex.total / annualGbp : 99;
    r.payback = {
      months: Math.round(paybackYears * 12),
      years: Math.round(paybackYears * 10) / 10,
    };
    return r;
  }, [totalCapKwh, totalInverterKw, exportLimitKw, solarKwp, battery, houseKwh, hasHeatPump, evCount, capex]);

  // Chart data
  const monthlyChartData = result.monthly.map(m => ({
    month: m.label,
    export: Math.round(m.exportRev / 100),
    selfUse: Math.round(m.selfUse / 100),
    chargeCost: -Math.round((m.offpeakCost + m.topupCost) / 100),
    evCost: -Math.round(m.evCost / 100),
    net: Math.round(m.net / 100),
  }));

  const dailyChartData = result.days.filter((_, i) => i % 3 === 0).map(d => ({
    date: d.date.slice(5),
    net: Math.round(d.net) / 100,
    solar: d.solarIn,
  }));

  const selectClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-full";
  const numberClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-20 text-center";
  const labelClass = "text-xs text-text-secondary uppercase tracking-wide";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-text-primary">IOF Revenue Model</h2>
        <span className="text-xs text-text-tertiary ml-2">Intelligent Octopus Flux — 365-day simulation</span>
      </div>

      {/* Hardware Selection */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Battery className="h-4 w-4 text-blue-400" />
          Hardware Selection
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className={labelClass}>Battery</label>
            <select value={batteryId} onChange={e => setBatteryId(e.target.value)} className={selectClass}>
              {batteries.map(b => (
                <option key={b.id} value={b.id}>
                  {b.manufacturer} {b.model}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              {battery.capacityPerModuleKwh}kWh/mod × {battery.maxModulesPerString} max
            </p>
          </div>

          <div>
            <label className={labelClass}>Battery Stacks</label>
            <input
              type="number"
              min={1}
              max={15}
              value={stacks}
              onChange={e => setStacks(Math.max(1, Math.min(15, Number(e.target.value))))}
              className={numberClass}
            />
            <p className="text-xs text-text-tertiary mt-1">
              = {totalCapKwh.toFixed(0)} kWh total
            </p>
          </div>

          <div>
            <label className={labelClass}>Inverter</label>
            <select value={inverterId} onChange={e => setInverterId(e.target.value)} className={selectClass}>
              {inverters.map(i => (
                <option key={i.id} value={i.id}>
                  {i.manufacturer} {i.model}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">
              {inverter.maxOutputKw}kW {inverter.threePhase ? '3-phase' : '1-phase'}
            </p>
          </div>

          <div>
            <label className={labelClass}>Inverter Count</label>
            <input
              type="number"
              min={1}
              max={5}
              value={inverterCount}
              onChange={e => setInverterCount(Math.max(1, Math.min(5, Number(e.target.value))))}
              className={numberClass}
            />
            <p className="text-xs text-text-tertiary mt-1">
              = {totalInverterKw}kW total
            </p>
          </div>

          <div>
            <label className={labelClass}>Solar (kWp)</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={solarKwp}
              onChange={e => setSolarKwp(Math.max(0, Math.min(50, Number(e.target.value))))}
              className={numberClass}
            />
          </div>

          <div>
            <label className={labelClass}>Export Limit (kW)</label>
            <input
              type="number"
              min={3}
              max={200}
              step={1}
              value={exportLimitKw}
              onChange={e => setExportLimitKw(Math.max(3, Math.min(200, Number(e.target.value))))}
              className={numberClass}
            />
            <p className="text-xs text-text-tertiary mt-1">
              Default: {defaultExportKw}kW ({phaseType === 'three' ? 'G99 3-ph' : 'G100 1-ph'})
            </p>
          </div>
        </div>

        {/* System summary row — red border on the limiting factor */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className={`rounded-lg p-2 ${limitingFactor.id === 'inverter' ? 'ring-2 ring-red-500 bg-red-500/5' : ''}`}>
            <span className="text-xs text-text-tertiary">Total Inverter</span>
            <p className="text-sm font-semibold text-text-primary">{totalInverterKw} kW</p>
            {limitingFactor.id === 'inverter' && <p className="text-xs text-red-400 font-medium">⚠ BOTTLENECK</p>}
          </div>
          <div className={`rounded-lg p-2 ${limitingFactor.id === 'export' ? 'ring-2 ring-red-500 bg-red-500/5' : ''}`}>
            <span className="text-xs text-text-tertiary">Export Limit</span>
            <p className="text-sm font-semibold text-text-primary">{exportLimitKw} kW</p>
            {limitingFactor.id === 'export' && <p className="text-xs text-red-400 font-medium">⚠ BOTTLENECK</p>}
          </div>
          <div className={`rounded-lg p-2 ${limitingFactor.id === 'battery-rate' ? 'ring-2 ring-red-500 bg-red-500/5' : ''}`}>
            <span className="text-xs text-text-tertiary">Battery Discharge</span>
            <p className="text-sm font-semibold text-text-primary">{batteryDischargeKw.toFixed(1)} kW</p>
            {limitingFactor.id === 'battery-rate' && <p className="text-xs text-red-400 font-medium">⚠ BOTTLENECK</p>}
          </div>
          <div className={`rounded-lg p-2 ${limitingFactor.id === 'battery-cap' ? 'ring-2 ring-red-500 bg-red-500/5' : ''}`}>
            <span className="text-xs text-text-tertiary">Usable Capacity</span>
            <p className="text-sm font-semibold text-text-primary">{usableKwh.toFixed(0)} kWh</p>
            {limitingFactor.id === 'battery-cap' && <p className="text-xs text-red-400 font-medium">⚠ BOTTLENECK</p>}
          </div>
          <div className="rounded-lg p-2">
            <span className="text-xs text-text-tertiary">Peak Export</span>
            <p className="text-sm font-semibold text-blue-400">{effectiveExportKw.toFixed(0)} kW → {(effectiveExportKw * 3).toFixed(0)} kWh/day</p>
          </div>
          <div className="rounded-lg p-2">
            <span className="text-xs text-text-tertiary">Total CAPEX</span>
            <p className="text-sm font-bold text-rose">£{capex.total.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Household Settings */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Home className="h-4 w-4 text-amber-400" />
          Household Settings
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Daily Consumption (kWh)</label>
            <input
              type="range"
              min={10}
              max={50}
              value={houseKwh}
              onChange={e => setHouseKwh(Number(e.target.value))}
              className="w-full mt-1"
            />
            <p className="text-sm font-semibold text-text-primary text-center">{houseKwh} kWh/day</p>
          </div>
          <div>
            <label className={labelClass}>Heat Pump</label>
            <button
              onClick={() => setHasHeatPump(!hasHeatPump)}
              className={`mt-1 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                hasHeatPump
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-bg-secondary text-text-tertiary border border-border'
              }`}
            >
              {hasHeatPump ? 'Yes' : 'No'}
            </button>
          </div>
          <div>
            <label className={labelClass}>Electric Vehicles</label>
            <div className="flex gap-2 mt-1">
              {[0, 1, 2].map(n => (
                <button
                  key={n}
                  onClick={() => setEvCount(n)}
                  className={`px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${
                    evCount === n
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-bg-secondary text-text-tertiary border border-border'
                  }`}
                >
                  {n === 0 ? 'None' : `${n} EV${n > 1 ? 's' : ''}`}
                </button>
              ))}
            </div>
            {evCount > 0 && (
              <div className="mt-2">
                <label className={labelClass}>Miles/year per EV</label>
                <input
                  type="number"
                  min={1000}
                  max={30000}
                  step={500}
                  value={evMilesPerYear}
                  onChange={e => setEvMilesPerYear(Math.max(1000, Math.min(30000, Number(e.target.value))))}
                  className={numberClass}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  = {evKwhPerDay} kWh/day/EV ({(evKwhPerDay * evCount).toFixed(1)} total) @ 3.5 mi/kWh
                </p>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>IOF Rates</label>
            <div className="text-xs text-text-tertiary mt-1 space-y-0.5">
              <div>Off-peak: <span className="text-green-400">16.40p</span> (02-05)</div>
              <div>Day: <span className="text-amber-400">27.33p</span> (05-16, 19-02)</div>
              <div>Peak: <span className="text-red-400">38.26p</span> (16-19)</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SimpleStatCard
          label="Annual Net Revenue"
          value={`£${result.annual.netGbp.toLocaleString()}`}
          subtitle={`£${result.annual.avgDailyGbp.toFixed(2)}/day`}
          trend="up"
        />
        <SimpleStatCard
          label="Total CAPEX"
          value={`£${capex.total.toLocaleString()}`}
          subtitle={`Battery £${capex.battery.toLocaleString()}`}
        />
        <SimpleStatCard
          label="Payback Period"
          value={`${result.payback.years} yrs`}
          subtitle={`${result.payback.months} months`}
          trend={result.payback.years < 7 ? 'up' : result.payback.years < 10 ? 'neutral' : 'down'}
        />
        <SimpleStatCard
          label="Summer Daily"
          value={`£${result.annual.summerDailyGbp.toFixed(2)}`}
          subtitle="June average"
          trend="up"
        />
        <SimpleStatCard
          label="Winter Daily"
          value={`£${result.annual.winterDailyGbp.toFixed(2)}`}
          subtitle="December average"
        />
        <SimpleStatCard
          label="Export Revenue"
          value={`£${Math.round(result.annual.export / 100).toLocaleString()}`}
          subtitle={`${result.system.maxPeakExportKwh.toFixed(0)}kWh/day @ 38.26p`}
        />
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          Monthly Revenue Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthlyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 12 }} />
            <YAxis tick={{ fill: '#888', fontSize: 12 }} tickFormatter={v => `£${v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`£${v}`, '']} />
            <Legend />
            <Bar dataKey="export" name="Export" stackId="pos" fill={COLORS.blue} />
            <Bar dataKey="selfUse" name="Self-Use" stackId="pos" fill={COLORS.green} />
            <Bar dataKey="chargeCost" name="Charge Cost" stackId="neg" fill={COLORS.red} />
            <Bar dataKey="evCost" name="EV Cost" stackId="neg" fill={COLORS.amber} />
            <Line type="monotone" dataKey="net" name="Net" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Monthly Table */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-text-tertiary uppercase py-2 px-3">Month</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3">Off-peak £</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3">Top-up £</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3">Solar In</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3">Export £</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3">Self-Use £</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3">EV £</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3 font-semibold">Net £</th>
                <th className="text-right text-xs text-text-tertiary uppercase py-2 px-3">Daily Avg</th>
              </tr>
            </thead>
            <tbody>
              {result.monthly.map(m => (
                <tr key={m.month} className="border-b border-border/50 hover:bg-bg-secondary/50">
                  <td className="py-2 px-3 font-medium text-text-primary">{m.label}</td>
                  <td className="py-2 px-3 text-right text-red-400">£{(m.offpeakCost / 100).toFixed(0)}</td>
                  <td className="py-2 px-3 text-right text-red-400">{m.topupCost > 0 ? `£${(m.topupCost / 100).toFixed(0)}` : '—'}</td>
                  <td className="py-2 px-3 text-right text-amber-400">{m.solarIn > 0 ? `${m.solarIn}kWh` : '—'}</td>
                  <td className="py-2 px-3 text-right">£{(m.exportRev / 100).toFixed(0)}</td>
                  <td className="py-2 px-3 text-right text-green-400">£{(m.selfUse / 100).toFixed(0)}</td>
                  <td className="py-2 px-3 text-right text-red-400">£{(m.evCost / 100).toFixed(0)}</td>
                  <td className="py-2 px-3 text-right font-bold text-blue-400">£{(m.net / 100).toFixed(0)}</td>
                  <td className="py-2 px-3 text-right text-text-secondary">£{(m.dailyAvg / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="py-2 px-3 font-bold text-text-primary">ANNUAL</td>
                <td className="py-2 px-3 text-right text-red-400 font-semibold">£{(result.annual.offpeakCharge / 100).toFixed(0)}</td>
                <td className="py-2 px-3 text-right text-red-400">£{(result.annual.topup / 100).toFixed(0)}</td>
                <td className="py-2 px-3 text-right text-amber-400">{result.monthly.reduce((s, m) => s + m.solarIn, 0).toFixed(0)}kWh</td>
                <td className="py-2 px-3 text-right font-semibold">£{(result.annual.export / 100).toFixed(0)}</td>
                <td className="py-2 px-3 text-right text-green-400 font-semibold">£{(result.annual.selfUse / 100).toFixed(0)}</td>
                <td className="py-2 px-3 text-right text-red-400">£{(result.annual.ev / 100).toFixed(0)}</td>
                <td className="py-2 px-3 text-right font-bold text-blue-400 text-lg">£{result.annual.netGbp.toLocaleString()}</td>
                <td className="py-2 px-3 text-right font-semibold">£{result.annual.avgDailyGbp.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* CAPEX Breakdown */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">CAPEX Breakdown & Payback</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-text-secondary">Battery ({stacks} × {battery.manufacturer} {battery.model})</td>
                  <td className="py-2 text-right font-medium">£{capex.battery.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-text-secondary">Inverter ({inverterCount} × {inverter.manufacturer} {inverter.model})</td>
                  <td className="py-2 text-right font-medium">£{capex.inverter.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-text-secondary">Solar ({solarKwp}kWp @ £400/kWp)</td>
                  <td className="py-2 text-right font-medium">£{capex.solar.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-text-secondary">Installation ({phaseType}-phase)</td>
                  <td className="py-2 text-right font-medium">£{capex.install.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 text-text-secondary">Contingency (10%)</td>
                  <td className="py-2 text-right font-medium">£{capex.contingency.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 border-border">
                  <td className="py-2 font-bold text-text-primary">Total CAPEX</td>
                  <td className="py-2 text-right font-bold text-rose text-lg">£{capex.total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-4">
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-tertiary uppercase">Payback Period</p>
              <p className="text-3xl font-bold text-blue-400">{result.payback.years} years</p>
              <p className="text-sm text-text-secondary">{result.payback.months} months</p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-tertiary uppercase">Annual Return on Investment</p>
              <p className="text-3xl font-bold text-green-400">
                {capex.total > 0 ? ((result.annual.netGbp / capex.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="bg-bg-secondary rounded-lg p-4">
              <p className="text-xs text-text-tertiary uppercase">10-Year Net Profit</p>
              <p className="text-3xl font-bold text-text-primary">
                £{(result.annual.netGbp * 10 - capex.total).toLocaleString()}
              </p>
              <p className="text-xs text-text-tertiary">Revenue £{(result.annual.netGbp * 10).toLocaleString()} - CAPEX £{capex.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* IOF Rate Info */}
      <div className="text-xs text-text-tertiary bg-bg-secondary/50 rounded-lg p-4 border border-border/50">
        <p><strong className="text-blue-400">IOF Model Assumptions:</strong> Kraken optimises to arrive at 16:00 fully charged.
        Off-peak charge reduced by predicted solar surplus. Day-rate top-up fills any remaining gap.
        Peak export: {exportLimitKw}kW × 3hrs = {result.system.maxPeakExportKwh}kWh/day at 38.26p (import = export parity).
        House on battery 24/7. 20% discharge floor ({result.system.dischargeFloorKwh}kWh).
        Solar calibrated to 900 kWh/kWp/yr for Lancashire (53.8°N).
        EVs: {evCount} × {evMilesPerYear.toLocaleString()} miles/yr = {(evKwhPerDay * evCount).toFixed(1)}kWh/day at off-peak 16.40p.</p>
      </div>
    </div>
  );
}
