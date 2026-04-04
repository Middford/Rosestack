'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Badge } from '@/shared/ui/badge';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

interface SubstationScore {
  substationNumber: string;
  score: number;
  grade: string;
  solarInstallations: number;
  batteryInstallations: number;
  phaseType: '415V' | '240V';
  headroomPercent: number;
  customerCount: number;
  flexTenderAvailable: boolean;
  heatPumps: number;
}

interface SubstationScoringResponse {
  substations: SubstationScore[];
  summary: {
    total: number;
    solarHomesNoBattery: number;
    threePhasePercent: number;
    avgScore: number;
    excellentCount: number;
  };
  dataSource: string;
  lastSynced: string;
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 55) return 'text-blue-400';
  if (score >= 35) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 55) return 'bg-blue-500';
  if (score >= 35) return 'bg-amber-500';
  return 'bg-red-500';
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

function getHeadroomColor(percent: number): string {
  if (percent < 50) return 'text-emerald-400';
  if (percent < 85) return 'text-amber-400';
  return 'text-red-400';
}

interface SubstationRankingProps {
  onSelectSubstation: (num: string) => void;
  selectedSubstation: string | null;
}

export function SubstationRanking({ onSelectSubstation, selectedSubstation }: SubstationRankingProps) {
  const [data, setData] = useState<SubstationScoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          '/api/grid/scoring?type=substations&lat=53.8&lng=-2.4&radius=15'
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load substation data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary mr-3" />
        <span className="text-text-secondary">Loading substation rankings...</span>
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

  const { substations, summary, dataSource } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Substation Prospecting</h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          Data source: {dataSource} | Ranked by composite grid + solar + flexibility score
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SimpleStatCard
          label="Total Substations"
          value={summary.total.toLocaleString()}
          subtitle="In search area"
        />
        <SimpleStatCard
          label="Solar Homes (no battery)"
          value={summary.solarHomesNoBattery.toLocaleString()}
          subtitle="Prime targets"
          trend="up"
        />
        <SimpleStatCard
          label="3-Phase %"
          value={`${summary.threePhasePercent.toFixed(1)}%`}
          subtitle="415V substations"
        />
        <SimpleStatCard
          label="Avg Score"
          value={`${summary.avgScore.toFixed(0)}/100`}
          subtitle="Across all ranked"
        />
        <SimpleStatCard
          label="Excellent Count"
          value={summary.excellentCount.toString()}
          subtitle="Score >= 75"
          trend="up"
        />
      </div>

      {/* Ranking table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary/50">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Substation</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Score</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider min-w-[120px]">Score Bar</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Solar</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Batteries</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Phase</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Headroom</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Customers</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Flex</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">HPs</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {substations.map((sub, idx) => {
                const isSelected = selectedSubstation === sub.substationNumber;
                return (
                  <tr
                    key={sub.substationNumber}
                    onClick={() => onSelectSubstation(sub.substationNumber)}
                    className={`cursor-pointer transition-colors hover:bg-bg-tertiary/40 ${
                      isSelected
                        ? 'bg-rose/5 border-l-2 border-l-rose'
                        : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-text-tertiary font-mono text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 text-text-primary font-medium">{sub.substationNumber}</td>
                    <td className={`px-3 py-2 font-bold ${getScoreColor(sub.score)}`}>
                      {sub.score}
                    </td>
                    <td className="px-3 py-2">
                      <div className="w-full bg-bg-tertiary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getScoreBarColor(sub.score)}`}
                          style={{ width: `${sub.score}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{sub.solarInstallations}</td>
                    <td className="px-3 py-2">
                      <span className={sub.batteryInstallations === 0 ? 'text-emerald-400 font-medium' : 'text-text-secondary'}>
                        {sub.batteryInstallations}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {sub.phaseType === '415V' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">415V</Badge>
                      ) : (
                        <Badge className="bg-bg-tertiary text-text-tertiary border-border text-xs">240V</Badge>
                      )}
                    </td>
                    <td className={`px-3 py-2 ${getHeadroomColor(sub.headroomPercent)}`}>
                      {sub.headroomPercent.toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{sub.customerCount}</td>
                    <td className="px-3 py-2">
                      {sub.flexTenderAvailable && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{sub.heatPumps}</td>
                    <td className="px-3 py-2">{getGradeBadge(sub.grade)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
