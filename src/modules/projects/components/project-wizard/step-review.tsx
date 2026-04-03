'use client';

import { Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import type { ProjectCapex } from '@/modules/projects/types';
import type { HardwareState, OverridesState, PropertyState, TariffName } from './wizard-shell';

interface StepReviewProps {
  property: PropertyState;
  hardware: HardwareState;
  overrides: OverridesState;
  tariffName: TariffName;
  capex: ProjectCapex;
  systemTotals: {
    totalCapKwh: number;
    totalInverterKw: number;
    efficiency: number;
    battery: { manufacturer: string; model: string } | undefined;
    inverter: { manufacturer: string; model: string } | undefined;
  };
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}

const TARIFF_DAILY_BASE: Record<TariffName, number> = {
  iof: 45,
  flux: 30,
  agile: 11,
};

const REFERENCE_KWH = 322;
const TARIFF_LABELS: Record<TariffName, string> = {
  flux: 'Octopus Flux',
  agile: 'Octopus Agile',
  iof: 'Intelligent Octopus Flux',
};

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

function fmtDec(n: number, dp: number = 1): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">
      {children}
    </h3>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary font-medium">{value}</span>
    </div>
  );
}

export function StepReview({
  property,
  hardware,
  overrides,
  tariffName,
  capex,
  systemTotals,
  onSubmit,
  submitting,
  error,
}: StepReviewProps) {
  const dailyBase = TARIFF_DAILY_BASE[tariffName];
  const scale = systemTotals.totalCapKwh / REFERENCE_KWH;
  const annualLikely = dailyBase * scale * 365;
  const monthlyLikely = annualLikely / 12;
  const paybackYears = capex.totalCapex > 0 ? capex.totalCapex / annualLikely : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Review & Create</h2>
      <p className="text-sm text-text-secondary">
        Check everything below before creating this project.
      </p>

      {/* Property */}
      <Card className="p-5 space-y-1">
        <SectionTitle>Property</SectionTitle>
        <DetailRow label="Address" value={property.address || '--'} />
        <DetailRow label="Postcode" value={property.postcode || '--'} />
        <DetailRow label="Phase" value={property.phase} />
        <DetailRow label="Property Type" value={property.propertyType} />
        <DetailRow label="Target Install Date" value={property.targetInstallDate || 'Not set'} />
        <DetailRow
          label="Homeowner"
          value={property.homeownerName || '--'}
        />
        <DetailRow
          label="Monthly Payment"
          value={`\u00A3${fmt(property.monthlyHomeownerPayment)}`}
        />
      </Card>

      {/* System */}
      <Card className="p-5 space-y-1">
        <SectionTitle>System</SectionTitle>
        <DetailRow
          label="Battery"
          value={`${systemTotals.battery?.manufacturer ?? '--'} x${hardware.batteryStacks} = ${fmt(systemTotals.totalCapKwh)} kWh`}
        />
        <DetailRow
          label="Inverter"
          value={`${systemTotals.inverter?.manufacturer ?? '--'} x${hardware.inverterCount} = ${fmt(systemTotals.totalInverterKw)} kW`}
        />
        <DetailRow label="Solar" value={`${hardware.solarKwp} kWp`} />
        <DetailRow label="Export Limit" value={`${hardware.exportLimitKw} kW`} />
        <DetailRow label="Daily Consumption" value={`${hardware.dailyConsumptionKwh} kWh`} />
        <DetailRow label="Heat Pump" value={hardware.hasHeatPump ? 'Yes' : 'No'} />
        <DetailRow label="EVs" value={String(hardware.evCount)} />
      </Card>

      {/* Costs */}
      <Card className="p-5 space-y-1">
        <SectionTitle>CAPEX Breakdown</SectionTitle>
        <DetailRow label="Battery Hardware" value={`\u00A3${fmt(capex.batteryHardware)}`} />
        <DetailRow label="Inverter Hardware" value={`\u00A3${fmt(capex.inverterHardware)}`} />
        <DetailRow label="Solar" value={`\u00A3${fmt(capex.solarCost)}`} />
        <DetailRow label="Installation" value={`\u00A3${fmt(capex.installationLabour)}`} />
        <DetailRow label="G99 Application" value={`\u00A3${fmt(capex.g99Application)}`} />
        <DetailRow label="Contingency (5%)" value={`\u00A3${fmt(capex.contingency)}`} />
        <div className="border-t border-border pt-2 mt-1 flex justify-between">
          <span className="text-sm font-bold text-text-primary">Total CAPEX</span>
          <span className="text-sm font-bold text-rose">&pound;{fmt(capex.totalCapex)}</span>
        </div>
      </Card>

      {/* Revenue (Likely) */}
      <Card className="p-5 space-y-1">
        <SectionTitle>Revenue (Likely Case)</SectionTitle>
        <DetailRow label="Annual" value={`\u00A3${fmt(annualLikely)}`} />
        <DetailRow label="Monthly" value={`\u00A3${fmt(monthlyLikely)}`} />
        <DetailRow label="Payback" value={`${fmtDec(paybackYears)} years`} />
      </Card>

      {/* Tariff */}
      <Card className="p-5">
        <SectionTitle>Tariff</SectionTitle>
        <p className="text-sm text-text-primary font-medium">{TARIFF_LABELS[tariffName]}</p>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        disabled={submitting}
        onClick={onSubmit}
        className="w-full rounded-[var(--radius-md)] bg-rose px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Create Project
      </button>
    </div>
  );
}
