'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Key, RefreshCw, Loader2, Download, Calendar, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import type { ProjectData } from './project-detail-page';

// ── Types ───────────────────────────────────────────────────────────────────
interface ActualsRow {
  month: string;
  importKwh: number;
  exportKwh: number;
  importCostGbp: number;
  exportRevenueGbp: number;
  netRevenueGbp: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n);

const kwh = (n: number) =>
  new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(n);

// ── Component ───────────────────────────────────────────────────────────────
interface TabActualsProps {
  project: ProjectData;
}

export function TabActuals({ project }: TabActualsProps) {
  // Credentials form state
  const [creds, setCreds] = useState({
    octopusApiKey: project.octopusApiKey ?? '',
    octopusAccountNumber: project.octopusAccountNumber ?? '',
    importMpan: project.importMpan ?? '',
    importSerialNumber: project.importSerialNumber ?? '',
    exportMpan: project.exportMpan ?? '',
    exportSerialNumber: project.exportSerialNumber ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Actuals data
  const [actuals, setActuals] = useState<ActualsRow[]>([]);
  const [loadingActuals, setLoadingActuals] = useState(false);

  const hasCredentials = !!(project.octopusApiKey && project.importMpan);

  // Fetch actuals on mount if credentials exist
  const fetchActuals = useCallback(async () => {
    if (!hasCredentials) return;
    setLoadingActuals(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/actuals`);
      if (res.ok) {
        const data = await res.json();
        setActuals(data.months ?? []);
      }
    } catch {
      // Silently fail — empty state will show
    } finally {
      setLoadingActuals(false);
    }
  }, [project.id, hasCredentials]);

  useEffect(() => {
    fetchActuals();
  }, [fetchActuals]);

  // Save credentials
  const handleSaveCredentials = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      if (res.ok) setSaveSuccess(true);
    } catch {
      // Error handling
    } finally {
      setSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Trigger sync
  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/sync`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSyncError(data.error ?? 'Sync failed');
      } else {
        // Refetch actuals after sync
        await fetchActuals();
      }
    } catch {
      setSyncError('Network error during sync');
    } finally {
      setSyncing(false);
    }
  };

  // Totals
  const totals = actuals.reduce(
    (acc, row) => ({
      importKwh: acc.importKwh + row.importKwh,
      exportKwh: acc.exportKwh + row.exportKwh,
      importCostGbp: acc.importCostGbp + row.importCostGbp,
      exportRevenueGbp: acc.exportRevenueGbp + row.exportRevenueGbp,
      netRevenueGbp: acc.netRevenueGbp + row.netRevenueGbp,
    }),
    { importKwh: 0, exportKwh: 0, importCostGbp: 0, exportRevenueGbp: 0, netRevenueGbp: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Meter Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-rose" />
            Octopus Meter Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldInput
              label="Octopus API Key"
              type="password"
              value={creds.octopusApiKey}
              onChange={(v) => setCreds((p) => ({ ...p, octopusApiKey: v }))}
              placeholder="sk_live_..."
            />
            <FieldInput
              label="Account Number"
              value={creds.octopusAccountNumber}
              onChange={(v) => setCreds((p) => ({ ...p, octopusAccountNumber: v }))}
              placeholder="A-1234ABCD"
            />
            <FieldInput
              label="Import MPAN"
              value={creds.importMpan}
              onChange={(v) => setCreds((p) => ({ ...p, importMpan: v }))}
              placeholder="1234567890123"
            />
            <FieldInput
              label="Import Serial Number"
              value={creds.importSerialNumber}
              onChange={(v) => setCreds((p) => ({ ...p, importSerialNumber: v }))}
              placeholder="12A3456789"
            />
            <FieldInput
              label="Export MPAN"
              value={creds.exportMpan}
              onChange={(v) => setCreds((p) => ({ ...p, exportMpan: v }))}
              placeholder="1234567890123"
            />
            <FieldInput
              label="Export Serial Number"
              value={creds.exportSerialNumber}
              onChange={(v) => setCreds((p) => ({ ...p, exportSerialNumber: v }))}
              placeholder="12A3456789"
            />
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSaveCredentials}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose text-white rounded-lg text-sm font-medium hover:bg-rose/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Save Credentials
            </button>
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
            {project.lastMeterSync && (
              <span className="text-xs text-text-tertiary ml-auto">
                Last sync: {new Date(project.lastMeterSync).toLocaleString('en-GB')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-rose" />
            Sync Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={syncing || !hasCredentials}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose text-white rounded-lg text-sm font-medium hover:bg-rose/90 disabled:opacity-50 transition-colors"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            {!hasCredentials && (
              <span className="text-sm text-text-tertiary">
                Enter API credentials above before syncing.
              </span>
            )}
            {syncError && (
              <span className="flex items-center gap-1.5 text-sm text-danger">
                <AlertCircle className="h-4 w-4" />
                {syncError}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Actuals Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-rose" />
            Actuals Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActuals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
            </div>
          ) : actuals.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-10 w-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-text-secondary">
                Connect your Octopus account to see actual performance
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Enter your API credentials and click Sync Now to pull meter data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-tertiary">
                    <th className="py-2 pr-4 text-left font-medium">Month</th>
                    <th className="py-2 px-3 text-right font-medium">Import kWh</th>
                    <th className="py-2 px-3 text-right font-medium">Export kWh</th>
                    <th className="py-2 px-3 text-right font-medium">Import Cost</th>
                    <th className="py-2 px-3 text-right font-medium">Export Revenue</th>
                    <th className="py-2 pl-3 text-right font-medium">Net Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {actuals.map((row) => (
                    <tr key={row.month} className="border-b border-border/50 hover:bg-bg-tertiary/50">
                      <td className="py-2 pr-4 font-medium text-text-primary">{row.month}</td>
                      <td className="py-2 px-3 text-right text-text-secondary">{kwh(row.importKwh)}</td>
                      <td className="py-2 px-3 text-right text-text-secondary">{kwh(row.exportKwh)}</td>
                      <td className="py-2 px-3 text-right text-scenario-worst">{gbp(row.importCostGbp)}</td>
                      <td className="py-2 px-3 text-right text-scenario-best">{gbp(row.exportRevenueGbp)}</td>
                      <td className={`py-2 pl-3 text-right font-medium ${row.netRevenueGbp >= 0 ? 'text-scenario-best' : 'text-danger'}`}>
                        {gbp(row.netRevenueGbp)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-2 pr-4 text-text-primary">Total</td>
                    <td className="py-2 px-3 text-right text-text-primary">{kwh(totals.importKwh)}</td>
                    <td className="py-2 px-3 text-right text-text-primary">{kwh(totals.exportKwh)}</td>
                    <td className="py-2 px-3 text-right text-scenario-worst">{gbp(totals.importCostGbp)}</td>
                    <td className="py-2 px-3 text-right text-scenario-best">{gbp(totals.exportRevenueGbp)}</td>
                    <td className={`py-2 pl-3 text-right ${totals.netRevenueGbp >= 0 ? 'text-rose' : 'text-danger'}`}>
                      {gbp(totals.netRevenueGbp)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Field input sub-component ───────────────────────────────────────────────
function FieldInput({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-tertiary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:ring-2 focus:ring-rose/40 focus:border-rose transition-colors"
      />
    </div>
  );
}
