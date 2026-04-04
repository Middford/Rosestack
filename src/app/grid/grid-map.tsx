'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Badge } from '@/shared/ui';
import 'leaflet/dist/leaflet.css';

interface SubstationMarker {
  substationNumber: string;
  latitude: number;
  longitude: number;
  outfeed: string;
  totalScore: number;
  solarInstallations: number;
  batteryInstallations: number;
  heatPumpInstallations: number;
  totalCustomers: number;
  generationHeadroomKva: number | null;
  loadUtilisation: number | null;
  grade: string;
}

function scoreToColor(score: number): string {
  if (score >= 80) return '#10B981'; // green — Tier 1 Prime
  if (score >= 60) return '#3B82F6'; // blue — Tier 2 Strong
  if (score >= 45) return '#F59E0B'; // amber — Tier 3 Viable
  if (score >= 30) return '#8B5CF6'; // purple — Tier 4 Possible
  return '#6B7280'; // grey — Tier 5
}

function phaseColor(outfeed: string): string {
  return outfeed === '415V' ? '#10B981' : '#6B7280';
}

function MapBounds() {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [map]);
  return null;
}

export function GridMap() {
  const [substations, setSubstations] = useState<SubstationMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorBy, setColorBy] = useState<'score' | 'phase' | 'solar'>('score');
  const [minTier, setMinTier] = useState<1 | 2 | 3 | 4 | 5>(1); // default: show Tier 1 only

  useEffect(() => {
    fetch('/api/grid/scoring?type=substations&lat=53.8&lng=-2.4&radius=15&limit=500')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.substations) setSubstations(data.substations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getColor(sub: SubstationMarker): string {
    if (colorBy === 'phase') return phaseColor(sub.outfeed);
    if (colorBy === 'solar') {
      if (sub.solarInstallations >= 10) return '#10B981';
      if (sub.solarInstallations >= 3) return '#3B82F6';
      if (sub.solarInstallations >= 1) return '#F59E0B';
      return '#6B7280';
    }
    return scoreToColor(sub.totalScore);
  }

  // Filter by minimum tier
  const tierMinScore = minTier === 1 ? 80 : minTier === 2 ? 60 : minTier === 3 ? 45 : minTier === 4 ? 30 : 0;
  const filtered = substations.filter(s => s.totalScore >= tierMinScore);

  function getRadius(sub: SubstationMarker): number {
    if (colorBy === 'solar') return Math.max(3, Math.min(12, sub.solarInstallations));
    return sub.totalScore >= 80 ? 7 : sub.totalScore >= 60 ? 5 : 4;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Color mode */}
        <div className="flex gap-1 rounded-lg border border-border overflow-hidden">
          {(['score', 'phase', 'solar'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setColorBy(mode)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                colorBy === mode ? 'bg-rose text-white' : 'bg-bg-secondary text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {mode === 'score' ? 'By Score' : mode === 'phase' ? 'By Phase' : 'By Solar'}
            </button>
          ))}
        </div>

        {/* Tier filter */}
        <div className="flex gap-1 rounded-lg border border-border overflow-hidden">
          {([
            { tier: 1 as const, label: 'T1 only', color: 'emerald' },
            { tier: 2 as const, label: 'T1-2', color: 'blue' },
            { tier: 3 as const, label: 'T1-3', color: 'amber' },
            { tier: 5 as const, label: 'All', color: 'gray' },
          ]).map(opt => (
            <button
              key={opt.tier}
              onClick={() => setMinTier(opt.tier)}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                minTier === opt.tier ? 'bg-rose text-white' : 'bg-bg-secondary text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {colorBy === 'score' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> T1 (80+)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> T2 (60-79)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> T3 (45-59)</span>
            </>
          )}
          {colorBy === 'phase' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 3-Phase</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> Single</span>
            </>
          )}
          {colorBy === 'solar' && (
            <>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 10+</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 3-9</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 1-2</span>
            </>
          )}
        </div>

        <span className="text-xs text-text-tertiary ml-auto">
          {loading ? 'Loading...' : `${filtered.length} of ${substations.length} substations`}
        </span>
      </div>

      {/* Map */}
      <div className="rounded-[var(--radius-lg)] border border-border overflow-hidden" style={{ height: 560 }}>
        <MapContainer
          center={[53.78, -2.38]}
          zoom={11}
          style={{ height: '100%', width: '100%', background: '#0F1117' }}
          scrollWheelZoom
        >
          <MapBounds />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {filtered.map(sub => (
            <CircleMarker
              key={sub.substationNumber}
              center={[sub.latitude, sub.longitude]}
              radius={getRadius(sub)}
              pathOptions={{
                color: getColor(sub),
                fillColor: getColor(sub),
                fillOpacity: 0.7,
                weight: sub.totalScore >= 80 ? 2 : 1,
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[220px]" style={{ color: '#0F1117' }}>
                  <p className="font-bold text-sm">Substation #{sub.substationNumber}</p>
                  <p className="font-semibold" style={{ color: scoreToColor(sub.totalScore) }}>
                    Score: {sub.totalScore}/100 — {sub.grade}
                  </p>
                  <hr />
                  <p>Phase: <strong>{sub.outfeed === '415V' ? '3-Phase (415V)' : 'Single (240V)'}</strong></p>
                  <p>Solar PV: <strong>{sub.solarInstallations}</strong> installations</p>
                  <p>Batteries: <strong>{sub.batteryInstallations}</strong> {sub.batteryInstallations === 0 ? '✨ Opportunity!' : ''}</p>
                  <p>Heat Pumps: <strong>{sub.heatPumpInstallations}</strong></p>
                  <p>Customers: <strong>{sub.totalCustomers}</strong></p>
                  {sub.generationHeadroomKva != null && (
                    <p>Gen Headroom: <strong>{Math.round(sub.generationHeadroomKva)} kVA</strong></p>
                  )}
                  {sub.loadUtilisation != null && (
                    <p>Load: <strong>{(sub.loadUtilisation * 100).toFixed(0)}%</strong></p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* The Beeches — RoseStack flagship property */}
          <CircleMarker
            center={[53.7223, -2.4855]}
            radius={10}
            pathOptions={{
              color: '#B91C4D',
              fillColor: '#B91C4D',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[250px]" style={{ color: '#0F1117' }}>
                <p className="font-bold text-sm" style={{ color: '#B91C4D' }}>🏠 The Beeches</p>
                <p className="font-semibold">RoseStack Flagship Property</p>
                <p>BB2 4LA — Ewood, Blackburn</p>
                <hr />
                <p>Nearest sub: <strong>#450990 (415V, 500kVA, 40% loaded)</strong></p>
                <p>Phase: <strong style={{ color: '#10B981' }}>✅ Already 3-phase</strong></p>
                <p>Gen headroom: <strong>490 kVA</strong> (need 66kVA for G99)</p>
                <hr />
                <p>ENWL 3-phase quote: <strong>£6,821 ex-VAT</strong> (ref 5500324786/A)</p>
                <p>Note: crosses busy road → higher construction cost</p>
                <p>Max standard capacity: 60 kVA</p>
                <hr />
                <p>Primary: Albion St (400019)</p>
                <p>Feeder: 12× 3-phase substations (all 415V)</p>
                <p>Solar nearby: 38 installations, 0 batteries</p>
                <p>Tier: <strong style={{ color: '#10B981' }}>1 — Prime</strong></p>
              </div>
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>
    </div>
  );
}
