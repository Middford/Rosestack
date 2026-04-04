'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Loader2, AlertTriangle, Home, CheckCircle, XCircle } from 'lucide-react';

interface ScoreBreakdown {
  solarPresent: number;
  noBattery: number;
  threePhase: number;
  gridHeadroom: number;
  epcRating: number;
  gardenSize: number;
  propertyType: number;
  flexTender: number;
}

interface PropertyScore {
  address: string;
  postcode: string;
  score: number;
  grade: string;
  bedrooms: number;
  propertyType: string;
  epcRating: string;
  hasGarden: boolean;
  threePhaseScore: number;
  distanceKm: number;
  breakdown: ScoreBreakdown;
}

interface PropertyScoringResponse {
  properties: PropertyScore[];
  substationNumber: string;
  phaseType: '415V' | '240V';
  solarCount: number;
  batteryCount: number;
  heatPumpCount: number;
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 55) return 'text-blue-400';
  if (score >= 35) return 'text-amber-400';
  return 'text-red-400';
}

function getGradeBadge(grade: string) {
  switch (grade) {
    case 'Excellent':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Excellent</Badge>;
    case 'Good':
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Good</Badge>;
    case 'Fair':
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Fair</Badge>;
    default:
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Low</Badge>;
  }
}

const breakdownColors: Record<keyof ScoreBreakdown, string> = {
  solarPresent: 'bg-yellow-500',
  noBattery: 'bg-emerald-500',
  threePhase: 'bg-blue-500',
  gridHeadroom: 'bg-cyan-500',
  epcRating: 'bg-purple-500',
  gardenSize: 'bg-lime-500',
  propertyType: 'bg-orange-500',
  flexTender: 'bg-rose-500',
};

const breakdownLabels: Record<keyof ScoreBreakdown, string> = {
  solarPresent: 'Solar Present',
  noBattery: 'No Battery',
  threePhase: '3-Phase',
  gridHeadroom: 'Grid Headroom',
  epcRating: 'EPC Rating',
  gardenSize: 'Garden Size',
  propertyType: 'Property Type',
  flexTender: 'Flex Tender',
};

interface PropertyRankingProps {
  substationNumber: string | null;
}

export function PropertyRanking({ substationNumber }: PropertyRankingProps) {
  const [data, setData] = useState<PropertyScoringResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<number | null>(null);

  useEffect(() => {
    if (!substationNumber) {
      setData(null);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/grid/scoring?type=properties&substationNumber=${encodeURIComponent(substationNumber!)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load property data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [substationNumber]);

  if (!substationNumber) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <Home className="w-10 h-10 text-text-tertiary mb-3" />
        <p className="text-text-secondary font-medium">Select a substation to see target properties</p>
        <p className="text-xs text-text-tertiary mt-1">
          Click any substation in the ranking table to view scored properties nearby
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary mr-3" />
        <span className="text-text-secondary">Loading properties for substation {substationNumber}...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-amber-400 mr-3" />
        <span className="text-text-secondary">Error: {error}</span>
      </Card>
    );
  }

  if (!data) return null;

  const { properties, phaseType, solarCount, batteryCount, heatPumpCount } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-text-primary">
          Substation {substationNumber}
        </h2>
        {phaseType === '415V' ? (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">415V 3-Phase</Badge>
        ) : (
          <Badge className="bg-bg-tertiary text-text-tertiary border-border">240V Single Phase</Badge>
        )}
        <span className="text-xs text-text-tertiary">
          {solarCount} solar | {batteryCount} batteries | {heatPumpCount} heat pumps | {properties.length} properties scored
        </span>
      </div>

      {/* Properties table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary/50">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Score</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider min-w-[140px]">Breakdown</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Address</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Postcode</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Beds</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Type</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">EPC</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Garden</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">3-Ph %</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Dist</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {properties.map((prop, idx) => {
                const totalBreakdown = Object.values(prop.breakdown).reduce((a, b) => a + b, 0);
                return (
                  <tr
                    key={`${prop.address}-${idx}`}
                    className="hover:bg-bg-tertiary/40 transition-colors relative"
                    onMouseEnter={() => setHoveredProperty(idx)}
                    onMouseLeave={() => setHoveredProperty(null)}
                  >
                    <td className="px-3 py-2 text-text-tertiary font-mono text-xs">{idx + 1}</td>
                    <td className={`px-3 py-2 font-bold ${getScoreColor(prop.score)}`}>
                      {prop.score}
                    </td>
                    <td className="px-3 py-2 relative">
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-bg-tertiary">
                        {(Object.entries(prop.breakdown) as [keyof ScoreBreakdown, number][]).map(
                          ([key, value]) =>
                            value > 0 ? (
                              <div
                                key={key}
                                className={`${breakdownColors[key]} h-full`}
                                style={{ width: `${(value / totalBreakdown) * 100}%` }}
                              />
                            ) : null
                        )}
                      </div>
                      {/* Tooltip */}
                      {hoveredProperty === idx && (
                        <div className="absolute z-50 left-0 top-full mt-1 bg-bg-secondary border border-border rounded-lg shadow-xl p-3 min-w-[220px]">
                          <p className="text-xs font-semibold text-text-primary mb-2">Score Breakdown</p>
                          <div className="space-y-1">
                            {(Object.entries(prop.breakdown) as [keyof ScoreBreakdown, number][]).map(
                              ([key, value]) => (
                                <div key={key} className="flex items-center gap-2 text-xs">
                                  <div className={`w-2.5 h-2.5 rounded-sm ${breakdownColors[key]}`} />
                                  <span className="text-text-secondary flex-1">{breakdownLabels[key]}</span>
                                  <span className="text-text-primary font-medium">{value}</span>
                                </div>
                              )
                            )}
                            <div className="border-t border-border pt-1 mt-1 flex items-center gap-2 text-xs">
                              <div className="w-2.5 h-2.5" />
                              <span className="text-text-secondary flex-1 font-medium">Total</span>
                              <span className="text-text-primary font-bold">{prop.score}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-primary max-w-[200px] truncate">{prop.address}</td>
                    <td className="px-3 py-2 text-text-secondary font-mono text-xs">{prop.postcode}</td>
                    <td className="px-3 py-2 text-text-secondary">{prop.bedrooms}</td>
                    <td className="px-3 py-2 text-text-secondary capitalize">{prop.propertyType}</td>
                    <td className="px-3 py-2">
                      <Badge className="bg-bg-tertiary text-text-secondary border-border text-xs">
                        {prop.epcRating}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {prop.hasGarden ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-text-tertiary" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{prop.threePhaseScore}%</td>
                    <td className="px-3 py-2 text-text-secondary">{prop.distanceKm.toFixed(1)}km</td>
                    <td className="px-3 py-2">{getGradeBadge(prop.grade)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Breakdown legend */}
      <div className="flex flex-wrap gap-3 px-1">
        {(Object.entries(breakdownLabels) as [keyof ScoreBreakdown, string][]).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <div className={`w-2.5 h-2.5 rounded-sm ${breakdownColors[key]}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
