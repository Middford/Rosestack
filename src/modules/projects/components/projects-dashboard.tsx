'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FolderOpen } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { SimpleStatCard } from '@/shared/ui/stat-card';
import { ProjectTable } from './project-table';
import { CashflowModel } from './cashflow-model';

interface Project {
  id: string;
  address: string;
  pipelineStatus: string;
  systemSummary: string;
  capacityKwh: number;
  tariff: string;
  monthlyRevenueLikely: number;
  paybackYears: number;
  targetInstallDate: string | null;
}

type Tab = 'projects' | 'cashflow';

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('projects');

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects ?? data);
        }
      } catch {
        // silently fail — empty state will show
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const liveStatuses = ['installed', 'commissioned', 'live'];
  const liveProjects = projects.filter((p) => liveStatuses.includes(p.pipelineStatus));
  const totalCapacity = projects.reduce((sum, p) => sum + (p.capacityKwh ?? 0), 0);
  const totalMonthlyRevenue = projects.reduce((sum, p) => sum + (p.monthlyRevenueLikely ?? 0), 0);
  const avgPayback =
    projects.length > 0
      ? projects.reduce((sum, p) => sum + (p.paybackYears ?? 0), 0) / projects.length
      : 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'projects', label: 'Projects' },
    { key: 'cashflow', label: 'Cashflow Model' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-rose'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose rounded-t" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
            <Link href="/projects/add">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </Link>
          </div>

          {/* Summary stats */}
          {projects.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <SimpleStatCard
                label="Total Projects"
                value={String(projects.length)}
              />
              <SimpleStatCard
                label="Live Projects"
                value={String(liveProjects.length)}
                subtitle={`${projects.length > 0 ? Math.round((liveProjects.length / projects.length) * 100) : 0}% of total`}
              />
              <SimpleStatCard
                label="Total Capacity"
                value={`${totalCapacity.toLocaleString()} kWh`}
              />
              <SimpleStatCard
                label="Monthly Revenue"
                value={`£${totalMonthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                subtitle="Likely case"
              />
              <SimpleStatCard
                label="Avg Payback"
                value={`${avgPayback.toFixed(1)} yrs`}
              />
            </div>
          )}

          {/* Table or empty state */}
          {loading ? (
            <Card className="p-12 flex items-center justify-center">
              <p className="text-text-secondary">Loading projects...</p>
            </Card>
          ) : projects.length > 0 ? (
            <ProjectTable projects={projects} />
          ) : (
            <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <FolderOpen className="w-12 h-12 text-text-tertiary" />
              <div>
                <p className="text-lg font-semibold text-text-primary">No projects yet</p>
                <p className="text-sm text-text-secondary mt-1">
                  Start building your fleet by adding the first project.
                </p>
              </div>
              <Link href="/projects/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first project
                </Button>
              </Link>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'cashflow' && <CashflowModel />}
    </div>
  );
}
