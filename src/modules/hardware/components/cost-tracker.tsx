'use client';

import { useState } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui';
import { batteries, inverters, solarPanels, heatPumps } from '../data';
import type { HardwareCategory } from '../types';

interface PriceItem {
  id: string;
  manufacturer: string;
  model: string;
  priceGbp: number;
  pricePerKwh?: number;
  category: HardwareCategory;
}

function buildPriceList(): PriceItem[] {
  const items: PriceItem[] = [];

  batteries.forEach(b =>
    items.push({
      id: b.id,
      manufacturer: b.manufacturer,
      model: b.model,
      priceGbp: b.wholesalePriceGbp,
      pricePerKwh: Math.round(b.wholesalePriceGbp / b.capacityPerModuleKwh),
      category: 'battery',
    })
  );
  inverters.forEach(i =>
    items.push({
      id: i.id,
      manufacturer: i.manufacturer,
      model: i.model,
      priceGbp: i.priceGbp,
      category: 'inverter',
    })
  );
  solarPanels.forEach(s =>
    items.push({
      id: s.id,
      manufacturer: s.manufacturer,
      model: s.model,
      priceGbp: s.priceGbp,
      category: 'solar',
    })
  );
  heatPumps.forEach(h =>
    items.push({
      id: h.id,
      manufacturer: h.manufacturer,
      model: h.model,
      priceGbp: h.priceGbp,
      category: 'heat-pump',
    })
  );

  return items;
}

export function CostTracker() {
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name'>('price-asc');
  const [categoryFilter, setCategoryFilter] = useState<HardwareCategory | 'all'>('all');

  const allItems = buildPriceList();
  const filteredItems = categoryFilter === 'all'
    ? allItems
    : allItems.filter(i => i.category === categoryFilter);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'price-asc') return a.priceGbp - b.priceGbp;
    if (sortBy === 'price-desc') return b.priceGbp - a.priceGbp;
    return a.manufacturer.localeCompare(b.manufacturer);
  });

  const categoryLabels: Record<HardwareCategory, string> = {
    battery: 'Battery',
    inverter: 'Inverter',
    solar: 'Solar PV',
    'heat-pump': 'Heat Pump',
  };

  const categoryBadgeVariant: Record<HardwareCategory, 'info' | 'success' | 'warning' | 'rose'> = {
    battery: 'info',
    inverter: 'success',
    solar: 'warning',
    'heat-pump': 'rose',
  };

  // Stats
  const batteryAvg = batteries.reduce((sum, b) => sum + b.wholesalePriceGbp, 0) / batteries.length;
  const cheapestBattery = batteries.reduce((min, b) => b.wholesalePriceGbp < min.wholesalePriceGbp ? b : min, batteries[0]);
  const cheapestInverter = inverters.reduce((min, i) => i.priceGbp < min.priceGbp ? i : min, inverters[0]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Avg Battery Price</p>
          <p className="text-2xl font-bold text-text-primary mt-1">£{Math.round(batteryAvg).toLocaleString()}</p>
          <p className="text-xs text-text-tertiary mt-1">per module (wholesale)</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Best Value Battery</p>
          <p className="text-2xl font-bold text-success mt-1">{cheapestBattery.manufacturer}</p>
          <p className="text-xs text-text-tertiary mt-1">
            {cheapestBattery.model} — £{cheapestBattery.wholesalePriceGbp.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Best Value Inverter</p>
          <p className="text-2xl font-bold text-info mt-1">{cheapestInverter.manufacturer}</p>
          <p className="text-xs text-text-tertiary mt-1">
            {cheapestInverter.model} — £{cheapestInverter.priceGbp.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Price table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as HardwareCategory | 'all')}
              className="h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
            >
              <option value="all">All Categories</option>
              <option value="battery">Batteries</option>
              <option value="inverter">Inverters</option>
              <option value="solar">Solar PV</option>
              <option value="heat-pump">Heat Pumps</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="h-10 px-3 rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary text-sm"
            >
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Manufacturer A-Z</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Price/kWh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={categoryBadgeVariant[item.category]}>
                      {categoryLabels[item.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.manufacturer}</TableCell>
                  <TableCell className="text-text-secondary text-xs">{item.model}</TableCell>
                  <TableCell className="font-mono font-medium">£{item.priceGbp.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-text-secondary">
                    {item.pricePerKwh ? `£${item.pricePerKwh}/kWh` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
