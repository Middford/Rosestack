'use client';

import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PropertyState } from './wizard-shell';

interface StepPropertyProps {
  property: PropertyState;
  setProperty: Dispatch<SetStateAction<PropertyState>>;
}

const PROPERTY_TYPES = [
  { value: 'detached', label: 'Detached' },
  { value: 'semi', label: 'Semi-Detached' },
  { value: 'terrace', label: 'Terrace' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'farm', label: 'Farm' },
  { value: 'commercial', label: 'Commercial' },
];

const labelClass = 'text-xs text-text-secondary uppercase tracking-wide';
const inputClass =
  'w-full text-sm bg-bg-secondary border border-border rounded-[var(--radius-md)] px-3 py-2 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-rose';

function update<K extends keyof PropertyState>(
  setter: Dispatch<SetStateAction<PropertyState>>,
  key: K,
  value: PropertyState[K],
) {
  setter((prev) => ({ ...prev, [key]: value }));
}

export function StepProperty({ property, setProperty }: StepPropertyProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lookup lat/long from postcodes.io when postcode changes
  const lookupPostcode = useCallback(
    (postcode: string) => {
      const trimmed = postcode.trim();
      if (trimmed.length < 5) return; // too short to be valid
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === 200 && data.result) {
            setProperty((prev) => ({
              ...prev,
              latitude: data.result.latitude,
              longitude: data.result.longitude,
            }));
          }
        } catch {
          // silently fail — user can enter manually
        }
      }, 500);
    },
    [setProperty],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Property Details</h2>

      {/* Address & Postcode */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass}>Address *</label>
          <input
            type="text"
            required
            className={inputClass}
            placeholder="123 Rose Lane, Burnley"
            value={property.address}
            onChange={(e) => update(setProperty, 'address', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Postcode *</label>
          <input
            type="text"
            required
            className={inputClass}
            placeholder="BB11 1AA"
            value={property.postcode}
            onChange={(e) => {
              const val = e.target.value;
              update(setProperty, 'postcode', val);
              lookupPostcode(val);
            }}
          />
        </div>
      </div>

      {/* Lat / Lng — auto-populated from postcode, editable */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass}>
            Latitude
            {property.latitude !== 0 && <span className="ml-1 text-emerald-400 text-[10px] normal-case">auto</span>}
          </label>
          <input
            type="number"
            step="0.0001"
            className={inputClass}
            value={property.latitude}
            onChange={(e) => update(setProperty, 'latitude', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>
            Longitude
            {property.longitude !== 0 && <span className="ml-1 text-emerald-400 text-[10px] normal-case">auto</span>}
          </label>
          <input
            type="number"
            step="0.0001"
            className={inputClass}
            value={property.longitude}
            onChange={(e) => update(setProperty, 'longitude', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Phase / Property Type / Bedrooms */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className={labelClass}>Phase</label>
          <select
            className={inputClass}
            value={property.phase}
            onChange={(e) => update(setProperty, 'phase', e.target.value as '1-phase' | '3-phase')}
          >
            <option value="1-phase">1-Phase</option>
            <option value="3-phase">3-Phase</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Property Type</label>
          <select
            className={inputClass}
            value={property.propertyType}
            onChange={(e) => update(setProperty, 'propertyType', e.target.value)}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Bedrooms</label>
          <input
            type="number"
            min={1}
            max={8}
            className={inputClass}
            value={property.bedrooms}
            onChange={(e) => update(setProperty, 'bedrooms', parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      {/* Garden access / EPC */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className={labelClass}>Garden Access</label>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => update(setProperty, 'gardenAccess', val)}
                className={`flex-1 rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors ${
                  property.gardenAccess === val
                    ? 'border-rose bg-rose/10 text-rose'
                    : 'border-border text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>EPC Rating</label>
          <input
            type="text"
            className={inputClass}
            placeholder="C"
            value={property.epcRating}
            onChange={(e) => update(setProperty, 'epcRating', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Target Install Month</label>
          <input
            type="month"
            className={inputClass}
            value={property.targetInstallDate}
            onChange={(e) => update(setProperty, 'targetInstallDate', e.target.value)}
          />
        </div>
      </div>

      {/* Homeowner info */}
      <h3 className="text-sm font-semibold text-text-secondary pt-2">Homeowner</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className={labelClass}>Name</label>
          <input
            type="text"
            className={inputClass}
            placeholder="Jane Smith"
            value={property.homeownerName}
            onChange={(e) => update(setProperty, 'homeownerName', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Email</label>
          <input
            type="email"
            className={inputClass}
            placeholder="jane@example.com"
            value={property.homeownerEmail}
            onChange={(e) => update(setProperty, 'homeownerEmail', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            className={inputClass}
            placeholder="07700 123456"
            value={property.homeownerPhone}
            onChange={(e) => update(setProperty, 'homeownerPhone', e.target.value)}
          />
        </div>
      </div>

      {/* Payment / Contract */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className={labelClass}>Monthly Homeowner Payment</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary">
              &pound;
            </span>
            <input
              type="number"
              min={0}
              className={`${inputClass} pl-7`}
              value={property.monthlyHomeownerPayment}
              onChange={(e) =>
                update(setProperty, 'monthlyHomeownerPayment', parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>ESA Contract Ref</label>
          <input
            type="text"
            className={inputClass}
            placeholder="ESA-2026-001"
            value={property.esaContractRef}
            onChange={(e) => update(setProperty, 'esaContractRef', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
