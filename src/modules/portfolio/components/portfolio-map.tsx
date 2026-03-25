'use client';

import { Card, CardHeader, CardTitle, Badge } from '@/shared/ui';
import { formatGbp } from '@/shared/utils/scenarios';
import type { PortfolioProperty } from '../types';
import type { HomeStatus } from '@/shared/types';

interface PortfolioMapProps {
  properties: PortfolioProperty[];
}

const statusColour: Record<HomeStatus, string> = {
  live: '#10B981',
  installed: '#F59E0B',
  contracted: '#3B82F6',
  qualified: '#6B7280',
  prospect: '#9CA3AF',
  churned: '#EF4444',
};

export function PortfolioMap({ properties }: PortfolioMapProps) {
  // SVG-based map visualization (Leaflet would require dynamic import)
  // Center on East Lancashire: ~53.76, -2.38
  const centerLat = 53.76;
  const centerLng = -2.38;
  const scale = 800; // pixels per degree

  function toSvg(lat: number, lng: number): { x: number; y: number } {
    return {
      x: 200 + (lng - centerLng) * scale,
      y: 200 - (lat - centerLat) * scale,
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Map</CardTitle>
      </CardHeader>
      <div className="relative">
        <svg viewBox="0 0 400 400" className="w-full h-80 bg-bg-primary rounded-[var(--radius-md)]">
          {/* Grid lines */}
          {[...Array(9)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1="0" y1={i * 50}
              x2="400" y2={i * 50}
              stroke="var(--color-border)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
          {[...Array(9)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 50} y1="0"
              x2={i * 50} y2="400"
              stroke="var(--color-border)"
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}

          {/* Area label */}
          <text x="200" y="20" textAnchor="middle" fill="var(--color-text-tertiary)" fontSize="10">
            East Lancashire (BB postcodes)
          </text>

          {/* Property pins */}
          {properties.map(p => {
            const pos = toSvg(p.latitude, p.longitude);
            const colour = statusColour[p.status];
            return (
              <g key={p.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={Math.max(8, p.system.totalCapacityKwh / 15)}
                  fill={colour}
                  opacity={0.8}
                  stroke="white"
                  strokeWidth="1.5"
                />
                <text
                  x={pos.x}
                  y={pos.y + Math.max(8, p.system.totalCapacityKwh / 15) + 12}
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                  fontSize="8"
                >
                  {p.postcode}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-2">
          {(['live', 'installed', 'contracted'] as HomeStatus[]).map(status => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColour[status] }}
              />
              <span className="text-xs text-text-secondary capitalize">{status}</span>
            </div>
          ))}
          <span className="text-xs text-text-tertiary ml-auto">Pin size = system capacity</span>
        </div>
      </div>
    </Card>
  );
}
