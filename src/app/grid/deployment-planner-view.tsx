'use client';

import { useState, useMemo } from 'react';
import { generateDeploymentPlan } from '@/modules/grid/deployment-planner';
import { Badge, Button, Card, CardHeader, CardTitle, CardContent, SimpleStatCard } from '@/shared/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function DeploymentPlannerView() {
  const [targetHomes, setTargetHomes] = useState(50);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const plan = useMemo(() => generateDeploymentPlan(targetHomes), [targetHomes]);

  const totalHomes = plan.phases.reduce((s, p) => s + p.homesTarget, 0);

  return (
    <div className="space-y-6">
      {/* Target selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-text-secondary">Target homes per year:</label>
        <div className="flex gap-2">
          {[25, 50, 100, 200].map(n => (
            <Button
              key={n}
              variant={targetHomes === n ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTargetHomes(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleStatCard
          label="Target Homes"
          value={targetHomes.toString()}
          subtitle={`${totalHomes} achievable`}
          trend={totalHomes >= targetHomes ? 'up' : 'down'}
        />
        <SimpleStatCard
          label="Deployment Phases"
          value={plan.phases.length.toString()}
          subtitle="Substation areas"
        />
        <SimpleStatCard
          label="Avg Property Score"
          value={`${plan.averagePropertyScore}/100`}
          subtitle={plan.averagePropertyScore >= 55 ? 'Good targets' : 'Fair targets'}
          trend={plan.averagePropertyScore >= 55 ? 'up' : 'neutral'}
        />
        <SimpleStatCard
          label="Flexibility Revenue"
          value={`£${(plan.totalFlexibilityRevenue / 1000).toFixed(0)}k`}
          subtitle="Annual from tenders"
          trend="up"
        />
      </div>

      {/* Phase breakdown */}
      <div className="space-y-3">
        {plan.phases.map(phase => (
          <Card key={phase.phase} className="p-0 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-bg-hover transition-colors text-left"
              onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
            >
              <div className="flex items-center gap-4">
                {expandedPhase === phase.phase
                  ? <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  : <ChevronRight className="h-4 w-4 text-text-tertiary" />
                }
                <div>
                  <span className="text-xs text-text-tertiary">Phase {phase.phase}</span>
                  <p className="text-sm font-semibold text-text-primary">{phase.substationName}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-text-tertiary text-xs">Homes</p>
                  <p className="font-mono text-text-primary">{phase.homesTarget}</p>
                </div>
                {phase.flexibilityValue > 0 && (
                  <div className="text-right">
                    <p className="text-text-tertiary text-xs">Flex value</p>
                    <p className="font-mono text-success">£{(phase.flexibilityValue / 1000).toFixed(0)}k/yr</p>
                  </div>
                )}
                <Badge variant={
                  phase.topProperties.length > 0 && phase.topProperties[0].score >= 60 ? 'success' : 'warning'
                }>
                  Priority {phase.phase}
                </Badge>
              </div>
            </button>

            {expandedPhase === phase.phase && (
              <div className="border-t border-border">
                <div className="p-4 bg-bg-primary">
                  <p className="text-sm text-text-secondary mb-4">{phase.rationale}</p>

                  {phase.topProperties.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead>Postcode</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="text-right">Est. Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {phase.topProperties.slice(0, 10).map(prop => (
                          <TableRow key={prop.id}>
                            <TableCell className="font-medium">{prop.address}</TableCell>
                            <TableCell className="font-mono text-sm">{prop.postcode}</TableCell>
                            <TableCell>
                              <Badge variant={
                                prop.score >= 75 ? 'success'
                                : prop.score >= 55 ? 'info'
                                : 'warning'
                              }>
                                {prop.score}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              £{prop.estimatedRevenue.low}-£{prop.estimatedRevenue.high}/yr
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {phase.topProperties.length > 10 && (
                    <p className="text-xs text-text-tertiary mt-2 text-center">
                      +{phase.topProperties.length - 10} more properties
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
