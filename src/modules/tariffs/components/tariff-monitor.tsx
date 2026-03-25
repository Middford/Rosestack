'use client';

import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge,
} from '@/shared/ui';
import { TARIFF_ALERTS } from '../data';

const severityConfig = {
  info: { variant: 'info' as const, label: 'Info' },
  warning: { variant: 'warning' as const, label: 'Warning' },
  critical: { variant: 'danger' as const, label: 'Critical' },
};

const typeConfig = {
  'rate-change': { label: 'Rate Change', icon: '~' },
  'new-tariff': { label: 'New Tariff', icon: '+' },
  'spread-move': { label: 'Spread Move', icon: '<>' },
  'regulatory': { label: 'Regulatory', icon: '!' },
};

export function TariffMonitor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tariff Monitor</CardTitle>
        <CardDescription>Rate changes, new tariffs, and regulatory alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {TARIFF_ALERTS.map(alert => {
            const sev = severityConfig[alert.severity];
            const typ = typeConfig[alert.type];

            return (
              <div
                key={alert.id}
                className="bg-bg-tertiary rounded-[var(--radius-md)] p-4 border-l-4"
                style={{
                  borderLeftColor: alert.severity === 'critical'
                    ? 'var(--color-danger)'
                    : alert.severity === 'warning'
                      ? 'var(--color-warning)'
                      : 'var(--color-info)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={sev.variant}>{sev.label}</Badge>
                      <Badge variant="default">{typ.label}</Badge>
                      <span className="text-xs text-text-tertiary">{alert.date}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-text-primary">{alert.title}</h4>
                    <p className="text-sm text-text-secondary mt-1">{alert.description}</p>
                  </div>
                  <div className="text-xs text-text-tertiary whitespace-nowrap">
                    {alert.tariffName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
