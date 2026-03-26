# Session Handover -- 26 March 2026

## What Was Done This Session

### 1. Business Plan Handover Document + Screenshots
- Created `docs/BUSINESS-PLAN-HANDOVER.md` -- comprehensive description of all 12 modules for Claude Chat
- Captured 24 screenshots (viewport + full-page) of every module at `docs/screenshots/`
- Uploaded to Dave's Google Drive

### 2. Seven-Agent Verification Sweep
- Ran 7 specialist agents to fact-check every data point in the platform
- **70 confirmed errors found, 52 missing items** across 425 data points
- Full report: `docs/VERIFICATION-REPORT.md`

### 3. Tariff Rates Fixed (Live API Data)
- Pulled live rates from Octopus Energy API for Region D (ENWL), March 2026
- **Flux:** Off-peak 17.90p import / 5.12p export, Peak 41.77p import / 30.68p export
- **IOF:** 2-period import from API (24.27p / 32.36p). Export product returned 404 -- Kraken manages internally
- Import and export are NOT equal on standard Flux (confirmed via API)
- IOF import=export question remains **UNRESOLVED** -- correction spec says yes, API inconclusive

### 4. Saving Sessions Rebuilt From Research
- DFS and Saving Sessions are the SAME events (old code double-counted)
- Bottleneck is inverter discharge rate, not battery capacity
- SS revenue stacks ON TOP of normal Flux export (no double-counting with arbitrage)
- Notice period: ~24 hours. Operational protocol documented.
- Corrected likely case: ~£110-175/year per home (was ~£17,850 -- overstated 100x)

### 5. Hardware Reference Stacks Created
- 6 stacks designed for different property scenarios: `src/modules/hardware/stacks.ts`
- Covers noise (dB at distance), physical footprint (m2), weight, phase requirements
- Key finding: single-phase is marginal, 3-phase essential for 100kWh+ systems

### 6. Enhanced Dashboard Built
- 15+ new charts added to `src/app/dashboard/page.tsx`
- Financial Health: Assets & Liabilities, Cash Flow, DSCR, Revenue per Home, Gross Margin
- Deployments: Stacked by hardware stack type, kWh capacity over time
- Operational: Fleet health, tariff spread trend, uptime, grid services
- Pipeline: Deployment velocity, capacity pipeline

### 7. Real EPC Data Pulled
- 6,500 real properties from EPC API across all BB postcodes
- 3,150 match RoseStack target profile (owner-occupied, large, detached/semi)
- 390 top-scoring properties saved to `docs/epc-data/target-properties.json`
- BB7 (Clitheroe/Ribble Valley) is richest target area

### 8. Data Corrections Applied
- BB postcode mappings fixed (6 were wrong, Longridge removed -- it's PR3)
- Substations: "11kV" labels corrected to "33/11kV"
- IOF compatibility: Huawei set to false, all flags verified against Octopus list
- Tesla PW3: charge 5kW / discharge 11.5kW confirmed, firmware note added
- EFG -> GGS: replaced across ALL files (risk, funding, agents, UI)
- PAS 63100:2024 and BS 7671 Amendment 4 added to legal module
- Saving Sessions defaults: 25 sessions -> 10, rates reduced to realistic levels

### 9. Corrected Revenue Numbers (Flux Tariff, Likely Case)

| Stack | Monthly Net | Annual Net | Payback |
|-------|-----------|-----------|---------|
| Garage King (192kWh/96kW) | £1,295 | £15,538 | 68 months |
| Garden Standard (160kWh/40kW) | £963 | £11,562 | 92 months |
| Full Package (192kWh + 6kWp solar) | £1,334 | £16,002 | 71 months |
| Quiet Neighbour (80kWh/20kW) | £433 | £5,191 | 108 months |
| Single-Phase (54kWh/11.5kW) | £267 | £3,209 | 129 months |

Old headline: £625/month, 18-month payback. These were wrong.

---

## What Still Needs Doing

### MUST DO (before business plan)

1. **IOF import=export question** -- The correction spec says IOF has equal import/export rates. The Octopus API shows a 2-period import structure but the export product returned 404. Dave needs to check the Octopus IOF FAQ or call Octopus to confirm. This changes the headline numbers significantly (~£1,800/mo net on IOF vs £1,295/mo on Flux).

2. **Run IOF + Agile scenarios** -- The revenue model currently only uses Flux. Need side-by-side comparison of Flux / IOF / Agile for the business plan. IOF signups are paused, so the fallback tariff strategy is critical.

3. **Ofgem price cap update** -- Correction spec item 1.5. Not yet addressed.

4. **Wire EPC data into grid module** -- 390 target properties pulled but not yet integrated as seed data replacing the fabricated properties.

5. **Recalculate all dashboard headline figures** -- The hero stats (£625/month, 18-month payback) need updating to match corrected model.

6. **Update Business Plan Handover** -- The handover doc still references old figures. Needs refreshing with corrected numbers before Claude Chat uses it.

### SHOULD DO (before lender conversations)

7. **ENWL real substation data** -- Substations are still fabricated names. ENWL open data portal has real data.
8. **PAS 63100 vs PAS 8811** -- Legal agent questioned whether PAS 63100:2024 exists. Needs BSI website check.
9. **Capacity Market clearing price** -- £5 vs £30-65/kW/yr disputed. Needs NESO register check.
10. **EIS gross assets** -- Funding data says 30M/35M, should be 15M/16M.
11. **EIS annual limit** -- Says 10M/20M KIC, should be 5M/12M.
12. **SEIS gross assets test** -- 350k limit not mentioned anywhere.
13. **Consumer Contracts Regs 2013** -- 14-day cooling-off not in legal compliance list.
14. **Strategy competitor data** -- Moixa (5k should be 50-150k), Octopus (500 should be 5-50k), SunGift is Southwest not NW.
15. **Missing competitors** -- GivEnergy, Sonnen (Shell) not listed.
16. **Missing partner** -- Calico Homes (Burnley housing provider, 5000+ homes).
17. **Fabricated lender contacts** -- All named contacts are made up. Replace with generic.
18. **Energy Catalyst** -- Wrong Innovate UK programme (focuses on developing countries).
19. **NWF minimum** -- £250k is too low for institutional investor (should be £5M+).
20. **Great British Energy** -- Completely missing from funding database.

### NICE TO HAVE

21. Wire up Postcodes.io for live postcode lookups
22. Agile API integration for real-time half-hourly rates
23. ENWL open data integration for substations
24. Tests for all financial calculations
25. API routes and database persistence

---

## Files Modified This Session

### Modified (15 files):
- `src/shared/utils/scenarios.ts` -- Saving Sessions formula rebuilt, defaults updated
- `src/modules/tariffs/data.ts` -- Flux/IOF rates from live API, grid services fixed
- `src/modules/tariffs/calculator.ts` -- SS formula fixed, DFS double-count removed
- `src/modules/hardware/data.ts` -- IOF flags, Tesla PW3 notes, Huawei fixed
- `src/modules/hardware/types.ts` -- Added notes field to BatterySpec
- `src/modules/hardware/index.ts` -- Exports for stacks
- `src/modules/legal/data.ts` -- PAS 63100, BS 7671 Am4, G98 correction
- `src/modules/risk/data.ts` -- R-FIN-002 EFG->GGS
- `src/modules/funding/data.ts` -- EFG->GGS scheme type
- `src/modules/funding/components/lender-database.tsx` -- GGS label
- `src/modules/grid/substation-data.ts` -- BB postcode mappings, substation labels
- `src/agents/shared/configs.ts` -- EFG->GGS across agent configs
- `src/app/dashboard/page.tsx` -- 15+ new charts and KPIs
- `package.json` / `package-lock.json` -- Puppeteer added (for screenshots)

### New files (5):
- `src/modules/hardware/stacks.ts` -- 6 reference hardware stacks
- `src/modules/hardware/stacks.test.ts` -- 25 test cases
- `docs/BUSINESS-PLAN-HANDOVER.md` -- Handover for Claude Chat
- `docs/VERIFICATION-REPORT.md` -- 7-agent fact-check results
- `docs/SESSION-HANDOVER-26-MAR-2026.md` -- This file

### Data files (not to commit):
- `docs/epc-data/` -- Real EPC API data (contains property addresses)
- `docs/screenshots/` -- 24 app screenshots
- `docs/capture-screenshots.js` -- Puppeteer screenshot script

---

## Key Decisions / Context for Next Session

- **Dave's EPC API key** is in the session but NOT committed to code. It's registered to damiddleton23@gmail.com.
- **Hardware stacks must target 100-200kWh** -- don't apply small-domestic assumptions. 100kW inverters are appropriate.
- **Noise, space, and weight** are real deployment constraints that affect stack selection.
- **Three-phase is essential** for viable returns. Single-phase is marginal at best.
- **The Saving Sessions agent confirmed** SS and DFS are the same events, revenue stacks with normal export, and the bottleneck is inverter rate not battery capacity.
- **Build compiles clean** -- all 14 routes working as of end of session.
