'use client';

import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { batteries, inverters } from '@/modules/hardware/data';
import type { ProjectCapex } from '@/modules/projects/types';
import type { HardwareState, TariffName } from './wizard-shell';

interface StepHardwareProps {
  hardware: HardwareState;
  setHardware: Dispatch<SetStateAction<HardwareState>>;
  tariffName: TariffName;
  setTariffName: Dispatch<SetStateAction<TariffName>>;
  capex: ProjectCapex;
  systemTotals: {
    totalCapKwh: number;
    totalInverterKw: number;
    efficiency: number;
    battery: (typeof batteries)[number] | undefined;
    inverter: (typeof inverters)[number] | undefined;
  };
}

const labelClass = 'text-xs text-text-secondary uppercase tracking-wide';
const inputClass =
  'w-full text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-rose';

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

export function StepHardware({
  hardware,
  setHardware,
  tariffName,
  setTariffName,
  capex,
  systemTotals,
}: StepHardwareProps) {
  const set = <K extends keyof HardwareState>(key: K, val: HardwareState[K]) =>
    setHardware((prev) => ({ ...prev, [key]: val }));

  const maxDischargeKw =
    (systemTotals.battery?.dischargeRateKw ?? 0) * hardware.batteryStacks;
  const effectiveExportKw = Math.min(
    systemTotals.totalInverterKw,
    hardware.exportLimitKw,
    maxDischargeKw,
  );
  const bottleneck =
    effectiveExportKw === hardware.exportLimitKw
      ? 'Export limit'
      : effectiveExportKw === maxDischargeKw
        ? 'Battery discharge'
        : 'Inverter capacity';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Hardware & System</h2>

      {/* Battery & Inverter selects */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass}>Battery</label>
          <select
            className={inputClass}
            value={hardware.batteryId}
            onChange={(e) => set('batteryId', e.target.value)}
          >
            {batteries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.manufacturer} {b.model} ({b.capacityPerModuleKwh}kWh)
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Battery Stacks</label>
          <input
            type="number"
            min={1}
            max={20}
            className={inputClass}
            value={hardware.batteryStacks}
            onChange={(e) => set('batteryStacks', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass}>Inverter</label>
          <select
            className={inputClass}
            value={hardware.inverterId}
            onChange={(e) => set('inverterId', e.target.value)}
          >
            {inverters.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.manufacturer} {inv.model} ({inv.maxOutputKw}kW)
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Inverter Count</label>
          <input
            type="number"
            min={1}
            max={10}
            className={inputClass}
            value={hardware.inverterCount}
            onChange={(e) => set('inverterCount', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      {/* Solar / Export / Consumption */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className={labelClass}>Solar kWp</label>
          <input
            type="number"
            min={0}
            step={0.5}
            className={inputClass}
            value={hardware.solarKwp}
            onChange={(e) => set('solarKwp', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Export Limit (kW)</label>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={hardware.exportLimitKw}
            onChange={(e) => set('exportLimitKw', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Tariff</label>
          <select
            className={inputClass}
            value={tariffName}
            onChange={(e) => setTariffName(e.target.value as TariffName)}
          >
            <option value="flux">Octopus Flux</option>
            <option value="agile">Octopus Agile</option>
            <option value="iof">Intelligent Octopus Flux (IOF)</option>
          </select>
        </div>
      </div>

      {/* Daily consumption slider */}
      <div className="space-y-2">
        <label className={labelClass}>
          Daily Consumption: {hardware.dailyConsumptionKwh} kWh
        </label>
        <input
          type="range"
          min={10}
          max={50}
          step={1}
          value={hardware.dailyConsumptionKwh}
          onChange={(e) => set('dailyConsumptionKwh', parseInt(e.target.value))}
          className="w-full accent-rose"
        />
        <div className="flex justify-between text-[10px] text-text-tertiary">
          <span>10 kWh</span>
          <span>50 kWh</span>
        </div>
      </div>

      {/* Heat pump / EVs */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass}>Heat Pump</label>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => set('hasHeatPump', val)}
                className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors ${
                  hardware.hasHeatPump === val
                    ? 'border-rose bg-rose/10 text-rose'
                    : 'border-border text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Electric Vehicles</label>
          <div className="flex gap-2">
            {[0, 1, 2].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => set('evCount', val)}
                className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors ${
                  hardware.evCount === val
                    ? 'border-rose bg-rose/10 text-rose'
                    : 'border-border text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CAPEX Breakdown */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">CAPEX Breakdown</h3>
        <div className="space-y-1.5 text-sm">
          <Row label="Battery" sub={`${hardware.batteryStacks} stacks`} value={capex.batteryHardware} />
          <Row label="Inverter" sub={`x${hardware.inverterCount}`} value={capex.inverterHardware} />
          <Row label="Solar" sub={`${hardware.solarKwp} kWp`} value={capex.solarCost} />
          <Row label="Installation" value={capex.installationLabour} />
          <Row label="G99 Application" value={capex.g99Application} />
          <Row label="Contingency (5%)" value={capex.contingency} />
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span className="text-text-primary">TOTAL</span>
            <span className="text-rose">&pound;{fmt(capex.totalCapex)}</span>
          </div>
        </div>
      </Card>

      {/* System Summary */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">System Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-text-tertiary text-xs">Total Capacity</p>
            <p className="text-text-primary font-medium">{fmt(systemTotals.totalCapKwh)} kWh</p>
          </div>
          <div>
            <p className="text-text-tertiary text-xs">Inverter Power</p>
            <p className="text-text-primary font-medium">{fmt(systemTotals.totalInverterKw)} kW</p>
          </div>
          <div>
            <p className="text-text-tertiary text-xs">Effective Export</p>
            <p className="text-text-primary font-medium">{fmt(effectiveExportKw)} kW</p>
          </div>
          <div>
            <p className="text-text-tertiary text-xs">Bottleneck</p>
            <p className="flex items-center gap-1 text-text-primary font-medium">
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
              {bottleneck}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, sub, value }: { label: string; sub?: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">
        {label}
        {sub && <span className="ml-1 text-text-tertiary text-xs">({sub})</span>}
      </span>
      <span className="text-text-primary">&pound;{fmt(value)}</span>
    </div>
  );
}

