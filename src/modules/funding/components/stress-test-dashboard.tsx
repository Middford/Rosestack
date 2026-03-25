'use client';

import { useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  TrafficLight, SimpleStatCard,
} from '@/shared/ui';
import { runStressTests, type StressTestResult } from '../data';
import { batteries, inverters } from '@/modules/hardware/data';
import { ALL_TARIFFS } from '@/modules/tariffs/data';
import type { BatterySystem } from '@/shared/types';

function buildDefaultSystem(): BatterySystem {
  const bat = batteries[0];
  const inv = inverters[0];
  return {
    id: 'stress-default',
    homeId: 'stress',
    inverterModel: `${inv.manufacturer} ${inv.model}`,
    batteryModules: 1,
    totalCapacityKwh: bat.capacityPerModuleKwh,
    batteryChemistry: bat.chemistry,
    solarPvKwp: 5,
    installCost: bat.wholesalePriceGbp + inv.priceGbp,
    annualMaintenanceCost: 150,
    warrantyYears: bat.warrantyYears,
    degradationRatePercent: bat.degradationRatePercent,
    maxChargeRateKw: Math.min(bat.chargeRateKw, inv.maxOutputKw),
    maxDischargeRateKw: Math.min(bat.dischargeRateKw, inv.maxOutputKw),
    roundTripEfficiency: bat.roundTripEfficiency / 100,
  };
}

export function StressTestDashboard() {
  const system = useMemo(buildDefaultSystem, []);
  const tariff = ALL_TARIFFS[0];
  const results = useMemo(() => runStressTests(system, tariff, 5000), [system, tariff]);

  const greenCount = results.filter(r => r.statusLikely === 'green').length;
  const amberCount = results.filter(r => r.statusLikely === 'amber').length;
  const redCount = results.filter(r => r.statusLikely === 'red').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SimpleStatCard label="Tests Run" value={String(results.length)} subtitle="Stress scenarios" />
        <SimpleStatCard
          label="Likely Pass"
          value={String(greenCount)}
          subtitle="DSCR above covenant"
          trend={greenCount >= results.length ? 'up' : 'neutral'}
        />
        <SimpleStatCard
          label="Watch"
          value={String(amberCount)}
          subtitle="DSCR approaching threshold"
          trend={amberCount > 0 ? 'down' : 'neutral'}
        />
        <SimpleStatCard
          label="Breach"
          value={String(redCount)}
          subtitle="DSCR below covenant"
          trend={redCount > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stress Test Results</CardTitle>
          <CardDescription>
            DSCR impact under various stress scenarios with traffic light indicators (covenant: 1.25x)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scenario</TableHead>
                <TableHead className="text-center">Best DSCR</TableHead>
                <TableHead className="text-center">Likely DSCR</TableHead>
                <TableHead className="text-center">Worst DSCR</TableHead>
                <TableHead className="hidden lg:table-cell">Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(result => (
                <StressRow key={result.id} result={result} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Cards for failing tests */}
      {results.filter(r => r.statusLikely !== 'green').length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-text-primary">Scenarios Requiring Attention</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.filter(r => r.statusLikely !== 'green').map(result => (
              <Card key={result.id} className={result.statusLikely === 'red' ? 'border-danger/30' : 'border-warning/30'}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrafficLight status={result.statusLikely} />
                    <h4 className="text-sm font-semibold text-text-primary">{result.name}</h4>
                  </div>
                  <p className="text-xs text-text-secondary">{result.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <DscrCell label="Best" dscr={result.dscrBest} status={result.statusBest} />
                    <DscrCell label="Likely" dscr={result.dscrLikely} status={result.statusLikely} />
                    <DscrCell label="Worst" dscr={result.dscrWorst} status={result.statusWorst} />
                  </div>
                  <p className="text-xs text-text-tertiary">{result.impact}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StressRow({ result }: { result: StressTestResult }) {
  return (
    <TableRow>
      <TableCell>
        <p className="text-sm font-medium">{result.name}</p>
        <p className="text-xs text-text-tertiary line-clamp-1 hidden md:block">{result.description}</p>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1.5">
          <TrafficLight status={result.statusBest} />
          <span className="text-sm">{result.dscrBest.toFixed(2)}x</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1.5">
          <TrafficLight status={result.statusLikely} />
          <span className="text-sm font-medium">{result.dscrLikely.toFixed(2)}x</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1.5">
          <TrafficLight status={result.statusWorst} />
          <span className="text-sm">{result.dscrWorst.toFixed(2)}x</span>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-xs text-text-secondary max-w-[200px]">
        {result.impact}
      </TableCell>
    </TableRow>
  );
}

function DscrCell({ label, dscr, status }: { label: string; dscr: number; status: 'green' | 'amber' | 'red' }) {
  return (
    <div className="bg-bg-primary rounded-[var(--radius-sm)] p-2">
      <p className="text-xs text-text-tertiary">{label}</p>
      <div className="flex items-center justify-center gap-1 mt-1">
        <TrafficLight status={status} />
        <span className="text-sm font-medium text-text-primary">{dscr.toFixed(2)}x</span>
      </div>
    </div>
  );
}
