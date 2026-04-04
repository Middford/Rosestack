'use client';

import { useMemo } from 'react';
import { Receipt, CalendarClock, PiggyBank, Timer } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Badge } from '@/shared/ui/badge';
import type { ProjectData } from './project-detail-page';

// ── Helpers ─────────────────────────────────────────────────────────────────
const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);

const gbp2 = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);

// Daily revenue per 322 kWh reference system
const DAILY_PER_322: Record<string, number> = { iof: 45, flux: 30, agile: 11 };

// ── Component ───────────────────────────────────────────────────────────────
interface TabBudgetProps {
  project: ProjectData;
}

export function TabBudget({ project }: TabBudgetProps) {
  const sys = project.system;
  const totalCapex = sys?.installCost ?? 0;

  // Decompose CAPEX into estimated line items
  // Since we don't store individual hardware IDs on the project, we estimate from total
  const capexBreakdown = useMemo(() => {
    if (!sys) return [];
    const total = sys.installCost;
    // Typical proportions for a RoseStack system
    const batteryPct = 0.45;
    const inverterPct = 0.15;
    const solarPct = sys.solarPvKwp ? 0.12 : 0;
    const installPct = 0.15;
    const g99 = project.g99ApplicationCost ?? 350;
    const g99Pct = g99 / total;
    const contingencyPct = 0.05;
    const remainPct = 1 - batteryPct - inverterPct - solarPct - installPct - g99Pct - contingencyPct;

    const lines = [
      { item: 'Battery Hardware', amount: Math.round(total * batteryPct), note: `${sys.batteryChemistry}, ${sys.totalCapacityKwh} kWh` },
      { item: 'Inverter', amount: Math.round(total * inverterPct), note: sys.inverterModel },
    ];
    if (sys.solarPvKwp) {
      lines.push({ item: 'Solar PV', amount: project.solarCostOverride ?? Math.round(total * solarPct), note: `${sys.solarPvKwp} kWp` });
    }
    lines.push(
      { item: 'Installation Labour', amount: project.installationCostOverride ?? Math.round(total * installPct), note: `${project.phase} supply` },
      { item: 'G99 Application', amount: g99, note: 'DNO export application' },
      { item: 'Contingency (5%)', amount: Math.round(total * contingencyPct), note: '' },
    );
    // Adjust battery to absorb rounding differences
    const lineTotal = lines.reduce((s, l) => s + l.amount, 0);
    if (lines.length > 0) {
      lines[0].amount += total - lineTotal;
    }
    return lines;
  }, [sys, project]);

  // Monthly costs
  const maintenanceMonthly = (sys?.annualMaintenanceCost ?? 0) / 12;
  const insuranceMonthly = (project.insuranceCostAnnual ?? 0) / 12;
  const homeownerPayment = project.monthlyHomeownerPayment ?? 0;
  const totalMonthlyCost = maintenanceMonthly + insuranceMonthly + homeownerPayment;

  // Annual totals
  const annualCosts = (sys?.annualMaintenanceCost ?? 0) + (project.insuranceCostAnnual ?? 0) + homeownerPayment * 12;
  const tariffKey = (project.tariffName ?? 'flux').toLowerCase().replace(/[^a-z]/g, '');
  const dailyBase = DAILY_PER_322[tariffKey] ?? 30;
  const annualRevenue = sys ? dailyBase * (sys.totalCapacityKwh / 322) * 365.25 : 0;
  const annualProfit = annualRevenue - annualCosts;

  // Payback
  const paybackMonths = annualProfit > 0 ? Math.ceil(totalCapex / (annualProfit / 12)) : Infinity;
  const monthsSinceInstall = project.targetInstallDate
    ? Math.max(0, Math.floor((Date.now() - new Date(project.targetInstallDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000)))
    : 0;
  const paybackPct = paybackMonths > 0 && paybackMonths !== Infinity
    ? Math.min(100, Math.round((monthsSinceInstall / paybackMonths) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SimpleStatCard label="Total CAPEX" value={gbp(totalCapex)} />
        <SimpleStatCard label="Monthly Costs" value={gbp2(totalMonthlyCost)} subtitle={`${gbp(annualCosts)}/yr`} />
        <SimpleStatCard
          label="Annual Profit"
          value={gbp(annualProfit)}
          subtitle={`Revenue ${gbp(annualRevenue)} - Costs ${gbp(annualCosts)}`}
          trend={annualProfit > 0 ? 'up' : 'down'}
        />
        <SimpleStatCard
          label="Payback"
          value={paybackMonths === Infinity ? '--' : `${Math.round(paybackMonths / 12 * 10) / 10} yrs`}
          subtitle={paybackMonths === Infinity ? 'Insufficient data' : `${monthsSinceInstall} of ${paybackMonths} months elapsed`}
        />
      </div>

      {/* CAPEX Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-rose" />
            CAPEX Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {capexBreakdown.length === 0 ? (
            <p className="text-sm text-text-tertiary">No system configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-tertiary">
                    <th className="py-2 pr-4 text-left font-medium">Item</th>
                    <th className="py-2 px-3 text-right font-medium">Amount</th>
                    <th className="py-2 pl-3 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {capexBreakdown.map((row) => (
                    <tr key={row.item} className="border-b border-border/50 hover:bg-bg-tertiary/50">
                      <td className="py-2 pr-4 text-text-primary">{row.item}</td>
                      <td className="py-2 px-3 text-right font-medium text-text-primary">{gbp(row.amount)}</td>
                      <td className="py-2 pl-3 text-text-tertiary">{row.note}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-2 pr-4 text-text-primary">Total</td>
                    <td className="py-2 px-3 text-right text-rose">{gbp(totalCapex)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Cost Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-rose" />
            Monthly Cost Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-tertiary">
                  <th className="py-2 pr-4 text-left font-medium">Cost</th>
                  <th className="py-2 px-3 text-right font-medium">Monthly</th>
                  <th className="py-2 pl-3 text-right font-medium">Annual</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 text-text-primary">Homeowner Payment</td>
                  <td className="py-2 px-3 text-right text-text-primary">{gbp2(homeownerPayment)}</td>
                  <td className="py-2 pl-3 text-right text-text-secondary">{gbp(homeownerPayment * 12)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 text-text-primary">Maintenance</td>
                  <td className="py-2 px-3 text-right text-text-primary">{gbp2(maintenanceMonthly)}</td>
                  <td className="py-2 pl-3 text-right text-text-secondary">{gbp(sys?.annualMaintenanceCost ?? 0)}</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 text-text-primary">Insurance</td>
                  <td className="py-2 px-3 text-right text-text-primary">{gbp2(insuranceMonthly)}</td>
                  <td className="py-2 pl-3 text-right text-text-secondary">{gbp(project.insuranceCostAnnual ?? 0)}</td>
                </tr>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2 pr-4 text-text-primary">Total</td>
                  <td className="py-2 px-3 text-right text-rose">{gbp2(totalMonthlyCost)}</td>
                  <td className="py-2 pl-3 text-right text-rose">{gbp(annualCosts)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Annual summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-rose" />
            Annual Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-bold text-scenario-likely mt-1">{gbp(annualRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Costs</p>
              <p className="text-xl font-bold text-scenario-worst mt-1">{gbp(annualCosts)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Net Profit</p>
              <p className={`text-xl font-bold mt-1 ${annualProfit >= 0 ? 'text-scenario-best' : 'text-danger'}`}>
                {gbp(annualProfit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payback progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-rose" />
            Payback Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paybackMonths === Infinity ? (
            <p className="text-sm text-text-tertiary">Insufficient data to calculate payback.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {monthsSinceInstall} months since install
                </span>
                <span className="text-text-secondary">
                  {paybackMonths} months target
                </span>
              </div>
              <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all bg-rose"
                  style={{ width: `${paybackPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <Badge variant={paybackPct >= 100 ? 'success' : 'default'}>
                  {paybackPct >= 100 ? 'Paid back' : `${paybackPct}% complete`}
                </Badge>
                {paybackPct < 100 && (
                  <span className="text-text-tertiary">
                    {paybackMonths - monthsSinceInstall} months remaining
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
