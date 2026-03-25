'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/shared/ui';
import { emailTemplates } from '../data';
import type { EmailTemplate } from '../types';
import { Mail, Eye, FileText } from 'lucide-react';

function templateBadge(type: string): { variant: 'default' | 'success' | 'warning' | 'info' | 'rose'; label: string } {
  switch (type) {
    case 'welcome': return { variant: 'success', label: 'Welcome' };
    case 'monthly-statement': return { variant: 'info', label: 'Monthly' };
    case 'annual-summary': return { variant: 'rose', label: 'Annual' };
    case 'referral-invite': return { variant: 'warning', label: 'Referral' };
    default: return { variant: 'default', label: type };
  }
}

function EmailPreview({ template }: { template: EmailTemplate }) {
  const badge = templateBadge(template.type);

  return (
    <div className="space-y-4">
      {/* Email Header */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-primary p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-text-tertiary border-b border-border pb-2">
          <span className="font-medium text-text-secondary">From:</span>
          <span>RoseStack Energy &lt;hello@rosestack.co.uk&gt;</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary border-b border-border pb-2">
          <span className="font-medium text-text-secondary">To:</span>
          <span>[homeowner.email]</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="font-medium text-text-secondary">Subject:</span>
          <span className="text-text-primary">{template.subject}</span>
        </div>
      </div>

      {/* Email Body */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-primary p-6 space-y-6">
        {/* Logo header */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose">
            <span className="text-lg font-bold text-white">R</span>
          </div>
          <span className="text-sm font-bold text-text-primary">RoseStack Energy</span>
        </div>

        {/* Sections */}
        {template.sections.map((section, i) => (
          <div key={i} className="space-y-1.5">
            <h4 className="text-sm font-semibold text-text-primary">{section.heading}</h4>
            <p className="text-sm text-text-secondary leading-relaxed">{section.content}</p>
            {section.showScenarios && (
              <div className="rounded-[var(--radius-sm)] bg-bg-secondary border border-border p-3 mt-2">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <p className="text-scenario-best font-medium">Best</p>
                    <p className="text-scenario-best text-lg font-bold">[BEST]</p>
                  </div>
                  <div>
                    <p className="text-scenario-likely font-medium">Likely</p>
                    <p className="text-scenario-likely text-lg font-bold">[LIKELY]</p>
                  </div>
                  <div>
                    <p className="text-scenario-worst font-medium">Worst</p>
                    <p className="text-scenario-worst text-lg font-bold">[WORST]</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="border-t border-border pt-4 text-xs text-text-tertiary space-y-1">
          <p>RoseStack Energy Ltd | East Lancashire</p>
          <p>hello@rosestack.co.uk | 01onal 200 300</p>
          <p>You are receiving this because you have a RoseStack energy system installed at your property.</p>
        </div>
      </div>
    </div>
  );
}

export function EmailTemplates() {
  const [selectedId, setSelectedId] = useState(emailTemplates[0].id);
  const selected = emailTemplates.find(t => t.id === selectedId)!;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Homeowner Email Templates</h2>
        <p className="text-sm text-text-secondary">Email-driven communication — no homeowner portal needed</p>
      </div>

      {/* Template Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {emailTemplates.map(t => {
          const badge = templateBadge(t.type);
          const isSelected = t.id === selectedId;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-rose bg-rose/10'
                  : 'border-border bg-bg-secondary hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-3.5 w-3.5 text-text-tertiary" />
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <p className="text-sm font-medium text-text-primary">{t.name}</p>
              <p className="text-xs text-text-tertiary mt-0.5">{t.sections.length} sections</p>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview: {selected.name}
            </CardTitle>
            <Button variant="secondary" size="sm">
              <FileText className="h-4 w-4 mr-1" /> Export HTML
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EmailPreview template={selected} />
        </CardContent>
      </Card>
    </div>
  );
}
