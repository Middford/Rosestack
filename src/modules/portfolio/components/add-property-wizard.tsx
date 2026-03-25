'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, StatCard, SimpleStatCard } from '@/shared/ui';
import { ScenarioChart, TrafficLight } from '@/shared/ui';
import { batteries, inverters, solarPanels, heatPumps } from '@/modules/hardware/data';
import { ALL_TARIFFS } from '@/modules/tariffs/data';
import { calculateAllScenarios, summariseScenarios, formatGbp, formatPaybackRange, getDscrStatus } from '@/shared/utils/scenarios';
import type { BatterySystem, ThreeScenarioProjection, ThreeScenarioSummary } from '@/shared/types';
import type { WizardPropertyDetails, WizardHardwareAssignment, WizardTariffAssignment, CyclingStrategy } from '../types';

const STEPS = ['Property Details', 'Hardware Assignment', 'Tariff Assignment', 'Financial Projection', 'Review & Confirm'];

export function AddPropertyWizard() {
  const [step, setStep] = useState(0);

  // Step 1: Property details
  const [propertyDetails, setPropertyDetails] = useState<WizardPropertyDetails>({
    address: '',
    postcode: '',
    propertyType: 'detached',
    bedrooms: 3,
    phase: '3-phase',
    epcRating: 'C',
    gardenLocation: '',
    nearestSubstationId: '',
    homeownerName: '',
    homeownerPhone: '',
    homeownerEmail: '',
    esaContractRef: '',
    esaStartDate: '',
    esaEndDate: '',
    monthlyHomeownerPayment: 100,
    referralSource: '',
    notes: '',
  });

  // Step 2: Hardware
  const [hardware, setHardware] = useState<WizardHardwareAssignment>({
    inverterId: inverters[0]?.id || '',
    batteryId: batteries[0]?.id || '',
    batteryModules: 2,
    installationCost: 5000,
    g99ApplicationCost: 350,
    mcsCertificationCost: 500,
    ancillaryCosts: 1500,
  });

  // Step 3: Tariff
  const [tariffAssignment, setTariffAssignment] = useState<WizardTariffAssignment>({
    tariffId: 'octopus-iof',
    cyclingStrategy: 'kraken-managed',
    solarSelfConsumptionEstimate: 35,
    savingSessionsParticipation: true,
    estimatedSessionsPerYear: 25,
    flexibilityParticipation: false,
    estimatedFlexRevenue: 0,
    segRegistered: true,
    segRate: 15,
  });

  // Build system from selections
  const selectedBattery = batteries.find(b => b.id === hardware.batteryId);
  const selectedInverter = inverters.find(i => i.id === hardware.inverterId);
  const selectedSolar = hardware.solarPanelId ? solarPanels.find(s => s.id === hardware.solarPanelId) : null;
  const selectedHeatPump = hardware.heatPumpId ? heatPumps.find(h => h.id === hardware.heatPumpId) : null;

  const system: BatterySystem | null = useMemo(() => {
    if (!selectedBattery || !selectedInverter) return null;
    const solarKwp = selectedSolar && hardware.solarPanelCount
      ? (selectedSolar.wattage * hardware.solarPanelCount) / 1000
      : undefined;
    return {
      id: 'wizard-system',
      homeId: 'wizard',
      inverterModel: `${selectedInverter.manufacturer} ${selectedInverter.model}`,
      batteryModules: hardware.batteryModules,
      totalCapacityKwh: selectedBattery.capacityPerModuleKwh * hardware.batteryModules,
      batteryChemistry: selectedBattery.chemistry,
      solarPvKwp: solarKwp,
      heatPumpModel: selectedHeatPump ? `${selectedHeatPump.manufacturer} ${selectedHeatPump.model}` : undefined,
      installCost: selectedBattery.wholesalePriceGbp * hardware.batteryModules + selectedInverter.priceGbp
        + (selectedSolar ? selectedSolar.priceGbp * (hardware.solarPanelCount || 0) : 0)
        + (selectedHeatPump ? selectedHeatPump.priceGbp : 0),
      annualMaintenanceCost: 150,
      warrantyYears: selectedBattery.warrantyYears,
      degradationRatePercent: selectedBattery.degradationRatePercent,
      maxChargeRateKw: Math.min(selectedBattery.chargeRateKw * hardware.batteryModules, selectedInverter.maxOutputKw),
      maxDischargeRateKw: Math.min(selectedBattery.dischargeRateKw * hardware.batteryModules, selectedInverter.maxOutputKw),
      roundTripEfficiency: selectedBattery.roundTripEfficiency / 100,
    };
  }, [selectedBattery, selectedInverter, selectedSolar, selectedHeatPump, hardware]);

  const selectedTariff = ALL_TARIFFS.find(t => t.id === tariffAssignment.tariffId);

  // Financial projection
  const projection = useMemo<{ proj: ThreeScenarioProjection; summary: ThreeScenarioSummary } | null>(() => {
    if (!system || !selectedTariff) return null;
    const proj = calculateAllScenarios(system, selectedTariff);
    const summary = summariseScenarios(proj, system);
    return { proj, summary };
  }, [system, selectedTariff]);

  // Cost calculations
  const hardwareCost = system?.installCost || 0;
  const totalCapex = hardwareCost + hardware.installationCost + hardware.g99ApplicationCost
    + hardware.mcsCertificationCost + hardware.ancillaryCosts;

  function updateProperty<K extends keyof WizardPropertyDetails>(key: K, value: WizardPropertyDetails[K]) {
    setPropertyDetails(prev => ({ ...prev, [key]: value }));
  }

  function updateHardware<K extends keyof WizardHardwareAssignment>(key: K, value: WizardHardwareAssignment[K]) {
    setHardware(prev => ({ ...prev, [key]: value }));
  }

  function updateTariff<K extends keyof WizardTariffAssignment>(key: K, value: WizardTariffAssignment[K]) {
    setTariffAssignment(prev => ({ ...prev, [key]: value }));
  }

  const inputClass = 'w-full h-10 px-3 text-sm rounded-[var(--radius-md)] bg-bg-tertiary border border-border text-text-primary placeholder:text-text-tertiary';
  const selectClass = inputClass;
  const labelClass = 'text-xs text-text-secondary block mb-1';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Add Property to Portfolio</h1>
        <p className="text-sm text-text-secondary mt-1">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`flex-1 h-2 rounded-full transition-colors ${
              i <= step ? 'bg-rose' : 'bg-bg-tertiary'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Property Details */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Address</label>
                <input className={inputClass} value={propertyDetails.address} onChange={e => updateProperty('address', e.target.value)} placeholder="e.g. 14 Oak Lane" />
              </div>
              <div>
                <label className={labelClass}>Postcode</label>
                <input className={inputClass} value={propertyDetails.postcode} onChange={e => updateProperty('postcode', e.target.value)} placeholder="e.g. BB2 4HN" />
              </div>
              <div>
                <label className={labelClass}>Property Type</label>
                <select className={selectClass} value={propertyDetails.propertyType} onChange={e => updateProperty('propertyType', e.target.value as any)}>
                  <option value="detached">Detached</option>
                  <option value="semi">Semi-detached</option>
                  <option value="terrace">Terrace</option>
                  <option value="bungalow">Bungalow</option>
                  <option value="farm">Farm</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Bedrooms</label>
                <input type="number" className={inputClass} value={propertyDetails.bedrooms} onChange={e => updateProperty('bedrooms', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>Phase Type</label>
                <select className={selectClass} value={propertyDetails.phase} onChange={e => updateProperty('phase', e.target.value as any)}>
                  <option value="1-phase">Single Phase</option>
                  <option value="3-phase">Three Phase</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>EPC Rating</label>
                <select className={selectClass} value={propertyDetails.epcRating} onChange={e => updateProperty('epcRating', e.target.value)}>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Garden Location & Access</label>
                <input className={inputClass} value={propertyDetails.gardenLocation} onChange={e => updateProperty('gardenLocation', e.target.value)} placeholder="e.g. Rear garden, side gate access" />
              </div>

              <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                <h4 className="text-sm font-medium text-text-primary mb-3">Homeowner Details</h4>
              </div>
              <div>
                <label className={labelClass}>Homeowner Name</label>
                <input className={inputClass} value={propertyDetails.homeownerName} onChange={e => updateProperty('homeownerName', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input className={inputClass} value={propertyDetails.homeownerPhone} onChange={e => updateProperty('homeownerPhone', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input className={inputClass} value={propertyDetails.homeownerEmail} onChange={e => updateProperty('homeownerEmail', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Referral Source</label>
                <input className={inputClass} value={propertyDetails.referralSource} onChange={e => updateProperty('referralSource', e.target.value)} placeholder="Who referred them?" />
              </div>

              <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                <h4 className="text-sm font-medium text-text-primary mb-3">ESA Contract</h4>
              </div>
              <div>
                <label className={labelClass}>ESA Reference</label>
                <input className={inputClass} value={propertyDetails.esaContractRef} onChange={e => updateProperty('esaContractRef', e.target.value)} placeholder="ESA-RS-2026-XXX" />
              </div>
              <div>
                <label className={labelClass}>Monthly Homeowner Payment</label>
                <input type="number" className={inputClass} value={propertyDetails.monthlyHomeownerPayment} onChange={e => updateProperty('monthlyHomeownerPayment', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>ESA Start Date</label>
                <input type="date" className={inputClass} value={propertyDetails.esaStartDate} onChange={e => updateProperty('esaStartDate', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>ESA End Date</label>
                <input type="date" className={inputClass} value={propertyDetails.esaEndDate} onChange={e => updateProperty('esaEndDate', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Notes</label>
                <textarea className={`${inputClass} h-20 py-2`} value={propertyDetails.notes} onChange={e => updateProperty('notes', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Hardware Assignment */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Hardware Assignment</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Inverter</label>
                <select className={selectClass} value={hardware.inverterId} onChange={e => updateHardware('inverterId', e.target.value)}>
                  {inverters.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.manufacturer} {inv.model} ({formatGbp(inv.priceGbp)}) {inv.threePhase ? '[3-phase]' : '[1-phase]'}
                    </option>
                  ))}
                </select>
                {selectedInverter && (
                  <div className="mt-2 text-xs text-text-tertiary space-y-0.5">
                    <p>Max PV: {selectedInverter.maxPvInputKw}kW | Max Battery: {selectedInverter.maxBatteryCapacityKwh}kWh</p>
                    <p>Output: {selectedInverter.maxOutputKw}kW | {selectedInverter.threePhase ? '3-phase' : '1-phase'} | G99: {selectedInverter.g99Compliant ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Battery</label>
                <select className={selectClass} value={hardware.batteryId} onChange={e => updateHardware('batteryId', e.target.value)}>
                  {batteries.map(bat => (
                    <option key={bat.id} value={bat.id}>
                      {bat.manufacturer} {bat.model} ({bat.capacityPerModuleKwh}kWh/module, {formatGbp(bat.wholesalePriceGbp)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Number of Modules</label>
                <input
                  type="number"
                  min={1}
                  max={selectedBattery?.maxModulesPerString || 8}
                  className={inputClass}
                  value={hardware.batteryModules}
                  onChange={e => updateHardware('batteryModules', parseInt(e.target.value) || 1)}
                />
                {selectedBattery && (
                  <p className="mt-1 text-xs text-text-tertiary">
                    Total: {(selectedBattery.capacityPerModuleKwh * hardware.batteryModules).toFixed(1)}kWh |
                    Weight: {(selectedBattery.weightKg * hardware.batteryModules)}kg |
                    Cost: {formatGbp(selectedBattery.wholesalePriceGbp * hardware.batteryModules)}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Solar Panels (optional)</label>
                <select className={selectClass} value={hardware.solarPanelId || ''} onChange={e => updateHardware('solarPanelId', e.target.value || undefined)}>
                  <option value="">No solar</option>
                  {solarPanels.map(sp => (
                    <option key={sp.id} value={sp.id}>
                      {sp.manufacturer} {sp.model} ({sp.wattage}W, {formatGbp(sp.priceGbp)})
                    </option>
                  ))}
                </select>
              </div>

              {hardware.solarPanelId && (
                <>
                  <div>
                    <label className={labelClass}>Number of Panels</label>
                    <input type="number" className={inputClass} value={hardware.solarPanelCount || 0} onChange={e => updateHardware('solarPanelCount', parseInt(e.target.value) || 0)} />
                    {selectedSolar && hardware.solarPanelCount && (
                      <p className="mt-1 text-xs text-text-tertiary">
                        Total: {((selectedSolar.wattage * hardware.solarPanelCount) / 1000).toFixed(1)}kWp
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Orientation</label>
                    <select className={selectClass} value={hardware.solarOrientation || ''} onChange={e => updateHardware('solarOrientation', e.target.value)}>
                      <option value="South">South</option>
                      <option value="South-east">South-east</option>
                      <option value="South-west">South-west</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className={labelClass}>Heat Pump (optional)</label>
                <select className={selectClass} value={hardware.heatPumpId || ''} onChange={e => updateHardware('heatPumpId', e.target.value || undefined)}>
                  <option value="">No heat pump</option>
                  {heatPumps.map(hp => (
                    <option key={hp.id} value={hp.id}>
                      {hp.manufacturer} {hp.model} (COP {hp.copRating}, {formatGbp(hp.priceGbp)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                <h4 className="text-sm font-medium text-text-primary mb-3">Additional Costs</h4>
              </div>
              <div>
                <label className={labelClass}>Installation Cost</label>
                <input type="number" className={inputClass} value={hardware.installationCost} onChange={e => updateHardware('installationCost', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>G99 Application Cost</label>
                <input type="number" className={inputClass} value={hardware.g99ApplicationCost} onChange={e => updateHardware('g99ApplicationCost', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>MCS Certification Cost</label>
                <input type="number" className={inputClass} value={hardware.mcsCertificationCost} onChange={e => updateHardware('mcsCertificationCost', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelClass}>Ancillary Costs</label>
                <input type="number" className={inputClass} value={hardware.ancillaryCosts} onChange={e => updateHardware('ancillaryCosts', parseFloat(e.target.value) || 0)} />
              </div>

              <div className="md:col-span-2 p-4 rounded-[var(--radius-md)] bg-bg-primary border border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Hardware Cost</span>
                  <span className="font-medium text-text-primary">{formatGbp(hardwareCost)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-text-secondary">Install + Ancillary</span>
                  <span className="font-medium text-text-primary">{formatGbp(hardware.installationCost + hardware.g99ApplicationCost + hardware.mcsCertificationCost + hardware.ancillaryCosts)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-text-primary">Total Capital Cost</span>
                  <span className="text-lg font-bold text-rose">{formatGbp(totalCapex)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Tariff Assignment */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Tariff Assignment</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Primary Tariff</label>
                <select className={selectClass} value={tariffAssignment.tariffId} onChange={e => updateTariff('tariffId', e.target.value)}>
                  {ALL_TARIFFS.map(t => (
                    <option key={t.id} value={t.id}>{t.supplier} - {t.name}</option>
                  ))}
                </select>
                {selectedTariff && (
                  <div className="mt-2 text-xs text-text-tertiary">
                    <p>Cheapest import: {Math.min(...selectedTariff.importRates.map(r => r.ratePencePerKwh))}p | Peak export: {Math.max(...selectedTariff.exportRates.map(r => r.ratePencePerKwh))}p</p>
                    <p>Standing charge: {selectedTariff.standingChargePencePerDay}p/day</p>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Cycling Strategy</label>
                <select className={selectClass} value={tariffAssignment.cyclingStrategy} onChange={e => updateTariff('cyclingStrategy', e.target.value as CyclingStrategy)}>
                  <option value="single">Single Cycle</option>
                  <option value="double">Double Cycle</option>
                  <option value="kraken-managed">Kraken Managed</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Solar Self-Consumption Estimate (%)</label>
                <input type="number" className={inputClass} value={tariffAssignment.solarSelfConsumptionEstimate} onChange={e => updateTariff('solarSelfConsumptionEstimate', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={tariffAssignment.savingSessionsParticipation} onChange={e => updateTariff('savingSessionsParticipation', e.target.checked)} className="rounded" />
                  <span className="text-sm text-text-primary">Saving Sessions</span>
                </label>
              </div>
              {tariffAssignment.savingSessionsParticipation && (
                <div>
                  <label className={labelClass}>Estimated Sessions/Year</label>
                  <input type="number" className={inputClass} value={tariffAssignment.estimatedSessionsPerYear} onChange={e => updateTariff('estimatedSessionsPerYear', parseInt(e.target.value) || 0)} />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={tariffAssignment.flexibilityParticipation} onChange={e => updateTariff('flexibilityParticipation', e.target.checked)} className="rounded" />
                  <span className="text-sm text-text-primary">Flexibility Market</span>
                </label>
              </div>
              {tariffAssignment.flexibilityParticipation && (
                <div>
                  <label className={labelClass}>Estimated Annual Flex Revenue</label>
                  <input type="number" className={inputClass} value={tariffAssignment.estimatedFlexRevenue} onChange={e => updateTariff('estimatedFlexRevenue', parseFloat(e.target.value) || 0)} />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={tariffAssignment.segRegistered} onChange={e => updateTariff('segRegistered', e.target.checked)} className="rounded" />
                  <span className="text-sm text-text-primary">SEG Registration</span>
                </label>
              </div>
              {tariffAssignment.segRegistered && (
                <div>
                  <label className={labelClass}>SEG Rate (p/kWh)</label>
                  <input type="number" className={inputClass} value={tariffAssignment.segRate} onChange={e => updateTariff('segRate', parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Financial Projection */}
      {step === 3 && (
        <div className="space-y-6">
          {projection ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Monthly Revenue"
                  bestValue={formatGbp(projection.summary.best.annualNetRevenue / 12)}
                  likelyValue={formatGbp(projection.summary.likely.annualNetRevenue / 12)}
                  worstValue={formatGbp(projection.summary.worst.annualNetRevenue / 12)}
                />
                <StatCard
                  label="Payback Period"
                  bestValue={`${projection.summary.best.paybackMonths}mo`}
                  likelyValue={`${projection.summary.likely.paybackMonths}mo`}
                  worstValue={`${projection.summary.worst.paybackMonths}mo`}
                />
                <StatCard
                  label="10-Year IRR"
                  bestValue={`${projection.summary.best.tenYearIrr}%`}
                  likelyValue={`${projection.summary.likely.tenYearIrr}%`}
                  worstValue={`${projection.summary.worst.tenYearIrr}%`}
                />
                <StatCard
                  label="10-Year NPV"
                  bestValue={formatGbp(projection.summary.best.tenYearNpv)}
                  likelyValue={formatGbp(projection.summary.likely.tenYearNpv)}
                  worstValue={formatGbp(projection.summary.worst.tenYearNpv)}
                />
              </div>

              <Card>
                <CardHeader><CardTitle>Annual Revenue Projection (10 Years)</CardTitle></CardHeader>
                <CardContent className="px-6 pb-6">
                  <ScenarioChart
                    projection={projection.proj}
                    dataKey="netRevenue"
                    height={320}
                    formatValue={(v) => formatGbp(v)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Cumulative Revenue</CardTitle></CardHeader>
                <CardContent className="px-6 pb-6">
                  <ScenarioChart
                    projection={projection.proj}
                    dataKey="cumulativeRevenue"
                    height={280}
                    formatValue={(v) => formatGbp(v)}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-text-secondary mb-2">Payback Range</p>
                  <p className="text-lg font-bold text-text-primary">{formatPaybackRange(projection.summary)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-text-secondary mb-2">DSCR</p>
                  <div className="flex items-center gap-3">
                    <TrafficLight status={getDscrStatus(projection.summary)} />
                    <div>
                      <span className="text-scenario-best text-sm">{projection.summary.best.dscr}</span>
                      <span className="text-text-tertiary mx-1">/</span>
                      <span className="text-scenario-likely text-lg font-bold">{projection.summary.likely.dscr}</span>
                      <span className="text-text-tertiary mx-1">/</span>
                      <span className="text-scenario-worst text-sm">{projection.summary.worst.dscr}</span>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-text-secondary mb-2">Total Capital Cost</p>
                  <p className="text-lg font-bold text-rose">{formatGbp(totalCapex)}</p>
                </Card>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-text-tertiary">Complete hardware and tariff assignment to generate projections.</p>
            </Card>
          )}
        </div>
      )}

      {/* Step 5: Review & Confirm */}
      {step === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Property Summary</CardTitle></CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-text-tertiary">Address</span>
                  <p className="font-medium text-text-primary">{propertyDetails.address || '(not set)'}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Postcode</span>
                  <p className="font-medium text-text-primary">{propertyDetails.postcode || '(not set)'}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Type</span>
                  <p className="font-medium text-text-primary capitalize">{propertyDetails.propertyType}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Phase</span>
                  <p className="font-medium text-text-primary">{propertyDetails.phase}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Homeowner</span>
                  <p className="font-medium text-text-primary">{propertyDetails.homeownerName || '(not set)'}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">ESA Ref</span>
                  <p className="font-medium text-text-primary">{propertyDetails.esaContractRef || '(not set)'}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Monthly Payment</span>
                  <p className="font-medium text-text-primary">{formatGbp(propertyDetails.monthlyHomeownerPayment)}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">EPC Rating</span>
                  <p className="font-medium text-text-primary">{propertyDetails.epcRating}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>System Configuration</CardTitle></CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-text-tertiary">Inverter</span>
                  <p className="font-medium text-text-primary">{system?.inverterModel || '-'}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Battery</span>
                  <p className="font-medium text-text-primary">{system?.totalCapacityKwh || 0} kWh ({hardware.batteryModules} modules)</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Solar</span>
                  <p className="font-medium text-text-primary">{system?.solarPvKwp ? `${system.solarPvKwp}kWp` : 'None'}</p>
                </div>
                <div>
                  <span className="text-text-tertiary">Tariff</span>
                  <p className="font-medium text-text-primary">{selectedTariff?.name || '-'}</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-bg-primary border border-border">
                <span className="text-lg font-bold text-rose">{formatGbp(totalCapex)}</span>
                <span className="text-sm text-text-secondary ml-2">total capital cost</span>
              </div>
            </CardContent>
          </Card>

          {projection && (
            <Card className="border-success border-2">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-text-secondary mb-2">Even in the worst case, this property</p>
                  <p className="text-xl font-bold text-text-primary">
                    pays back in {projection.summary.worst.paybackMonths < 999 ? `${projection.summary.worst.paybackMonths} months` : '>10 years'}
                    {' '}and generates{' '}
                    {formatGbp(Math.max(0, projection.summary.worst.annualNetRevenue))}/year
                  </p>
                  <p className="text-sm text-text-tertiary mt-2">
                    Likely case: {projection.summary.likely.paybackMonths} month payback, {formatGbp(projection.summary.likely.annualNetRevenue)}/year net revenue
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center">
            <Button size="lg" className="px-12">
              Add to Portfolio
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Previous
        </Button>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-text-tertiary">
            {step + 1} / {STEPS.length}
          </span>
        </div>
        <Button
          onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
