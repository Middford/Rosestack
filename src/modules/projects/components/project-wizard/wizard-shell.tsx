'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { calculateProjectCapex, getSystemTotals } from '@/modules/projects/utils';
import { StepProperty } from './step-property';
import { StepHardware } from './step-hardware';
import { StepOverrides } from './step-overrides';
import { StepProjection } from './step-projection';
import { StepReview } from './step-review';

const STEPS = [
  'Property Details',
  'Hardware & System',
  'Cost Overrides',
  'Revenue Projection',
  'Review & Create',
] as const;

export interface PropertyState {
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  phase: '1-phase' | '3-phase';
  propertyType: string;
  bedrooms: number;
  gardenAccess: boolean;
  epcRating: string;
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
  monthlyHomeownerPayment: number;
  esaContractRef: string;
  targetInstallDate: string;
}

export interface HardwareState {
  batteryId: string;
  batteryStacks: number;
  inverterId: string;
  inverterCount: number;
  solarKwp: number;
  exportLimitKw: number;
  dailyConsumptionKwh: number;
  hasHeatPump: boolean;
  evCount: number;
}

export interface OverridesState {
  installationCost: number | null;
  maintenanceCost: number | null;
  solarCost: number | null;
  insuranceCostAnnual: number;
  g99ApplicationCost: number;
}

export type TariffName = 'flux' | 'agile' | 'iof';

export function WizardShell() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [property, setProperty] = useState<PropertyState>({
    address: '',
    postcode: '',
    latitude: 53.75,
    longitude: -2.48,
    phase: '3-phase',
    propertyType: 'detached',
    bedrooms: 3,
    gardenAccess: true,
    epcRating: '',
    homeownerName: '',
    homeownerEmail: '',
    homeownerPhone: '',
    monthlyHomeownerPayment: 100,
    esaContractRef: '',
    targetInstallDate: '',
  });

  const [hardware, setHardware] = useState<HardwareState>({
    batteryId: 'bat-fogstar-64',
    batteryStacks: 4,
    inverterId: 'inv-solis-30k',
    inverterCount: 3,
    solarKwp: 25,
    exportLimitKw: 66,
    dailyConsumptionKwh: 24,
    hasHeatPump: true,
    evCount: 2,
  });

  const [overrides, setOverrides] = useState<OverridesState>({
    installationCost: null,
    maintenanceCost: null,
    solarCost: null,
    insuranceCostAnnual: 500,
    g99ApplicationCost: 350,
  });

  const [tariffName, setTariffName] = useState<TariffName>('flux');

  const capex = useMemo(
    () =>
      calculateProjectCapex({
        batteryId: hardware.batteryId,
        batteryStacks: hardware.batteryStacks,
        inverterId: hardware.inverterId,
        inverterCount: hardware.inverterCount,
        solarKwp: hardware.solarKwp,
        phase: property.phase,
        g99ApplicationCost: overrides.g99ApplicationCost,
        installationCostOverride: overrides.installationCost,
        solarCostOverride: overrides.solarCost,
      }),
    [hardware, property.phase, overrides.g99ApplicationCost, overrides.installationCost, overrides.solarCost],
  );

  const systemTotals = useMemo(
    () =>
      getSystemTotals(
        hardware.batteryId,
        hardware.batteryStacks,
        hardware.inverterId,
        hardware.inverterCount,
      ),
    [hardware.batteryId, hardware.batteryStacks, hardware.inverterId, hardware.inverterCount],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...property,
          ...hardware,
          tariffName,
          installationCostOverride: overrides.installationCost,
          maintenanceCostOverride: overrides.maintenanceCost,
          solarCostOverride: overrides.solarCost,
          insuranceCostAnnual: overrides.insuranceCostAnnual,
          g99ApplicationCost: overrides.g99ApplicationCost,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Server error ${res.status}`);
      }
      router.push('/projects');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }, [property, hardware, tariffName, overrides, router]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => {
          const idx = i + 1;
          const isActive = idx === step;
          const isComplete = idx < step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => idx < step && setStep(idx)}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  isComplete || isActive ? 'bg-rose' : 'border border-border bg-transparent'
                }`}
              />
              <span
                className={`text-[10px] uppercase tracking-wide ${
                  isActive
                    ? 'font-semibold text-rose'
                    : isComplete
                      ? 'text-text-secondary'
                      : 'text-text-tertiary'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === 1 && <StepProperty property={property} setProperty={setProperty} />}
        {step === 2 && (
          <StepHardware
            hardware={hardware}
            setHardware={setHardware}
            tariffName={tariffName}
            setTariffName={setTariffName}
            capex={capex}
            property={property}
            systemTotals={systemTotals}
          />
        )}
        {step === 3 && (
          <StepOverrides
            overrides={overrides}
            setOverrides={setOverrides}
            capex={capex}
            property={property}
          />
        )}
        {step === 4 && (
          <StepProjection
            hardware={hardware}
            tariffName={tariffName}
            capex={capex}
            systemTotals={systemTotals}
          />
        )}
        {step === 5 && (
          <StepReview
            property={property}
            hardware={hardware}
            overrides={overrides}
            tariffName={tariffName}
            capex={capex}
            systemTotals={systemTotals}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => s - 1)}
          className="flex items-center gap-1 rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-secondary disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-1 rounded-[var(--radius-md)] bg-rose px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-rose px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Project
          </button>
        )}
      </div>
    </div>
  );
}
