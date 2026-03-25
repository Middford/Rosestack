'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from 'react-leaflet';
import type { Substation } from '@/shared/types';
import { substations, flexibilityTenders } from '@/modules/grid/substation-data';
import { targetProperties } from '@/modules/grid/property-data';
import { scoreAndRankProperties } from '@/modules/grid/scoring';
import { Badge } from '@/shared/ui';
import 'leaflet/dist/leaflet.css';

const constraintColors: Record<string, string> = {
  unconstrained: '#10B981',
  approaching: '#F59E0B',
  constrained: '#EF4444',
};

function scoreToColor(score: number): string {
  if (score >= 75) return '#10B981';
  if (score >= 55) return '#3B82F6';
  if (score >= 35) return '#F59E0B';
  return '#6B7280';
}

function MapBounds() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export function GridMap() {
  const [selectedSubstation, setSelectedSubstation] = useState<Substation | null>(null);
  const [showProperties, setShowProperties] = useState(true);
  const [showFlexZones, setShowFlexZones] = useState(true);

  const scoredProperties = scoreAndRankProperties(targetProperties);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showProperties}
            onChange={e => setShowProperties(e.target.checked)}
            className="rounded border-border bg-bg-tertiary"
          />
          Property heat map
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showFlexZones}
            onChange={e => setShowFlexZones(e.target.checked)}
            className="rounded border-border bg-bg-tertiary"
          />
          Flexibility tender zones
        </label>
        <div className="flex items-center gap-4 ml-auto text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-success" /> Unconstrained
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-warning" /> Approaching
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-danger" /> Constrained
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-[var(--radius-lg)] border border-border overflow-hidden" style={{ height: 520 }}>
        <MapContainer
          center={[53.78, -2.38]}
          zoom={11}
          style={{ height: '100%', width: '100%', background: '#0F1117' }}
          scrollWheelZoom
        >
          <MapBounds />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Flexibility tender zones */}
          {showFlexZones && substations
            .filter(s => flexibilityTenders[s.id])
            .map(s => (
              <Circle
                key={`flex-${s.id}`}
                center={[s.latitude, s.longitude]}
                radius={1500}
                pathOptions={{
                  color: '#8B5CF6',
                  fillColor: '#8B5CF6',
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: '5,5',
                }}
              />
            ))
          }

          {/* Property heat dots */}
          {showProperties && scoredProperties.map(scored => (
            <CircleMarker
              key={scored.property.id}
              center={[scored.property.latitude, scored.property.longitude]}
              radius={4}
              pathOptions={{
                color: scoreToColor(scored.totalScore),
                fillColor: scoreToColor(scored.totalScore),
                fillOpacity: 0.6,
                weight: 0,
              }}
            >
              <Popup>
                <div className="text-xs space-y-1" style={{ color: '#0F1117' }}>
                  <p className="font-semibold">{scored.property.address}</p>
                  <p>{scored.property.postcode}</p>
                  <p>Score: {scored.totalScore}/100</p>
                  <p>Type: {scored.property.propertyType} ({scored.property.bedrooms} bed)</p>
                  <p>EPC: {scored.property.epcRating}</p>
                  <p>3-phase: {scored.property.threePhaseScore}%</p>
                  <p>Revenue: £{scored.estimatedRevenueRange.low}-£{scored.estimatedRevenueRange.high}/yr</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Substations */}
          {substations.map(sub => (
            <CircleMarker
              key={sub.id}
              center={[sub.latitude, sub.longitude]}
              radius={10}
              pathOptions={{
                color: constraintColors[sub.constraintStatus],
                fillColor: constraintColors[sub.constraintStatus],
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={{
                click: () => setSelectedSubstation(sub),
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[200px]" style={{ color: '#0F1117' }}>
                  <p className="font-bold text-sm">{sub.name}</p>
                  <p>Capacity: {sub.capacityMva} MVA</p>
                  <p>Load: {sub.currentLoadPercent}%</p>
                  <p>Connected homes: {sub.connectedHomes?.toLocaleString()}</p>
                  <p>Available headroom: {sub.maxNewConnections} connections</p>
                  <p>Status: {sub.constraintStatus}</p>
                  {flexibilityTenders[sub.id] && (
                    <>
                      <hr />
                      <p className="font-semibold">Flexibility Tender</p>
                      <p>Value: £{flexibilityTenders[sub.id].valuePerMwPerHour}/MW/hr</p>
                      <p>Annual: £{flexibilityTenders[sub.id].totalAnnualValue.toLocaleString()}</p>
                      <p>Window: {flexibilityTenders[sub.id].windowStart}-{flexibilityTenders[sub.id].windowEnd}</p>
                      <p>Status: {flexibilityTenders[sub.id].status}</p>
                    </>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Selected substation detail */}
      {selectedSubstation && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-text-primary">{selectedSubstation.name}</h3>
            <button
              onClick={() => setSelectedSubstation(null)}
              className="text-text-tertiary hover:text-text-primary text-sm"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-text-tertiary">Capacity</p>
              <p className="text-text-primary font-medium">{selectedSubstation.capacityMva} MVA</p>
            </div>
            <div>
              <p className="text-text-tertiary">Current Load</p>
              <p className="text-text-primary font-medium">{selectedSubstation.currentLoadPercent}%</p>
            </div>
            <div>
              <p className="text-text-tertiary">Connected Homes</p>
              <p className="text-text-primary font-medium">{selectedSubstation.connectedHomes?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-text-tertiary">Available Headroom</p>
              <p className="text-text-primary font-medium">{selectedSubstation.maxNewConnections} connections</p>
            </div>
            <div>
              <p className="text-text-tertiary">Constraint Status</p>
              <Badge variant={
                selectedSubstation.constraintStatus === 'unconstrained' ? 'success'
                : selectedSubstation.constraintStatus === 'approaching' ? 'warning'
                : 'danger'
              }>
                {selectedSubstation.constraintStatus}
              </Badge>
            </div>
            <div>
              <p className="text-text-tertiary">Flexibility Tender</p>
              <Badge variant={selectedSubstation.flexibilityTenderActive ? 'info' : 'default'}>
                {selectedSubstation.flexibilityTenderActive ? 'Active' : 'None'}
              </Badge>
            </div>
            {flexibilityTenders[selectedSubstation.id] && (
              <>
                <div>
                  <p className="text-text-tertiary">Flex Value</p>
                  <p className="text-text-primary font-medium">
                    £{flexibilityTenders[selectedSubstation.id].totalAnnualValue.toLocaleString()}/yr
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">Flex Window</p>
                  <p className="text-text-primary font-medium">
                    {flexibilityTenders[selectedSubstation.id].windowStart}-{flexibilityTenders[selectedSubstation.id].windowEnd}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
