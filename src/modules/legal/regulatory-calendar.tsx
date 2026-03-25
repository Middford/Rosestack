'use client';

import { Badge } from '@/shared/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import type { RegulatoryEvent, CalendarEventType } from './types';

const typeConfig: Record<CalendarEventType, { label: string; variant: 'danger' | 'warning' | 'info' | 'success' | 'default' | 'rose' }> = {
  deadline: { label: 'Deadline', variant: 'danger' },
  renewal: { label: 'Renewal', variant: 'warning' },
  consultation: { label: 'Consultation', variant: 'info' },
  audit: { label: 'Audit', variant: 'rose' },
  review: { label: 'Review', variant: 'default' },
  filing: { label: 'Filing', variant: 'warning' },
};

function getDaysUntil(dateStr: string): number {
  const today = new Date('2026-03-25');
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyClass(days: number, completed: boolean): string {
  if (completed) return 'text-text-tertiary';
  if (days < 0) return 'text-danger font-bold';
  if (days <= 14) return 'text-danger';
  if (days <= 30) return 'text-warning';
  return 'text-text-primary';
}

interface RegulatoryCalendarProps {
  events: RegulatoryEvent[];
}

export function RegulatoryCalendar({ events }: RegulatoryCalendarProps) {
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter((e) => !e.completed);
  const overdue = upcoming.filter((e) => getDaysUntil(e.date) < 0).length;
  const next30Days = upcoming.filter((e) => {
    const d = getDaysUntil(e.date);
    return d >= 0 && d <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-text-secondary">Total Events</p>
          <p className="text-2xl font-bold text-text-primary">{events.length}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-danger">
          <p className="text-sm text-text-secondary">Overdue</p>
          <p className="text-2xl font-bold text-danger">{overdue}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-warning">
          <p className="text-sm text-text-secondary">Next 30 Days</p>
          <p className="text-2xl font-bold text-warning">{next30Days}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-success">
          <p className="text-sm text-text-secondary">Completed</p>
          <p className="text-2xl font-bold text-success">
            {events.filter((e) => e.completed).length}
          </p>
        </Card>
      </div>

      {/* Timeline View */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines & Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcoming.map((event) => {
              const days = getDaysUntil(event.date);
              const tc = typeConfig[event.type];
              const urgency = getUrgencyClass(days, event.completed);
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-4 rounded-[var(--radius-md)] border p-4 ${
                    days < 0
                      ? 'border-danger/50 bg-danger/5'
                      : days <= 14
                        ? 'border-warning/50 bg-warning/5'
                        : 'border-border bg-bg-tertiary'
                  }`}
                >
                  <div className="shrink-0 text-center min-w-[60px]">
                    <p className={`text-lg font-bold ${urgency}`}>
                      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                    </p>
                    <p className="text-[10px] text-text-tertiary">
                      {new Date(event.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm text-text-primary">{event.title}</h4>
                      <Badge variant={tc.variant}>{tc.label}</Badge>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">{event.description}</p>
                    <p className="text-xs text-text-tertiary mt-1">Owner: {event.owner}</p>
                  </div>
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <p className="text-center text-text-tertiary py-8">No upcoming events.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Regulatory Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Days</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((event) => {
                const days = getDaysUntil(event.date);
                const tc = typeConfig[event.type];
                return (
                  <TableRow key={event.id} className={event.completed ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{event.title}</p>
                        <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
                          {event.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tc.variant}>{tc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{event.date}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={getUrgencyClass(days, event.completed)}>
                        {event.completed
                          ? 'Done'
                          : days < 0
                            ? `${Math.abs(days)}d overdue`
                            : `${days}d`}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-text-secondary">
                      {event.owner}
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.completed ? 'success' : 'warning'}>
                        {event.completed ? 'Complete' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
