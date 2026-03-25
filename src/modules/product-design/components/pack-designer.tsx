'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, SimpleStatCard } from '@/shared/ui';
import { packDesigns, bmsOptions, sodiumIonCells } from '../data';

export function PackDesigner() {
  const [selectedPack, setSelectedPack] = useState(packDesigns[2].id); // default 12kWh
  const [selectedCell, setSelectedCell] = useState(sodiumIonCells[0].id); // default CATL
  const [selectedBms, setSelectedBms] = useState(bmsOptions[1].id); // default Orion

  const pack = packDesigns.find(p => p.id === selectedPack)!;
  const cell = sodiumIonCells.find(c => c.id === selectedCell)!;
  const bms = bmsOptions.find(b => b.id === selectedBms)!;

  const cellCostGbp = (cell.estimatedCellPriceUsdKwh * 0.79 * pack.nominalCapacityKwh) / pack.totalCells * pack.totalCells;
  const totalBom = cellCostGbp + bms.priceGbp + 280 + 85; // enclosure + wiring
  const retailPrice = Math.round(totalBom * 1.3);

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pack size */}
        <Card>
          <CardHeader><CardTitle>Pack Size</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {packDesigns.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPack(p.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedPack === p.id
                      ? 'border-rose bg-rose-subtle'
                      : 'border-border bg-bg-tertiary hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{p.name}</span>
                    <Badge variant="rose">{p.nominalCapacityKwh} kWh</Badge>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">
                    {p.totalCells} cells, {p.nominalVoltageV}V, {p.weightKg}kg
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cell source */}
        <Card>
          <CardHeader><CardTitle>Cell Source</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sodiumIonCells
                .filter(c => c.status === 'mass-production' && c.exportToUk)
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCell(c.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedCell === c.id
                        ? 'border-rose bg-rose-subtle'
                        : 'border-border bg-bg-tertiary hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary">{c.manufacturer}</span>
                      <Badge variant="info">{c.energyDensityWhKg} Wh/kg</Badge>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">
                      ~${c.estimatedCellPriceUsdKwh}/kWh, {c.cycleLife} cycles
                    </p>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* BMS */}
        <Card>
          <CardHeader><CardTitle>BMS</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bmsOptions.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBms(b.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedBms === b.id
                      ? 'border-rose bg-rose-subtle'
                      : 'border-border bg-bg-tertiary hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{b.name}</span>
                    <Badge variant={b.canBus ? 'success' : 'warning'}>
                      {b.canBus ? 'CAN' : 'UART'}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-tertiary mt-1">
                    {b.voltageRangeMin}-{b.voltageRangeMax}V/cell, {b.cellCountMax} cells max, £{b.priceGbp}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration result */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <SimpleStatCard label="Pack Capacity" value={`${pack.nominalCapacityKwh} kWh`} />
        <SimpleStatCard label="Cell Count" value={String(pack.totalCells)} subtitle={`${pack.cellsInSeries}S${pack.cellsInParallel}P`} />
        <SimpleStatCard label="System Voltage" value={`${pack.nominalVoltageV}V`} />
        <SimpleStatCard label="Max Power" value={`${pack.maxDischargeRateKw} kW`} />
        <SimpleStatCard label="Est. BOM" value={`£${Math.round(totalBom)}`} trend="down" subtitle={`£${Math.round(totalBom / pack.nominalCapacityKwh)}/kWh`} />
        <SimpleStatCard label="Est. Retail" value={`£${retailPrice}`} trend="down" subtitle="30% margin" />
      </div>

      {/* Pack details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Physical Specifications</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Dimensions</dt>
                <dd className="text-text-primary">{pack.dimensionsMm.width} x {pack.dimensionsMm.height} x {pack.dimensionsMm.depth} mm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Weight</dt>
                <dd className="text-text-primary">{pack.weightKg} kg</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">IP Rating</dt>
                <dd className="text-text-primary">{pack.ipRating}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Thermal Management</dt>
                <dd className="text-text-primary text-right max-w-[200px]">{pack.thermalManagement}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Operating Temp</dt>
                <dd className="text-text-primary">{cell.operatingTempMin}C to {cell.operatingTempMax}C</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>BMS Configuration</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">BMS</dt>
                <dd className="text-text-primary">{bms.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Protocol</dt>
                <dd className="text-text-primary">{bms.protocol}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Cell Voltage Range</dt>
                <dd className="text-text-primary">{bms.voltageRangeMin}-{bms.voltageRangeMax}V</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Max Cells</dt>
                <dd className="text-text-primary">{bms.cellCountMax}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">CAN Bus</dt>
                <dd className="text-text-primary">{bms.canBus ? 'Yes' : 'No'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Na-ion Compatible</dt>
                <dd className="text-success">{bms.sodiumIonCompatible ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
