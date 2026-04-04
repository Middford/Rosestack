// 22 June 2025 — Full negative pricing exploitation
// RS-300 (322kWh) + 2 EVs (22kW each) + Household
// Charge everything 07:30-15:00, discharge 16:00 → sunrise next day

const data = [
  { slot: 0,  time: '00:00-00:30', imp: 4.92,  exp: 3.07  },
  { slot: 1,  time: '00:30-01:00', imp: 3.97,  exp: 2.65  },
  { slot: 2,  time: '01:00-01:30', imp: 18.38, exp: 8.98  },
  { slot: 3,  time: '01:30-02:00', imp: 17.30, exp: 8.51  },
  { slot: 4,  time: '02:00-02:30', imp: 16.80, exp: 8.29  },
  { slot: 5,  time: '02:30-03:00', imp: 16.10, exp: 7.98  },
  { slot: 6,  time: '03:00-03:30', imp: 14.89, exp: 7.45  },
  { slot: 7,  time: '03:30-04:00', imp: 14.77, exp: 7.40  },
  { slot: 8,  time: '04:00-04:30', imp: 12.13, exp: 6.24  },
  { slot: 9,  time: '04:30-05:00', imp: 8.82,  exp: 4.78  },
  { slot: 10, time: '05:00-05:30', imp: 11.13, exp: 5.80  },
  { slot: 11, time: '05:30-06:00', imp: 8.60,  exp: 4.68  },
  { slot: 12, time: '06:00-06:30', imp: 4.41,  exp: 2.84  },
  { slot: 13, time: '06:30-07:00', imp: 3.75,  exp: 2.55  },
  { slot: 14, time: '07:00-07:30', imp: 0.22,  exp: 1.00  },
  { slot: 15, time: '07:30-08:00', imp: -1.60, exp: 0.20  },
  { slot: 16, time: '08:00-08:30', imp: -1.10, exp: 0.42  },
  { slot: 17, time: '08:30-09:00', imp: -2.43, exp: 0.00  },
  { slot: 18, time: '09:00-09:30', imp: -1.10, exp: 0.42  },
  { slot: 19, time: '09:30-10:00', imp: -4.85, exp: 0.00  },
  { slot: 20, time: '10:00-10:30', imp: -0.98, exp: 0.47  },
  { slot: 21, time: '10:30-11:00', imp: -3.31, exp: 0.00  },
  { slot: 22, time: '11:00-11:30', imp: -0.51, exp: 0.68  },
  { slot: 23, time: '11:30-12:00', imp: -2.78, exp: 0.00  },
  { slot: 24, time: '12:00-12:30', imp: -2.98, exp: 0.00  },
  { slot: 25, time: '12:30-13:00', imp: -2.58, exp: 0.00  },
  { slot: 26, time: '13:00-13:30', imp: -1.98, exp: 0.03  },
  { slot: 27, time: '13:30-14:00', imp: -1.98, exp: 0.03  },
  { slot: 28, time: '14:00-14:30', imp: -5.19, exp: 0.00  },
  { slot: 29, time: '14:30-15:00', imp: -2.01, exp: 0.02  },
  { slot: 30, time: '15:00-15:30', imp: 0.60,  exp: 1.16  },
  { slot: 31, time: '15:30-16:00', imp: 1.71,  exp: 1.65  },
  { slot: 32, time: '16:00-16:30', imp: 12.87, exp: 4.41  },
  { slot: 33, time: '16:30-17:00', imp: 15.86, exp: 5.72  },
  { slot: 34, time: '17:00-17:30', imp: 23.35, exp: 9.02  },
  { slot: 35, time: '17:30-18:00', imp: 26.00, exp: 10.18 },
  { slot: 36, time: '18:00-18:30', imp: 29.44, exp: 11.70 },
  { slot: 37, time: '18:30-19:00', imp: 30.65, exp: 12.23 },
  { slot: 38, time: '19:00-19:30', imp: 22.05, exp: 10.60 },
  { slot: 39, time: '19:30-20:00', imp: 22.59, exp: 10.84 },
  { slot: 40, time: '20:00-20:30', imp: 22.51, exp: 10.80 },
  { slot: 41, time: '20:30-21:00', imp: 22.75, exp: 10.91 },
  { slot: 42, time: '21:00-21:30', imp: 23.29, exp: 11.14 },
  { slot: 43, time: '21:30-22:00', imp: 22.71, exp: 10.89 },
  { slot: 44, time: '22:00-22:30', imp: 21.61, exp: 10.41 },
  { slot: 45, time: '22:30-23:00', imp: 18.50, exp: 9.04  },
  { slot: 46, time: '23:00-23:30', imp: 10.28, exp: 5.42  },
  { slot: 47, time: '23:30-00:00', imp: 5.51,  exp: 3.32  },
];

// Next morning (23 June) — estimated from similar night pattern
const nextMorning = [
  { slot: 'N0',  time: '00:00-00:30+1', imp: 5.00,  exp: 3.10  },
  { slot: 'N1',  time: '00:30-01:00+1', imp: 4.00,  exp: 2.70  },
  { slot: 'N2',  time: '01:00-01:30+1', imp: 18.00, exp: 8.80  },
  { slot: 'N3',  time: '01:30-02:00+1', imp: 17.00, exp: 8.40  },
  { slot: 'N4',  time: '02:00-02:30+1', imp: 16.50, exp: 8.20  },
  { slot: 'N5',  time: '02:30-03:00+1', imp: 16.00, exp: 7.90  },
  { slot: 'N6',  time: '03:00-03:30+1', imp: 15.00, exp: 7.50  },
  { slot: 'N7',  time: '03:30-04:00+1', imp: 14.50, exp: 7.30  },
  { slot: 'N8',  time: '04:00-04:30+1', imp: 12.00, exp: 6.20  },
];

// System
const bat = { cap: 322, chargeKw: 76.8, dischargeKw: 66, eff: 0.93, minSoc: 0.05, maxSoc: 0.93 };
const ev1 = { name: 'EV 1', chargerKw: 22, cap: 60, soc: 0.20 };
const ev2 = { name: 'EV 2', chargerKw: 22, cap: 60, soc: 0.20 };
const houseKwhPerSlot = 0.5;

let batKwh = bat.minSoc * bat.cap;
let ev1Kwh = ev1.soc * ev1.cap;
let ev2Kwh = ev2.soc * ev2.cap;

console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log('  22 JUNE 2025 — FULL DAY MODEL');
console.log('  Battery: 322kWh (76.8kW charge, 66kW export) + 2×EV (22kW) + Household (0.5kWh/slot)');
console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════
// PHASE 1: CHARGING
// ═══════════════════════════════════════════
const chargeSlots = data.filter(d => d.slot >= 14 && d.slot <= 31 && d.imp < 2);
let chargePaid = 0;
let chargeGrid = 0;

console.log('┌─────┬──────────────┬─────────┬────────────────┬────────────────┬────────────────┬──────────┬─────────┐');
console.log('│Slot │ Time         │ Rate    │ Battery        │ EV 1           │ EV 2           │ Grid kWh │ Earned  │');
console.log('├─────┼──────────────┼─────────┼────────────────┼────────────────┼────────────────┼──────────┼─────────┤');

for (const s of chargeSlots) {
  let grid = 0;
  let bStr = '', e1Str = '', e2Str = '';

  // Battery
  const bHead = (bat.maxSoc * bat.cap) - batKwh;
  if (bHead > 0.1) {
    const eIn = Math.min(bat.chargeKw * 0.5 * bat.eff, bHead);
    const gKwh = eIn / bat.eff;
    batKwh += eIn;
    grid += gKwh;
    bStr = `+${eIn.toFixed(1)}→${(batKwh/bat.cap*100).toFixed(0)}%`;
  } else { bStr = 'FULL 93%'; }

  // EV1
  const e1Head = ev1.cap - ev1Kwh;
  if (e1Head > 0.1) {
    const c = Math.min(ev1.chargerKw * 0.5, e1Head);
    ev1Kwh += c; grid += c;
    e1Str = `+${c.toFixed(0)}→${(ev1Kwh/ev1.cap*100).toFixed(0)}%`;
  } else { e1Str = 'FULL 100%'; }

  // EV2
  const e2Head = ev2.cap - ev2Kwh;
  if (e2Head > 0.1) {
    const c = Math.min(ev2.chargerKw * 0.5, e2Head);
    ev2Kwh += c; grid += c;
    e2Str = `+${c.toFixed(0)}→${(ev2Kwh/ev2.cap*100).toFixed(0)}%`;
  } else { e2Str = 'FULL 100%'; }

  const earned = -(grid * s.imp);
  chargePaid += earned;
  chargeGrid += grid;

  const rateStr = s.imp < 0 ? `${s.imp.toFixed(2)}p` : ` ${s.imp.toFixed(2)}p`;
  console.log(`│ ${String(s.slot).padStart(2)}  │ ${s.time} │${rateStr.padStart(8)} │ ${bStr.padEnd(14)} │ ${e1Str.padEnd(14)} │ ${e2Str.padEnd(14)} │ ${grid.toFixed(1).padStart(7)}  │ £${(earned/100).toFixed(3).padStart(6)} │`);
}

console.log('└─────┴──────────────┴─────────┴────────────────┴────────────────┴────────────────┴──────────┴─────────┘');
console.log(`\n  🔋 Battery: ${batKwh.toFixed(0)}/${bat.cap} kWh (${(batKwh/bat.cap*100).toFixed(0)}%)`);
console.log(`  🚗 EV 1: ${ev1Kwh.toFixed(0)}/${ev1.cap} kWh (${(ev1Kwh/ev1.cap*100).toFixed(0)}%) — ${(ev1Kwh - ev1.soc*ev1.cap).toFixed(0)} kWh added FREE`);
console.log(`  🚗 EV 2: ${ev2Kwh.toFixed(0)}/${ev2.cap} kWh (${(ev2Kwh/ev2.cap*100).toFixed(0)}%) — ${(ev2Kwh - ev2.soc*ev2.cap).toFixed(0)} kWh added FREE`);
console.log(`  ⚡ Grid absorbed: ${chargeGrid.toFixed(0)} kWh`);
console.log(`  💰 Earned charging: £${(chargePaid/100).toFixed(2)}`);

// ═══════════════════════════════════════════
// PHASE 2: DISCHARGE (16:00 → 04:30 next day)
// ═══════════════════════════════════════════
console.log('\n┌──────────────┬─────────┬─────────┬──────────────────────┬──────────────────────┬───────────┐');
console.log('│ Time         │ Import  │ Export  │ House (self-use)     │ Grid export          │ Bat SOC   │');
console.log('├──────────────┼─────────┼─────────┼──────────────────────┼──────────────────────┼───────────┤');

const dischargeSlots = [
  ...data.filter(d => d.slot >= 32),
  ...nextMorning,
];

let selfUseValue = 0, selfUseKwh = 0;
let exportValue = 0, exportKwh = 0;

for (const s of dischargeSlots) {
  const avail = batKwh - (bat.minSoc * bat.cap);
  if (avail <= 0) {
    console.log(`│ ${s.time.padEnd(12)} │${s.imp.toFixed(2).padStart(7)}p │${s.exp.toFixed(2).padStart(7)}p │ BATTERY EMPTY        │                      │ ${(batKwh/bat.cap*100).toFixed(1).padStart(5)}%    │`);
    continue;
  }

  // House first
  const hKwh = Math.min(houseKwhPerSlot, avail);
  const hVal = hKwh * s.imp;
  batKwh -= hKwh;
  selfUseKwh += hKwh;
  selfUseValue += hVal;

  // Export surplus
  const remain = batKwh - (bat.minSoc * bat.cap);
  const expKwh = Math.min(bat.dischargeKw * 0.5, Math.max(0, remain));
  const expVal = expKwh * s.exp;
  batKwh -= expKwh;
  exportKwh += expKwh;
  exportValue += expVal;

  const socStr = `${(batKwh/bat.cap*100).toFixed(1)}%`;
  console.log(`│ ${s.time.padEnd(12)} │${s.imp.toFixed(2).padStart(7)}p │${s.exp.toFixed(2).padStart(7)}p │ ${hKwh.toFixed(1)}kWh = £${(hVal/100).toFixed(2).padStart(5)} saved │ ${expKwh.toFixed(1)}kWh = £${(expVal/100).toFixed(2).padStart(5)} export │ ${socStr.padStart(5)}%    │`);
}

console.log('└──────────────┴─────────┴─────────┴──────────────────────┴──────────────────────┴───────────┘');

// ═══════════════════════════════════════════
// TOTAL P&L
// ═══════════════════════════════════════════
const evFreeKwh = (ev1Kwh - ev1.soc*ev1.cap) + (ev2Kwh - ev2.soc*ev2.cap);
const evSavings = evFreeKwh * 25; // vs 25p avg Agile

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
console.log('  💰 TOTAL 24-HOUR P&L — 22 JUNE 2025');
console.log('═══════════════════════════════════════════════════════════════════════════════════════');
console.log(`\n  REVENUE:`);
console.log(`    Negative pricing (paid to charge):    +£${(chargePaid/100).toFixed(2).padStart(8)}`);
console.log(`    Self-use (${selfUseKwh.toFixed(0)}kWh, avoided import):    +£${(selfUseValue/100).toFixed(2).padStart(8)}`);
console.log(`    Grid export (${exportKwh.toFixed(0)}kWh, Agile Out):      +£${(exportValue/100).toFixed(2).padStart(8)}`);
console.log(`    EV charging (${evFreeKwh.toFixed(0)}kWh free, vs 25p):     +£${(evSavings/100).toFixed(2).padStart(8)}`);
console.log(`                                            ──────────`);
const total = chargePaid + selfUseValue + exportValue + evSavings;
console.log(`    TOTAL DAY VALUE:                       £${(total/100).toFixed(2).padStart(8)}`);
console.log(`\n  ENERGY FLOWS:`);
console.log(`    Grid → Battery:  ${(batKwh > bat.minSoc*bat.cap ? chargeGrid - evFreeKwh : chargeGrid).toFixed(0)} kWh (charged free/paid)`);
console.log(`    Grid → EVs:      ${evFreeKwh.toFixed(0)} kWh (charged free)`);
console.log(`    Battery → House: ${selfUseKwh.toFixed(0)} kWh (saved ${(selfUseValue/100).toFixed(2)})`);
console.log(`    Battery → Grid:  ${exportKwh.toFixed(0)} kWh (earned ${(exportValue/100).toFixed(2)})`);
console.log(`    Battery EOD:     ${(batKwh/bat.cap*100).toFixed(1)}% SOC remaining`);
