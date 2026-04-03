'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/shared/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui/table';

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

interface ProjectTableProps {
  projects: Project[];
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
  const blue = [
    'property_assessed',
    'design_complete',
    'quote_sent',
    'quote_accepted',
    'contracted',
  ];
  const amber = [
    'g99_submitted',
    'g99_approved',
    'equipment_ordered',
    'installation_scheduled',
  ];
  const green = ['installed', 'commissioned', 'live'];
  const red = ['on_hold', 'lost'];

  if (gray.includes(status)) return 'default';
  if (blue.includes(status)) return 'info';
  if (amber.includes(status)) return 'warning';
  if (green.includes(status)) return 'success';
  if (red.includes(status)) return 'danger';
  return 'default';
}

export function ProjectTable({ projects }: ProjectTableProps) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Address</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">System</TableHead>
          <TableHead className="hidden sm:table-cell">Capacity</TableHead>
          <TableHead className="hidden lg:table-cell">Tariff</TableHead>
          <TableHead>Monthly Rev</TableHead>
          <TableHead className="hidden sm:table-cell">Payback</TableHead>
          <TableHead className="hidden lg:table-cell">Target Install</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow
            key={project.id}
            className="cursor-pointer"
            onClick={() => router.push(`/projects/${project.id}`)}
          >
            <TableCell>
              <span className="font-medium text-rose hover:underline">
                {project.address}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(project.pipelineStatus)}>
                {statusLabels[project.pipelineStatus] ?? project.pipelineStatus}
              </Badge>
            </TableCell>
            <TableCell className="hidden md:table-cell text-text-secondary text-xs max-w-[200px] truncate">
              {project.systemSummary}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {project.capacityKwh?.toLocaleString()} kWh
            </TableCell>
            <TableCell className="hidden lg:table-cell text-text-secondary">
              {project.tariff}
            </TableCell>
            <TableCell className="font-medium">
              £{project.monthlyRevenueLikely?.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {project.paybackYears?.toFixed(1)} yrs
            </TableCell>
            <TableCell className="hidden lg:table-cell text-text-secondary">
              {project.targetInstallDate
                ? new Date(project.targetInstallDate).toLocaleDateString('en-GB', {
                    month: 'short',
                    year: 'numeric',
                  })
                : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
