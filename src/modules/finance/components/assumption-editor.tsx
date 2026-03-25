'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@/shared/ui';
import {
  BEST_CASE_DEFAULTS,
  LIKELY_CASE_DEFAULTS,
  WORST_CASE_DEFAULTS,
} from '../data';
import type { ScenarioAssumptions, ScenarioType } from '@/shared/types';

interface AssumptionField {
  key: keyof ScenarioAssumptions;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: AssumptionField[] = [
  { key: 'energyInflationPercent', label: 'Energy Inflation', unit: '%/yr', min: -5, max: 15, step: 0.5 },
  { key: 'batteryDegradationPercent', label: 'Battery Degradation', unit: '%/yr', min: 0.5, max: 5, step: 0.25 },
  { key: 'iofSpreadChangePercent', label: 'Tariff Spread Change', unit: '%', min: -30, max: 30, step: 2 },
  { key: 'savingSessionsPerYear', label: 'Saving Sessions/yr', unit: 'sessions', min: 0, max: 50, step: 5 },
  { key: 'savingSessionRatePencePerKwh', label: 'SS Rate', unit: 'p/kWh', min: 100, max: 800, step: 50 },
  { key: 'flexibilityRevenuePerHomePerYear', label: 'Flexibility Revenue', unit: '£/home/yr', min: 0, max: 3000, step: 100 },
  { key: 'hardwareCostChangePercent', label: 'Hardware Cost Change', unit: '%', min: -30, max: 30, step: 5 },
  { key: 'installCostChangePercent', label: 'Install Cost Change', unit: '%', min: -20, max: 30, step: 5 },
  { key: 'homeownerChurnPercent', label: 'Homeowner Churn', unit: '%/yr', min: 0, max: 10, step: 1 },
  { key: 'cyclesPerDay', label: 'Cycles/Day', unit: 'cycles', min: 1, max: 3, step: 0.25 },
  { key: 'solarSelfConsumptionPercent', label: 'Solar Self-Consumption', unit: '%', min: 10, max: 70, step: 5 },
  { key: 'maintenanceCostChangePercent', label: 'Maintenance Cost Change', unit: '%', min: -30, max: 40, step: 5 },
  { key: 'interestRateSpreadPercent', label: 'Interest Rate Spread', unit: '%', min: 0.5, max: 8, step: 0.5 },
];

const scenarioColors: Record<ScenarioType, string> = {
  best: 'text-scenario-best',
  likely: 'text-scenario-likely',
  worst: 'text-scenario-worst',
};

const scenarioBg: Record<ScenarioType, string> = {
  best: 'bg-scenario-best/5 border-scenario-best/20',
  likely: 'bg-scenario-likely/5 border-scenario-likely/20',
  worst: 'bg-scenario-worst/5 border-scenario-worst/20',
};

export function AssumptionEditor() {
  const [best, setBest] = useState<ScenarioAssumptions>({ ...BEST_CASE_DEFAULTS });
  const [likely, setLikely] = useState<ScenarioAssumptions>({ ...LIKELY_CASE_DEFAULTS });
  const [worst, setWorst] = useState<ScenarioAssumptions>({ ...WORST_CASE_DEFAULTS });

  const assumptions: Record<ScenarioType, { state: ScenarioAssumptions; setState: (v: ScenarioAssumptions) => void; defaults: ScenarioAssumptions }> = {
    best: { state: best, setState: setBest, defaults: BEST_CASE_DEFAULTS },
    likely: { state: likely, setState: setLikely, defaults: LIKELY_CASE_DEFAULTS },
    worst: { state: worst, setState: setWorst, defaults: WORST_CASE_DEFAULTS },
  };

  const handleReset = (scenario: ScenarioType) => {
    assumptions[scenario].setState({ ...assumptions[scenario].defaults });
  };

  const handleResetAll = () => {
    setBest({ ...BEST_CASE_DEFAULTS });
    setLikely({ ...LIKELY_CASE_DEFAULTS });
    setWorst({ ...WORST_CASE_DEFAULTS });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Edit assumptions for each scenario. Changes ripple through all models and charts.
        </p>
        <Button variant="secondary" size="sm" onClick={handleResetAll}>
          Reset All to Defaults
        </Button>
      </div>

      {/* Assumptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium sticky left-0 bg-bg-secondary">Assumption</th>
                  {(['best', 'likely', 'worst'] as ScenarioType[]).map(scenario => (
                    <th key={scenario} className={`text-center py-3 px-4 font-medium ${scenarioColors[scenario]}`}>
                      <div className="flex items-center justify-center gap-2">
                        <span className="capitalize">{scenario}</span>
                        <button
                          onClick={() => handleReset(scenario)}
                          className="text-[10px] text-text-tertiary hover:text-text-secondary underline"
                        >
                          reset
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.map(field => (
                  <tr key={field.key} className="border-b border-border/50">
                    <td className="py-2 px-4 text-text-primary sticky left-0 bg-bg-secondary">
                      <div>
                        <span className="text-sm">{field.label}</span>
                        <span className="text-xs text-text-tertiary ml-1">({field.unit})</span>
                      </div>
                    </td>
                    {(['best', 'likely', 'worst'] as ScenarioType[]).map(scenario => {
                      const { state, setState } = assumptions[scenario];
                      const value = state[field.key] as number;
                      const isDefault = value === assumptions[scenario].defaults[field.key];
                      return (
                        <td key={scenario} className={`py-2 px-4 ${scenarioBg[scenario]} border`}>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={value}
                              onChange={e => setState({ ...state, [field.key]: Number(e.target.value) })}
                              className="flex-1 h-1.5"
                            />
                            <span className={`text-xs font-mono w-14 text-right ${isDefault ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                              {value}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Current Values Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['best', 'likely', 'worst'] as ScenarioType[]).map(scenario => {
          const { state, defaults } = assumptions[scenario];
          const changedCount = FIELDS.filter(f => state[f.key] !== defaults[f.key]).length;
          return (
            <Card key={scenario} className={`border ${scenarioBg[scenario]}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={`capitalize ${scenarioColors[scenario]}`}>{scenario} Case</CardTitle>
                  {changedCount > 0 && (
                    <Badge variant="info">{changedCount} changed</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {FIELDS.filter(f => state[f.key] !== defaults[f.key]).map(f => (
                  <div key={f.key} className="flex justify-between text-xs">
                    <span className="text-text-secondary">{f.label}</span>
                    <span className="text-text-primary font-medium">
                      {String(defaults[f.key])} &rarr; {String(state[f.key])} {f.unit}
                    </span>
                  </div>
                ))}
                {changedCount === 0 && (
                  <p className="text-xs text-text-tertiary">Using defaults</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
