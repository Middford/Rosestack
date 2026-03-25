'use client';

import { Card, CardHeader, CardTitle, Badge } from '@/shared/ui';
import type { PortfolioAlert } from '../types';

interface AlertsPanelProps {
  alerts: PortfolioAlert[];
}

const severityVariant: Record<string, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

const typeIcon: Record<string, string> = {
  underperforming: '↓',
  renewal: '↻',
  maintenance: '⚙',
  'g99-delay': '⏳',
  degradation: '↘',
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6 text-sm text-text-tertiary">
          No active alerts. All properties operating within expected parameters.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Alerts</CardTitle>
          <Badge variant="warning">{alerts.length} active</Badge>
        </div>
      </CardHeader>
      <div className="px-6 pb-6 space-y-3">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-bg-primary border border-border"
          >
            <span className="text-lg mt-0.5">{typeIcon[alert.type] || '!'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={severityVariant[alert.severity]}>
                  {alert.severity}
                </Badge>
                <span className="text-sm font-medium text-text-primary">{alert.title}</span>
              </div>
              <p className="text-xs text-text-secondary">{alert.description}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-text-tertiary">{alert.address}</span>
                <span className="text-xs text-text-tertiary">{alert.date}</span>
                <a
                  href={`/portfolio/${alert.propertyId}`}
                  className="text-xs text-rose hover:text-rose-light"
                >
                  View property
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
