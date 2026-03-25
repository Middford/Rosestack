'use client';

import { useState, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button,
} from '@/shared/ui';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend,
} from 'recharts';
import { batteries, inverters } from '../data';
import type { BatterySpec, InverterSpec } from '../types';

type CompareMode = 'battery' | 'inverter';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

function normalizeBatteryMetrics(items: BatterySpec[]) {
  if (items.length === 0) return [];

  const maxCapacity = Math.max(...items.map(b => b.capacityPerModuleKwh));
  const maxCycles = Math.max(...items.map(b => b.cycleLife));
  const maxEfficiency = 100;
  const maxWarranty = Math.max(...items.map(b => b.warrantyYears));
  const maxPrice = Math.max(...items.map(b => b.wholesalePriceGbp));
  const maxChargeRate = Math.max(...items.map(b => b.chargeRateKw));

  const metrics = [
    'Capacity', 'Cycle Life', 'Efficiency', 'Warranty', 'Value', 'Charge Rate',
  ];

  return metrics.map(metric => {
    const row: Record<string, string | number> = { metric };
    items.forEach(b => {
      const label = `${b.manufacturer} ${b.model.split(' ')[0]}`;
      switch (metric) {
        case 'Capacity': row[label] = (b.capacityPerModuleKwh / maxCapacity) * 100; break;
        case 'Cycle Life': row[label] = (b.cycleLife / maxCycles) * 100; break;
        case 'Efficiency': row[label] = (b.roundTripEfficiency / maxEfficiency) * 100; break;
        case 'Warranty': row[label] = (b.warrantyYears / maxWarranty) * 100; break;
        case 'Value': row[label] = (1 - b.wholesalePriceGbp / maxPrice) * 100 || 50; break;
        case 'Charge Rate': row[label] = (b.chargeRateKw / maxChargeRate) * 100; break;
      }
    });
    return row;
  });
}

function normalizeInverterMetrics(items: InverterSpec[]) {
  if (items.length === 0) return [];

  const maxOutput = Math.max(...items.map(i => i.maxOutputKw));
  const maxPv = Math.max(...items.map(i => i.maxPvInputKw));
  const maxBatCap = Math.max(...items.map(i => i.maxBatteryCapacityKwh));
  const maxMppt = Math.max(...items.map(i => i.mpptTrackers));
  const maxWarranty = Math.max(...items.map(i => i.warrantyYears));
  const maxPrice = Math.max(...items.map(i => i.priceGbp));

  const metrics = [
    'Max Output', 'PV Input', 'Battery Capacity', 'MPPTs', 'Warranty', 'Value',
  ];

  return metrics.map(metric => {
    const row: Record<string, string | number> = { metric };
    items.forEach(i => {
      const label = `${i.manufacturer} ${i.model.split(' ')[0]}`;
      switch (metric) {
        case 'Max Output': row[label] = (i.maxOutputKw / maxOutput) * 100; break;
        case 'PV Input': row[label] = (i.maxPvInputKw / maxPv) * 100; break;
        case 'Battery Capacity': row[label] = (i.maxBatteryCapacityKwh / maxBatCap) * 100; break;
        case 'MPPTs': row[label] = maxMppt > 0 ? (i.mpptTrackers / maxMppt) * 100 : 0; break;
        case 'Warranty': row[label] = (i.warrantyYears / maxWarranty) * 100; break;
        case 'Value': row[label] = (1 - i.priceGbp / maxPrice) * 100 || 50; break;
      }
    });
    return row;
  });
}

export function ComparisonTool() {
  const [mode, setMode] = useState<CompareMode>('battery');
  const [selectedBatteries, setSelectedBatteries] = useState<string[]>([]);
  const [selectedInverters, setSelectedInverters] = useState<string[]>([]);

  const selected = mode === 'battery' ? selectedBatteries : selectedInverters;
  const setSelected = mode === 'battery' ? setSelectedBatteries : setSelectedInverters;
  const items = mode === 'battery' ? batteries : inverters;
  const max = 4;

  function toggleItem(id: string) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < max ? [...prev, id] : prev
    );
  }

  const selectedBatItems = batteries.filter(b => selectedBatteries.includes(b.id));
  const selectedInvItems = inverters.filter(i => selectedInverters.includes(i.id));

  const chartData = useMemo(() => {
    if (mode === 'battery') return normalizeBatteryMetrics(selectedBatItems);
    return normalizeInverterMetrics(selectedInvItems);
  }, [mode, selectedBatItems, selectedInvItems]);

  const chartKeys = useMemo(() => {
    const activeItems = mode === 'battery' ? selectedBatItems : selectedInvItems;
    return activeItems.map(item => `${item.manufacturer} ${item.model.split(' ')[0]}`);
  }, [mode, selectedBatItems, selectedInvItems]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparison Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'battery' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMode('battery')}
            >
              Batteries
            </Button>
            <Button
              variant={mode === 'inverter' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setMode('inverter')}
            >
              Inverters
            </Button>
          </div>

          <p className="text-sm text-text-secondary mb-3">
            Select up to {max} items to compare ({selected.length}/{max} selected)
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {items.map(item => {
              const isSelected = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isSelected
                      ? 'bg-rose-subtle border-rose text-rose-light'
                      : 'bg-bg-tertiary border-border text-text-secondary hover:border-border-hover'
                  }`}
                >
                  {item.manufacturer} {item.model.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart */}
      {selected.length >= 2 && (
        <Card>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={chartData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                {chartKeys.map((key, idx) => (
                  <Radar
                    key={key}
                    name={key}
                    dataKey={key}
                    stroke={CHART_COLORS[idx]}
                    fill={CHART_COLORS[idx]}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                ))}
                <Legend wrapperStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side specs */}
      {mode === 'battery' && selectedBatItems.length >= 2 && (
        <Card>
          <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-text-secondary font-medium">Spec</th>
                    {selectedBatItems.map(b => (
                      <th key={b.id} className="text-left py-2 px-3 text-text-primary font-medium">{b.manufacturer}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-text-primary">
                  <SpecRow label="Model" values={selectedBatItems.map(b => b.model)} />
                  <SpecRow label="Capacity/Module" values={selectedBatItems.map(b => `${b.capacityPerModuleKwh}kWh`)} />
                  <SpecRow label="Max Modules" values={selectedBatItems.map(b => `${b.maxModulesPerString}`)} />
                  <SpecRow label="Chemistry" values={selectedBatItems.map(b => b.chemistry)} />
                  <SpecRow label="Cycle Life" values={selectedBatItems.map(b => b.cycleLife.toLocaleString())} />
                  <SpecRow label="RTE" values={selectedBatItems.map(b => `${b.roundTripEfficiency}%`)} />
                  <SpecRow label="Charge Rate" values={selectedBatItems.map(b => `${b.chargeRateKw}kW`)} />
                  <SpecRow label="Weight" values={selectedBatItems.map(b => `${b.weightKg}kg`)} />
                  <SpecRow label="Warranty" values={selectedBatItems.map(b => `${b.warrantyYears} years`)} />
                  <SpecRow label="Price" values={selectedBatItems.map(b => `£${b.wholesalePriceGbp.toLocaleString()}`)} />
                  <SpecRow label="IOF" values={selectedBatItems.map(b => b.iofCompatible ? 'Yes' : 'No')} />
                  <SpecRow label="MCS" values={selectedBatItems.map(b => b.mcsCertified ? 'Yes' : 'No')} />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'inverter' && selectedInvItems.length >= 2 && (
        <Card>
          <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-text-secondary font-medium">Spec</th>
                    {selectedInvItems.map(i => (
                      <th key={i.id} className="text-left py-2 px-3 text-text-primary font-medium">{i.manufacturer}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-text-primary">
                  <SpecRow label="Model" values={selectedInvItems.map(i => i.model)} />
                  <SpecRow label="Max Output" values={selectedInvItems.map(i => `${i.maxOutputKw}kW`)} />
                  <SpecRow label="Max PV Input" values={selectedInvItems.map(i => `${i.maxPvInputKw}kW`)} />
                  <SpecRow label="Max Battery" values={selectedInvItems.map(i => `${i.maxBatteryCapacityKwh}kWh`)} />
                  <SpecRow label="MPPTs" values={selectedInvItems.map(i => `${i.mpptTrackers}`)} />
                  <SpecRow label="3-Phase" values={selectedInvItems.map(i => i.threePhase ? 'Yes' : 'No')} />
                  <SpecRow label="Hybrid" values={selectedInvItems.map(i => i.hybrid ? 'Yes' : 'No')} />
                  <SpecRow label="Warranty" values={selectedInvItems.map(i => `${i.warrantyYears} years`)} />
                  <SpecRow label="Price" values={selectedInvItems.map(i => `£${i.priceGbp.toLocaleString()}`)} />
                  <SpecRow label="IOF" values={selectedInvItems.map(i => i.iofCompatible ? 'Yes' : 'No')} />
                  <SpecRow label="Octopus API" values={selectedInvItems.map(i => i.octopusApiIntegration ? 'Yes' : 'No')} />
                  <SpecRow label="Home Assistant" values={selectedInvItems.map(i => i.homeAssistantCompatible ? 'Yes' : 'No')} />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SpecRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 px-3 text-text-secondary font-medium">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-2 px-3">{v}</td>
      ))}
    </tr>
  );
}
