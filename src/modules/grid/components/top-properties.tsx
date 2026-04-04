'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Loader2, AlertTriangle, MapPin, Home, Zap, Shield } from 'lucide-react';

interface PropertyResult {
  propertyId: string;
  address: string;
  postcode: string;
  totalScore: number;
  breakdown: {
    tier: number;
    tierLabel: string;
    phaseStatus: string;
    phaseStatusLabel: string;
    hasSolar: boolean;
  };
  bedrooms: number;
  propertyType: string;
  epcRating: string;
  gardenAccess: boolean;
  phaseStatus: string;
  phaseStatusLabel: string;
  distanceToSubKm: number;
  nearestSubstationNumber: string | null;
  nearestSubstationOutfeed: string | null;
  solarNearby: number;
  batteriesNearby: number;
  generationHeadroomKva: number | null;
  transformerRatingKva: number | null;
  connectionType: string;
  connectionLabel: string;
  estimatedConnectionCost: number;
  exportLimitKw: number;
  roadCrossingRisk: string;
  grade: string;
}

interface ApiResponse {
  total: number;
  totalEpcProperties: number;
  tierCounts: { tier1: number; tier2: number; tier3: number; tier4: number; tier5: number };
  avgScore: number;
  properties: PropertyResult[];
}

function tierColor(tier: number): string {
  if (tier === 1) return 'text-emerald-400';
  if (tier === 2) return 'text-blue-400';
  if (tier === 3) return 'text-amber-400';
  if (tier === 4) return 'text-violet-400';
  return 'text-text-tertiary';
}

function tierBgColor(tier: number): string {
  if (tier === 1) return 'bg-emerald-500/10';
  if (tier === 2) return 'bg-blue-500/10';
  if (tier === 3) return 'bg-amber-500/10';
  return 'bg-bg-tertiary';
}

export function TopProperties() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTier, setShowTier] = useState<number>(0); // 0 = all

  useEffect(() => {
    fetch('/api/grid/properties?limit=200')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => setData(json))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-rose mr-3" />
        <span className="text-text-secondary">Ranking all Lancashire properties against ENWL grid data...</span>
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

  const filtered = showTier > 0
    ? data.properties.filter(p => p.breakdown.tier === showTier)
    : data.properties;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Home className="h-5 w-5 text-rose" />
          Top {data.total} Properties — Door-Knock List
        </h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          {data.totalEpcProperties} EPC properties scored against real ENWL grid data (substations, headroom, solar density, 3-phase feasibility)
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SimpleStatCard label="Tier 1 — Prime" value={String(data.tierCounts.tier1)} subtitle="3-phase + solar + large" trend="up" />
        <SimpleStatCard label="Tier 2 — Strong" value={String(data.tierCounts.tier2)} subtitle="3-phase + solar/large" />
        <SimpleStatCard label="Tier 3 — Viable" value={String(data.tierCounts.tier3)} subtitle="Cheap upgrade + solar" />
        <SimpleStatCard label="Tier 4+5" value={String(data.tierCounts.tier4 + data.tierCounts.tier5)} subtitle="Lower priority" />
        <SimpleStatCard label="Avg Score" value={String(data.avgScore)} subtitle="Out of 100" />
      </div>

      {/* Tier filter */}
      <div className="flex gap-1 rounded-lg border border-border overflow-hidden w-fit">
        {[
          { tier: 0, label: 'All' },
          { tier: 1, label: `T1 (${data.tierCounts.tier1})` },
          { tier: 2, label: `T2 (${data.tierCounts.tier2})` },
          { tier: 3, label: `T3 (${data.tierCounts.tier3})` },
          { tier: 4, label: `T4+ (${data.tierCounts.tier4 + data.tierCounts.tier5})` },
        ].map(opt => (
          <button
            key={opt.tier}
            onClick={() => setShowTier(opt.tier)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              showTier === opt.tier ? 'bg-rose text-white' : 'bg-bg-secondary text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Properties table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary text-xs text-text-tertiary uppercase">
                <th className="px-2 py-2 text-left">#</th>
                <th className="px-2 py-2 text-left">Score</th>
                <th className="px-2 py-2 text-left">Tier</th>
                <th className="px-2 py-2 text-left">Address</th>
                <th className="px-2 py-2 text-left">Postcode</th>
                <th className="px-2 py-2 text-right">Beds</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-center">EPC</th>
                <th className="px-2 py-2 text-center">Garden</th>
                <th className="px-2 py-2 text-left">Phase Status</th>
                <th className="px-2 py-2 text-right">Solar</th>
                <th className="px-2 py-2 text-right">Gen HR</th>
                <th className="px-2 py-2 text-left">Connection</th>
                <th className="px-2 py-2 text-right">Est. Cost</th>
                <th className="px-2 py-2 text-center">Road</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((prop, idx) => (
                <tr
                  key={prop.propertyId}
                  className={`border-b border-border/50 hover:bg-bg-hover transition-colors ${tierBgColor(prop.breakdown.tier)}`}
                >
                  <td className="px-2 py-1.5 text-text-tertiary text-xs">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <span className={`font-bold ${tierColor(prop.breakdown.tier)}`}>{prop.totalScore}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-xs font-medium ${tierColor(prop.breakdown.tier)}`}>T{prop.breakdown.tier}</span>
                  </td>
                  <td className="px-2 py-1.5 text-text-primary font-medium max-w-[180px] truncate text-xs">{prop.address}</td>
                  <td className="px-2 py-1.5 text-text-secondary text-xs">{prop.postcode}</td>
                  <td className="px-2 py-1.5 text-right text-text-primary text-xs">{prop.bedrooms}</td>
                  <td className="px-2 py-1.5 text-text-secondary capitalize text-xs">{prop.propertyType}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-xs font-medium ${
                      prop.epcRating === 'D' || prop.epcRating === 'E' ? 'text-emerald-400' :
                      prop.epcRating === 'C' ? 'text-blue-400' : 'text-text-tertiary'
                    }`}>{prop.epcRating}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center text-xs">
                    {prop.gardenAccess ? <span className="text-emerald-400">✓</span> : <span className="text-text-tertiary">✗</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`text-[10px] ${
                      prop.phaseStatus === 'already-3-phase' ? 'text-emerald-400' :
                      prop.phaseStatus === 'cheap-upgrade' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {prop.phaseStatus === 'already-3-phase' ? '✅ 3-ph' :
                       prop.phaseStatus === 'cheap-upgrade' ? '🟡 Upgr' : '🔴 Cplx'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-xs ${prop.solarNearby > 0 ? 'text-amber-400' : 'text-text-tertiary'}`}>
                      {prop.solarNearby > 0 ? prop.solarNearby : '—'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {prop.generationHeadroomKva != null ? (
                      <span className={`text-xs ${prop.generationHeadroomKva >= 66 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {Math.round(prop.generationHeadroomKva)}
                      </span>
                    ) : <span className="text-text-tertiary text-xs">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="text-[10px] text-text-secondary">{prop.connectionLabel.split('—')[0]?.trim()}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="text-xs text-text-primary">£{prop.estimatedConnectionCost.toLocaleString()}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`text-[10px] ${
                      prop.roadCrossingRisk === 'likely' ? 'text-red-400' :
                      prop.roadCrossingRisk === 'possible' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {prop.roadCrossingRisk === 'likely' ? '🔴' :
                       prop.roadCrossingRisk === 'possible' ? '🟡' : '✅'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-xs text-text-tertiary bg-bg-secondary/50 rounded-lg p-3 border border-border/50">
        <strong>Scoring:</strong> T1=3-phase+solar+large (85-100), T2=3-phase+solar/large (60-79), T3=cheap upgrade+solar (45-59).
        <strong> Gen HR</strong>=generation headroom at transformer (kVA, need 66 for G99).
        <strong> Est. Cost</strong>=G99 assessment + DNO connection works (road crossing adds ~£5K).
        <strong> Solar</strong>=MCS solar PV installations at nearest substation.
        All data from ENWL Open Data.
      </div>
    </div>
  );
}
