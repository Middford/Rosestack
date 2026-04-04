'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ProjectDetailPage } from '@/modules/projects/components/project-detail/project-detail-page';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Project not found');
        return res.json();
      })
      .then(data => setProject(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-rose" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-text-secondary">{error ?? 'Project not found'}</p>
        <Link href="/projects" className="text-rose hover:text-rose-light text-sm">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Projects
      </Link>
      <ProjectDetailPage project={project as any} />
    </div>
  );
}
