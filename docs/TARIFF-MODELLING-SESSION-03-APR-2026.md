# RoseStack Tariff Modelling Session — 3 April 2026

## Summary

Full-day session building energy tariff revenue models for the RoseStack battery arbitrage platform. Started with reading the strategy document, ended with three working tariff models in the app and critical findings about tariff viability backed by real data.

## System Under Test

- **Battery:** 5 × Fogstar 64.4kWh stacks (322kWh total) — £5,999 each
- **Inverter:** 4 × Deye SUN-20K-SG05LP3-EU-SM2 20kW 3-phase — £2,300 each
- **Solar:** 25kWp south-facing, Lancashire (53.8°N)
- **Export limit:** 66kW (G99 three-phase)
- **Household:** 24kWh/day + heat pump + 2 EVs (10,000 miles/yr each)
- **Sweet spot logic:** 5 stacks + 4 inverters makes the G99 export limit the only bottleneck (battery discharge 76.8kW and inverter output 80kW both exceed 66kW)

## Infrastructure Built

### Database (Railway PostgreSQL)
- Created RoseStack project on Railway with PostgreSQL
- **289,431 Agile half-hourly rate slots** ingested (import from Jan 2017, export from Jan 2018)
- **9,190 Flux band rate entries** ingested (import + export from Feb 2023)
- Four Agile product codes: AGILE-18-02-21, AGILE-24-10-01, AGILE-FLEX-22-11-25, AGILE-OUTGOING-19-05-13
- Two Flux product codes: FLUX-IMPORT-23-02-14, FLUX-EXPORT-23-02-14
- All Region N (ENWL — Electricity North West, covering Lancashire)

### App Features Built
- **IOF Model tab** — interactive hardware selection with instant 365-day simulation
- **Agile Model tab** — API-driven backtest against real historical half-hourly rates
- **Flux Model tab** — currently fixed rates, needs updating to use DB (next session)
- **Hardware catalogue updated** — Fogstar 48.3kWh (£4,999) and 64.4kWh (£5,999), Deye 20kW (£2,300)
- **Bottleneck indicator** — red box highlights the system limiting factor
- **Editable export limit** on all models
- **EV miles/year input** converting to kWh/day at 3.5 miles/kWh

### HTML Outputs Generated
- `agile-22-june-2025.html` — single day slot-by-slot rate table with chart (solar glut day)
- `worst-day-8march2026.html` — worst Agile day analysis (no viable spread)
- `full-year-model-v2.html` — all 565 days IOF vs Agile comparison
- `iof-365-v4.html` — IOF smart charging model (always-full strategy)
- `october-2025-model.html` — three-tariff comparison for October
- `agile-full-year-tracker.html` — 365 days with line charts showing import/export rates + charge/discharge actions + SOC tracking + monthly P&L summary

## Key Findings

### 1. IOF Is the Best Tariff for Battery Arbitrage
- **Annual revenue: ~£16,643** (£45.60/day average)
- Import = export parity at every band (38.26p peak)
- Guaranteed 21.86p spread (peak export 38.26p minus off-peak charge 16.40p)
- Predictable daily income regardless of weather or wholesale markets
- **Problem:** IOF signups are PAUSED as of early 2026

### 2. Agile Export Rates Make Grid Arbitrage Unviable
- Agile import avg: 20.17p, but export avg: only **9.03p** (P90 = 13p)
- Export rate tracks at roughly **40-44% of import rate** across every slot
- The spread is ALWAYS negative — you can never buy at Agile import and sell at Agile export for a profit
- **Agile annual revenue: ~£3,226** (£8.86/day) — mostly from self-consumption savings
- Agile only works for: self-consumption offset, negative pricing capture, rare spike export

### 3. Agile Spreads Are Improving But Export Isn't
- Import spreads grew from 22p (2017) to **28p (2024-2025)** — more wind/solar on grid
- Negative pricing days: from 0% (2017) to **14% of all days** (2024)
- But export rates stuck at 8-10p average — hasn't improved with spreads
- Trend will continue as more offshore wind comes online

### 4. Agile Is Really a Solar Tariff
- The only days Agile clearly wins are negative pricing days (free/paid-to-charge)
- Value comes from: solar → battery → house (avoids import) + negative pricing capture
- Winter with no solar and no negative pricing = nothing to do
- Best Agile months: September (47% good days), October (37%), June (43%)
- Worst: February (54% dead days), July (48% — surprisingly bad)

### 5. Standard Flux Rates Have Dropped Significantly
- Peak export spread halved: 16.01p (Q1 2023) → 8.93p (Q3 2024) → 12.21p (Q2 2026)
- Current rates: off-peak 14.98p import, peak 27.19p export
- Day export collapsed: 17.16p (Jan 2024) → 9.55p (now)
- Flux is available today but produces less than IOF

### 6. Solar Calibration Matters
- Sinusoidal model was underestimating by 23% overall
- Corrected to 900 kWh/kWp/year for Lancashire (MCS/PVGIS data)
- Monthly values: Jan 21.8, Jun 97.5, Dec 14.5 kWh/day for 25kWp
- Solar must power house FIRST (no battery round-trip loss), then surplus to battery, then export excess

### 7. Battery Sizing for IOF
- Peak discharge limited by 3hr window × export limit: 66kW × 3hrs = 198kWh
- With 5% floor: need ~210kWh usable = 220kWh total minimum
- 322kWh (5 stacks) provides comfortable buffer for house + peak
- 600kWh on IOF wastes 255kWh of capacity daily (can't export it in 3hrs)
- 600kWh only justified if also running Agile strategy or wanting multi-day backup

### 8. The "Always Full" IOF Strategy
- Battery target: 100% at all times
- Off-peak charge reduced by predicted solar surplus (smart charging)
- Solar fills during day, day-rate top-up at 15:00 only if gap remains
- Day-rate top-up at 26.80p only profitable if spread after efficiency > cycle cost
- Summer: solar provides 68kWh/day free, dramatically reduces off-peak charging
- Winter: full off-peak charge needed + day-rate top-up for house demand

## Algorithm Lessons Learned

### IOF Model
- Simple and deterministic — same rates every day
- Key insight: off-peak charge should be reduced by predicted solar (not charge to 100% then waste solar)
- House runs off battery 24/7 — saves import rate on every slot
- Solar → house → battery → export priority chain

### Agile Model (Patient Trader)
- Every charge/discharge pair must be individually profitable (paired algorithm)
- Old approach: greedy averaging allowed loss-making trades to hide behind profitable ones
- Cycle degradation hurdle: 1.2p/kWh — don't trade below this spread
- Hold on dead days (no spread worth trading) — the battery waits
- Always charge on negative pricing regardless of strategy
- Solar excess exported even on hold days (free revenue)
- Self-consumption is the reliable baseline (~£5/day); export is volatile upside

### Flux Model
- You control the battery (no Kraken) — 5% reserve only
- Day-rate top-up only profitable because 26.80/0.93 = 28.82p < 30.68p peak export (0.66p margin after degradation — barely worth it)
- Needs historical rate data from DB (next session) — rates have been declining

## Files Created/Modified

### New Source Files
- `src/modules/tariffs/iof-model.ts` — IOF 365-day simulation engine
- `src/modules/tariffs/flux-model.ts` — Flux 365-day simulation engine
- `src/modules/tariffs/agile-model.ts` — Agile patient trader with paired algorithm
- `src/modules/tariffs/components/iof-modeller.tsx` — IOF interactive UI
- `src/modules/tariffs/components/flux-modeller.tsx` — Flux interactive UI
- `src/modules/tariffs/components/agile-modeller.tsx` — Agile interactive UI (API-driven)
- `src/app/api/tariffs/agile-model/route.ts` — API endpoint for Agile backtest
- `src/app/api/tariffs/ingest/route.ts` — API for rate ingestion
- `src/modules/tariffs/agile-ingestion.ts` — Multi-product rate ingestion service
- `src/modules/tariffs/backtest-engine.ts` — Historical backtest runner
- `src/modules/tariffs/multi-day-dispatch.ts` — SOC carry-over dispatch
- `src/modules/tariffs/solar-model.ts` — Lancashire solar generation model
- `src/modules/tariffs/system-presets.ts` — Fogstar/Sunsynk/Deye hardware presets
- `src/modules/tariffs/hardware-optimiser.ts` — Grid search for optimal config
- `src/modules/tariffs/trend-projection.ts` — Forward projection with degradation

### Modified Files
- `src/shared/db/schema.ts` — 6 new tables + agileRates enhancements
- `src/shared/db/index.ts` — Switched from Neon to postgres.js for Railway
- `src/app/tariffs/page.tsx` — Added IOF Model, Agile Model, Flux Model tabs
- `src/modules/hardware/data.ts` — Fogstar 48.3/64.4kWh, Deye 20kW, compatibility

### Scripts
- `scripts/ingest-agile.mjs` — Bulk Agile rate ingestion (289K slots)
- `scripts/ingest-flux.mjs` — Flux rate ingestion (9K entries)
- `scripts/run-backtest.mjs` — RS-300 backtest runner
- `scripts/iof-365-v4.mjs` — IOF annual model with smart charging
- `scripts/full-year-model-v2.mjs` — Multi-tariff annual comparison
- `scripts/oct-model.mjs` — October three-tariff comparison
- `scripts/sept-tracker-v3.mjs` — Full year rate + action tracker HTML
- Various day-analysis scripts for June 22, March 8, etc.

## Next Session Priorities

1. **Historical Flux model** — read actual rates from flux_rates DB table day by day (rates have been declining — this changes the revenue significantly)
2. **IOF historical check** — verify IOF rates via API, check if they've also been variable
3. **Side-by-side comparison view** — same hardware config across all three tariffs on one page
4. **Seasonal switching model** — IOF winter + Agile/Flux summer, quantify the uplift
5. **Portfolio integration** — wire the tariff models into property configuration
6. **Saving Sessions** — add to the model (£2.25/kWh, 6-10 events/year, stacks on top)

## Revenue Summary (322kWh system, 25kWp solar)

| Tariff | Annual Revenue | Daily Avg | Payback (on ~£67K CAPEX) | Available |
|--------|---------------|-----------|--------------------------|-----------|
| **IOF** | **£16,643** | **£45.60** | **4.0 years** | ❌ Paused |
| **Flux** | TBD (was ~£12K, now lower) | TBD | ~5-6 years | ✅ Yes |
| **Agile** | **£3,226** | **£8.86** | **20+ years** | ✅ Yes |

**Conclusion: IOF is the target tariff. Flux is the realistic starting point. Agile is supplementary for summer negative pricing and solar self-consumption only.**
