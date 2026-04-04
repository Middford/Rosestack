'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Loader2, AlertTriangle, MapPin } from 'lucide-react';
import type { PropertyScore } from '@/modules/grid/enwl-scoring';

interface ApiResponse {
  type: string;
  substationNumber: string;
  substationOutfeed: string | null;
  phaseStatus: string;
  phaseStatusLabel: string;
  solar: number;
  batteries: number;
  heatPumps: number;
  generationHeadroomKva: number | null;
  transformerRatingKva: number | null;
  feederHas3Phase: boolean;
  total: number;
  tierCounts: { tier1: number; tier2: number; tier3: number; tier4: number; tier5: number };
  properties: PropertyScore[];
}

function tierColor(tier: number): string {
  if (tier === 1) return 'text-emerald-400';
  if (tier === 2) return 'text-blue-400';
  if (tier === 3) return 'text-amber-400';
  if (tier === 4) return 'text-violet-400';
  return 'text-text-tertiary';
}

function tierBg(tier: number): string {
  if (tier === 1) return 'bg-emerald-500/10 border-emerald-500/30';
  if (tier === 2) return 'bg-blue-500/10 border-blue-500/30';
  if (tier === 3) return 'bg-amber-500/10 border-amber-500/30';
  if (tier === 4) return 'bg-violet-500/10 border-violet-500/30';
  return 'bg-bg-tertiary border-border';
}

interface PropertyRankingProps {
  substationNumber: string | null;
}

export function PropertyRanking({ substationNumber }: PropertyRankingProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!substationNumber) { setData(null); return; }
    setLoading(true);
    setError(null);
    fetch(`/api/grid/scoring?type=properties&substationNumber=${substationNumber}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [substationNumber]);

  if (!substationNumber) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center">
        <MapPin className="w-8 h-8 text-text-tertiary mb-3" />
        <p className="text-text-secondary">Select a substation to see target properties</p>
        <p className="text-xs text-text-tertiary mt-1">Click a row in the ranking table above</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-text-tertiary mr-3" />
        <span className="text-text-secondary">Loading properties near #{substationNumber}...</span>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-amber-400 mr-3" />
        <span className="text-text-secondary">{error ?? 'No data'}</span>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold text-text-primary">
          Properties near #{data.substationNumber}
        </h3>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          data.substationOutfeed === '415V' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-bg-tertiary text-text-tertiary'
        }`}>
          {data.substationOutfeed === '415V' ? '3-Phase' : 'Single-Phase'}
        </span>
        <span className="text-xs text-text-tertiary">
          {data.solar} solar | {data.batteries} battery | {data.heatPumps} HP
        </span>
        {data.generationHeadroomKva != null && (
          <span className="text-xs text-emerald-400">
            Gen headroom: {Math.round(data.generationHeadroomKva)} kVA
          </span>
        )}
        <span className="text-xs text-text-tertiary ml-auto">{data.phaseStatusLabel}</span>
      </div>

      {/* Tier summary */}
      <div className="flex gap-2 text-xs">
        {[1, 2, 3, 4, 5].map(t => (
          <span key={t} className={`px-2 py-1 rounded border ${tierBg(t)}`}>
            <span className={tierColor(t)}>T{t}: {(data.tierCounts as Record<string, number>)[`tier${t}`] ?? 0}</span>
          </span>
        ))}
      </div>

      {/* Properties table */}
      {data.properties.length === 0 ? (
        <Card className="p-6 text-center text-text-tertiary text-sm">
          No EPC properties found near this substation
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-tertiary text-xs text-text-tertiary uppercase">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Score</th>
                  <th className="px-3 py-2 text-left">Tier</th>
                  <th className="px-3 py-2 text-left">Address</th>
                  <th className="px-3 py-2 text-left">Postcode</th>
                  <th className="px-3 py-2 text-right">Beds</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-center">EPC</th>
                  <th className="px-3 py-2 text-center">Garden</th>
                  <th className="px-3 py-2 text-left">Phase Status</th>
                  <th className="px-3 py-2 text-right">Dist</th>
                </tr>
              </thead>
              <tbody>
                {data.properties.map((prop, idx) => (
                  <tr key={prop.propertyId} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                    <td className="px-3 py-2 text-text-tertiary">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <span className={`font-bold ${tierColor(prop.breakdown.tier)}`}>{prop.totalScore}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${tierColor(prop.breakdown.tier)}`}>
                        T{prop.breakdown.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-primary font-medium max-w-[200px] truncate">{prop.address}</td>
                    <td className="px-3 py-2 text-text-secondary">{prop.postcode}</td>
                    <td className="px-3 py-2 text-right text-text-primary">{prop.bedrooms}</td>
                    <td className="px-3 py-2 text-text-secondary capitalize">{prop.propertyType}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-medium ${
                        prop.epcRating === 'D' || prop.epcRating === 'E' ? 'text-emerald-400' :
                        prop.epcRating === 'C' ? 'text-blue-400' : 'text-text-tertiary'
                      }`}>{prop.epcRating}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {prop.gardenAccess ? '✓' : '✗'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${
                        prop.phaseStatus === 'already-3-phase' ? 'text-emerald-400' :
                        prop.phaseStatus === 'cheap-upgrade' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {prop.phaseStatus === 'already-3-phase' ? '✅ 3-phase' :
                         prop.phaseStatus === 'cheap-upgrade' ? '🟡 Upgrade' : '🔴 Complex'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-text-tertiary">{prop.distanceKm}km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
