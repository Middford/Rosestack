'use client';

import { useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from '@/shared/ui';
import { batteries, inverters, compatibilityMatrix } from '../data';

export function CompatibilityMatrix() {
  const matrix = useMemo(() => {
    const map = new Map<string, { compatible: boolean; iofEligible: boolean; notes?: string }>();
    compatibilityMatrix.forEach(entry => {
      map.set(`${entry.batteryId}:${entry.inverterId}`, {
        compatible: entry.compatible,
        iofEligible: entry.iofEligible,
        notes: entry.notes,
      });
    });
    return map;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compatibility Matrix</CardTitle>
        <CardDescription>
          Battery / inverter compatibility and IOF eligibility. Hover cells for details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-success/30 border border-success/50" />
            <span>Compatible + IOF Eligible</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-info/30 border border-info/50" />
            <span>Compatible (no IOF)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-bg-tertiary border border-border" />
            <span>Not Compatible</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-bg-secondary p-2 text-left text-text-secondary font-medium min-w-[140px]">
                  Battery \ Inverter
                </th>
                {inverters.map(inv => (
                  <th
                    key={inv.id}
                    className="p-2 text-center text-text-secondary font-medium min-w-[80px]"
                    style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                  >
                    {inv.manufacturer}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batteries.map(bat => (
                <tr key={bat.id} className="border-b border-border/30">
                  <td className="sticky left-0 z-10 bg-bg-secondary p-2 text-text-primary font-medium whitespace-nowrap">
                    {bat.manufacturer}
                    <span className="block text-text-tertiary font-normal">{bat.model.split(' ')[0]}</span>
                  </td>
                  {inverters.map(inv => {
                    const entry = matrix.get(`${bat.id}:${inv.id}`);
                    const isCompat = entry?.compatible ?? false;
                    const isIof = entry?.iofEligible ?? false;

                    let cellClass = 'bg-bg-tertiary/50';
                    let label = '';
                    if (isCompat && isIof) {
                      cellClass = 'bg-success/20 border border-success/40';
                      label = 'IOF';
                    } else if (isCompat) {
                      cellClass = 'bg-info/20 border border-info/40';
                      label = 'OK';
                    }

                    return (
                      <td
                        key={inv.id}
                        className={`p-2 text-center ${cellClass} rounded-sm`}
                        title={entry?.notes ?? (isCompat ? 'Compatible' : 'Not compatible')}
                      >
                        {isCompat && (
                          <span className={`text-[10px] font-bold ${isIof ? 'text-success' : 'text-info'}`}>
                            {label}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
