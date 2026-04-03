'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Card } from '@/shared/ui/card';
import { batteries } from '@/modules/hardware/data';
import { inverters } from '@/modules/hardware/data';
import type { AgileModelResult, AgileMonthResult, AgileDayResult } from '@/modules/tariffs/agile-model';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart,
} from 'recharts';
import { Zap, Battery, Sun, Car, Home, TrendingUp, RefreshCw, Calendar } from 'lucide-react';

const INSTALL_COSTS = {
  single: { labour: 2000, slab: 800, cabling: 500, metering: 1500, contingencyPct: 0.10 },
  three: { labour: 4000, slab: 2500, cabling: 1500, metering: 3500, contingencyPct: 0.10 },
};

const COLORS = {
  green: '#10B981', amber: '#F59E0B', red: '#EF4444', blue: '#3B82F6',
  cyan: '#06B6D4', violet: '#8B5CF6', rose: '#B91C4D',
};

const tooltipStyle = {
  backgroundColor: '#1A1D2E', border: '1px solid #2A2D3E',
  borderRadius: '8px', color: '#F0F1F5', fontSize: '12px',
};

export function AgileModeller() {
  const [batteryId, setBatteryId] = useState('bat-fogstar-64');
  const [stacks, setStacks] = useState(5);
  const [inverterId, setInverterId] = useState('inv-deye-20k');
  const [inverterCount, setInverterCount] = useState(4);
  const [solarKwp, setSolarKwp] = useState(25);
  const [exportLimitKw, setExportLimitKw] = useState(66);
  const [houseKwh, setHouseKwh] = useState(24);
  const [hasHeatPump, setHasHeatPump] = useState(true);
  const [evCount, setEvCount] = useState(2);
  const [evMilesPerYear, setEvMilesPerYear] = useState(10000);
  const [months, setMonths] = useState(12);

  const [result, setResult] = useState<AgileModelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string; totalDays: number } | null>(null);

  const battery = batteries.find(b => b.id === batteryId) ?? batteries[0]!;
  const inverter = inverters.find(i => i.id === inverterId) ?? inverters[0]!;

  const totalCapKwh = stacks * battery.capacityPerModuleKwh * battery.maxModulesPerString;
  const totalInverterKw = inverterCount * inverter.maxOutputKw;
  const phaseType = inverter.threePhase ? 'three' as const : 'single' as const;
  const evKwhPerDay = Math.round((evMilesPerYear / 365 / 3.5) * 10) / 10;

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

  const effectiveExportKw = Math.min(totalInverterKw, exportLimitKw, stacks * battery.dischargeRateKw * battery.maxModulesPerString);

  const fetchModel = useCallback(async () => {
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
      const res = await fetch(`/api/tariffs/agile-model?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setDateRange(data.dateRange);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run model');
    } finally {
      setLoading(false);
    }
  }, [totalCapKwh, totalInverterKw, effectiveExportKw, solarKwp, battery, houseKwh, hasHeatPump, evCount, evKwhPerDay, months]);

  // Auto-fetch on mount
  useEffect(() => { void fetchModel(); }, []);

  const selectClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-full";
  const numberClass = "text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:border-rose w-20 text-center";
  const labelClass = "text-xs text-text-secondary uppercase tracking-wide";

  const monthlyChartData = result?.monthly.map((m: AgileMonthResult) => ({
    month: m.label,
    export: Math.round(m.exportRev / 100),
    selfUse: Math.round(m.selfUse / 100),
    negEarned: Math.round(m.negEarned / 100),
    chargeCost: -Math.round(m.chargeCost / 100),
    evCost: -Math.round(m.evCost / 100),
    net: Math.round(m.net / 100),
  })) ?? [];

  const paybackYears = result && result.annual.netGbp > 0 ? Math.round(capex.total / result.annual.netGbp * 10) / 10 : 99;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-green-400" />
          <h2 className="text-lg font-semibold text-text-primary">Agile Revenue Model</h2>
          <span className="text-xs text-text-tertiary ml-2">Patient trader — historical backtest against real rates</span>
        </div>
        <button
          onClick={() => void fetchModel()}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-[var(--radius-md)] bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Run Model'}
        </button>
      </div>

      {dateRange && (
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Calendar className="h-3.5 w-3.5" />
          Historical data: {dateRange.from} → {dateRange.to} ({dateRange.totalDays} days)
        </div>
      )}

      {/* Hardware Selection — identical to IOF */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Battery className="h-4 w-4 text-green-400" />
          Hardware Selection
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className={labelClass}>Battery</label>
            <select value={batteryId} onChange={e => setBatteryId(e.target.value)} className={selectClass}>
              {batteries.map(b => <option key={b.id} value={b.id}>{b.manufacturer} {b.model}</option>)}
            </select>
            <p className="text-xs text-text-tertiary mt-1">{battery.capacityPerModuleKwh}kWh/mod × {battery.maxModulesPerString} max</p>
          </div>
          <div>
            <label className={labelClass}>Battery Stacks</label>
            <input type="number" min={1} max={15} value={stacks} onChange={e => setStacks(Math.max(1, Math.min(15, Number(e.target.value))))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">= {totalCapKwh.toFixed(0)} kWh</p>
          </div>
          <div>
            <label className={labelClass}>Inverter</label>
            <select value={inverterId} onChange={e => setInverterId(e.target.value)} className={selectClass}>
              {inverters.map(i => <option key={i.id} value={i.id}>{i.manufacturer} {i.model}</option>)}
            </select>
            <p className="text-xs text-text-tertiary mt-1">{inverter.maxOutputKw}kW {inverter.threePhase ? '3-ph' : '1-ph'}</p>
          </div>
          <div>
            <label className={labelClass}>Inverter Count</label>
            <input type="number" min={1} max={10} value={inverterCount} onChange={e => setInverterCount(Math.max(1, Math.min(10, Number(e.target.value))))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">= {totalInverterKw}kW total</p>
          </div>
          <div>
            <label className={labelClass}>Solar (kWp)</label>
            <input type="number" min={0} max={50} step={0.5} value={solarKwp} onChange={e => setSolarKwp(Number(e.target.value))} className={numberClass} />
          </div>
          <div>
            <label className={labelClass}>Export Limit (kW)</label>
            <input type="number" min={3} max={200} value={exportLimitKw} onChange={e => setExportLimitKw(Number(e.target.value))} className={numberClass} />
            <p className="text-xs text-text-tertiary mt-1">Effective: {effectiveExportKw.toFixed(0)}kW</p>
          </div>
        </div>
      </Card>

      {/* Household Settings */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Home className="h-4 w-4 text-amber-400" /> Household Settings
          <select value={months} onChange={e => setMonths(Number(e.target.value))} className="ml-auto text-xs bg-bg-secondary border border-border rounded px-2 py-1 text-text-primary">
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={18}>Last 18 months</option>
          </select>
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
            <label className={labelClass}>EVs</label>
            <div className="flex gap-2 mt-1">
              {[0, 1, 2].map(n => (
                <button key={n} onClick={() => setEvCount(n)} className={`px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors ${evCount === n ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                  {n === 0 ? 'None' : `${n}`}
                </button>
              ))}
            </div>
            {evCount > 0 && (
              <div className="mt-2">
                <input type="number" min={1000} max={30000} step={500} value={evMilesPerYear} onChange={e => setEvMilesPerYear(Number(e.target.value))} className={numberClass} />
                <p className="text-xs text-text-tertiary mt-1">{evKwhPerDay}kWh/day/EV</p>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Agile Strategy</label>
            <div className="text-xs text-text-tertiary mt-1 space-y-0.5">
              <div>5% reserve (vs IOF 20%)</div>
              <div>Self-use at import rate</div>
              <div>Hold on dead days</div>
              <div>Charge on negative pricing</div>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="text-center py-12 text-text-tertiary">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-green-400" />
          <p>Running Agile backtest against {months} months of historical rates...</p>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SimpleStatCard label="Annual Net Revenue" value={`£${result.annual.netGbp.toLocaleString()}`} subtitle={`£${result.annual.avgDailyGbp.toFixed(2)}/day`} trend="up" />
            <SimpleStatCard label="Total CAPEX" value={`£${capex.total.toLocaleString()}`} subtitle={`Payback: ${paybackYears} yrs`} />
            <SimpleStatCard label="Traded Days" value={`${result.annual.tradedDays}`} subtitle={`${Math.round(result.annual.tradedDays / result.annual.totalDays * 100)}% of days`} trend="up" />
            <SimpleStatCard label="Held (Dead) Days" value={`${result.annual.heldDays}`} subtitle={`${Math.round(result.annual.heldDays / result.annual.totalDays * 100)}% idle`} />
            <SimpleStatCard label="Neg Pricing Days" value={`${result.annual.negDays}`} subtitle={`${Math.round(result.annual.negDays / result.annual.totalDays * 100)}% free charge`} trend="up" />
            <SimpleStatCard label="Self-Use Saved" value={`£${Math.round(result.annual.selfUse / 100).toLocaleString()}`} subtitle="House at import rate" trend="up" />
          </div>

          {/* Monthly Chart */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" /> Monthly Revenue
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
                <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 12 }} />
                <YAxis tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(v: number) => `£${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`£${v}`, '']} />
                <Legend />
                <Bar dataKey="export" name="Grid Export" stackId="pos" fill={COLORS.green} />
                <Bar dataKey="selfUse" name="Self-Use" stackId="pos" fill={COLORS.cyan} />
                <Bar dataKey="negEarned" name="Neg Pricing" stackId="pos" fill={COLORS.amber} />
                <Bar dataKey="chargeCost" name="Charge Cost" stackId="neg" fill={COLORS.red} />
                <Bar dataKey="evCost" name="EV Cost" stackId="neg" fill={COLORS.violet} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#fff" strokeWidth={2} dot={false} />
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
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Charge £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Export £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Self-Use £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Neg Earned £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">EV £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Solar kWh</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2 font-semibold">Net £</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Daily</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Traded</th>
                    <th className="text-right text-xs text-text-tertiary uppercase py-2 px-2">Held</th>
                  </tr>
                </thead>
                <tbody>
                  {result.monthly.map((m: AgileMonthResult) => (
                    <tr key={m.month} className="border-b border-border/50 hover:bg-bg-secondary/50">
                      <td className="py-2 px-2 font-medium text-text-primary">{m.label}</td>
                      <td className="py-2 px-2 text-right text-red-400">£{(m.chargeCost / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-green-400">£{(m.exportRev / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-cyan-400">£{(m.selfUse / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-amber-400">{m.negEarned > 0 ? `£${(m.negEarned / 100).toFixed(0)}` : '—'}</td>
                      <td className="py-2 px-2 text-right text-red-400">£{(m.evCost / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-amber-300">{m.solarIn > 0 ? `${m.solarIn}` : '—'}</td>
                      <td className="py-2 px-2 text-right font-bold text-green-400">£{(m.net / 100).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right text-text-secondary">£{(m.dailyAvg / 100).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-text-secondary">{m.tradedDays}</td>
                      <td className="py-2 px-2 text-right text-text-tertiary">{m.heldDays}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2 px-2 font-bold">ANNUAL</td>
                    <td className="py-2 px-2 text-right text-red-400 font-semibold">£{(result.annual.chargeCost / 100).toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-green-400 font-semibold">£{(result.annual.export / 100).toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-cyan-400 font-semibold">£{(result.annual.selfUse / 100).toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-amber-400 font-semibold">£{(result.annual.negEarned / 100).toFixed(0)}</td>
                    <td className="py-2 px-2 text-right text-red-400">£{(result.annual.evCost / 100).toFixed(0)}</td>
                    <td className="py-2 px-2 text-right"></td>
                    <td className="py-2 px-2 text-right font-bold text-green-400 text-lg">£{result.annual.netGbp.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-semibold">£{result.annual.avgDailyGbp.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right">{result.annual.tradedDays}</td>
                    <td className="py-2 px-2 text-right">{result.annual.heldDays}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* CAPEX + Payback */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">CAPEX & Payback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Battery</td><td className="py-2 text-right">£{capex.battery.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Inverter</td><td className="py-2 text-right">£{capex.inverter.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Solar</td><td className="py-2 text-right">£{capex.solar.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Installation</td><td className="py-2 text-right">£{capex.install.toLocaleString()}</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 text-text-secondary">Contingency</td><td className="py-2 text-right">£{capex.contingency.toLocaleString()}</td></tr>
                  <tr className="border-t-2 border-border"><td className="py-2 font-bold">Total CAPEX</td><td className="py-2 text-right font-bold text-rose text-lg">£{capex.total.toLocaleString()}</td></tr>
                </tbody>
              </table>
              <div className="space-y-4">
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-xs text-text-tertiary uppercase">Payback Period</p>
                  <p className="text-3xl font-bold text-green-400">{paybackYears} years</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-4">
                  <p className="text-xs text-text-tertiary uppercase">10-Year Net Profit</p>
                  <p className="text-3xl font-bold text-text-primary">£{(result.annual.netGbp * 10 - capex.total).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="text-xs text-text-tertiary bg-bg-secondary/50 rounded-lg p-4 border border-border/50">
            <p><strong className="text-green-400">Agile Patient Trader:</strong> Backtest against {dateRange?.totalDays ?? 0} days of real Octopus Agile rates.
            Strategy: charge on cheapest slots (always on negative pricing), self-consume at full import rate before grid export,
            hold charge through dead days when no profitable spread. Cycle degradation hurdle: 1.2p/kWh.
            5% SOC reserve. Solar excess exported even on hold days. {dateRange?.from} to {dateRange?.to}.</p>
          </div>
        </>
      )}
    </div>
  );
}
