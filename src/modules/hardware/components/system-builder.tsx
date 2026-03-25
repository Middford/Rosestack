'use client';

import { useState, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Badge, Button, SimpleStatCard,
} from '@/shared/ui';
import { batteries, inverters, solarPanels, heatPumps } from '../data';
import { calculateSystemCost, checkSystemCompatibility } from '../service';
import type { SystemConfig } from '../types';

export function SystemBuilder() {
  const [config, setConfig] = useState<SystemConfig>({
    battery: null,
    batteryModules: 1,
    inverter: null,
    solarPanel: null,
    solarPanelCount: 0,
    heatPump: null,
  });

  const cost = useMemo(() => calculateSystemCost(config), [config]);
  const compat = useMemo(() => checkSystemCompatibility(config), [config]);
  const totalCapacity = config.battery
    ? config.battery.capacityPerModuleKwh * config.batteryModules
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Battery */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">1. Select Battery</label>
            <select
              value={config.battery?.id ?? ''}
              onChange={e => {
                const bat = batteries.find(b => b.id === e.target.value) ?? null;
                setConfig(c => ({ ...c, battery: bat, batteryModules: bat ? 1 : 0 }));
              }}
              className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
            >
              <option value="">-- Select battery --</option>
              {batteries.map(b => (
                <option key={b.id} value={b.id}>
                  {b.manufacturer} {b.model} ({b.capacityPerModuleKwh}kWh, {b.chemistry})
                </option>
              ))}
            </select>
            {config.battery && (
              <div className="mt-2 flex items-center gap-4">
                <label className="text-sm text-text-secondary">Modules:</label>
                <input
                  type="number"
                  min={1}
                  max={config.battery.maxModulesPerString}
                  value={config.batteryModules}
                  onChange={e => setConfig(c => ({ ...c, batteryModules: Math.max(1, Math.min(c.battery?.maxModulesPerString ?? 1, parseInt(e.target.value) || 1)) }))}
                  className="w-20 h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm text-center"
                />
                <span className="text-sm text-text-tertiary">
                  (max {config.battery.maxModulesPerString}) = {totalCapacity.toFixed(1)}kWh total
                </span>
              </div>
            )}
          </div>

          {/* Step 2: Inverter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">2. Select Inverter</label>
            <select
              value={config.inverter?.id ?? ''}
              onChange={e => {
                const inv = inverters.find(i => i.id === e.target.value) ?? null;
                setConfig(c => ({ ...c, inverter: inv }));
              }}
              className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
            >
              <option value="">-- Select inverter --</option>
              {inverters.map(i => (
                <option key={i.id} value={i.id}>
                  {i.manufacturer} {i.model} ({i.maxOutputKw}kW{i.threePhase ? ', 3-phase' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Solar */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">3. Solar PV (Optional)</label>
            <div className="flex flex-wrap gap-3">
              <select
                value={config.solarPanel?.id ?? ''}
                onChange={e => {
                  const panel = solarPanels.find(s => s.id === e.target.value) ?? null;
                  setConfig(c => ({ ...c, solarPanel: panel, solarPanelCount: panel ? Math.max(1, c.solarPanelCount) : 0 }));
                }}
                className="flex-1 min-w-[200px] h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
              >
                <option value="">-- None --</option>
                {solarPanels.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.manufacturer} {s.model} ({s.efficiency}% eff)
                  </option>
                ))}
              </select>
              {config.solarPanel && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-secondary">Panels:</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={config.solarPanelCount}
                    onChange={e => setConfig(c => ({ ...c, solarPanelCount: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) }))}
                    className="w-20 h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm text-center"
                  />
                  <span className="text-sm text-text-tertiary">
                    = {((config.solarPanel.wattage * config.solarPanelCount) / 1000).toFixed(1)}kWp
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 4: Heat Pump */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">4. Heat Pump (Optional)</label>
            <select
              value={config.heatPump?.id ?? ''}
              onChange={e => {
                const hp = heatPumps.find(h => h.id === e.target.value) ?? null;
                setConfig(c => ({ ...c, heatPump: hp }));
              }}
              className="w-full h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
            >
              <option value="">-- None --</option>
              {heatPumps.map(h => (
                <option key={h.id} value={h.id}>
                  {h.manufacturer} {h.model} (COP {h.copRating}, {h.heatingCapacityKw}kW)
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Compatibility & Cost Summary */}
      {(config.battery || config.inverter) && (
        <div className="space-y-4">
          {/* Compatibility */}
          {config.battery && config.inverter && (
            <Card className={compat.compatible ? 'border-success/30' : 'border-danger/30'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant={compat.compatible ? 'success' : 'danger'}>
                    {compat.compatible ? 'Compatible' : 'Not Compatible'}
                  </Badge>
                  {compat.iofEligible && (
                    <Badge variant="rose">IOF Eligible</Badge>
                  )}
                </div>
                {compat.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {compat.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-warning">{w}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cost */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <SimpleStatCard label="Battery" value={`£${cost.batteryCost.toLocaleString()}`} />
            <SimpleStatCard label="Inverter" value={`£${cost.inverterCost.toLocaleString()}`} />
            <SimpleStatCard label="Solar PV" value={`£${cost.solarCost.toLocaleString()}`} />
            <SimpleStatCard label="Heat Pump" value={`£${cost.heatPumpCost.toLocaleString()}`} />
            <SimpleStatCard label="Installation" value={`£${cost.installationEstimate.toLocaleString()}`} subtitle="Estimated" />
            <SimpleStatCard
              label="Total Cost"
              value={`£${cost.totalCost.toLocaleString()}`}
              className="border-rose/30"
            />
          </div>
        </div>
      )}
    </div>
  );
}
