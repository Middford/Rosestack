'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Zap, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

interface Project {
  id: string;
  address: string;
  pipelineStatus: string;
  systemSummary: string;
  capacityKwh: number;
  tariff: string;
  capex: number;
  monthlyRevenueBest: number;
  monthlyRevenueLikely: number;
  monthlyRevenueWorst: number;
  paybackYears: number;
  targetInstallDate: string | null;
}

const statusLabels: Record<string, string> = {
  new_lead: 'New Lead',
  initial_contact: 'Initial Contact',
  interested: 'Interested',
  property_assessed: 'Property Assessed',
  design_complete: 'Design Complete',
  quote_sent: 'Quote Sent',
  quote_accepted: 'Quote Accepted',
  contracted: 'Contracted',
  g99_submitted: 'G99 Submitted',
  g99_approved: 'G99 Approved',
  equipment_ordered: 'Equipment Ordered',
  installation_scheduled: 'Install Scheduled',
  installed: 'Installed',
  commissioned: 'Commissioned',
  live: 'Live',
  on_hold: 'On Hold',
  lost: 'Lost',
};

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  const gray = ['new_lead', 'initial_contact', 'interested'];
  const blue = ['property_assessed', 'design_complete', 'quote_sent', 'quote_accepted', 'contracted'];
  const amber = ['g99_submitted', 'g99_approved', 'equipment_ordered', 'installation_scheduled'];
  const green = ['installed', 'commissioned', 'live'];
  const red = ['on_hold', 'lost'];

  if (gray.includes(status)) return 'default';
  if (blue.includes(status)) return 'info';
  if (amber.includes(status)) return 'warning';
  if (green.includes(status)) return 'success';
  if (red.includes(status)) return 'danger';
  return 'default';
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) {
          setError('Project not found');
          return;
        }
        const data = await res.json();
        setProject(data);
      } catch {
        setError('Failed to load project');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProject();
  }, [id]);

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <p className="text-text-secondary">Loading project...</p>
      </Card>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <Card className="p-12 flex items-center justify-center">
          <p className="text-text-secondary">{error ?? 'Project not found'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{project.address}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={getStatusVariant(project.pipelineStatus)}>
              {statusLabels[project.pipelineStatus] ?? project.pipelineStatus}
            </Badge>
            {project.targetInstallDate && (
              <span className="flex items-center gap-1 text-sm text-text-secondary">
                <Calendar className="w-3.5 h-3.5" />
                Target:{' '}
                {new Date(project.targetInstallDate).toLocaleDateString('en-GB', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/projects/${id}/edit`)}>
          Edit Project
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Monthly Revenue"
          value={`£${project.monthlyRevenueLikely?.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          subtitle="Likely case"
        />
        <SimpleStatCard
          label="CAPEX"
          value={`£${project.capex?.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
        />
        <SimpleStatCard
          label="Payback"
          value={`${project.paybackYears?.toFixed(1)} yrs`}
        />
        <SimpleStatCard
          label="Capacity"
          value={`${project.capacityKwh?.toLocaleString()} kWh`}
        />
      </div>

      {/* Details cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-rose" />
              System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Configuration</span>
              <span className="text-text-primary">{project.systemSummary}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Capacity</span>
              <span className="text-text-primary">{project.capacityKwh?.toLocaleString()} kWh</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Tariff</span>
              <span className="text-text-primary">{project.tariff}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose" />
              Revenue Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-400">Best Case</span>
              <span className="text-text-primary">
                £{project.monthlyRevenueBest?.toLocaleString()} /mo
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-400 font-medium">Likely Case</span>
              <span className="text-text-primary font-medium">
                £{project.monthlyRevenueLikely?.toLocaleString()} /mo
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-400">Worst Case</span>
              <span className="text-text-primary">
                £{project.monthlyRevenueWorst?.toLocaleString()} /mo
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
