'use client';

import type { Dispatch, SetStateAction } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ProjectCapex } from '@/modules/projects/types';
import { getDefaultInstallCost } from '@/modules/projects/utils';
import type { OverridesState, PropertyState } from './wizard-shell';

interface StepOverridesProps {
  overrides: OverridesState;
  setOverrides: Dispatch<SetStateAction<OverridesState>>;
  capex: ProjectCapex;
  property: PropertyState;
}

function fmt(n: number): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

interface OverrideRowProps {
  label: string;
  defaultValue: number;
  overrideValue: number | null;
  onChange: (val: number | null) => void;
}

function OverrideRow({ label, defaultValue, overrideValue, onChange }: OverrideRowProps) {
  const isOverridden = overrideValue !== null;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5 pr-4 text-sm text-text-primary">{label}</td>
      <td className="py-2.5 pr-4 text-sm text-text-tertiary text-right tabular-nums">
        &pound;{fmt(defaultValue)}
      </td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">
              &pound;
            </span>
            <input
              type="number"
              min={0}
              className={`w-28 text-sm text-right bg-bg-secondary border rounded-[var(--radius-md)] pl-6 pr-3 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-rose ${
                isOverridden ? 'border-rose' : 'border-border'
              }`}
              placeholder="--"
              value={isOverridden ? overrideValue : ''}
              onChange={(e) => {
                const v = e.target.value;
                onChange(v === '' ? null : parseFloat(v));
              }}
            />
          </div>
          {isOverridden && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-[var(--radius-md)] p-1 text-text-tertiary hover:text-rose transition-colors"
              title="Reset to default"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function StepOverrides({ overrides, setOverrides, capex, property }: StepOverridesProps) {
  const set = <K extends keyof OverridesState>(key: K, val: OverridesState[K]) =>
    setOverrides((prev) => ({ ...prev, [key]: val }));

  const defaultInstall = getDefaultInstallCost(property.phase);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Cost Overrides</h2>
      <p className="text-sm text-text-secondary">
        Adjust any cost variable. Leave blank to use the computed default.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-text-tertiary uppercase tracking-wide py-2 pr-4">
                Variable
              </th>
              <th className="text-right text-xs text-text-tertiary uppercase tracking-wide py-2 pr-4">
                Default
              </th>
              <th className="text-right text-xs text-text-tertiary uppercase tracking-wide py-2">
                Override
              </th>
            </tr>
          </thead>
          <tbody>
            <OverrideRow
              label="Battery cost"
              defaultValue={capex.batteryHardware}
              overrideValue={null}
              onChange={() => {}}
            />
            <OverrideRow
              label="Inverter cost"
              defaultValue={capex.inverterHardware}
              overrideValue={null}
              onChange={() => {}}
            />
            <OverrideRow
              label="Solar cost"
              defaultValue={capex.solarCost}
              overrideValue={overrides.solarCost}
              onChange={(v) => set('solarCost', v)}
            />
            <OverrideRow
              label="Installation cost"
              defaultValue={defaultInstall}
              overrideValue={overrides.installationCost}
              onChange={(v) => set('installationCost', v)}
            />
            <OverrideRow
              label="G99 application"
              defaultValue={350}
              overrideValue={
                overrides.g99ApplicationCost !== 350 ? overrides.g99ApplicationCost : null
              }
              onChange={(v) => set('g99ApplicationCost', v ?? 350)}
            />
            <OverrideRow
              label="Annual insurance"
              defaultValue={500}
              overrideValue={
                overrides.insuranceCostAnnual !== 500 ? overrides.insuranceCostAnnual : null
              }
              onChange={(v) => set('insuranceCostAnnual', v ?? 500)}
            />
            <OverrideRow
              label="Annual maintenance"
              defaultValue={150}
              overrideValue={overrides.maintenanceCost}
              onChange={(v) => set('maintenanceCost', v)}
            />
            <OverrideRow
              label="Monthly homeowner payment"
              defaultValue={property.monthlyHomeownerPayment}
              overrideValue={null}
              onChange={() => {}}
            />
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-tertiary">
        Battery and inverter costs are derived from hardware selection. Homeowner payment is set on
        the Property step. Override other fields above as needed.
      </p>
    </div>
  );
}
