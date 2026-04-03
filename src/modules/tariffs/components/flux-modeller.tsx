'use client';

import { useState, useMemo, useCallback } from 'react';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Card } from '@/shared/ui/card';
import { batteries } from '@/modules/hardware/data';
import { inverters } from '@/modules/hardware/data';
import { runFluxModel, type FluxModelConfig } from '@/modules/tariffs/flux-model';
import type { FluxHistoricalResult, FluxHistoricalMonthResult } from '@/modules/tariffs/flux-historical-model';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart, Cell,
} from 'recharts';
import { Zap, Battery, Sun, Car, Home, TrendingUp, RefreshCw, Calendar, Database, Calculator } from 'lucide-react';

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

export function FluxModeller() {
  // Mode toggle: fixed (synthetic) vs historical (DB)
  const [mode, setMode] = useState<'historical' | 'fixed'>('historical');

  // Hardware selections
  const [batteryId, setBatteryId] = useState('bat-fogstar-64');
  const [stacks, setStacks] = useState(4);
  const [inverterId, setInverterId] = useState('inv-solis-30k');
  const [inverterCount, setInverterCount] = useState(3);
  const [solarKwp, setSolarKwp] = useState(25);
  const [exportLimitKw, setExportLimitKw] = useState(66);

  // Household settings
  const [houseKwh, setHouseKwh] = useState(24);
  const [hasHeatPump, setHasHeatPump] = useState(true);
  const [evCount, setEvCount] = useState(2);
  const [evMilesPerYear, setEvMilesPerYear] = useState(10000);
  const [months, setMonths] = useState(12);

  // Historical model state
  const [historicalResult, setHistoricalResult] = useState<FluxHistoricalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string; totalDays: number } | null>(null);

  const evKwhPerDay = Math.round((evMilesPerYear / 365 / 3.5) * 10) / 10;

  const battery = batteries.find(b => b.id === batteryId) ?? batteries[0]!;
  const inverter = inverters.find(i => i.id === inverterId) ?? inverters[0]!;

  const totalCapKwh = stacks * battery.capacityPerModuleKwh * battery.maxModulesPerString;
  const totalInverterKw = inverterCount * inverter.maxOutputKw;
  const phaseType = inverter.threePhase ? 'three' as const : 'single' as const;
  const defaultExportKw = phaseType === 'three' ? 66 : 22;
  const batteryDischargeKw = stacks * battery.dischargeRateKw * battery.maxModulesPerString;
  const usableKwh = totalCapKwh * 0.95; // 5% floor for Flux

  const limits = [
    { id: 'inverter', label: 'Inverter Output', kw: totalInverterKw },
    { id: 'export', label: 'Export Limit (G99)', kw: exportLimitKw },
    { id: 'battery-rate', label: 'Battery Discharge Rate', kw: batteryDischargeKw },
    { id: 'battery-cap', label: 'Battery Capacity (3hr drain)', kw: usableKwh / 3 },
  ];
  const effectiveExportKw = Math.min(...limits.map(l => l.kw));
  const limitingFactor = limits.find(l => l.kw === effectiveExportKw)!;

  const capex = useMemo(() => {
    const batteryGbp = stacks * battery.wholesalePriceGbp * battery.maxModulesPerString;
    const inverterGbp = inverterCount * inverter.priceGbp;
    const solarGbp = solarKwp * 400;
    const install = INSTALL_COSTS[phaseType];
    const installGbp = install.labour + install.slab + install.cabling + install.metering;
    const subtotal = batteryGbp + inverterGbp + solarGbp + installGbp;
    const contingency = Math.round(subtotal * install.contingencyPct);
    return {
      battery: batteryGbp, inverter: inverterGbp, solar: solarGbp,
      install: installGbp, contingency, total: subtotal + contingency,
    };
  }, [stacks, battery, inverterCount, inverter, solarKwp, phaseType]);

  // Fixed-rate model
  const fixedResult = useMemo(() => {
    if (mode !== 'fixed') return null;
    const config: FluxModelConfig = {
      batteryCapKwh: totalCapKwh,
      inverterKw: totalInverterKw,
      exportLimitKw: effectiveExportKw,
      solarKwp,
      efficiency: battery.roundTripEfficiency / 100,
      houseKwhPerDay: houseKwh,
      hasHeatPump,
      evCount,
      evKwhPerDay,
    };
    const r = runFluxModel(config);
    const annualGbp = r.annual.netGbp;
    const paybackYears = annualGbp > 0 ? capex.total / annualGbp : 99;
    r.payback = { months: Math.round(paybackYears * 12), years: Math.round(paybackYears * 10) / 10 };
    return r;
  }, [mode, totalCapKwh, totalInverterKw, effectiveExportKw, solarKwp, battery, houseKwh, hasHeatPump, evCount, evKwhPerDay, capex]);

  // Historical model fetch
  const fetchHistorical = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        batteryKwh: String(totalCapKwh),
        inverterKw: String(totalInverterKw),
        exportKw: String(effectiveExportKw),
        solarKwp: String(solarKwp),
        efficiency: String(battery.roundTripEfficiency / 100),
        houseKwh: String(houseKwh),
        heatPump: String(hasHeatPump),
        evCount: String(evCount),
        evKwhPerDay: String(evKwhPerDay),
        months: String(months),
      });
      const res = await fetch(`/api/tariffs/flux-model?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHistoricalResult(data);
      setDateRange(data.dateRange);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run model');
    } finally {
      setLoading(false);
    }
  }, [totalCapKwh, totalInverterKw, effectiveExportKw, solarKwp, battery, houseKwh, hasHeatPump, evCount, evKwhPerDay, months]);

  // Determine which result to display
  const isHistorical = mode === 'historical';
  const activeResult = isHistorical ? historicalResult : fixedResult;

  // Unified chart/table data
  const monthlyChartData = isHistorical
    ? (historicalResult?.monthly ?? []).map((m: FluxHistoricalMonthResult) => ({
        month: m.label,
        export: Math.round(m.peakExpRev / 100),
        selfUse: Math.round((m.peakSelfUse + m.eveSelfUse + m.nightSelfUse) / 100),
        chargeCost: -Math.round((m.offpeakCost + m.topupCost) / 100),
        evCost: -Math.round(m.evCost / 100),
        net: Math.round(m.net / 100),
      }))
    : (fixedResult?.monthly ?? []).map(m => ({
        month: m.label,
        export: Math.round(m.peakExpRev / 100),
        selfUse: Math.round((m.peakSelfUse + m.eveSelfUse + m.nightSelfUse) / 100),
        chargeCost: -Math.round((m.offpeakCost + m.topupCost) / 100),
        evCost: -Math.round(m.evCost / 100),
        net: Math.round(m.net / 100),
      }));

  const annualNet = isHistorical ? (historicalResult?.annual.netGbp ?? 0) : (fixedResult?.annual.netGbp ?? 0);
  const avgDaily = isHistorical ? (historicalResult?.annual.avgDailyGbp ?? 0) : (fixedResult?.annual.avgDailyGbp ?? 0);
  const paybackYears = annualNet > 0 ? Math.round(capex.total / annualNet * 10) / 10 : 99;

  const selectClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-full";
  const numberClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-20 text-center";
  const labelClass = "text-xs text-text-secondary uppercase tracking-wide";

  return (
    <div className="space-y-6">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-text-primary">Flux Revenue Model</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setMode('historical')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 transition-colors ${
                mode === 'historical'
                  ? 'bg-blue-600 text-white'
                  : 'bg-bg-secondary text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Database className="h-3 w-3" />
              Historical (DB)
            </button>
            <button
              onClick={() => setMode('fixed')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 transition-colors ${
                mode === 'fixed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-bg-secondary text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Calculator className="h-3 w-3" />
              Fixed Rates
            </button>
          </div>
          {isHistorical && (
            <button
              onClick={() => void fetchHistorical()}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-[var(--radius-md)] bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Running...' : 'Run Model'}
            </button>
          )}
        </div>
      </div>

      {/* Mode description */}
      {isHistorical && dateRange && (
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Calendar className="h-3.5 w-3.5" />
          Historical Flux rates: {dateRange.from} → {dateRange.to} ({dateRange.totalDays} days from DB)
        </div>
      )}
      {isHistorical && !historicalResult && !loading && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-blue-300 text-sm">
          Click <strong>Run Model</strong> to backtest against {months} months of real Flux rates from the database.
          Rates have changed quarterly — this shows actual revenue with declining spreads.
        </div>
      )}
      {!isHistorical && (
        <div className="text-xs text-text-tertiary">
          Fixed rates: off-peak 17.90p/5.12p, day 26.80p/10.54p, peak 30.68p/30.68p — 365-day synthetic simulation
        </div>
      )}

      {/* Hardware Selection */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Battery className="h-4 w-4 text-blue-400" />
          Hardware Selection
          {isHistorical && (
            <select value={months} onChange={e => setMonths(Number(e.target.value))} className="ml-auto text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary">
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={18}>Last 18 months</option>
              <option value={24}>Last 24 months</option>
              <option value={36}>All data (~3 years)</option>
            </select>
          )}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className={labelClass}>Battery</label>
            <select value={batteryId} onChange={e => setBatteryId(e.target.value)} className={selectClass}>
              {batteries.map(b => (
                <option key={b.id} value={b.id}>{b.manufacturer} {b.model}</option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">{battery.capacityPerModuleKwh}kWh/mod × {battery.maxModulesPerString} max</p>
          </div>
          <div>
            <label className={labelClass}>Battery Stacks</label>
            <input type="number" min={1} max={15} value={stacks} onChange={e => setStacks(Math.max(1, Math.min(15, Number(e.target.value))))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">= {totalCapKwh.toFixed(0)} kWh total</p>
          </div>
          <div>
            <label className={labelClass}>Inverter</label>
            <select value={inverterId} onChange={e => setInverterId(e.target.value)} className={selectClass}>
              {inverters.map(i => (
                <option key={i.id} value={i.id}>{i.manufacturer} {i.model}</option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary mt-1">{inverter.maxOutputKw}kW {inverter.threePhase ? '3-phase' : '1-phase'}</p>
          </div>
          <div>
            <label className={labelClass}>Inverter Count</label>
            <input type="number" min={1} max={5} value={inverterCount} onChange={e => setInverterCount(Math.max(1, Math.min(5, Number(e.target.value))))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">= {totalInverterKw}kW total</p>
          </div>
          <div>
            <label className={labelClass}>Solar (kWp)</label>
            <input type="number" min={0} max={50} step={0.5} value={solarKwp} onChange={e => setSolarKwp(Number(e.target.value))} className={numberClass} />
          </div>
          <div>
            <label className={labelClass}>Export Limit (kW)</label>
            <input type="number" min={3} max={200} step={1} value={exportLimitKw} onChange={e => setExportLimitKw(Number(e.target.value))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">Default: {defaultExportKw}kW</p>
          </div>
        </div>

        {/* Bottleneck indicators */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-6 gap-3">
          {limits.map(l => (
            <div key={l.id} className={`rounded-lg p-2 ${l.id === limitingFactor.id ? 'ring-2 ring-red-500 bg-red-500/5' : ''}`}>
              <span className="text-xs text-text-tertiary">{l.label}</span>
              <p className="text-sm font-semibold text-text-primary">{l.kw.toFixed(0)} kW</p>
              {l.id === limitingFactor.id && <p className="text-xs text-red-400 font-medium">BOTTLENECK</p>}
            </div>
          ))}
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
            <input type="range" min={10} max={50} value={houseKwh} onChange={e => setHouseKwh(Number(e.target.value))} className="w-full mt-1" />
            <p className="text-sm font-semibold text-text-primary text-center">{houseKwh} kWh/day</p>
          </div>
          <div>
            <label className={labelClass}>Heat Pump</label>
            <button onClick={() => setHasHeatPump(!hasHeatPump)} className={`mt-1 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${hasHeatPump ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
              {hasHeatPump ? 'Yes' : 'No'}
            </button>
          </div>
          <div>
            <label className={labelClass}>Electric Vehicles</label>
            <div className="flex gap-2 mt-1">
              {[0, 1, 2].map(n => (
                <button key={n} onClick={() => setEvCount(n)} className={`px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${evCount === n ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                  {n === 0 ? 'None' : `${n} EV${n > 1 ? 's' : ''}`}
                </button>
              ))}
            </div>
            {evCount > 0 && (
              <div className="mt-2">
                <label className={labelClass}>Miles/year per EV</label>
                <input type="number" min={1000} max={30000} step={500} value={evMilesPerYear} onChange={e => setEvMilesPerYear(Number(e.target.value))} className={numberClass} />
                <p className="text-xs text-text-tertiary mt-1">= {evKwhPerDay} kWh/day/EV ({(evKwhPerDay * evCount).toFixed(1)} total)</p>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>{isHistorical ? 'Historical Rates' : 'Fixed Rates'}</label>
            {isHistorical && historicalResult ? (
              <div className="text-xs text-text-tertiary mt-1 space-y-0.5">
                <div>Avg spread: <span className="text-blue-400">{historicalResult.annual.avgSpread.toFixed(1)}p</span></div>
                <div>Total days: <span className="text-blue-400">{historicalResult.annual.totalDays}</span></div>
                <div className="text-amber-400">Rates change quarterly from Octopus</div>
              </div>
            ) : (
              <div className="text-xs text-text-tertiary mt-1 space-y-0.5">
                <div>Off-peak: <span className="text-green-400">17.90p / 5.12p</span> (02-05)</div>
                <div>Day: <span className="text-amber-400">26.80p / 10.54p</span> (05-16, 19-02)</div>
                <div>Peak: <span className="text-red-400">30.68p / 30.68p</span> (16-19)</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="text-center py-12 text-text-tertiary">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-400" />
          <p>Running Flux backtest against {months} months of historical rates...</p>
        </div>
      )}

      {/* Results — displayed for both modes */}
      {((isHistorical && historicalResult && !loading) || (!isHistorical && fixedResult)) && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SimpleStatCard
              label="Annual Net Revenue"
              value={`£${annualNet.toLocaleString()}`}
              subtitle={`£${avgDaily.toFixed(2)}/day`}
              trend="up"
            />
            <SimpleStatCard
              label="Total CAPEX"
              value={`£${capex.total.toLocaleString()}`}
              subtitle={`Battery £${capex.battery.toLocaleString()}`}
            />
            <SimpleStatCard
              label="Payback Period"
              value={`${paybackYears} yrs`}
              subtitle={`${Math.round(paybackYears * 12)} months`}
              trend={paybackYears < 7 ? 'up' : paybackYears < 10 ? 'neutral' : 'down'}
            />
            {isHistorical && historicalResult ? (
              <>
                <SimpleStatCard
                  label="Avg Peak Export"
                  value={`${historicalResult.monthly.length > 0 ? (historicalResult.monthly.reduce((s, m) => s + m.avgPeakExp, 0) / historicalResult.monthly.length).toFixed(1) : '0'}p`}
                  subtitle="Rate declining over time"
                  trend="down"
                />
                <SimpleStatCard
                  label="Avg Spread"
                  value={`${historicalResult.annual.avgSpread.toFixed(1)}p`}
                  subtitle="Peak export - off-peak import"
                />
                <SimpleStatCard
                  label="Data Days"
                  value={`${historicalResult.annual.totalDays}`}
                  subtitle={`${dateRange?.from} → ${dateRange?.to}`}
                />
              </>
            ) : fixedResult ? (
              <>
                <SimpleStatCard
                  label="Summer Daily"
                  value={`£${fixedResult.annual.summerDailyGbp.toFixed(2)}`}
                  subtitle="June average"
                  trend="up"
                />
                <SimpleStatCard
                  label="Winter Daily"
                  value={`£${fixedResult.annual.winterDailyGbp.toFixed(2)}`}
                  subtitle="December average"
                />
                <SimpleStatCard
                  label="Export Revenue"
                  value={`£${Math.round(fixedResult.annual.peakExport / 100).toLocaleString()}`}
                  subtitle={`Peak @ 30.68p`}
                />
              </>
            ) : null}
          </div>

          {/* Rate Trend (historical only) */}
          {isHistorical && historicalResult && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                Rate Trend — Flux Spread Declining Over Time
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={historicalResult.monthly.map(m => ({
                  month: m.label,
                  spread: m.avgSpread,
                  peakExp: m.avgPeakExp,
                  dailyRev: Math.round(m.dailyAvg) / 100,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                  <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis yAxisId="rate" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => `${v}p`} />
                  <YAxis yAxisId="rev" orientation="right" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => `£${v}`} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar yAxisId="rate" dataKey="spread" name="Spread (p)" fill={COLORS.amber} opacity={0.6} />
                  <Line yAxisId="rate" type="monotone" dataKey="peakExp" name="Peak Export (p)" stroke={COLORS.red} strokeWidth={2} dot={false} />
                  <Line yAxisId="rev" type="monotone" dataKey="dailyRev" name="Daily Revenue (£)" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          )}

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
                    <th className="text-left text-xs text-text-tertiary uppercase py-2 px-2">Month</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Off-peak £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Top-up £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Solar kWh</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Export £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Self-Use £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">EV £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2 font-semibold">Net £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Daily</th>
                    {isHistorical && <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Spread</th>}
                  </tr>
                </thead>
                <tbody>
                  {isHistorical && historicalResult ? historicalResult.monthly.map((m: FluxHistoricalMonthResult) => (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-bg-secondary/50">
                      <td className="py-2 px-2 font-medium text-text-primary">{m.label}</td>
                      <td className="py-2 px-2 text-right text-red-400">£{(m.offpeakCost / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-red-400">{m.topupCost > 0 ? `£${(m.topupCost / 100).toFixed(0)}` : '—'}</td>
                      <td className="py-2 px-2 text-right text-amber-400">{m.solarIn > 0 ? `${m.solarIn}` : '—'}</td>
                      <td className="py-2 px-2 text-right">£{(m.peakExpRev / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-green-400">£{((m.peakSelfUse + m.eveSelfUse + m.nightSelfUse) / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-red-400">£{(m.evCost / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-bold text-blue-400">£{(m.net / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-text-secondary">£{(m.dailyAvg / 100).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-amber-400">{m.avgSpread.toFixed(1)}p</td>
                    </tr>
                  )) : fixedResult?.monthly.map(m => (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-bg-secondary/50">
                      <td className="py-2 px-2 font-medium text-text-primary">{m.label}</td>
                      <td className="py-2 px-2 text-right text-red-400">£{(m.offpeakCost / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-red-400">{m.topupCost > 0 ? `£${(m.topupCost / 100).toFixed(0)}` : '—'}</td>
                      <td className="py-2 px-2 text-right text-amber-400">{m.solarIn > 0 ? `${m.solarIn}kWh` : '—'}</td>
                      <td className="py-2 px-2 text-right">£{(m.peakExpRev / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-green-400">£{((m.peakSelfUse + m.eveSelfUse + m.nightSelfUse) / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-red-400">£{(m.evCost / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-bold text-blue-400">£{(m.net / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-text-secondary">£{(m.dailyAvg / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2 px-2 font-bold">
                      {isHistorical ? `ANNUALISED (${historicalResult?.annual.totalDays ?? 0}d)` : 'ANNUAL'}
                    </td>
                    <td className="py-2 px-2 text-right text-red-400 font-semibold">
                      £{isHistorical ? (historicalResult?.annual.offpeakCharge ?? 0) / 100 : (fixedResult?.annual.offpeakCharge ?? 0) / 100 | 0}
                    </td>
                    <td className="py-2 px-2 text-right text-red-400">
                      £{isHistorical ? Math.round((historicalResult?.annual.topup ?? 0) / 100) : Math.round((fixedResult?.annual.topup ?? 0) / 100)}
                    </td>
                    <td className="py-2 px-2"></td>
                    <td className="py-2 px-2 text-right font-semibold">
                      £{Math.round((isHistorical ? historicalResult?.annual.peakExport ?? 0 : fixedResult?.annual.peakExport ?? 0) / 100)}
                    </td>
                    <td className="py-2 px-2 text-right text-green-400 font-semibold">
                      £{Math.round(((isHistorical ? (historicalResult?.annual.peakSelfUse ?? 0) + (historicalResult?.annual.eveSelfUse ?? 0) + (historicalResult?.annual.nightSelfUse ?? 0) : (fixedResult?.annual.peakSelfUse ?? 0) + (fixedResult?.annual.eveSelfUse ?? 0) + (fixedResult?.annual.nightSelfUse ?? 0))) / 100)}
                    </td>
                    <td className="py-2 px-2 text-right text-red-400">
                      £{Math.round((isHistorical ? historicalResult?.annual.ev ?? 0 : fixedResult?.annual.ev ?? 0) / 100)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-blue-400 text-lg">£{annualNet.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-semibold">£{avgDaily.toFixed(2)}</td>
                    {isHistorical && <td className="py-2 px-2 text-right text-amber-400 font-semibold">{historicalResult?.annual.avgSpread.toFixed(1)}p</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* CAPEX Breakdown */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">CAPEX Breakdown & Payback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Battery ({stacks} × {battery.manufacturer} {battery.model})</td><td className="py-2 text-right font-medium">£{capex.battery.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Inverter ({inverterCount} × {inverter.manufacturer} {inverter.model})</td><td className="py-2 text-right font-medium">£{capex.inverter.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Solar ({solarKwp}kWp @ £400/kWp)</td><td className="py-2 text-right font-medium">£{capex.solar.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Installation ({phaseType}-phase)</td><td className="py-2 text-right font-medium">£{capex.install.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Contingency (10%)</td><td className="py-2 text-right font-medium">£{capex.contingency.toLocaleString()}</td></tr>
                  <tr className="border-t-2 border-border"><td className="py-2 font-bold text-text-primary">Total CAPEX</td><td className="py-2 text-right font-bold text-rose text-lg">£{capex.total.toLocaleString()}</td></tr>
                </tbody>
              </table>
              <div className="space-y-4">
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-xs text-text-tertiary uppercase">Payback Period</p>
                  <p className="text-3xl font-bold text-blue-400">{paybackYears} years</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-xs text-text-tertiary uppercase">Annual ROI</p>
                  <p className="text-3xl font-bold text-green-400">{capex.total > 0 ? ((annualNet / capex.total) * 100).toFixed(1) : 0}%</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-xs text-text-tertiary uppercase">10-Year Net Profit</p>
                  <p className="text-3xl font-bold text-text-primary">£{(annualNet * 10 - capex.total).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Info footer */}
          <div className="text-xs text-text-tertiary bg-bg-secondary/50 rounded-lg p-4 border border-border/50">
            <p><strong className="text-blue-400">Flux Model{isHistorical ? ' (Historical)' : ' (Fixed Rates)'}:</strong>{' '}
            {isHistorical
              ? `Backtest against ${historicalResult?.annual.totalDays ?? 0} days of real Octopus Flux rates from the database. Rates change quarterly — peak export has been declining from ~22p (Q1 2023) to ~12p (Q1 2026). ${dateRange?.from} to ${dateRange?.to}.`
              : 'Synthetic 365-day simulation with current fixed rates. Off-peak 17.90p, day 26.80p, peak 30.68p.'
            }{' '}
            Strategy: YOU control the battery — 5% reserve only. Off-peak charge reduced by predicted solar.
            Day-rate top-up only if profitable. Solar → house → battery → export priority.
            EVs: {evCount} × {evMilesPerYear.toLocaleString()} miles/yr at off-peak rate.</p>
          </div>
        </>
      )}
    </div>
  );
}
