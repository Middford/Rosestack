'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card } from '@/shared/ui/card';
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

// Substation colors — blue tones to distinguish from green properties
function scoreToColor(score: number): string {
  if (score >= 80) return '#3B82F6'; // bright blue — high score
  if (score >= 60) return '#60A5FA'; // lighter blue — good
  if (score >= 45) return '#93C5FD'; // pale blue — fair
  if (score >= 30) return '#BFDBFE'; // very pale blue — low
  return '#6B7280'; // grey — poor
}

function phaseColor(outfeed: string): string {
  return outfeed === '415V' ? '#3B82F6' : '#6B7280';
}

// Property colors — green tones to stand out from blue substations
function propertyTierColor(tier: number): string {
  if (tier === 1) return '#10B981'; // bright green — Prime
  if (tier === 2) return '#34D399'; // lighter green — Strong
  if (tier === 3) return '#F59E0B'; // amber — Viable
  if (tier === 4) return '#8B5CF6'; // purple — Possible
  return '#6B7280'; // grey — Deprioritise
}

function MapBounds() {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [map]);
  return null;
}

export function GridMap() {
  const [substations, setSubstations] = useState<SubstationMarker[]>([]);
  const [properties, setProperties] = useState<Array<{
    propertyId: string; address: string; postcode: string; totalScore: number;
    breakdown: { tier: number }; latitude?: number; longitude?: number;
    bedrooms: number; propertyType: string; phaseStatus: string;
    solarNearby: number; generationHeadroomKva: number | null;
    estimatedConnectionCost: number; epcRating: string;
    nearestSubstationOutfeed?: string | null;
  }>>([]);
  const [showProperties, setShowProperties] = useState(true);
  const [loading, setLoading] = useState(true);
  const [colorBy, setColorBy] = useState<'score' | 'phase' | 'solar'>('score');
  const [minTier, setMinTier] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Infrastructure trace state
  const [trace, setTrace] = useState<Record<string, unknown> | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  // Track which properties have been added to pipeline
  const [addedToPipeline, setAddedToProject] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  async function addToPipeline(prop: typeof properties[0]) {
    if (!prop.latitude || !prop.longitude) return;
    setAdding(prop.propertyId);
    try {
      // Geocode by full address for precise location (not postcode centroid)
      let lat = prop.latitude;
      let lng = prop.longitude;
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(prop.address + ', ' + prop.postcode)}&format=json&limit=1&countrycodes=gb`
        );
        const geoData = await geoRes.json();
        if (geoData?.[0]) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch {
        // Fall back to postcode centroid if geocoding fails
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: prop.address,
          postcode: prop.postcode,
          latitude: lat,
          longitude: lng,
          phase: prop.nearestSubstationOutfeed === '415V' ? '3-phase' : '1-phase',
          currentPhase: prop.nearestSubstationOutfeed === '415V' ? '3-phase' : '1-phase',
          plannedPhase: '3-phase',
          propertyType: 'detached',
          bedrooms: prop.bedrooms || 4,
          gardenAccess: true,
          epcRating: prop.epcRating || 'D',
          tariffName: 'flux',
          solarKwp: 25,
          exportLimitKw: 66,
          batteryId: 'bat-fogstar-64',
          batteryStacks: 4,
          inverterId: 'inv-solis-30k',
          inverterCount: 3,
          dailyConsumptionKwh: 24,
          hasHeatPump: false,
          evCount: 0,
          monthlyHomeownerPayment: 100,
          homeownerName: 'Homeowner at ' + prop.address,
        }),
      });
      if (res.ok) {
        setAddedToProject(prev => new Set(prev).add(prop.propertyId));
      }
    } catch {
      // silently fail
    } finally {
      setAdding(null);
    }
  }

  function loadTrace(lat: number, lng: number) {
    setTraceLoading(true);
    fetch(`/api/grid/trace?lat=${lat}&lng=${lng}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setTrace(data))
      .catch(() => setTrace(null))
      .finally(() => setTraceLoading(false));
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/grid/scoring?type=substations&lat=53.8&lng=-2.4&radius=15&limit=500')
        .then(res => res.ok ? res.json() : null),
      fetch('/api/grid/properties?limit=200')
        .then(res => res.ok ? res.json() : null),
    ]).then(([subData, propData]) => {
      if (subData?.substations) setSubstations(subData.substations);
      if (propData?.properties) {
        // The API doesn't return lat/lng directly — get from EPC data via the property finder
        // For now, properties don't have lat/lng in the response, so we'll use the ones
        // that do have coordinates (from the EPC seed data matched by address)
        setProperties(propData.properties);
      }
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getColor(sub: SubstationMarker): string {
    if (colorBy === 'phase') return phaseColor(sub.outfeed);
    if (colorBy === 'solar') {
      if (sub.solarInstallations >= 10) return '#3B82F6';
      if (sub.solarInstallations >= 3) return '#60A5FA';
      if (sub.solarInstallations >= 1) return '#93C5FD';
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

        {/* Full legend — substations + properties + special markers */}
        <div className="flex flex-col gap-1 text-[10px] text-text-tertiary">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-text-secondary">Substations:</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3B82F6' }} /> High score</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#60A5FA' }} /> Good</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#93C5FD' }} /> Fair</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#6B7280' }} /> Low</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-text-secondary">Properties:</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} /> T1 Prime</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#34D399' }} /> T2 Strong</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} /> T3 Viable</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B5CF6' }} /> T4 Possible</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#B91C4D' }} /> The Beeches</span>
          </div>
        </div>

        {/* Properties toggle */}
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showProperties}
            onChange={e => setShowProperties(e.target.checked)}
            className="rounded border-border"
          />
          Show Top 200 Properties
        </label>

        <span className="text-xs text-text-tertiary ml-auto">
          {loading ? 'Loading...' : `${filtered.length} substations${showProperties ? ` + ${properties.length} properties` : ''}`}
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

          {/* Trace lines: feeder substations → primary */}
          {trace && (() => {
            const t = trace as any;
            const feederPoints: [number, number][] = (t.feeder?.substations || [])
              .filter((s: any) => s.latitude && s.longitude)
              .map((s: any) => [s.latitude, s.longitude] as [number, number]);
            const primaryPoint = t.primary?.latitude && t.primary?.longitude
              ? [t.primary.latitude, t.primary.longitude] as [number, number]
              : null;
            const nearestPoint = t.nearestSubstation?.latitude && t.nearestSubstation?.longitude
              ? [t.nearestSubstation.latitude, t.nearestSubstation.longitude] as [number, number]
              : null;
            const propPoint = [t.property?.latitude, t.property?.longitude] as [number, number];

            return (
              <>
                {/* Line from property to nearest substation */}
                {nearestPoint && (
                  <Polyline positions={[propPoint, nearestPoint]} pathOptions={{ color: '#B91C4D', weight: 3, dashArray: '8,6' }} />
                )}
                {/* Lines connecting feeder substations */}
                {feederPoints.length > 1 && (
                  <Polyline positions={feederPoints} pathOptions={{ color: '#8B5CF6', weight: 1.5, opacity: 0.5 }} />
                )}
                {/* Line from nearest substation to primary */}
                {nearestPoint && primaryPoint && (
                  <Polyline positions={[nearestPoint, primaryPoint]} pathOptions={{ color: '#F59E0B', weight: 2, dashArray: '12,8' }} />
                )}
                {/* Primary substation marker */}
                {primaryPoint && (
                  <CircleMarker center={primaryPoint} radius={12} pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.9, weight: 2 }}>
                    <Popup>
                      <div className="text-xs" style={{ color: '#0F1117' }}>
                        <p className="font-bold">Primary: {t.primary?.name}</p>
                        <p>#{t.primary?.substationNumber}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}
                {/* Property marker */}
                <CircleMarker center={propPoint} radius={8} pathOptions={{ color: '#B91C4D', fillColor: '#B91C4D', fillOpacity: 1, weight: 3 }}>
                  <Popup>
                    <div className="text-xs" style={{ color: '#0F1117' }}>
                      <p className="font-bold">Selected Property</p>
                      <p>Nearest sub: #{t.nearestSubstation?.substationNumber}</p>
                    </div>
                  </Popup>
                </CircleMarker>
                {/* Feeder substation highlights */}
                {feederPoints.map((pos, i) => (
                  <CircleMarker key={`feeder-${i}`} center={pos} radius={4}
                    pathOptions={{ color: '#8B5CF6', fillColor: '#8B5CF6', fillOpacity: 0.5, weight: 1 }} />
                ))}
              </>
            );
          })()}

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
              eventHandlers={{
                click: () => loadTrace(sub.latitude, sub.longitude),
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

          {/* Top 200 Properties — door-knock targets */}
          {showProperties && properties.map(prop => {
            if (!prop.latitude || !prop.longitude) return null;
            const tier = prop.breakdown?.tier ?? 5;
            const propColor = propertyTierColor(tier);
            return (
              <CircleMarker
                key={prop.propertyId}
                center={[prop.latitude, prop.longitude]}
                radius={tier <= 2 ? 6 : 4}
                pathOptions={{
                  color: propColor,
                  fillColor: propColor,
                  fillOpacity: tier === 1 ? 0.9 : 0.6,
                  weight: tier === 1 ? 2 : 1,
                }}
                eventHandlers={{
                  click: () => loadTrace(prop.latitude!, prop.longitude!),
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[200px]" style={{ color: '#0F1117' }}>
                    <p className="font-bold text-sm">{prop.address}</p>
                    <p>{prop.postcode} — {prop.bedrooms} bed {prop.propertyType}</p>
                    <p className="font-semibold" style={{ color: propColor }}>
                      Score: {prop.totalScore} — Tier {tier}
                    </p>
                    <hr />
                    <p>Phase: {prop.phaseStatus === 'already-3-phase' ? '✅ 3-phase' : prop.phaseStatus === 'cheap-upgrade' ? '🟡 Upgrade' : '🔴 Complex'}</p>
                    <p>EPC: {prop.epcRating} | Solar nearby: {prop.solarNearby}</p>
                    {prop.generationHeadroomKva != null && (
                      <p>Gen headroom: {Math.round(prop.generationHeadroomKva)} kVA</p>
                    )}
                    <p>Est. connection: £{prop.estimatedConnectionCost.toLocaleString()}</p>
                    <hr />
                    {addedToPipeline.has(prop.propertyId) ? (
                      <p style={{ color: '#10B981', fontWeight: 'bold' }}>✓ Added to Pipeline</p>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); addToPipeline(prop); }}
                        disabled={adding === prop.propertyId}
                        style={{
                          background: '#B91C4D', color: 'white', border: 'none',
                          padding: '4px 12px', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '11px', fontWeight: 'bold', width: '100%',
                          opacity: adding === prop.propertyId ? 0.6 : 1,
                        }}
                      >
                        {adding === prop.propertyId ? 'Adding...' : '+ Add to Pipeline'}
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* The Beeches — RoseStack flagship property */}
          <CircleMarker
            center={[53.720611, -2.483972]}
            radius={10}
            pathOptions={{
              color: '#B91C4D',
              fillColor: '#B91C4D',
              fillOpacity: 1,
              weight: 3,
            }}
            eventHandlers={{
              click: () => loadTrace(53.720611, -2.483972),
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
                <p>ENWL quote: <strong>£6,821 ex-VAT</strong> (ref 5500324786/A)</p>
                <p>Note: crosses busy road → higher construction cost</p>
                <hr />
                <p>Primary: Albion St (400019) | Feeder: 12× 3-phase</p>
                <p>Solar nearby: 38 installs, 0 batteries</p>
                <p>Tier: <strong style={{ color: '#10B981' }}>1 — Prime</strong></p>
                <p className="text-[10px] italic">Click to trace infrastructure</p>
              </div>
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      {/* Trace detail panel */}
      {traceLoading && (
        <Card className="p-4 text-center text-text-tertiary text-sm">Loading infrastructure trace...</Card>
      )}
      {trace && !traceLoading && (() => {
        const t = trace as any;
        const ns = t.nearestSubstation;
        const tx = ns?.transformer;
        const rc = t.roadCrossing;
        return (
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Infrastructure Trace</h3>
              <button onClick={() => setTrace(null)} className="text-xs text-text-tertiary hover:text-text-primary">Clear</button>
            </div>

            {/* Chain: Property → Substation → Feeder → Primary */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-rose/20 text-rose font-medium">Property</span>
              <span className="text-text-tertiary">→ {ns?.distanceKm ? `${Math.round(ns.distanceKm * 1000)}m` : '?'} →</span>
              <span className={`px-2 py-1 rounded font-medium ${ns?.outfeed === '415V' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-bg-tertiary text-text-secondary'}`}>
                Sub #{ns?.substationNumber} ({ns?.outfeed})
              </span>
              <span className="text-text-tertiary">→ Feeder {t.feeder?.feederId?.slice(-3)} ({t.feeder?.phases?.total} subs) →</span>
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 font-medium">
                Primary: {t.primary?.name ?? '?'}
              </span>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {tx && (
                <>
                  <div>
                    <span className="text-text-tertiary">Transformer</span>
                    <p className="text-text-primary font-medium">{tx.ratingKva} kVA ({tx.utilisationPercent?.toFixed(0)}% loaded)</p>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Gen Headroom</span>
                    <p className={`font-medium ${tx.generationHeadroomKva >= 66 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {Math.round(tx.generationHeadroomKva)} kVA {tx.generationHeadroomKva >= 66 ? '✓ G99 OK' : '⚠ Tight'}
                    </p>
                  </div>
                </>
              )}
              <div>
                <span className="text-text-tertiary">Feeder Phase Mix</span>
                <p className="text-text-primary font-medium">
                  {t.feeder?.phases?.threePhase}× 3-ph / {t.feeder?.phases?.singlePhase}× 1-ph
                </p>
              </div>
              {ns?.lct && (
                <div>
                  <span className="text-text-tertiary">Solar / Battery / HP</span>
                  <p className="text-text-primary font-medium">
                    {ns.lct.solarInstallations ?? 0} / {ns.lct.batteryInstallations ?? 0} / {ns.lct.heatPumpInstallations ?? 0}
                  </p>
                </div>
              )}
            </div>

            {/* Road crossing risk */}
            {rc && (
              <div className={`rounded-lg px-3 py-2 text-xs border ${
                rc.risk === 'likely' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                rc.risk === 'possible' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <span className="font-semibold">
                  Road Crossing: {rc.risk === 'likely' ? '🔴 Likely' : rc.risk === 'possible' ? '🟡 Possible' : '✅ Unlikely'}
                </span>
                {' — '}{rc.note}
                {rc.estimatedExtraCost > 0 && (
                  <span className="font-semibold"> Est. extra cost: £{rc.estimatedExtraCost.toLocaleString()}</span>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="flex gap-4 text-[10px] text-text-tertiary pt-1 border-t border-border">
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-rose inline-block" style={{ borderTop: '2px dashed #B91C4D' }} /> Property → Substation</span>
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-violet-500 inline-block" /> Feeder network</span>
              <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-amber-500 inline-block" style={{ borderTop: '2px dashed #F59E0B' }} /> → Primary substation</span>
            </div>

            {/* Data disclaimer */}
            <p className="text-[9px] text-text-tertiary italic pt-1">
              Infrastructure data from ENWL Open Data (transformer ratings, headroom, voltages are real).
              Lines show network hierarchy — not physical cable routes (underground routes not published by ENWL).
              Property locations are postcode centroids — confirm exact position on site visit.
              Always confirm actual connection point with ENWL before quoting.
            </p>
          </Card>
        );
      })()}
    </div>
  );
}
