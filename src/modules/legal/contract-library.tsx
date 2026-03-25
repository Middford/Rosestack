'use client';

import { useState } from 'react';
import { Badge, Button } from '@/shared/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui';
import type { ContractTemplate, ContractStatus } from './types';
import { esaClauseDetails } from './data';

const statusConfig: Record<ContractStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  draft: { label: 'Draft', variant: 'warning' },
  review: { label: 'In Review', variant: 'info' },
  approved: { label: 'Approved', variant: 'success' },
  active: { label: 'Active', variant: 'success' },
  expired: { label: 'Expired', variant: 'danger' },
  superseded: { label: 'Superseded', variant: 'default' },
};

interface ContractLibraryProps {
  contracts: ContractTemplate[];
}

export function ContractLibrary({ contracts }: ContractLibraryProps) {
  const [expandedEsa, setExpandedEsa] = useState(false);

  const esaContract = contracts.find((c) => c.type === 'ESA');

  return (
    <div className="space-y-6">
      {/* LoA Critical Alert */}
      <Card className="border-2 border-danger bg-danger/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center">
              <span className="text-danger font-bold text-sm">!</span>
            </div>
            <div>
              <h3 className="font-semibold text-danger text-sm">
                Letter of Authority (LoA) — CRITICAL CLAUSE
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                The ESA must include a Letter of Authority granting RoseStack permission to:
              </p>
              <ul className="text-sm text-text-secondary mt-2 space-y-1 list-disc ml-4">
                <li>View the homeowner&apos;s energy account with their supplier</li>
                <li>Switch tariffs on the homeowner&apos;s behalf</li>
                <li>Communicate with the energy supplier regarding the battery system</li>
                <li>Manage G99/SEG registrations associated with the property</li>
                <li>Be notified if the homeowner changes supplier</li>
              </ul>
              <p className="text-xs text-danger mt-2 font-medium">
                This clause enables portfolio-wide tariff optimisation without homeowner involvement — the core of the business model.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ESA Template Structure */}
      {esaContract && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>{esaContract.name}</CardTitle>
                <CardDescription>
                  Version {esaContract.version} — Last modified {esaContract.lastModified}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusConfig[esaContract.status].variant}>
                  {statusConfig[esaContract.status].label}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setExpandedEsa(!expandedEsa)}
                >
                  {expandedEsa ? 'Collapse' : 'View Clauses'}
                </Button>
              </div>
            </div>
          </CardHeader>
          {expandedEsa && (
            <CardContent>
              <div className="space-y-4">
                {Object.entries(esaClauseDetails).map(([key, clause]) => {
                  const isCritical = 'isCritical' in clause && clause.isCritical;
                  return (
                    <div
                      key={key}
                      className={`rounded-[var(--radius-md)] border p-4 ${
                        isCritical
                          ? 'border-danger bg-danger/5'
                          : 'border-border bg-bg-tertiary'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-sm ${isCritical ? 'text-danger' : 'text-text-primary'}`}>
                          {clause.title}
                        </h4>
                        {isCritical && <Badge variant="danger">CRITICAL</Badge>}
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{clause.summary}</p>
                      <p className="text-xs text-text-tertiary mt-2">{clause.detail}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* All Contracts */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {contracts.map((contract) => {
              const sc = statusConfig[contract.status];
              return (
                <div
                  key={contract.id}
                  className={`rounded-[var(--radius-md)] border p-4 ${
                    contract.hasLoaClause
                      ? 'border-danger/50 bg-danger/5'
                      : 'border-border bg-bg-tertiary'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary">{contract.name}</h4>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        v{contract.version} — {contract.type}
                      </p>
                    </div>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary mt-2">{contract.description}</p>
                  {contract.keyClauses && contract.keyClauses.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-text-secondary mb-1">Key Clauses:</p>
                      <div className="flex flex-wrap gap-1">
                        {contract.keyClauses.map((clause) => {
                          const isLoa = clause.includes('LETTER OF AUTHORITY');
                          return (
                            <Badge
                              key={clause}
                              variant={isLoa ? 'danger' : 'default'}
                              className="text-[10px]"
                            >
                              {clause}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 text-xs text-text-tertiary">
                    <span>Owner: {contract.owner}</span>
                    <span>Modified: {contract.lastModified}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
