'use client';

// ============================================================
// Fleet Revenue Dashboard
//
// Shows live Octopus Flux rates fetched from /api/tariffs/rates
// and calculates per-install + fleet-wide revenue estimates.
//
// Tabs:
//   Fleet Summary  — aggregate totals, rate change alerts
//   Per Install    — individual cards with daily/monthly/annual revenue
//   Rate Details   — current band rates, spread, standing charge
//
// Revenue is calculated client-side using the live rates returned
// by the API, so re-fetching rates gives immediate updated figures.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Zap,
  Battery,
  DollarSign,
  Home,
  Clock,
} from 'lucide-react';
import type { FluxRates } from '@/modules/tariffs/flux-api';
import { FLUX_FALLBACK_RATES } from '@/modules/tariffs/flux-api';
import {
  calculateInstallRevenue,
  calculateFleetRevenue,
  type InstallConfig,
  type FleetRevenueSummary,
} from '@/lib/revenue';

// --- Mock install fleet (replace with DB fetch in production) ---
// These represent the Beeches pilot installs. In production this would
// come from GET /api/portfolio/homes?status=live

const DEMO_FLEET: InstallConfig[] = [
  {
    homeId: 'beeches-01',
    address: '14 Beeches Avenue, Accrington BB5 2QN',
    batteryCapacityKwh: 100,
    roundTripEfficiency: 0.9,
    exportPowerKw: 10,
    batteryHealthPercent: 98,
    monthlyHomeownerPaymentGbp: 50,
    tariff: 'flux',
  },
  {
    homeId: 'beeches-02',
    address: '22 Beeches Avenue, Accrington BB5 2QN',
    batteryCapacityKwh: 120,
    roundTripEfficiency: 0.9,
    exportPowerKw: 12,
    batteryHealthPercent: 96,
    monthlyHomeownerPaymentGbp: 60,
    tariff: 'flux',
  },
  {
    homeId: 'beeches-03',
    address: '37 Beeches Avenue, Accrington BB5 2QN',
    batteryCapacityKwh: 100,
    roundTripEfficiency: 0.88,
    exportPowerKw: 10,
    batteryHealthPercent: 94,
    monthlyHomeownerPaymentGbp: 50,
    tariff: 'flux',
  },
];

// --- Sub-components ---

function StatCard({
  label,
  value,
  subtitle,
  accent = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? 'border-rose/40 bg-rose/10'
          : 'border-border bg-surface-secondary'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-tertiary mb-1">{label}</p>
          <p
            className={`text-2xl font-bold ${
              accent ? 'text-rose-light' : 'text-text-primary'
            }`}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <Icon
            className={`w-5 h-5 mt-0.5 ${
              accent ? 'text-rose/70' : 'text-text-tertiary'
            }`}
          />
        )}
      </div>
    </div>
  );
}

function RateBadge({
  label,
  value,
  variant = 'neutral',
}: {
  label: string;
  value: string;
  variant?: 'green' | 'amber' | 'red' | 'neutral';
}) {
  const colours: Record<string, string> = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    neutral: 'bg-surface-secondary text-text-secondary border-border',
  };
  return (
    <div
      className={`rounded px-2.5 py-1.5 border text-xs font-medium ${colours[variant]}`}
    >
      <span className="text-text-tertiary mr-1.5">{label}</span>
      {value}
    </div>
  );
}

// --- Main component ---

export function FleetRevenueDashboard() {
  const [tab, setTab] = useState<'summary' | 'installs' | 'rates'>('summary');
  const [rates, setRates] = useState<FluxRates>(FLUX_FALLBACK_RATES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchRates = useCallback(async (triggerRefresh = false) => {
    if (triggerRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      if (triggerRefresh) {
        // Trigger a live re-fetch from Octopus and DB write
        await fetch('/api/tariffs/refresh?type=flux', { method: 'POST' });
      }

      const res = await fetch('/api/tariffs/rates?tariff=flux&region=G');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FluxRates;
      setRates(data);
      setLastFetched(new Date().toLocaleTimeString('en-GB'));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load rates',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Calculate fleet revenue using current rates
  const fleet: FleetRevenueSummary = calculateFleetRevenue(DEMO_FLEET, rates);
  const spread = rates.export.peak - rates.import.offPeak;

  const tabs = [
    { id: 'summary' as const, label: 'Fleet Summary' },
    { id: 'installs' as const, label: `Per Install (${fleet.totalInstalls})` },
    { id: 'rates' as const, label: 'Rate Details' },
  ];

  return (
    <div className="space-y-5">
      {/* Header + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            Live Octopus Flux rates · ENWL region G
          </p>
          {lastFetched && (
            <p className="text-xs text-text-tertiary mt-0.5">
              Last fetched: {lastFetched}
              {rates.source === 'fallback' && (
                <span className="ml-2 text-amber-400">(fallback rates)</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchRates(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose/20 hover:bg-rose/30 text-rose-light text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Refreshing…' : 'Refresh Rates'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error} — showing fallback rates
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-border bg-surface-secondary animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Rate pills — always visible */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <RateBadge
            label="Off-peak import"
            value={`${rates.import.offPeak}p`}
            variant="green"
          />
          <RateBadge
            label="Peak import"
            value={`${rates.import.peak}p`}
            variant="red"
          />
          <RateBadge
            label="Peak export"
            value={`${rates.export.peak}p`}
            variant="amber"
          />
          <RateBadge
            label="Spread"
            value={`${spread.toFixed(1)}p`}
            variant="neutral"
          />
          <RateBadge
            label="Standing"
            value={`${rates.standingCharge}p/day`}
            variant="neutral"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                tab === t.id
                  ? 'border-rose text-rose-light'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Fleet Summary */}
      {tab === 'summary' && !loading && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total Installs"
              value={fleet.totalInstalls.toString()}
              subtitle={`${fleet.totalCapacityKwh} kWh fleet capacity`}
              icon={Home}
            />
            <StatCard
              label="Monthly Fleet Gross"
              value={`£${fleet.monthlyFleetGrossGbp.toFixed(0)}`}
              subtitle="Before homeowner payments"
              icon={TrendingUp}
            />
            <StatCard
              label="Monthly Homeowner Payments"
              value={`£${fleet.monthlyHomeownerPaymentsGbp.toFixed(0)}`}
              subtitle="Total paid to homeowners"
              icon={DollarSign}
            />
            <StatCard
              label="Monthly RoseStack Net"
              value={`£${fleet.monthlyRoseStackNetGbp.toFixed(0)}`}
              subtitle={`£${fleet.annualRoseStackNetGbp.toFixed(0)}/yr annual`}
              accent
              icon={Zap}
            />
          </div>

          {/* Annual summary bar */}
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Annual Fleet Projection
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Gross Revenue</p>
                <p className="text-xl font-bold text-green-400">
                  £{fleet.annualFleetGrossGbp.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">
                  Homeowner Payments
                </p>
                <p className="text-xl font-bold text-amber-400">
                  £{(fleet.monthlyHomeownerPaymentsGbp * 12).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">
                  RoseStack Net
                </p>
                <p className="text-xl font-bold text-rose-light">
                  £{fleet.annualRoseStackNetGbp.toFixed(0)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border text-xs text-text-tertiary text-center">
              Based on 1 cycle/day · {rates.source === 'live' ? 'live' : 'fallback'} rates ·
              spread {spread.toFixed(1)}p/kWh · standing charge {rates.standingCharge}p/day
            </div>
          </div>

          {/* Rate change alert */}
          {rates.source === 'fallback' && (
            <div className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-400">Using fallback rates</p>
                <p className="mt-0.5 text-amber-300/80">
                  Live Octopus API unavailable. Revenue figures use hardcoded March 2026
                  rates. Click &quot;Refresh Rates&quot; to fetch the latest values.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Per Install */}
      {tab === 'installs' && !loading && (
        <div className="space-y-3">
          {fleet.installs.map(install => (
            <div
              key={install.homeId}
              className="rounded-lg border border-border bg-surface-secondary p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {install.address}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    Tariff: {install.tariff.toUpperCase()} ·
                    Import {install.rates.offPeakImport}p off-peak ·
                    Export {install.rates.peakExport}p peak
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Battery
                    className={`w-3.5 h-3.5 ${
                      install.batteryHealthPercent >= 90
                        ? 'text-green-400'
                        : install.batteryHealthPercent >= 80
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  />
                  <span className="text-text-secondary">
                    {install.batteryHealthPercent}% health
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center rounded bg-surface-primary p-2.5">
                  <p className="text-xs text-text-tertiary mb-0.5">Daily net</p>
                  <p className="text-base font-bold text-text-primary">
                    £{install.daily.netDailyGbp.toFixed(2)}
                  </p>
                </div>
                <div className="text-center rounded bg-surface-primary p-2.5">
                  <p className="text-xs text-text-tertiary mb-0.5">Monthly net</p>
                  <p className="text-base font-bold text-text-primary">
                    £{install.monthly.netGbp.toFixed(0)}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    gross £{install.monthly.grossGbp.toFixed(0)}
                  </p>
                </div>
                <div className="text-center rounded bg-surface-primary p-2.5">
                  <p className="text-xs text-text-tertiary mb-0.5">Annual net</p>
                  <p className="text-base font-bold text-rose-light">
                    £{install.annual.netGbp.toFixed(0)}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    homeowner £{install.annual.homeownerGbp.toFixed(0)}
                  </p>
                </div>
              </div>

              {/* Energy flow detail */}
              <div className="mt-2.5 grid grid-cols-4 gap-2 text-xs text-text-tertiary">
                <span>
                  Charge: <span className="text-text-secondary">{install.daily.chargeKwh} kWh</span>
                </span>
                <span>
                  Export: <span className="text-text-secondary">{install.daily.actualExportKwh} kWh</span>
                </span>
                <span>
                  Cost: <span className="text-text-secondary">£{install.daily.chargeCostGbp.toFixed(2)}</span>
                </span>
                <span>
                  Revenue: <span className="text-text-secondary">£{install.daily.exportRevenueGbp.toFixed(2)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Rate Details */}
      {tab === 'rates' && !loading && (
        <div className="space-y-4">
          {/* Import rates */}
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Import Rates (pence/kWh inc VAT)
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Off-peak (02:00–05:00)', value: rates.import.offPeak, variant: 'green' as const },
                { label: 'Day (05:00–16:00 + 19:00–02:00)', value: rates.import.day, variant: 'neutral' as const },
                { label: 'Peak (16:00–19:00)', value: rates.import.peak, variant: 'red' as const },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{row.label}</span>
                  <RateBadge label="" value={`${row.value}p`} variant={row.variant} />
                </div>
              ))}
            </div>
          </div>

          {/* Export rates */}
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Export Rates (pence/kWh inc VAT)
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Off-peak (02:00–05:00)', value: rates.export.offPeak, variant: 'neutral' as const },
                { label: 'Day (05:00–16:00 + 19:00–02:00)', value: rates.export.day, variant: 'neutral' as const },
                { label: 'Peak (16:00–19:00)', value: rates.export.peak, variant: 'amber' as const },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{row.label}</span>
                  <RateBadge label="" value={`${row.value}p`} variant={row.variant} />
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Arbitrage Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Best Spread</p>
                <p className="text-xl font-bold text-green-400">
                  {spread.toFixed(1)}p
                </p>
                <p className="text-xs text-text-tertiary">
                  peak export − off-peak import
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Standing Charge</p>
                <p className="text-xl font-bold text-text-primary">
                  {rates.standingCharge}p/day
                </p>
                <p className="text-xs text-text-tertiary">
                  £{((rates.standingCharge * 365) / 100).toFixed(2)}/yr
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Data Source</p>
                <p
                  className={`text-xl font-bold ${
                    rates.source === 'live' ? 'text-green-400' : 'text-amber-400'
                  }`}
                >
                  {rates.source === 'live' ? 'Live' : 'Fallback'}
                </p>
                <p className="text-xs text-text-tertiary">
                  {rates.source === 'live'
                    ? 'Octopus API'
                    : 'Mar 2026 hardcoded'}
                </p>
              </div>
            </div>
          </div>

          {/* Scheduled fetch info */}
          <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface-secondary p-3 text-xs text-text-tertiary">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-text-tertiary" />
            <div>
              <p className="text-text-secondary font-medium">Scheduled updates</p>
              <p className="mt-0.5">
                Flux rates checked weekly (change quarterly) ·
                Agile rates fetched daily at 16:30 (published at 16:00) ·
                Manual refresh via button above or{' '}
                <code className="bg-surface-primary px-1 py-0.5 rounded">
                  POST /api/tariffs/refresh
                </code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
