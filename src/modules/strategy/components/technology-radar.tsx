'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/shared/ui';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getAllEmergingTech } from '../service';
import type { TechMaturity, TechRelevance } from '../types';

const maturityScore: Record<TechMaturity, number> = {
  emerging: 1,
  developing: 2,
  maturing: 3,
  mature: 4,
};

const relevanceScore: Record<TechRelevance, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const relevanceVariant: Record<TechRelevance, 'default' | 'info' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const maturityVariant: Record<TechMaturity, 'default' | 'info' | 'warning' | 'success'> = {
  emerging: 'default',
  developing: 'info',
  maturing: 'warning',
  mature: 'success',
};

export function TechnologyRadar() {
  const tech = getAllEmergingTech();

  const radarData = tech.map(t => ({
    name: t.name,
    maturity: maturityScore[t.maturity],
    relevance: relevanceScore[t.relevance],
    timeline: Math.max(1, 8 - t.timelineYears),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Technology Radar</CardTitle>
          <p className="text-sm text-text-secondary">
            Emerging technologies by maturity and relevance to RoseStack
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 4]}
                  tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
                />
                <Radar
                  name="Relevance"
                  dataKey="relevance"
                  stroke="var(--color-rose)"
                  fill="var(--color-rose)"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Maturity"
                  dataKey="maturity"
                  stroke="var(--color-info)"
                  fill="var(--color-info)"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Proximity"
                  dataKey="timeline"
                  stroke="var(--color-success)"
                  fill="var(--color-success)"
                  fillOpacity={0.1}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tech detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tech.map(t => (
          <Card key={t.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{t.name}</p>
                <p className="text-xs text-text-tertiary">{t.category}</p>
              </div>
              <Badge variant={relevanceVariant[t.relevance]}>{t.relevance}</Badge>
            </div>
            <p className="text-xs text-text-secondary">{t.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={maturityVariant[t.maturity]}>{t.maturity}</Badge>
              <span className="text-xs text-text-tertiary">~{t.timelineYears}yr to market</span>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">Key Players</p>
              <div className="flex flex-wrap gap-1">
                {t.keyPlayers.map((p, i) => (
                  <span key={i} className="text-xs bg-bg-tertiary text-text-tertiary px-1.5 py-0.5 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-2">
              <p className="text-xs text-rose-light">{t.rosestackImplication}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
