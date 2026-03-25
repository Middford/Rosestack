'use client';

import { useState, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui';
import { batteries, inverters, solarPanels, heatPumps } from '../data';
import type { HardwareCategory, BatterySpec, InverterSpec, SolarPanelSpec, HeatPumpSpec, SortDirection } from '../types';

type SortKey = string;

export function HardwareCatalogue() {
  const [category, setCategory] = useState<HardwareCategory>('battery');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('manufacturer');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [chemFilter, setChemFilter] = useState<string>('all');
  const [iofFilter, setIofFilter] = useState<string>('all');

  const categories: { key: HardwareCategory; label: string }[] = [
    { key: 'battery', label: 'Batteries' },
    { key: 'inverter', label: 'Inverters' },
    { key: 'solar', label: 'Solar PV' },
    { key: 'heat-pump', label: 'Heat Pumps' },
  ];

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortIndicator = (key: string) =>
    sortKey === key ? (sortDir === 'asc' ? ' ^' : ' v') : '';

  const filteredBatteries = useMemo(() => {
    let items = batteries.filter(b =>
      b.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      b.model.toLowerCase().includes(search.toLowerCase())
    );
    if (chemFilter !== 'all') items = items.filter(b => b.chemistry === chemFilter);
    if (iofFilter === 'yes') items = items.filter(b => b.iofCompatible);
    if (iofFilter === 'no') items = items.filter(b => !b.iofCompatible);

    items.sort((a, b) => {
      let valA: string | number, valB: string | number;
      switch (sortKey) {
        case 'manufacturer': valA = a.manufacturer; valB = b.manufacturer; break;
        case 'capacity': valA = a.capacityPerModuleKwh; valB = b.capacityPerModuleKwh; break;
        case 'price': valA = a.wholesalePriceGbp; valB = b.wholesalePriceGbp; break;
        case 'efficiency': valA = a.roundTripEfficiency; valB = b.roundTripEfficiency; break;
        case 'warranty': valA = a.warrantyYears; valB = b.warrantyYears; break;
        case 'cycleLife': valA = a.cycleLife; valB = b.cycleLife; break;
        default: return 0;
      }
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return items;
  }, [search, sortKey, sortDir, chemFilter, iofFilter]);

  const filteredInverters = useMemo(() => {
    let items = inverters.filter(i =>
      i.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      i.model.toLowerCase().includes(search.toLowerCase())
    );
    if (iofFilter === 'yes') items = items.filter(i => i.iofCompatible);
    if (iofFilter === 'no') items = items.filter(i => !i.iofCompatible);

    items.sort((a, b) => {
      let valA: string | number, valB: string | number;
      switch (sortKey) {
        case 'manufacturer': valA = a.manufacturer; valB = b.manufacturer; break;
        case 'maxOutput': valA = a.maxOutputKw; valB = b.maxOutputKw; break;
        case 'price': valA = a.priceGbp; valB = b.priceGbp; break;
        case 'mppt': valA = a.mpptTrackers; valB = b.mpptTrackers; break;
        case 'warranty': valA = a.warrantyYears; valB = b.warrantyYears; break;
        default: return 0;
      }
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return items;
  }, [search, sortKey, sortDir, iofFilter]);

  const filteredSolar = useMemo(() => {
    let items = solarPanels.filter(s =>
      s.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      s.model.toLowerCase().includes(search.toLowerCase())
    );
    items.sort((a, b) => {
      let valA: string | number, valB: string | number;
      switch (sortKey) {
        case 'manufacturer': valA = a.manufacturer; valB = b.manufacturer; break;
        case 'wattage': valA = a.wattage; valB = b.wattage; break;
        case 'efficiency': valA = a.efficiency; valB = b.efficiency; break;
        case 'price': valA = a.priceGbp; valB = b.priceGbp; break;
        case 'warranty': valA = a.warrantyYears; valB = b.warrantyYears; break;
        default: return 0;
      }
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return items;
  }, [search, sortKey, sortDir]);

  const filteredHeatPumps = useMemo(() => {
    let items = heatPumps.filter(h =>
      h.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      h.model.toLowerCase().includes(search.toLowerCase())
    );
    items.sort((a, b) => {
      let valA: string | number, valB: string | number;
      switch (sortKey) {
        case 'manufacturer': valA = a.manufacturer; valB = b.manufacturer; break;
        case 'cop': valA = a.copRating; valB = b.copRating; break;
        case 'capacity': valA = a.heatingCapacityKw; valB = b.heatingCapacityKw; break;
        case 'price': valA = a.priceGbp; valB = b.priceGbp; break;
        case 'warranty': valA = a.warrantyYears; valB = b.warrantyYears; break;
        default: return 0;
      }
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return items;
  }, [search, sortKey, sortDir]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hardware Catalogue</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(c => (
            <Button
              key={c.key}
              variant={category === c.key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setCategory(c.key); setSortKey('manufacturer'); setSearch(''); }}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search manufacturer or model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-rose"
          />
          {category === 'battery' && (
            <select
              value={chemFilter}
              onChange={e => setChemFilter(e.target.value)}
              className="h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
            >
              <option value="all">All Chemistry</option>
              <option value="LFP">LFP</option>
              <option value="NMC">NMC</option>
              <option value="NaIon">Sodium-Ion</option>
            </select>
          )}
          {(category === 'battery' || category === 'inverter') && (
            <select
              value={iofFilter}
              onChange={e => setIofFilter(e.target.value)}
              className="h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
            >
              <option value="all">IOF: All</option>
              <option value="yes">IOF Compatible</option>
              <option value="no">Not IOF</option>
            </select>
          )}
        </div>

        {/* Tables */}
        <div className="overflow-x-auto">
          {category === 'battery' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('manufacturer')}>Manufacturer{sortIndicator('manufacturer')}</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('capacity')}>kWh/Module{sortIndicator('capacity')}</TableHead>
                  <TableHead>Chemistry</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('cycleLife')}>Cycle Life{sortIndicator('cycleLife')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('efficiency')}>RTE %{sortIndicator('efficiency')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('warranty')}>Warranty{sortIndicator('warranty')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('price')}>Price{sortIndicator('price')}</TableHead>
                  <TableHead>IOF</TableHead>
                  <TableHead>MCS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatteries.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.manufacturer}</TableCell>
                    <TableCell className="text-text-secondary text-xs">{b.model}</TableCell>
                    <TableCell>{b.capacityPerModuleKwh}</TableCell>
                    <TableCell>
                      <Badge variant={b.chemistry === 'NaIon' ? 'warning' : b.chemistry === 'LFP' ? 'success' : 'info'}>
                        {b.chemistry}
                      </Badge>
                    </TableCell>
                    <TableCell>{b.cycleLife.toLocaleString()}</TableCell>
                    <TableCell>{b.roundTripEfficiency}%</TableCell>
                    <TableCell>{b.warrantyYears}yr</TableCell>
                    <TableCell className="font-mono">{formatPrice(b.wholesalePriceGbp)}</TableCell>
                    <TableCell>{b.iofCompatible ? <Badge variant="success">Yes</Badge> : <Badge variant="default">No</Badge>}</TableCell>
                    <TableCell>{b.mcsCertified ? <Badge variant="success">Yes</Badge> : <Badge variant="danger">No</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {category === 'inverter' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('manufacturer')}>Manufacturer{sortIndicator('manufacturer')}</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('maxOutput')}>Max Output{sortIndicator('maxOutput')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('mppt')}>MPPTs{sortIndicator('mppt')}</TableHead>
                  <TableHead>3-Phase</TableHead>
                  <TableHead>Hybrid</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('warranty')}>Warranty{sortIndicator('warranty')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('price')}>Price{sortIndicator('price')}</TableHead>
                  <TableHead>IOF</TableHead>
                  <TableHead>HA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInverters.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.manufacturer}</TableCell>
                    <TableCell className="text-text-secondary text-xs">{i.model}</TableCell>
                    <TableCell>{i.maxOutputKw}kW</TableCell>
                    <TableCell>{i.mpptTrackers}</TableCell>
                    <TableCell>{i.threePhase ? <Badge variant="success">Yes</Badge> : <Badge>No</Badge>}</TableCell>
                    <TableCell>{i.hybrid ? <Badge variant="info">Yes</Badge> : <Badge>No</Badge>}</TableCell>
                    <TableCell>{i.warrantyYears}yr</TableCell>
                    <TableCell className="font-mono">{formatPrice(i.priceGbp)}</TableCell>
                    <TableCell>{i.iofCompatible ? <Badge variant="success">Yes</Badge> : <Badge>No</Badge>}</TableCell>
                    <TableCell>{i.homeAssistantCompatible ? <Badge variant="success">Yes</Badge> : <Badge>No</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {category === 'solar' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('manufacturer')}>Manufacturer{sortIndicator('manufacturer')}</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('wattage')}>Watts{sortIndicator('wattage')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('efficiency')}>Efficiency{sortIndicator('efficiency')}</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('warranty')}>Warranty{sortIndicator('warranty')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('price')}>Price{sortIndicator('price')}</TableHead>
                  <TableHead>Degradation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolar.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.manufacturer}</TableCell>
                    <TableCell className="text-text-secondary text-xs">{s.model}</TableCell>
                    <TableCell>{s.wattage}W</TableCell>
                    <TableCell>{s.efficiency}%</TableCell>
                    <TableCell>{s.weightKg}kg</TableCell>
                    <TableCell>{s.warrantyYears}yr</TableCell>
                    <TableCell className="font-mono">{formatPrice(s.priceGbp)}</TableCell>
                    <TableCell>{s.degradationRatePercent}%/yr</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {category === 'heat-pump' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('manufacturer')}>Manufacturer{sortIndicator('manufacturer')}</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('cop')}>COP{sortIndicator('cop')}</TableHead>
                  <TableHead>COP @ -5C</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('capacity')}>Capacity{sortIndicator('capacity')}</TableHead>
                  <TableHead>Noise</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('warranty')}>Warranty{sortIndicator('warranty')}</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('price')}>Price{sortIndicator('price')}</TableHead>
                  <TableHead>Smart Tariff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHeatPumps.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.manufacturer}</TableCell>
                    <TableCell className="text-text-secondary text-xs">{h.model}</TableCell>
                    <TableCell>{h.copRating}</TableCell>
                    <TableCell>{h.copAtMinus5}</TableCell>
                    <TableCell>{h.heatingCapacityKw}kW</TableCell>
                    <TableCell>{h.noiseDb}dB</TableCell>
                    <TableCell>{h.warrantyYears}yr</TableCell>
                    <TableCell className="font-mono">{formatPrice(h.priceGbp)}</TableCell>
                    <TableCell>{h.smartTariffIntegration ? <Badge variant="success">Yes</Badge> : <Badge>No</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatPrice(p: number): string {
  return `£${p.toLocaleString()}`;
}
