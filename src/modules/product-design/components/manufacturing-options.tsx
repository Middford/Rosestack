'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, SimpleStatCard } from '@/shared/ui';
import { manufacturingOptions, importLogistics } from '../data';
import type { ManufacturingStrategy } from '../types';

const strategyColors: Record<ManufacturingStrategy, 'info' | 'success' | 'rose'> = {
  'full-china-oem': 'info',
  'china-cells-uk-assembly': 'success',
  'full-uk': 'rose',
};

export function ManufacturingOptions() {
  const [selected, setSelected] = useState<string>(manufacturingOptions[1].id);
  const option = manufacturingOptions.find(o => o.id === selected)!;

  return (
    <div className="space-y-4">
      {/* Option selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {manufacturingOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={`text-left rounded-[var(--radius-lg)] border p-4 transition-colors ${
              selected === opt.id
                ? 'border-rose bg-rose-subtle'
                : 'border-border bg-bg-secondary hover:border-border-hover'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Badge variant={strategyColors[opt.strategy]}>{opt.strategy}</Badge>
              <span className="text-lg font-bold text-text-primary">£{opt.estimatedUnitCostGbp.toLocaleString()}</span>
            </div>
            <h3 className="font-semibold text-text-primary">{opt.name}</h3>
            <p className="text-xs text-text-secondary mt-1">{opt.description}</p>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SimpleStatCard label="Unit Cost (12kWh)" value={`£${option.estimatedUnitCostGbp.toLocaleString()}`} />
        <SimpleStatCard label="Setup Cost" value={`£${option.setupCostGbp.toLocaleString()}`} />
        <SimpleStatCard label="Lead Time" value={`${option.leadTimeWeeks} weeks`} />
        <SimpleStatCard label="Min Order" value={`${option.minOrderUnits} units`} />
        <SimpleStatCard
          label="Grant Eligible"
          value={option.grantEligibility ? 'Yes' : 'No'}
          trend={option.grantEligibility ? 'up' : 'down'}
        />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Advantages</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {option.advantages.map((adv, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-success mt-0.5 shrink-0">+</span>
                  <span className="text-text-primary">{adv}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Risks</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {option.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-danger mt-0.5 shrink-0">-</span>
                  <span className="text-text-primary">{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Additional details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Supply Chain</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Cell Source</dt>
                <dd className="text-text-primary text-right max-w-[200px]">{option.cellSource}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Assembly Location</dt>
                <dd className="text-text-primary">{option.assemblyLocation}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Quality Control</dt>
                <dd className="text-text-primary text-right max-w-[200px]">{option.qualityControl}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Brand Value</dt>
                <dd className="text-text-primary text-right max-w-[200px]">{option.brandValue}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {option.grantEligibility && (
          <Card>
            <CardHeader><CardTitle>Available Grants</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {option.grantsAvailable.map((grant, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-success mt-0.5 shrink-0">£</span>
                    <span className="text-text-primary">{grant}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Import logistics */}
      <Card>
        <CardHeader><CardTitle>Import Logistics (China to UK)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">Shipping Details</h4>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Route</dt>
                  <dd className="text-text-primary text-right max-w-[250px]">{importLogistics.route}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Cost per unit</dt>
                  <dd className="text-text-primary">£{importLogistics.shippingCostPerUnit}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Customs Duty</dt>
                  <dd className="text-text-primary">{importLogistics.customsDutyPercent}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">VAT</dt>
                  <dd className="text-text-primary">{importLogistics.vatPercent}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Transit Time</dt>
                  <dd className="text-text-primary">{importLogistics.transitDays} days</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">Required Documentation</h4>
              <ul className="space-y-1 text-sm">
                {importLogistics.certifications.map((cert, i) => (
                  <li key={i} className="text-text-secondary">{cert}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-l-4 border-l-rose">
        <CardContent className="py-4">
          <h4 className="font-semibold text-text-primary mb-2">Recommendation: Chinese Cells + UK Assembly</h4>
          <p className="text-sm text-text-secondary">
            Option B (Chinese cells + Lancashire assembly) provides the best balance of cost, quality control, brand value,
            and grant eligibility. Unit cost is 30% higher than full China OEM, but offset by: Battery Innovation Programme
            grants (up to 70% of eligible costs), "Made in Lancashire" brand value, full QC control, IP protection, and
            community/council support. Setup cost of ~£150K is achievable within Year 3-4 timeline.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
