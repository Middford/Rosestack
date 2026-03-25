# RoseStack Platform — Agent Review Findings (25 March 2026)

All 10 specialist agents reviewed their modules against the spec and conducted deep web research. This document captures every finding, prioritised for action.

---

## CRITICAL — Fix Before First Deployment

### 1. Octopus IOF Signup Pause (LIVE BLOCKER)
Octopus has temporarily paused new IOF/Flux signups due to "particularly volatile" energy prices. New RoseStack installations cannot currently join IOF. This is a deployment blocker.
- **Action:** Monitor daily, prepare fallback tariff strategy (Agile, standard Flux)
- **Source:** Risk module review, March 2026

### 2. IOF Rate Model is Fundamentally Wrong (Tariffs)
The code treats IOF as having different import/export rates. In reality, on IOF **import = export at all times** — that's the product's key feature. The entire rate model needs rebuilding.
- **Current:** 4-period structure with different import/export rates
- **Correct:** 2-period structure (peak/off-peak), import = export in each period
- **Impact:** Revenue calculator likely overstates by 30-50%

### 3. Saving Sessions Revenue Massively Overstated (Finance)
For a 204kWh system: model calculates ~£17,850/yr. Realistic is £200-800/yr. The formula treats full battery discharge at session rate, which isn't how DFS works.
- **Action:** Fix calculation to reflect actual Saving Sessions mechanics (baseline reduction, not full capacity export)
- **Also:** Sessions becoming "much less common" in 2026. Reduce defaults to 5-15 sessions/yr at £2.00-2.50/kWh

### 4. PAS 63100:2024 Not Referenced (Legal)
The fire safety compliance item mentions IEC 62619 and UL 9540A but NOT PAS 63100:2024, which is the **mandatory UK domestic BESS fire safety standard** since March 2024. This is the standard installers and local authorities enforce.
- **Action:** Add PAS 63100:2024 as primary fire safety compliance item

### 5. BS 7671 Amendment 4 Publishes 15 April 2026 (Legal)
New Chapter 57 dedicated to battery storage regulations (thermal runaway, isolation, location restrictions, documentation). Calendar event set for September — must be brought forward to April.
- **Action:** Update regulatory calendar, review Amendment 4 requirements immediately

### 6. FCA/Consumer Credit Risk on ESA (Legal)
Green Deal Plans were classified as regulated credit agreements. The ESA has parallels. Plus incoming BNPL/DPC regulation changes July 2026 could catch the ESA.
- **Action:** Obtain solicitor opinion BEFORE first ESA is signed, specifically addressing: consumer hire agreement risk, Green Deal precedent, BNPL/DPC changes

### 7. EFG Scheme Closed in 2020 (Funding)
Replaced by Growth Guarantee Scheme: 70% guarantee (not 75%), £2M cap (not £1.2M), 6-year terms (not 10).
- **Action:** Replace all EFG references with GGS. Scheme may expire March 2026.

### 8. SEIS/EIS Energy Generation Exclusion (Funding)
Energy generation is an excluded trade under SEIS/EIS. RoseStack may be classified as energy generation. The deal structurer recommends SEIS without flagging this risk.
- **Action:** Flag prominently in UI, obtain HMRC advance assurance before any EIS fundraise

---

## HIGH — Fix Before Scaling

### Data Accuracy (Hardware)
| Issue | Current | Correct |
|-------|---------|---------|
| Tesla PW3 discharge rate | 5kW | **11.5kW** |
| BYD HVS module capacity | 5.12kWh | **2.56kWh** |
| BYD HVM module capacity | 5.12kWh | **2.76kWh** |
| BYD IOF compatible | true | **false** |
| Fox ESS IOF compatible | false | **true** |
| Alpha ESS IOF compatible | false | **true** |
| GivEnergy charge/discharge rate | 3.6kW | **6.1kW** |
| GivEnergy weight | 112kg | **85kg** |
| Huawei efficiency | 97% | **95%** |
| Huawei IP rating | IP66 | **IP65** |
| Fox ESS ECS 10.4kWh | exists | **doesn't exist as a product** |
| Fogstar "Drift" | home storage | **campervan line** (home line is "Fogstar Energy") |
| Alpha ESS model | SMILE-B3 | **SMILE-G3** |
| Vaillant COP | 4.5 | **5.4** (at A7/W35) |

### Data Accuracy (Tariffs — every rate needs updating)
- **All export rates:** Octopus Outgoing dropped to 12p (1 March 2026)
- **All SEG rates:** Every supplier rate is wrong
- **Octopus Cosy:** Missing 22:00-00:00 cheap window (has 3 windows, not 2)
- **Agile API:** Product code should be AGILE-24-10-01
- **E.ON:** Product is "E.ON Next Drive Smart" not "Smart Flex"
- **British Gas:** Product is "EV Power" not "Electric Drivers"
- **Capacity Market T-1:** £5/kW/year, not £30

### Regulatory Compliance (Customers)
- **No GDPR consent tracking** on leads — regulatory requirement
- **No unsubscribe links** in email templates — PECR, up to £500k fine
- **No 14-day cooling-off** in proposals — Consumer Contracts Regulations 2013

### Competitor Intel Outdated (Strategy)
- **Octopus** now actively deploying batteries via "Zero Bills" programme targeting 100,000 homes by 2030 — confirmed direct competitor
- **Lunar Energy** controls ~150,000 devices (not 5,000)
- **Social Energy** alive and expanding (not unstable)

### Finance Calculation Issues
- **Debt repayment bug** in portfolio model — doesn't properly split principal/interest
- **IOF tariff rates used in scenario engine** are wrong (7.44p import vs real ~14.99p)
- **Insurance £500/yr** should scale with system size
- **Missing cost items:** G99 application, MCS certification, monitoring subscription

### LoA Supplier Acceptance (Legal)
- LoA is legally sound in principle but untested for domestic energy accounts
- **Action:** Engage Octopus Energy to confirm they accept domestic LoAs for fleet management

---

## MEDIUM — Important Improvements

### Missing Features (All Modules)
- **No AI research agents built** — all 9 agent configs exist in /src/agents/shared/configs.ts but no module has an actual agent runner UI
- **No API routes** — no /api/[module]/ endpoints exist anywhere
- **No database persistence** — all modules use in-memory seed data
- **No tests** — only the shared scenario engine has tests

### Grid Module
- All 15 substations are fabricated — ENWL has real open data (electricitynorthwest.opendatasoft.com)
- Revenue calculation bypasses shared scenario engine
- P483 went live Nov 2025 — major enabler not reflected
- Real API endpoints found: ENWL substations, EPC register, flexibility tenders

### Portfolio Module
- Portfolio map is SVG placeholder, not interactive Leaflet
- No postcode autocomplete (Postcodes.io is free)
- No EPC API auto-lookup (gov.uk API is free)
- No PDF generation for portfolio summaries
- No sensitivity sliders on Financial tab
- Integration APIs identified: mySigen developer portal, GivEnergy API, Enode unified API

### Funding Module
- Seedrs renamed to Republic Europe
- Funding Circle no longer P2P (institutional since 2022)
- SITR closed April 2023 — referenced incorrectly
- Missing: National Wealth Fund, Great British Energy
- EIS limits outdated (now £30M gross assets, £10M annual)

### Strategy Module
- Competitor map is a table, not a geographic map
- Missing local Lancashire competitors (ECO Renewables, White Energi, APG Domestic, etc.)
- **Calico Homes** identified as #1 strategic partner — 5,000+ homes in Burnley, already building solar-ready homes
- Sodium-ion arriving faster than planned — CATL mass production Dec 2025

### Risk Module
- 7 risk scores and 5 opportunity scores need updating
- 4 new risks to add (IOF pause, regional battery price premium, lithium-ion safety legislation, geopolitical volatility)
- 4 new opportunities to add (ENWL reduced minimum, Warm Homes Plan, market validation, stationary storage cost collapse)
- Net position formula uses simplified approximation

### Customers Module
- No lead creation form or editing
- No drag-and-drop on Kanban
- No LoA/tariff authority tracking
- **Addressable market: ~4,500-8,000 homes** in BB postcodes
- **No direct competitor** with same ownership model in Lancashire
- **Referral programme is competitive** — stacking mechanism unique in market

---

## POSITIVE FINDINGS

1. **All 10 modules structurally complete** — every spec'd UI component exists
2. **Three-scenario standard correctly applied** across all financial outputs
3. **Shared scenario engine properly used** by finance and portfolio modules
4. **Risk module is exhaustive** — all 44 risks and 39 opportunities from spec are seeded
5. **Referral programme is competitive** to strong vs market benchmarks
6. **No direct competitor** in Lancashire with RoseStack's ownership/fleet model
7. **Portfolio wizard is comprehensive** — all 5 steps, all 6 property tabs
8. **ENWL flexibility market is expanding** — lowered minimums, more tender sites, £14M available
9. **Stationary storage costs collapsing** — down 45% in 2025 to $70/kWh
10. **P483 now live** — domestic batteries can participate in flexibility markets

---

## REAL DATA SOURCES IDENTIFIED

| Resource | URL | Cost |
|----------|-----|------|
| ENWL Substations | electricitynorthwest.opendatasoft.com | Free |
| ENWL Flexibility Tenders | electricitynorthwest.opendatasoft.com | Free |
| EPC Register API | epc.opendatacommunities.org/api/v1 | Free |
| Postcodes.io | postcodes.io | Free |
| OS Code-Point Open | osdatahub.os.uk/downloads/open/CodePointOpen | Free |
| Octopus Agile API | api.octopus.energy | Free |
| mySigen Developer Portal | developer.sigencloud.com | Partnership |
| GivEnergy API | givenergy.cloud/docs/api/v1 | Free |
| Enode Energy API | enode.com | Subscription |
| ENWL G99 Fast Track | enwl.co.uk/get-connected | Free |
| MCS Installer Register | mcscertified.com | Free |
| Piclo Max / ElectronConnect | piclo.com / electron.net | Registration |
| GB Capacity Market | gbcmn.nationalenergyso.com | Free |

---

## NEW RISKS TO ADD (from research)

| ID | Risk | P | I | Score |
|----|------|---|---|-------|
| R-NEW-001 | Geopolitical energy price volatility (Middle East conflict) | 4 | 3 | 12 |
| R-NEW-002 | IOF tariff signup suspension (LIVE — March 2026) | 5 | 4 | 20 |
| R-NEW-003 | Regional battery price premium (UK 56-227% above China) | 4 | 3 | 12 |
| R-NEW-004 | Lithium-ion battery safety legislation (2 bills in Parliament) | 4 | 3 | 12 |

## NEW OPPORTUNITIES TO ADD (from research)

| ID | Opportunity | P | I | Score |
|----|-------------|---|---|-------|
| O-NEW-001 | ENWL reduced flex minimum (50kW to 10kW) | 5 | 4 | 20 |
| O-NEW-002 | Warm Homes Plan battery inclusion (£15B) | 4 | 4 | 16 |
| O-NEW-003 | Major brand market validation (Duracell, Lunar) | 5 | 2 | 10 |
| O-NEW-004 | Stationary storage cost collapse (45% drop in 2025) | 5 | 4 | 20 |
