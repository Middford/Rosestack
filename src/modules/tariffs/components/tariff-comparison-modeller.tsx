'use client';

import { useState, useMemo, useCallback } from 'react';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Card } from '@/shared/ui/card';
import { batteries, inverters } from '@/modules/hardware/data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart,
} from 'recharts';
import { Zap, Battery, Home, TrendingUp, RefreshCw, Calendar, Trophy, ArrowRight } from 'lucide-react';

const INSTALL_COSTS = {
  single: { labour: 2000, slab: 800, cabling: 500, metering: 1500, contingencyPct: 0.10 },
  three: { labour: 4000, slab: 2500, cabling: 1500, metering: 3500, contingencyPct: 0.10 },
};

const COLORS = {
  iof: '#F59E0B',   // amber — the gold standard
  flux: '#3B82F6',  // blue
  agile: '#10B981', // green
  rose: '#B91C4D',
  red: '#EF4444',
  muted: '#6B7280',
};

const tooltipStyle = {
  backgroundColor: '#1A1D2E',
  border: '1px solid #2A2D3E',
  borderRadius: '8px',
  color: '#F0F1F5',
  fontSize: '12px',
};

interface ComparisonResult {
  config: Record<string, unknown>;
  dateRanges: {
    agile: { from: string; to: string; totalDays: number };
    flux: { from: string; to: string; totalDays: number };
    iof: { from: string | null; to: string | null; totalDays: number; note: string };
  };
  annual: {
    iof: { net: number; netGbp: number; avgDailyPence: number; avgDailyGbp: number };
    flux: { net: number; netGbp: number; avgDailyPence: number; avgDailyGbp: number; totalDays: number; avgSpread: number };
    agile: { net: number; netGbp: number; avgDailyPence: number; avgDailyGbp: number; totalDays: number; tradedDays: number; heldDays: number; negDays: number };
  };
  monthly: Array<{
    month: number;
    label: string;
    iof: { net: number; dailyAvg: number };
    flux: { net: number; dailyAvg: number; days: number; avgSpread: number };
    agile: { net: number; dailyAvg: number; days: number; tradedDays: number; heldDays: number; negDays: number };
    best: string;
  }>;
}

export function TariffComparisonModeller() {
  const [batteryId, setBatteryId] = useState('bat-fogstar-64');
  const [stacks, setStacks] = useState(4);
  const [inverterId, setInverterId] = useState('inv-solis-30k');
  const [inverterCount, setInverterCount] = useState(3);
  const [solarKwp, setSolarKwp] = useState(25);
  const [exportLimitKw, setExportLimitKw] = useState(66);
  const [houseKwh, setHouseKwh] = useState(24);
  const [hasHeatPump, setHasHeatPump] = useState(true);
  const [evCount, setEvCount] = useState(2);
  const [evMilesPerYear, setEvMilesPerYear] = useState(10000);
  const [months, setMonths] = useState(12);

  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const battery = batteries.find(b => b.id === batteryId) ?? batteries[0]!;
  const inverter = inverters.find(i => i.id === inverterId) ?? inverters[0]!;

  const totalCapKwh = stacks * battery.capacityPerModuleKwh * battery.maxModulesPerString;
  const totalInverterKw = inverterCount * inverter.maxOutputKw;
  const phaseType = inverter.threePhase ? 'three' as const : 'single' as const;
  const evKwhPerDay = Math.round((evMilesPerYear / 365 / 3.5) * 10) / 10;
  const effectiveExportKw = Math.min(totalInverterKw, exportLimitKw, stacks * battery.dischargeRateKw * battery.maxModulesPerString);

  const capex = useMemo(() => {
    const batteryGbp = stacks * battery.wholesalePriceGbp * battery.maxModulesPerString;
    const inverterGbp = inverterCount * inverter.priceGbp;
    const solarGbp = solarKwp * 400;
    const install = INSTALL_COSTS[phaseType];
    const installGbp = install.labour + install.slab + install.cabling + install.metering;
    const subtotal = batteryGbp + inverterGbp + solarGbp + installGbp;
    const contingency = Math.round(subtotal * install.contingencyPct);
    return { battery: batteryGbp, inverter: inverterGbp, solar: solarGbp, install: installGbp, contingency, total: subtotal + contingency };
  }, [stacks, battery, inverterCount, inverter, solarKwp, phaseType]);

  const fetchComparison = useCallback(async () => {
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
      const res = await fetch(`/api/tariffs/comparison?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run comparison');
    } finally {
      setLoading(false);
    }
  }, [totalCapKwh, totalInverterKw, effectiveExportKw, solarKwp, battery, houseKwh, hasHeatPump, evCount, evKwhPerDay, months]);

  // Chart data
  const monthlyChartData = result?.monthly.map(m => ({
    month: m.label,
    IOF: Math.round(m.iof.dailyAvg) / 100,
    Flux: Math.round(m.flux.dailyAvg) / 100,
    Agile: Math.round(m.agile.dailyAvg) / 100,
  })) ?? [];

  const selectClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-full";
  const numberClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-20 text-center";
  const labelClass = "text-xs text-text-secondary uppercase tracking-wide";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-text-primary">Tariff Comparison</h2>
          <span className="text-xs text-text-tertiary ml-2">IOF vs Flux vs Agile — same hardware, real rates</span>
        </div>
        <button
          onClick={() => void fetchComparison()}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-[var(--radius-md)] bg-rose text-white hover:bg-rose/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running all 3...' : 'Run Comparison'}
        </button>
      </div>

      {!result && !loading && (
        <div className="bg-rose/10 border border-rose/30 rounded-lg p-4 text-rose-light text-sm">
          Click <strong>Run Comparison</strong> to backtest IOF, Flux, and Agile with identical hardware.
          Uses real historical rates from the database. IOF uses fixed rates (API limited).
        </div>
      )}

      {/* Hardware Selection */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Battery className="h-4 w-4 text-rose" />
          Hardware Config (shared across all tariffs)
          <select value={months} onChange={e => setMonths(Number(e.target.value))} className="ml-auto text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary">
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={18}>Last 18 months</option>
            <option value={24}>Last 24 months</option>
            <option value={36}>All data</option>
          </select>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className={labelClass}>Battery</label>
            <select value={batteryId} onChange={e => setBatteryId(e.target.value)} className={selectClass}>
              {batteries.map(b => <option key={b.id} value={b.id}>{b.manufacturer} {b.model}</option>)}
            </select>
            <p className="text-xs text-text-tertiary mt-1">{battery.capacityPerModuleKwh}kWh × {battery.maxModulesPerString}</p>
          </div>
          <div>
            <label className={labelClass}>Stacks</label>
            <input type="number" min={1} max={15} value={stacks} onChange={e => setStacks(Math.max(1, Math.min(15, Number(e.target.value))))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">= {totalCapKwh.toFixed(0)} kWh</p>
          </div>
          <div>
            <label className={labelClass}>Inverter</label>
            <select value={inverterId} onChange={e => setInverterId(e.target.value)} className={selectClass}>
              {inverters.map(i => <option key={i.id} value={i.id}>{i.manufacturer} {i.model}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Inv. Count</label>
            <input type="number" min={1} max={10} value={inverterCount} onChange={e => setInverterCount(Math.max(1, Math.min(10, Number(e.target.value))))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">= {totalInverterKw}kW</p>
          </div>
          <div>
            <label className={labelClass}>Solar (kWp)</label>
            <input type="number" min={0} max={50} step={0.5} value={solarKwp} onChange={e => setSolarKwp(Number(e.target.value))} className={numberClass} />
          </div>
          <div>
            <label className={labelClass}>Export (kW)</label>
            <input type="number" min={3} max={200} value={exportLimitKw} onChange={e => setExportLimitKw(Number(e.target.value))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">Eff: {effectiveExportKw.toFixed(0)}kW</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>House kWh/day</label>
            <input type="range" min={10} max={50} value={houseKwh} onChange={e => setHouseKwh(Number(e.target.value))} className="w-full mt-1" />
            <p className="text-sm font-semibold text-text-primary text-center">{houseKwh}</p>
          </div>
          <div>
            <label className={labelClass}>Heat Pump</label>
            <button onClick={() => setHasHeatPump(!hasHeatPump)} className={`mt-1 px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium ${hasHeatPump ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
              {hasHeatPump ? 'Yes' : 'No'}
            </button>
          </div>
          <div>
            <label className={labelClass}>EVs</label>
            <div className="flex gap-2 mt-1">
              {[0, 1, 2].map(n => (
                <button key={n} onClick={() => setEvCount(n)} className={`px-3 py-2 rounded text-sm font-medium ${evCount === n ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>CAPEX</label>
            <p className="text-lg font-bold text-rose mt-1">£{capex.total.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="text-center py-12 text-text-tertiary">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-rose" />
          <p>Running IOF + Flux + Agile models in parallel...</p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Head-to-Head Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* IOF Card */}
            <Card className={`p-5 border-2 ${result.annual.iof.avgDailyGbp >= result.annual.flux.avgDailyGbp && result.annual.iof.avgDailyGbp >= result.annual.agile.avgDailyGbp ? 'border-amber-500/60 bg-amber-500/5' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-amber-400">Intelligent Octopus Flux</h3>
                {result.annual.iof.avgDailyGbp >= result.annual.flux.avgDailyGbp && result.annual.iof.avgDailyGbp >= result.annual.agile.avgDailyGbp && (
                  <Trophy className="h-4 w-4 text-amber-400 ml-auto" />
                )}
              </div>
              <p className="text-3xl font-bold text-text-primary">£{result.annual.iof.netGbp.toLocaleString()}</p>
              <p className="text-sm text-text-secondary">£{result.annual.iof.avgDailyGbp.toFixed(2)}/day</p>
              <div className="mt-3 pt-3 border-t border-border text-xs text-text-tertiary space-y-1">
                <p>Payback: <span className="text-text-primary font-semibold">{result.annual.iof.netGbp > 0 ? (capex.total / result.annual.iof.netGbp).toFixed(1) : '99'} years</span></p>
                <p>Import = Export parity (all bands)</p>
                <p>20% reserve (Kraken mandated)</p>
                <p className="text-red-400 font-medium">Sign-ups PAUSED</p>
              </div>
            </Card>

            {/* Flux Card */}
            <Card className={`p-5 border-2 ${result.annual.flux.avgDailyGbp >= result.annual.iof.avgDailyGbp && result.annual.flux.avgDailyGbp >= result.annual.agile.avgDailyGbp ? 'border-blue-500/60 bg-blue-500/5' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <h3 className="text-sm font-semibold text-blue-400">Standard Flux</h3>
                {result.annual.flux.avgDailyGbp >= result.annual.iof.avgDailyGbp && result.annual.flux.avgDailyGbp >= result.annual.agile.avgDailyGbp && (
                  <Trophy className="h-4 w-4 text-blue-400 ml-auto" />
                )}
              </div>
              <p className="text-3xl font-bold text-text-primary">£{result.annual.flux.netGbp.toLocaleString()}</p>
              <p className="text-sm text-text-secondary">£{result.annual.flux.avgDailyGbp.toFixed(2)}/day</p>
              <div className="mt-3 pt-3 border-t border-border text-xs text-text-tertiary space-y-1">
                <p>Payback: <span className="text-text-primary font-semibold">{result.annual.flux.netGbp > 0 ? (capex.total / result.annual.flux.netGbp).toFixed(1) : '99'} years</span></p>
                <p>Avg spread: <span className="text-blue-400">{result.annual.flux.avgSpread.toFixed(1)}p</span> (declining)</p>
                <p>{result.annual.flux.totalDays} days backtested</p>
                <p>5% reserve, you control battery</p>
              </div>
            </Card>

            {/* Agile Card */}
            <Card className={`p-5 border-2 ${result.annual.agile.avgDailyGbp >= result.annual.iof.avgDailyGbp && result.annual.agile.avgDailyGbp >= result.annual.flux.avgDailyGbp ? 'border-green-500/60 bg-green-500/5' : 'border-border'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <h3 className="text-sm font-semibold text-green-400">Agile (Patient Trader)</h3>
                {result.annual.agile.avgDailyGbp >= result.annual.iof.avgDailyGbp && result.annual.agile.avgDailyGbp >= result.annual.flux.avgDailyGbp && (
                  <Trophy className="h-4 w-4 text-green-400 ml-auto" />
                )}
              </div>
              <p className="text-3xl font-bold text-text-primary">£{result.annual.agile.netGbp.toLocaleString()}</p>
              <p className="text-sm text-text-secondary">£{result.annual.agile.avgDailyGbp.toFixed(2)}/day</p>
              <div className="mt-3 pt-3 border-t border-border text-xs text-text-tertiary space-y-1">
                <p>Payback: <span className="text-text-primary font-semibold">{result.annual.agile.netGbp > 0 ? (capex.total / result.annual.agile.netGbp).toFixed(1) : '99'} years</span></p>
                <p>Traded: {result.annual.agile.tradedDays}d / Held: {result.annual.agile.heldDays}d</p>
                <p>Neg pricing days: {result.annual.agile.negDays}</p>
                <p className="text-green-400">Open for sign-ups</p>
              </div>
            </Card>
          </div>

          {/* Delta analysis */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Revenue Delta</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-bg-secondary rounded-lg p-4 text-center">
                <p className="text-xs text-text-tertiary uppercase">IOF vs Flux</p>
                <p className={`text-2xl font-bold ${result.annual.iof.netGbp > result.annual.flux.netGbp ? 'text-amber-400' : 'text-blue-400'}`}>
                  {result.annual.iof.netGbp > result.annual.flux.netGbp ? '+' : ''}
                  £{(result.annual.iof.netGbp - result.annual.flux.netGbp).toLocaleString()}/yr
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  £{Math.abs((result.annual.iof.avgDailyGbp - result.annual.flux.avgDailyGbp)).toFixed(2)}/day {result.annual.iof.netGbp > result.annual.flux.netGbp ? 'IOF advantage' : 'Flux advantage'}
                </p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-4 text-center">
                <p className="text-xs text-text-tertiary uppercase">IOF vs Agile</p>
                <p className={`text-2xl font-bold ${result.annual.iof.netGbp > result.annual.agile.netGbp ? 'text-amber-400' : 'text-green-400'}`}>
                  {result.annual.iof.netGbp > result.annual.agile.netGbp ? '+' : ''}
                  £{(result.annual.iof.netGbp - result.annual.agile.netGbp).toLocaleString()}/yr
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  £{Math.abs((result.annual.iof.avgDailyGbp - result.annual.agile.avgDailyGbp)).toFixed(2)}/day difference
                </p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-4 text-center">
                <p className="text-xs text-text-tertiary uppercase">Flux vs Agile</p>
                <p className={`text-2xl font-bold ${result.annual.flux.netGbp > result.annual.agile.netGbp ? 'text-blue-400' : 'text-green-400'}`}>
                  {result.annual.flux.netGbp > result.annual.agile.netGbp ? '+' : ''}
                  £{(result.annual.flux.netGbp - result.annual.agile.netGbp).toLocaleString()}/yr
                </p>
                <p className="text-xs text-text-tertiary mt-1">
                  £{Math.abs((result.annual.flux.avgDailyGbp - result.annual.agile.avgDailyGbp)).toFixed(2)}/day difference
                </p>
              </div>
            </div>
          </Card>

          {/* Monthly Bar Chart — all three tariffs */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose" />
              Monthly Daily Average Revenue (£/day)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyChartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis tick={{ fill: '#888', fontSize: 12 }} tickFormatter={v => `£${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`£${v.toFixed(2)}`, '']} />
                <Legend />
                <Bar dataKey="IOF" fill={COLORS.iof} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Flux" fill={COLORS.flux} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Agile" fill={COLORS.agile} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Comparison Table */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Monthly Comparison Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-text-tertiary uppercase py-2 px-2">Month</th>
                    <th className="text-right text-xs uppercase py-2 px-2 text-amber-400">IOF £/day</th>
                    <th className="text-right text-xs uppercase py-2 px-2 text-blue-400">Flux £/day</th>
                    <th className="text-right text-xs uppercase py-2 px-2 text-blue-400">Spread</th>
                    <th className="text-right text-xs uppercase py-2 px-2 text-green-400">Agile £/day</th>
                    <th className="text-right text-xs uppercase py-2 px-2 text-green-400">Traded</th>
                    <th className="text-center text-xs text-text-tertiary uppercase py-2 px-2">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {result.monthly.map(m => {
                    const winColor = m.best === 'iof' ? 'text-amber-400' : m.best === 'flux' ? 'text-blue-400' : 'text-green-400';
                    return (
                      <tr key={m.month} className="border-b border-border/50 hover:bg-bg-secondary/50">
                        <td className="py-2 px-2 font-medium text-text-primary">{m.label}</td>
                        <td className="py-2 px-2 text-right text-amber-400 font-medium">£{(m.iof.dailyAvg / 100).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-blue-400">£{(m.flux.dailyAvg / 100).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-text-tertiary">{m.flux.avgSpread.toFixed(1)}p</td>
                        <td className="py-2 px-2 text-right text-green-400">£{(m.agile.dailyAvg / 100).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-text-tertiary">{m.agile.tradedDays}/{m.agile.days ?? 0}</td>
                        <td className={`py-2 px-2 text-center font-bold uppercase ${winColor}`}>{m.best}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2 px-2 font-bold">ANNUAL</td>
                    <td className="py-2 px-2 text-right text-amber-400 font-bold">£{result.annual.iof.avgDailyGbp.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-blue-400 font-bold">£{result.annual.flux.avgDailyGbp.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-text-tertiary">{result.annual.flux.avgSpread.toFixed(1)}p</td>
                    <td className="py-2 px-2 text-right text-green-400 font-bold">£{result.annual.agile.avgDailyGbp.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-text-tertiary">
                      {result.annual.agile.tradedDays}/{result.annual.agile.totalDays}
                    </td>
                    <td className={`py-2 px-2 text-center font-bold uppercase ${
                      result.annual.iof.avgDailyGbp >= result.annual.flux.avgDailyGbp && result.annual.iof.avgDailyGbp >= result.annual.agile.avgDailyGbp ? 'text-amber-400' :
                      result.annual.flux.avgDailyGbp >= result.annual.agile.avgDailyGbp ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {result.annual.iof.avgDailyGbp >= result.annual.flux.avgDailyGbp && result.annual.iof.avgDailyGbp >= result.annual.agile.avgDailyGbp ? 'IOF' :
                       result.annual.flux.avgDailyGbp >= result.annual.agile.avgDailyGbp ? 'FLUX' : 'AGILE'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Payback Comparison */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Payback & 10-Year Return (CAPEX: £{capex.total.toLocaleString()})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'IOF', color: 'amber', annual: result.annual.iof.netGbp, avail: 'Paused' },
                { name: 'Flux', color: 'blue', annual: result.annual.flux.netGbp, avail: 'Paused' },
                { name: 'Agile', color: 'green', annual: result.annual.agile.netGbp, avail: 'Open' },
              ].map(t => {
                const payback = t.annual > 0 ? (capex.total / t.annual).toFixed(1) : '99+';
                const tenYr = t.annual * 10 - capex.total;
                return (
                  <div key={t.name} className="bg-bg-secondary rounded-lg p-4">
                    <p className={`text-xs uppercase font-semibold text-${t.color}-400 mb-2`}>{t.name}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-text-tertiary">Annual</span>
                        <span className="text-sm font-semibold text-text-primary">£{t.annual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-text-tertiary">Payback</span>
                        <span className="text-sm font-semibold text-text-primary">{payback} yrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-text-tertiary">10-Year Net</span>
                        <span className={`text-sm font-bold ${tenYr > 0 ? 'text-green-400' : 'text-red-400'}`}>£{tenYr.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-text-tertiary">ROI</span>
                        <span className="text-sm font-semibold text-text-primary">{capex.total > 0 ? ((t.annual / capex.total) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-text-tertiary">Status</span>
                        <span className={`text-xs font-medium ${t.avail === 'Open' ? 'text-green-400' : 'text-red-400'}`}>{t.avail}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Data sources */}
          <div className="text-xs text-text-tertiary bg-bg-secondary/50 rounded-lg p-4 border border-border/50 space-y-1">
            <p><strong className="text-amber-400">IOF:</strong> Fixed-rate model (Octopus API only has ~3 months of IOF data). Import = export parity. 20% Kraken reserve.</p>
            <p><strong className="text-blue-400">Flux:</strong> Historical backtest — {result.dateRanges.flux.totalDays} days of real rates from {result.dateRanges.flux.from} to {result.dateRanges.flux.to}. Rates declining quarterly.</p>
            <p><strong className="text-green-400">Agile:</strong> Historical backtest — {result.dateRanges.agile.totalDays} days of real half-hourly rates from {result.dateRanges.agile.from} to {result.dateRanges.agile.to}. Patient trader strategy.</p>
          </div>
        </>
      )}
    </div>
  );
}
