// 22 June 2025 — IOF vs Agile head-to-head — RS-300 + 2 EVs

const bat = { cap: 322, chargeKw: 76.8, dischargeKw: 66, eff: 0.93 };

// ══════════════════════════════════════════
// IOF MODEL
// ══════════════════════════════════════════
// IOF: Import = Export at every band
// Off-peak 02:00-05:00: 16.40p
// Day 05:00-16:00 + 19:00-02:00: 27.33p
// Peak 16:00-19:00: 38.26p
// 20% SOC reserve. Kraken controls dispatch.

const iofMinSoc = 0.05;
const iofMaxSoc = 0.78; // 0.98 - 0.20 reserve
const iofUsable = bat.cap * (iofMaxSoc - iofMinSoc); // 235 kWh

// CHARGE: 02:00-05:00 (6 slots, 3 hours)
const iofChargePerSlot = bat.chargeKw * 0.5 * bat.eff; // 35.7 kWh stored per slot
const iofCharged = Math.min(6 * iofChargePerSlot, iofUsable); // 214.3 or 235
const iofGridDrawn = iofCharged / bat.eff;
const iofChargeCostPence = iofGridDrawn * 16.40;

// DISCHARGE: 16:00-19:00 (6 slots, 3 hours)
const iofDischargePerSlot = Math.min(bat.dischargeKw, 66) * 0.5; // 33 kWh
const iofDischarged = Math.min(6 * iofDischargePerSlot, iofCharged); // 198 or charged
const iofExportPence = iofDischarged * 38.26;

// House self-use during peak (3kWh over 3hrs)
const iofHousePeakKwh = 3;
const iofHouseSavePence = iofHousePeakKwh * 38.26;

// EVs on IOF: charge off-peak at 16.40p/kWh
const evKwh = 96; // same 96kWh total
const iofEvCostPence = evKwh * 16.40;
const evAltCostPence = evKwh * 25; // what they'd cost at avg Agile daytime
const iofEvSavePence = evAltCostPence - iofEvCostPence;

// IOF battery net
const iofBatNetPence = iofExportPence - iofChargeCostPence + iofHouseSavePence;

// ══════════════════════════════════════════
// AGILE (from previous run)
// ══════════════════════════════════════════
const agileChargeEarned = 690; // pence (paid TO charge)
const agileSelfUsePence = 103;
const agileExportPence = 2626;
const agileEvSavePence = 2400; // 96kWh free vs 25p

const agileBatNetPence = agileChargeEarned + agileSelfUsePence + agileExportPence;

// ══════════════════════════════════════════
// OUTPUT
// ══════════════════════════════════════════

console.log(`
═══════════════════════════════════════════════════════════════════════════════════
  IOF vs AGILE — 22 JUNE 2025 (Summer Solar Glut Day)
  System: RS-300 (322kWh) + 2 × EV (22kW each)
═══════════════════════════════════════════════════════════════════════════════════

  IOF TARIFF STRUCTURE (import = export):
  ┌────────────────────────┬───────────┬───────────┐
  │ Time Band              │ Import    │ Export    │
  ├────────────────────────┼───────────┼───────────┤
  │ Off-peak 02:00-05:00   │  16.40p   │  16.40p   │ ← Kraken charges here
  │ Day 05:00-16:00        │  27.33p   │  27.33p   │ ← IDLE (Kraken holds)
  │ PEAK 16:00-19:00       │  38.26p   │  38.26p   │ ← Kraken discharges here
  │ Day 19:00-02:00        │  27.33p   │  27.33p   │ ← IDLE
  └────────────────────────┴───────────┴───────────┘

═══════════════════════════════════════════════════════════════════════════════════
  BATTERY OPERATIONS
═══════════════════════════════════════════════════════════════════════════════════

  ┌───────────────────────────────┬─────────────────────┬─────────────────────┐
  │                               │       AGILE         │        IOF          │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ CHARGING                      │                     │                     │
  │   Window                      │  07:30-11:00        │  02:00-05:00        │
  │   Rate paid                   │  -5.19p to -0.51p   │  16.40p fixed       │
  │   Grid drawn                  │  305 kWh            │  ${iofGridDrawn.toFixed(0)} kWh            │
  │   Stored in battery           │  283 kWh            │  ${iofCharged.toFixed(0)} kWh            │
  │   COST / (INCOME)             │  (+£6.90) EARNED    │  (£${(iofChargeCostPence/100).toFixed(2)}) COST    │
  │   SOC after charge            │  93%                │  ${((iofMinSoc*bat.cap + iofCharged)/bat.cap*100).toFixed(0)}%                │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ IDLE / MISSED OPPORTUNITY     │                     │                     │
  │   07:30-15:00 negative prices │  ✅ CAPTURED         │  ❌ WASTED           │
  │   Octopus won't let you charge│  N/A (you control)  │  Kraken says no     │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ DISCHARGING                   │                     │                     │
  │   Window                      │  16:00-20:30        │  16:00-19:00        │
  │   Duration                    │  4.5 hours          │  3.0 hours          │
  │   Export rate                 │  4.41p-12.23p       │  38.26p FIXED       │
  │   Avg export rate             │  ~9.4p              │  38.26p             │
  │   kWh exported                │  279 kWh            │  ${iofDischarged.toFixed(0)} kWh            │
  │   EXPORT REVENUE              │  £26.26             │  £${(iofExportPence/100).toFixed(2)}          │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ House self-use (peak)         │  £1.03 (5kWh)       │  £${(iofHouseSavePence/100).toFixed(2)} (3kWh)       │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ BATTERY NET P&L               │  £${(agileBatNetPence/100).toFixed(2)}            │  £${(iofBatNetPence/100).toFixed(2)}            │
  └───────────────────────────────┴─────────────────────┴─────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
  EV CHARGING (2 × EVs, 96kWh total, 20% → 100%)
═══════════════════════════════════════════════════════════════════════════════════

  ┌───────────────────────────────┬─────────────────────┬─────────────────────┐
  │                               │       AGILE         │        IOF          │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ Charge window                 │  07:30-09:30        │  02:00-05:00        │
  │ Rate                          │  NEGATIVE (free)    │  16.40p/kWh         │
  │ Cost for 96kWh                │  £0 (+£6.90 earned) │  £${(iofEvCostPence/100).toFixed(2)}            │
  │ Value vs 25p avg              │  £24.00 saved       │  £${(iofEvSavePence/100).toFixed(2)} saved       │
  └───────────────────────────────┴─────────────────────┴─────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
  💰 TOTAL DAY VALUE — 22 JUNE 2025
═══════════════════════════════════════════════════════════════════════════════════

  ┌───────────────────────────────┬─────────────────────┬─────────────────────┐
  │                               │       AGILE         │        IOF          │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ Battery charge income/cost    │  +£6.90             │  -£${(iofChargeCostPence/100).toFixed(2)}          │
  │ Battery export revenue        │  +£26.26            │  +£${(iofExportPence/100).toFixed(2)}          │
  │ House self-use saved          │  +£1.03             │  +£${(iofHouseSavePence/100).toFixed(2)}           │
  │ EV savings vs 25p             │  +£24.00            │  +£${(iofEvSavePence/100).toFixed(2)}           │
  ├───────────────────────────────┼─────────────────────┼─────────────────────┤
  │ TOTAL                         │  £${(agileBatNetPence/100 + agileEvSavePence/100).toFixed(2)}            │  £${(iofBatNetPence/100 + iofEvSavePence/100).toFixed(2)}            │
  └───────────────────────────────┴─────────────────────┴─────────────────────┘
`);

const agileTotal = (agileBatNetPence + agileEvSavePence) / 100;
const iofTotal = (iofBatNetPence + iofEvSavePence) / 100;
const winner = iofTotal > agileTotal ? 'IOF' : 'AGILE';
const margin = Math.abs(iofTotal - agileTotal);

console.log(`  🏆 WINNER: ${winner} by £${margin.toFixed(2)}`);
console.log('');

console.log('  WHY IOF WINS THIS DAY:');
console.log(`    IOF export rate (38.26p) is ${(38.26/9.4).toFixed(1)}× Agile export avg (~9.4p)`);
console.log(`    IOF export revenue: £${(iofExportPence/100).toFixed(2)} vs Agile: £26.26 = +£${((iofExportPence/100)-26.26).toFixed(2)} advantage`);
console.log(`    Agile free charging saves: £${(6.90 + 24.00 - (-iofEvCostPence/100 + iofChargeCostPence/100)).toFixed(2)} vs IOF charge costs`);
console.log(`    But IOF's export premium (£${((iofExportPence/100)-26.26).toFixed(2)}) > Agile's charge savings (£${(6.90+24.00+iofChargeCostPence/100+iofEvCostPence/100).toFixed(2)})`);
console.log('');
console.log('  ⚠️  BUT: IOF signups are PAUSED. You cannot get IOF today.');
console.log('  ⚠️  IOF gives Octopus CONTROL of your battery. No manual override.');
console.log('  ⚠️  IOF 20% reserve = 64kWh of dead capital vs Agile 5% = 16kWh.');
