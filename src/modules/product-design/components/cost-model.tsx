'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { costModels } from '../data';

export function CostModel() {
  const [selectedModel, setSelectedModel] = useState(costModels[1].id);
  const model = costModels.find(m => m.id === selectedModel)!;
  const incumbent = costModels[0];

  return (
    <div className="space-y-4">
      {/* Model selector */}
      <div className="flex flex-wrap gap-2">
        {costModels.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedModel(m.id)}
            className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
              selectedModel === m.id
                ? 'border-rose bg-rose-subtle text-rose-light'
                : 'border-border bg-bg-tertiary text-text-secondary hover:border-border-hover'
            }`}
          >
            <span className="font-medium">{m.name}</span>
            <span className="ml-2 text-xs opacity-75">{m.capacityKwh}kWh</span>
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total BOM</p>
          <p className="text-2xl font-bold text-text-primary mt-1">£{model.totalBomGbp.toLocaleString()}</p>
          <p className="text-xs text-text-tertiary mt-1">Bill of materials</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Retail Price</p>
          <p className="text-2xl font-bold text-text-primary mt-1">£{model.retailPriceGbp.toLocaleString()}</p>
          <p className="text-xs text-text-tertiary mt-1">{model.marginPercent}% margin</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Price per kWh</p>
          <p className="text-2xl font-bold text-success mt-1">£{model.pricePerKwhGbp}/kWh</p>
          <p className="text-xs text-text-tertiary mt-1">vs £{incumbent.pricePerKwhGbp}/kWh Sigenergy</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Savings vs Incumbent</p>
          <p className={`text-2xl font-bold mt-1 ${model.savingsPercent > 0 ? 'text-success' : 'text-text-primary'}`}>
            {model.savingsPercent}%
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            £{(model.comparisonRetailGbp - model.retailPriceGbp).toLocaleString()} saved
          </p>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">% of BOM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.lineItems.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Badge variant="info">{item.category}</Badge>
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">£{item.unitCostGbp}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">£{item.totalGbp.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {model.totalBomGbp > 0 ? Math.round((item.totalGbp / model.totalBomGbp) * 100) : 0}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="font-semibold">Total BOM</TableCell>
                <TableCell className="text-right font-bold text-lg">£{model.totalBomGbp.toLocaleString()}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="font-semibold">
                  Margin ({model.marginPercent}%)
                </TableCell>
                <TableCell className="text-right font-medium">
                  £{(model.retailPriceGbp - model.totalBomGbp).toLocaleString()}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="font-bold text-rose-light">Retail Price</TableCell>
                <TableCell className="text-right font-bold text-lg text-rose-light">
                  £{model.retailPriceGbp.toLocaleString()}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Comparison bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price Comparison (per kWh)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {costModels.map(m => {
              const maxPrice = Math.max(...costModels.map(x => x.pricePerKwhGbp));
              const width = (m.pricePerKwhGbp / maxPrice) * 100;
              const isSelected = m.id === selectedModel;
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                      {m.name}
                    </span>
                    <span className={isSelected ? 'text-rose-light font-bold' : 'text-text-secondary'}>
                      £{m.pricePerKwhGbp}/kWh
                    </span>
                  </div>
                  <div className="h-6 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        m.id === incumbent.id ? 'bg-danger' : isSelected ? 'bg-rose' : 'bg-success'
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
