'use client';

import { Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/ui';
import { inverterOptions } from '../data';
import type { InverterCompatibility as InvCompat } from '../types';

const compatColors: Record<InvCompat, 'success' | 'warning' | 'info' | 'danger'> = {
  native: 'success',
  compatible: 'success',
  possible: 'warning',
  incompatible: 'danger',
};

const compatLabels: Record<InvCompat, string> = {
  native: 'Native Na-ion',
  compatible: 'Compatible',
  possible: 'Possible',
  incompatible: 'Incompatible',
};

function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return <Badge variant={value ? 'success' : 'danger'}>{value ? trueLabel : falseLabel}</Badge>;
}

export function InverterCompatibility() {
  const sorted = [...inverterOptions].sort((a, b) => {
    const order: InvCompat[] = ['native', 'compatible', 'possible', 'incompatible'];
    return order.indexOf(a.sodiumIonCompatibility) - order.indexOf(b.sodiumIonCompatibility);
  });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sorted
          .filter(i => i.sodiumIonCompatibility !== 'incompatible')
          .slice(0, 3)
          .map(inv => (
            <Card key={inv.id} className="border-l-4 border-l-success">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{inv.manufacturer} {inv.model}</CardTitle>
                  <Badge variant={compatColors[inv.sodiumIonCompatibility]}>
                    {compatLabels[inv.sodiumIonCompatibility]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Output</dt>
                    <dd className="text-text-primary">{inv.maxOutputKw} kW</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Price</dt>
                    <dd className="text-text-primary">£{inv.priceGbp.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">3rd Party Battery</dt>
                    <dd><BoolBadge value={inv.thirdPartyBattery} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">CAN BMS</dt>
                    <dd><BoolBadge value={inv.canBmsProtocol} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">IOF</dt>
                    <dd><BoolBadge value={inv.iofCompatible} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Octopus API</dt>
                    <dd><BoolBadge value={inv.octopusApiIntegration} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">White-label</dt>
                    <dd><BoolBadge value={inv.whiteLabel} /></dd>
                  </div>
                </dl>
                <p className="text-xs text-text-tertiary mt-3">{inv.notes}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Full comparison table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Inverter Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inverter</TableHead>
                <TableHead>Na-ion</TableHead>
                <TableHead>3rd Party</TableHead>
                <TableHead>CAN BMS</TableHead>
                <TableHead>IOF</TableHead>
                <TableHead>Octopus</TableHead>
                <TableHead>HA</TableHead>
                <TableHead>G99</TableHead>
                <TableHead>White-label</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="font-medium text-text-primary">{inv.manufacturer}</div>
                    <div className="text-xs text-text-tertiary">{inv.model}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={compatColors[inv.sodiumIonCompatibility]}>
                      {compatLabels[inv.sodiumIonCompatibility]}
                    </Badge>
                  </TableCell>
                  <TableCell><BoolBadge value={inv.thirdPartyBattery} /></TableCell>
                  <TableCell><BoolBadge value={inv.canBmsProtocol} /></TableCell>
                  <TableCell><BoolBadge value={inv.iofCompatible} /></TableCell>
                  <TableCell><BoolBadge value={inv.octopusApiIntegration} /></TableCell>
                  <TableCell><BoolBadge value={inv.homeAssistantCompatible} /></TableCell>
                  <TableCell><BoolBadge value={inv.g99Compliant} /></TableCell>
                  <TableCell><BoolBadge value={inv.whiteLabel} /></TableCell>
                  <TableCell className="text-right font-medium">£{inv.priceGbp.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-l-4 border-l-rose">
        <CardContent className="py-4">
          <h4 className="font-semibold text-text-primary mb-2">Recommendation</h4>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              <strong className="text-text-primary">Primary: Victron MultiPlus-II</strong> — Best option for custom Na-ion battery. Open CAN protocol via Venus OS/GX device.
              Strong IOF compatibility via Home Assistant + Octopus integration. Active community support for custom BMS.
              BMS must correctly control Charge Voltage Limit (CVL).
            </p>
            <p>
              <strong className="text-text-primary">Budget: Deye SUN-6K</strong> — Native sodium-ion firmware support. Cheapest option. White-label available.
              Lacks native IOF/Octopus integration but achievable via Home Assistant bridge.
            </p>
            <p>
              <strong className="text-danger">Avoid: Sigenergy M1 / GivEnergy</strong> — Closed ecosystems. Cannot use third-party batteries.
              Not viable for RoseStack own-brand battery despite excellent IOF integration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
