// Run backtest against historical Agile data for RS-300 preset
// node scripts/run-backtest.mjs

import postgres from 'postgres';

const DB = 'postgresql://postgres:PEkBMkfwLxHGdrBMlBXbAtSgfaSzQsNs@junction.proxy.rlwy.net:19190/railway';
const sql = postgres(DB, { ssl: 'require' });

// RS-300 system params (5 Fogstar stacks, 3x Sunsynk 30kW, 25kWp solar)
const RS300 = {
  totalCapacityKwh: 322,
  maxChargeRateKw: 76.8, // min(90kW inverter, 5 × 15.36kW battery)
  maxDischargeRateKw: 76.8,
  roundTripEfficiency: 0.93,
  minSoc: 0.05,
  maxSoc: 0.98,
  solarKwp: 25,
  exportLimitKw: 66, // 3-phase G99
};

// IOF rates (fixed bands)
const IOF = {
  offPeakImport: 16.4, offPeakExport: 16.4,  // 02:00-05:00
  dayImport: 27.33, dayExport: 27.33,          // 05:00-16:00 + 19:00-02:00
  peakImport: 38.26, peakExport: 38.26,        // 16:00-19:00
};

function getIofRate(slotIndex, type) {
  if (slotIndex >= 4 && slotIndex < 10) return type === 'import' ? IOF.offPeakImport : IOF.offPeakExport;
  if (slotIndex >= 32 && slotIndex < 38) return type === 'import' ? IOF.peakImport : IOF.peakExport;
  return type === 'import' ? IOF.dayImport : IOF.dayExport;
}

// Solar model (Lancashire, south-facing)
function estimateSolar(dayOfYear, kwp) {
  if (kwp <= 0) return new Array(48).fill(0);
  const seasonal = Math.max(0, Math.sin((dayOfYear - 80) * (Math.PI / 185)));
  const dailyKwh = kwp * 4.8 * seasonal;
  if (dailyKwh <= 0) return new Array(48).fill(0);
  const slots = new Array(48).fill(0);
  const peak = 26; const spread = 10; let total = 0;
  for (let i = 0; i < 48; i++) {
    const dist = Math.abs(i - peak);
    if (dist <= spread) { slots[i] = Math.exp(-0.5 * (dist / (spread * 0.5)) ** 2); total += slots[i]; }
  }
  const maxSlot = kwp * 0.85 * 0.5;
  const scale = total > 0 ? dailyKwh / total : 0;
  return slots.map(v => Math.min(v * scale, maxSlot));
}

function getDayOfYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / (1000 * 60 * 60 * 24));
}

// Greedy dispatch for one day
function dispatch(params, importRates, exportRates, solarKwh) {
  const cap = params.totalCapacityKwh;
  const reserve = 0.05; // Agile reserve
  const maxSoc = params.maxSoc - reserve;
  const minSoc = params.minSoc;
  const eff = params.roundTripEfficiency;
  const maxChargePerSlot = Math.min(params.maxChargeRateKw, cap) * 0.5;
  const maxDischargePerSlot = Math.min(params.maxDischargeRateKw, params.exportLimitKw || 999) * 0.5;

  // Find profitable charge/discharge pairs
  const slots = [];
  for (let i = 0; i < 48; i++) {
    slots.push({ i, imp: importRates[i], exp: exportRates[i], action: 'idle', energy: 0, revenue: 0 });
  }

  // Negative pricing = always charge
  for (const s of slots) {
    if (s.imp <= 0) s.action = 'charge';
  }

  // Solar slots
  const solar = solarKwh || new Array(48).fill(0);
  for (let i = 0; i < 48; i++) {
    if (solar[i] > 0.01 && slots[i].action === 'idle') slots[i].action = 'solar_charge';
  }

  // Rank for greedy pairing
  const chargePool = slots.filter(s => s.action === 'idle').sort((a, b) => a.imp - b.imp);
  const dischargePool = slots.filter(s => s.action === 'idle').sort((a, b) => b.exp - a.exp);

  for (const cs of chargePool) {
    for (const ds of dischargePool) {
      if (cs.i >= ds.i) continue;
      if (cs.action !== 'idle' || ds.action !== 'idle') continue;
      const spread = ds.exp - (cs.imp / eff);
      if (spread > 0) {
        cs.action = 'charge';
        ds.action = 'discharge';
        break;
      }
    }
  }

  // SOC pass
  let storedKwh = minSoc * cap;
  let totalCharge = 0, totalDischarge = 0, importCost = 0, exportRevenue = 0;
  let profitableExportSlots = 0, zeroCostSlots = 0;

  for (const s of slots) {
    if (s.imp <= 0) zeroCostSlots++;

    if (s.action === 'charge' || s.action === 'solar_charge') {
      const headroom = (maxSoc * cap) - storedKwh;
      let energyIn;
      if (s.action === 'solar_charge') {
        energyIn = Math.min(solar[s.i], headroom, maxChargePerSlot);
        // No grid cost for solar
      } else {
        energyIn = Math.min(maxChargePerSlot * eff, headroom);
        const gridKwh = energyIn / eff;
        const cost = gridKwh * s.imp;
        importCost += cost;
        if (s.imp <= 0) exportRevenue += Math.abs(cost); // Paid to charge!
      }
      storedKwh += energyIn;
      totalCharge += energyIn;
    } else if (s.action === 'discharge') {
      const available = storedKwh - (minSoc * cap);
      const energyOut = Math.min(maxDischargePerSlot, available);
      const revenue = energyOut * s.exp;
      exportRevenue += revenue;
      storedKwh -= energyOut;
      totalDischarge += energyOut;
      if (s.exp > 5) profitableExportSlots++;
    }
  }

  return {
    totalChargeKwh: Math.round(totalCharge * 10) / 10,
    totalDischargeKwh: Math.round(totalDischarge * 10) / 10,
    importCostPence: Math.round(importCost),
    exportRevenuePence: Math.round(exportRevenue),
    netRevenuePence: Math.round(exportRevenue - importCost),
    cycles: Math.round(Math.min(totalCharge, totalDischarge) / cap * 100) / 100,
    profitableExportSlots,
    zeroCostSlots,
  };
}

// IOF dispatch (charge off-peak only, discharge peak only)
function dispatchIof(params, solarKwh) {
  const cap = params.totalCapacityKwh;
  const iofReserve = 0.20;
  const maxSoc = params.maxSoc - iofReserve;
  const minSoc = params.minSoc;
  const eff = params.roundTripEfficiency;
  const maxChargePerSlot = Math.min(params.maxChargeRateKw, cap) * 0.5;
  const maxDischargePerSlot = Math.min(params.maxDischargeRateKw, params.exportLimitKw || 999) * 0.5;

  let storedKwh = minSoc * cap;
  let importCost = 0, exportRevenue = 0, totalCharge = 0, totalDischarge = 0;

  for (let i = 0; i < 48; i++) {
    const impRate = getIofRate(i, 'import');
    const expRate = getIofRate(i, 'export');

    if (i >= 4 && i < 10) {
      // Off-peak: charge
      const headroom = (maxSoc * cap) - storedKwh;
      const energyIn = Math.min(maxChargePerSlot * eff, headroom);
      const gridKwh = energyIn / eff;
      importCost += gridKwh * impRate;
      storedKwh += energyIn;
      totalCharge += energyIn;
    } else if (i >= 32 && i < 38) {
      // Peak: discharge
      const available = storedKwh - (minSoc * cap);
      const energyOut = Math.min(maxDischargePerSlot, available);
      exportRevenue += energyOut * expRate;
      storedKwh -= energyOut;
      totalDischarge += energyOut;
    }
    // All other slots: idle (Octopus controls)
  }

  return {
    netRevenuePence: Math.round(exportRevenue - importCost),
    importCostPence: Math.round(importCost),
    exportRevenuePence: Math.round(exportRevenue),
    totalChargeKwh: Math.round(totalCharge * 10) / 10,
    totalDischargeKwh: Math.round(totalDischarge * 10) / 10,
  };
}

// UK timezone helpers
function toUkDate(isoUtc) {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = fmt.formatToParts(d);
  return `${p.find(x=>x.type==='year').value}-${p.find(x=>x.type==='month').value}-${p.find(x=>x.type==='day').value}`;
}

function toUkSlotIndex(isoUtc) {
  const d = new Date(isoUtc);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = fmt.formatToParts(d);
  const h = parseInt(p.find(x=>x.type==='hour').value);
  const m = parseInt(p.find(x=>x.type==='minute').value);
  return h * 2 + (m >= 30 ? 1 : 0);
}

async function main() {
  console.log('🔌 Connected to Railway DB');
  console.log('⚡ Running RS-300 backtest (322kWh, 90kW, 25kWp solar, 66kW export)\n');

  // Fetch all rates
  const importSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'import' ORDER BY valid_from`;
  const exportSlots = await sql`SELECT valid_from, value_inc_vat FROM agile_rates WHERE type = 'export' ORDER BY valid_from`;

  console.log(`  Import slots: ${importSlots.length}`);
  console.log(`  Export slots: ${exportSlots.length}`);

  // Group by UK date
  const importByDate = new Map();
  for (const s of importSlots) {
    const d = toUkDate(s.valid_from);
    if (!importByDate.has(d)) importByDate.set(d, []);
    importByDate.get(d).push(s);
  }
  const exportByDate = new Map();
  for (const s of exportSlots) {
    const d = toUkDate(s.valid_from);
    if (!exportByDate.has(d)) exportByDate.set(d, []);
    exportByDate.get(d).push(s);
  }

  // Only days with >=40 import slots AND export data
  const dates = [...importByDate.keys()]
    .filter(d => importByDate.get(d).length >= 40 && exportByDate.has(d))
    .sort();

  console.log(`  Valid days (import+export): ${dates.length}\n`);

  // Run dispatch for each day
  const agileResults = [];
  const iofResults = [];

  for (const date of dates) {
    const impSlots = importByDate.get(date);
    const expSlots = exportByDate.get(date);

    // Build 48-element arrays
    const impArr = new Array(48).fill(20);
    const expArr = new Array(48).fill(10);
    for (const s of impSlots) { const idx = toUkSlotIndex(s.valid_from); if (idx >= 0 && idx < 48) impArr[idx] = s.value_inc_vat; }
    for (const s of expSlots) { const idx = toUkSlotIndex(s.valid_from); if (idx >= 0 && idx < 48) expArr[idx] = s.value_inc_vat; }

    const dayOfYear = getDayOfYear(date);
    const solarKwh = estimateSolar(dayOfYear, RS300.solarKwp);

    const agile = dispatch(RS300, impArr, expArr, solarKwh);
    const iof = dispatchIof(RS300, solarKwh);

    agileResults.push({ date, ...agile });
    iofResults.push({ date, ...iof });
  }

  // Aggregate by month
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const agileByMonth = {};
  const iofByMonth = {};

  for (const r of agileResults) {
    const m = parseInt(r.date.slice(5, 7));
    if (!agileByMonth[m]) agileByMonth[m] = [];
    agileByMonth[m].push(r);
  }
  for (const r of iofResults) {
    const m = parseInt(r.date.slice(5, 7));
    if (!iofByMonth[m]) iofByMonth[m] = [];
    iofByMonth[m].push(r);
  }

  // Print monthly comparison
  console.log('╔══════════╤══════════════════╤══════════════════╤══════════╤══════════════════════════╗');
  console.log('║  Month   │  Agile avg/day   │  IOF avg/day     │  Winner  │  Agile export slots/day  ║');
  console.log('╠══════════╪══════════════════╪══════════════════╪══════════╪══════════════════════════╣');

  let totalAgile = 0, totalIof = 0, totalDays = 0;

  for (let m = 1; m <= 12; m++) {
    const agile = agileByMonth[m] || [];
    const iof = iofByMonth[m] || [];
    if (agile.length === 0) continue;

    const agileAvg = agile.reduce((s, r) => s + r.netRevenuePence, 0) / agile.length;
    const iofAvg = iof.reduce((s, r) => s + r.netRevenuePence, 0) / iof.length;
    const winner = agileAvg > iofAvg ? 'AGILE' : 'IOF';
    const avgExportSlots = agile.reduce((s, r) => s + r.profitableExportSlots, 0) / agile.length;
    const avgZeroCost = agile.reduce((s, r) => s + r.zeroCostSlots, 0) / agile.length;

    totalAgile += agile.reduce((s, r) => s + r.netRevenuePence, 0);
    totalIof += iof.reduce((s, r) => s + r.netRevenuePence, 0);
    totalDays += agile.length;

    const agileGbp = (agileAvg / 100).toFixed(2);
    const iofGbp = (iofAvg / 100).toFixed(2);

    console.log(`║  ${monthNames[m].padEnd(6)}  │  £${agileGbp.padStart(7)}/day     │  £${iofGbp.padStart(7)}/day     │  ${winner.padEnd(6)}  │  ${avgExportSlots.toFixed(1).padStart(4)} slots (${avgZeroCost.toFixed(1)} free)  ║`);
  }

  console.log('╠══════════╪══════════════════╪══════════════════╪══════════╪══════════════════════════╣');

  const agileAnnual = (totalAgile / totalDays * 365 / 100);
  const iofAnnual = (totalIof / totalDays * 365 / 100);

  // Optimal switching: pick best tariff each month
  let switchingTotal = 0;
  const switchCal = {};
  for (let m = 1; m <= 12; m++) {
    const agile = agileByMonth[m] || [];
    const iof = iofByMonth[m] || [];
    if (agile.length === 0) continue;
    const agileAvg = agile.reduce((s, r) => s + r.netRevenuePence, 0) / agile.length;
    const iofAvg = iof.reduce((s, r) => s + r.netRevenuePence, 0) / iof.length;
    const best = Math.max(agileAvg, iofAvg);
    switchCal[m] = agileAvg > iofAvg ? 'Agile' : 'IOF';
    const daysInMonth = [0,31,28,31,30,31,30,31,31,30,31,30,31][m];
    switchingTotal += best * daysInMonth;
  }
  const switchingAnnual = switchingTotal / 100;

  console.log(`║  ANNUAL  │  £${agileAnnual.toFixed(0).padStart(7)}/yr      │  £${iofAnnual.toFixed(0).padStart(7)}/yr      │          │                          ║`);
  console.log(`║  SWITCH  │  £${switchingAnnual.toFixed(0).padStart(7)}/yr      │  (optimal mix)   │          │                          ║`);
  console.log('╚══════════╧══════════════════╧══════════════════╧══════════╧══════════════════════════╝');

  console.log(`\n📅 Optimal Switching Calendar:`);
  for (let m = 1; m <= 12; m++) {
    if (switchCal[m]) console.log(`  ${monthNames[m]}: ${switchCal[m]}`);
  }

  console.log(`\n📊 Summary (RS-300: 322kWh, 66kW export, 25kWp solar):`);
  console.log(`  Days analysed: ${totalDays}`);
  console.log(`  Agile year-round: £${agileAnnual.toFixed(0)}/yr`);
  console.log(`  IOF year-round:   £${iofAnnual.toFixed(0)}/yr`);
  console.log(`  Optimal switch:   £${switchingAnnual.toFixed(0)}/yr`);
  console.log(`  Switching uplift: +£${(switchingAnnual - Math.max(agileAnnual, iofAnnual)).toFixed(0)}/yr vs best single tariff`);

  // Best/worst days
  const sorted = [...agileResults].sort((a, b) => b.netRevenuePence - a.netRevenuePence);
  console.log(`\n🏆 Best 5 days (Agile):`);
  for (const d of sorted.slice(0, 5)) {
    console.log(`  ${d.date}: £${(d.netRevenuePence/100).toFixed(2)} (${d.profitableExportSlots} export slots, ${d.zeroCostSlots} free charge slots)`);
  }
  console.log(`\n💀 Worst 5 days (Agile):`);
  for (const d of sorted.slice(-5).reverse()) {
    console.log(`  ${d.date}: £${(d.netRevenuePence/100).toFixed(2)}`);
  }

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
