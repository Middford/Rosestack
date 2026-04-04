'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Badge } from '@/shared/ui/badge';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { SubstationScore } from '@/modules/grid/enwl-scoring';

interface ApiResponse {
  type: string;
  total: number;
  summary: {
    totalSolar: number;
    totalBatteries: number;
    solarBatteryGap: number;
    threePhaseCount: number;
    threePhasePercent: number;
    avgScore: number;
    excellentCount: number;
    goodCount: number;
  };
  substations: SubstationScore[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 45) return 'text-amber-400';
  return 'text-red-400';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-red-500';
}

function getHeadroomColor(loadUtil: number): string {
  if (loadUtil < 0.5) return 'text-emerald-400';
  if (loadUtil < 0.85) return 'text-amber-400';
  return 'text-red-400';
}

interface SubstationRankingProps {
  onSelectSubstation: (num: string) => void;
  selectedSubstation: string | null;
}

export function SubstationRanking({ onSelectSubstation, selectedSubstation }: SubstationRankingProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/grid/scoring?type=substations&lat=53.8&lng=-2.4&radius=15')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-text-tertiary mr-3" />
        <span className="text-text-secondary">Loading substation rankings...</span>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-amber-400 mr-3" />
        <span className="text-text-secondary">{error ?? 'No data available'}</span>
      </Card>
    );
  }

  const { substations, summary } = data;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Substation Prospecting</h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          ENWL Open Data | Ranked by solar density + 3-phase + grid headroom
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SimpleStatCard label="Substations" value={String(data.total)} subtitle="In search area" />
        <SimpleStatCard label="Solar-Battery Gap" value={String(summary.solarBatteryGap)} subtitle="Solar homes without battery" trend="up" />
        <SimpleStatCard label="3-Phase" value={`${summary.threePhasePercent}%`} subtitle={`${summary.threePhaseCount} substations`} />
        <SimpleStatCard label="Avg Score" value={String(summary.avgScore)} subtitle="Out of 100" />
        <SimpleStatCard label="Tier 1+2" value={String(summary.excellentCount + summary.goodCount)} subtitle="Prime + strong targets" trend="up" />
      </div>

      {/* Ranking table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-tertiary text-xs text-text-tertiary uppercase">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Substation</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-right">Solar</th>
                <th className="px-3 py-2 text-right">Batt</th>
                <th className="px-3 py-2 text-center">Phase</th>
                <th className="px-3 py-2 text-right">Load</th>
                <th className="px-3 py-2 text-right">Gen Headroom</th>
                <th className="px-3 py-2 text-right">Customers</th>
                <th className="px-3 py-2 text-center">Flex</th>
                <th className="px-3 py-2 text-right">HP</th>
                <th className="px-3 py-2 text-left">Grade</th>
              </tr>
            </thead>
            <tbody>
              {substations.map((sub, idx) => (
                <tr
                  key={sub.substationNumber}
                  onClick={() => onSelectSubstation(sub.substationNumber)}
                  className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-bg-hover ${
                    selectedSubstation === sub.substationNumber ? 'bg-rose/5 border-l-2 border-l-rose' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-text-tertiary">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">#{sub.substationNumber}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${getScoreColor(sub.totalScore)}`}>{sub.totalScore}</span>
                      <div className="w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className={`h-full rounded-full ${getScoreBarColor(sub.totalScore)}`} style={{ width: `${sub.totalScore}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={sub.solarInstallations > 0 ? 'text-amber-400 font-medium' : 'text-text-tertiary'}>
                      {sub.solarInstallations}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={sub.batteryInstallations === 0 ? 'text-emerald-400 font-medium' : 'text-text-tertiary'}>
                      {sub.batteryInstallations}
                      {sub.batteryInstallations === 0 && sub.solarInstallations > 0 && ' ✨'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      sub.outfeed === '415V'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-bg-tertiary text-text-tertiary'
                    }`}>
                      {sub.outfeed === '415V' ? '3-PH' : '1-PH'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {sub.loadUtilisation != null ? (
                      <span className={getHeadroomColor(sub.loadUtilisation)}>
                        {(sub.loadUtilisation * 100).toFixed(0)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {sub.generationHeadroomKva != null ? (
                      <span className={sub.generationHeadroomKva >= 66 ? 'text-emerald-400' : 'text-text-secondary'}>
                        {Math.round(sub.generationHeadroomKva)} kVA
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-text-secondary">{sub.totalCustomers}</td>
                  <td className="px-3 py-2 text-center">
                    {sub.hasFlexTender ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" /> : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-text-tertiary">{sub.heatPumpInstallations}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-medium ${
                      sub.totalScore >= 80 ? 'text-emerald-400' :
                      sub.totalScore >= 60 ? 'text-blue-400' :
                      sub.totalScore >= 45 ? 'text-amber-400' : 'text-text-tertiary'
                    }`}>
                      {sub.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
