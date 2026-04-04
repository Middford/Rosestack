'use client';

import {
  Battery, Zap, Sun, Gauge, Home, User, Mail, Phone,
  MapPin, Building2, Thermometer, Car,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Badge } from '@/shared/ui/badge';
import type { ProjectData } from './project-detail-page';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined, opts?: Intl.NumberFormatOptions) =>
  n != null ? new Intl.NumberFormat('en-GB', opts).format(n) : '--';

const gbp = (n: number | null | undefined) =>
  fmt(n, { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

function estimateMonthlyRevenue(capacityKwh: number, tariff: string | null): number {
  // Simplified daily rates per 322 kWh reference system
  const dailyPer322: Record<string, number> = { iof: 45, flux: 30, agile: 11 };
  const key = (tariff ?? 'flux').toLowerCase().replace(/[^a-z]/g, '');
  const daily = dailyPer322[key] ?? 30;
  return Math.round((daily * (capacityKwh / 322)) * 30.44);
}

function estimatePaybackMonths(capex: number, monthlyRevenue: number): number {
  if (monthlyRevenue <= 0) return Infinity;
  return Math.ceil(capex / monthlyRevenue);
}

// ── Component ───────────────────────────────────────────────────────────────
interface TabOverviewProps {
  project: ProjectData;
}

export function TabOverview({ project }: TabOverviewProps) {
  const sys = project.system;
  const lead = project.lead;
  const capex = sys?.installCost ?? 0;
  const monthlyRev = sys ? estimateMonthlyRevenue(sys.totalCapacityKwh, project.tariffName) : 0;
  const paybackMonths = estimatePaybackMonths(capex, monthlyRev);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Battery Capacity"
          value={sys ? `${fmt(sys.totalCapacityKwh)} kWh` : '--'}
          subtitle={sys ? sys.batteryChemistry : undefined}
        />
        <SimpleStatCard
          label="Total CAPEX"
          value={gbp(capex)}
          subtitle={sys ? `${gbp(sys.annualMaintenanceCost)}/yr maintenance` : undefined}
        />
        <SimpleStatCard
          label="Monthly Revenue (Likely)"
          value={gbp(monthlyRev)}
          subtitle={`${gbp(monthlyRev * 12)}/yr`}
          trend="up"
        />
        <SimpleStatCard
          label="Payback Period"
          value={paybackMonths === Infinity ? '--' : `${Math.round(paybackMonths / 12 * 10) / 10} yrs`}
          subtitle={paybackMonths === Infinity ? undefined : `${paybackMonths} months`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5 text-rose" />
              System Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DetailRow icon={<Battery className="h-4 w-4" />} label="Capacity" value={sys ? `${fmt(sys.totalCapacityKwh)} kWh` : '--'} />
              <DetailRow icon={<Zap className="h-4 w-4" />} label="Inverter" value={sys?.inverterModel ?? '--'} />
              <DetailRow icon={<Gauge className="h-4 w-4" />} label="Charge Rate" value={sys ? `${fmt(sys.maxChargeRateKw)} kW` : '--'} />
              <DetailRow icon={<Gauge className="h-4 w-4" />} label="Discharge Rate" value={sys ? `${fmt(sys.maxDischargeRateKw)} kW` : '--'} />
              <DetailRow icon={<Sun className="h-4 w-4" />} label="Solar PV" value={project.solarKwp ? `${fmt(project.solarKwp)} kWp` : 'None'} />
              <DetailRow icon={<Zap className="h-4 w-4" />} label="Export Limit" value={project.exportLimitKw ? `${fmt(project.exportLimitKw)} kW` : '--'} />
              <DetailRow icon={<Zap className="h-4 w-4" />} label="Tariff" value={project.tariffName ?? '--'} />
              <DetailRow icon={<Battery className="h-4 w-4" />} label="Efficiency" value={sys ? `${fmt(sys.roundTripEfficiency)}%` : '--'} />
            </dl>
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-rose" />
              Property Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address" value={project.address} />
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="Postcode" value={project.postcode} />
              <DetailRow icon={<Zap className="h-4 w-4" />} label="Phase" value={project.phase} />
              <DetailRow icon={<Building2 className="h-4 w-4" />} label="Property Type" value={project.propertyType ?? '--'} />
              <DetailRow icon={<Home className="h-4 w-4" />} label="Bedrooms" value={project.bedrooms != null ? String(project.bedrooms) : '--'} />
              <DetailRow icon={<Thermometer className="h-4 w-4" />} label="EPC Rating" value={project.epcRating ?? '--'} />
              <DetailRow icon={<Thermometer className="h-4 w-4" />} label="Heat Pump" value={project.hasHeatPump ? 'Yes' : 'No'} />
              <DetailRow icon={<Car className="h-4 w-4" />} label="EVs" value={String(project.evCount ?? 0)} />
            </dl>

            {/* Homeowner info */}
            {lead && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Homeowner</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-text-primary">
                    <User className="h-4 w-4 text-text-tertiary" />
                    {lead.name}
                    <Badge variant={lead.pipelineStatus === 'live' ? 'success' : 'default'} className="ml-auto">
                      {lead.pipelineStatus.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Mail className="h-4 w-4 text-text-tertiary" />
                      {lead.email}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Phone className="h-4 w-4 text-text-tertiary" />
                      {lead.phone}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Detail row sub-component ────────────────────────────────────────────────
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="col-span-1">
      <dt className="flex items-center gap-1.5 text-text-tertiary">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-text-primary">{value}</dd>
    </div>
  );
}
