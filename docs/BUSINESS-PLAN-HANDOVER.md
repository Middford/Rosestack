# RoseStack Energy Platform -- Business Plan Handover

**Prepared:** 26 March 2026
**For:** Claude Chat (Business Plan Author)
**From:** Dave Middleton, Co-Founder

---

## 1. What Is RoseStack?

RoseStack Energy is a Lancashire-based battery storage deployment and management business. We install large battery systems (100--200 kWh) in homeowners' gardens across East Lancashire, retaining ownership of the hardware. Revenue comes from energy arbitrage -- buying electricity cheaply overnight and selling it back at peak rates -- plus grid flexibility services and Saving Sessions.

**The target:** 100 homes over 8 years across East Lancashire (BB postcode area).

**Founders:** Dave Middleton and Josh Knight (both employed full-time elsewhere -- this is built to run with minimal manual intervention).

**Key differentiator:** We own the assets, the homeowner gets a monthly payment, and we keep the arbitrage revenue. Think "solar farm in a garden."

---

## 2. The Platform

The RoseStack Platform is a custom-built web application that serves as the operational brain of the business. It covers every aspect of the operation -- from sourcing hardware and identifying properties, through financial modelling and investor materials, to live portfolio monitoring and risk management.

**Tech stack:** Next.js 15 / TypeScript / Recharts / Leaflet maps
**Design:** Dark-mode dashboard with rose-red (#B91C4D) brand accent

The platform has 12 modules, each covering a distinct area of the business. Every financial output displays three scenarios (Best / Likely / Worst case) -- this is a non-negotiable standard across the entire platform.

---

## 3. Platform Modules

### 3.1 Fleet Dashboard (Home Screen)

**Screenshot:** `screenshots/01-dashboard.png` (full page), `screenshots/01-dashboard-viewport.png` (above the fold)

The main dashboard aggregates KPIs from every module into a single view:

**Hero Stats (top row, 5 cards):**
- **Homes Deployed:** 2 of 100 target (with progress indicator)
- **Monthly Revenue / Home:** Three-scenario display -- Best: £1,295, Likely: £963, Worst: £267
- **Best Tariff Spread:** 14.9p/kWh (Agile peak spread)
- **Pipeline:** 16 total (3 contracted, 2 live)
- **Net R&O Position:** £3,510,600 (net risk vs opportunity value)

**Charts:**
- **Portfolio Revenue Projection (10yr):** Area chart with three colour-coded scenario curves (green/blue/amber) showing revenue growth from Year 1 to Year 10
- **Revenue Streams (Donut):** Flux Arbitrage 85%, Grid Services 6%, Saving Sessions 5%, ENWL Flexibility 4% (Garden Standard reference stack, no solar)
- **Tariff Arbitrage Spreads:** Horizontal bar chart comparing top 6 tariff spreads
- **Sales Pipeline:** Funnel showing leads at each stage (New through to Live)
- **Risk & Opportunity Snapshot:** Colour-coded risk/opportunity counts by severity

---

### 3.2 Hardware Database

**Screenshot:** `screenshots/02-hardware.png` (full), `screenshots/02-hardware-viewport.png`

A comprehensive database of all battery, inverter, solar panel, and heat pump options under consideration.

**Key data:**
- 14 battery models across 3 chemistries (LFP, NMC, Sodium-Ion)
- 6 inverter models (1--15 kW)
- Capacity per module: 3--25 kWh
- Wholesale prices: £1,500--£8,000
- Round-trip efficiency: 88--96%
- Warranties: 10--15 years
- IOF (Intelligent Octopus Flux) compatibility flags

**5 tabs:**
1. **Catalogue** -- Searchable/sortable table of all hardware
2. **System Builder** -- Interactive wizard to compose battery + inverter + solar systems with cost calculator and compatibility warnings
3. **Compare** -- Side-by-side comparison of selected hardware
4. **Cost Tracker** -- Line charts tracking hardware cost trends over time by chemistry type
5. **Compatibility Matrix** -- Grid showing which batteries pair with which inverters

---

### 3.3 Tariffs & Revenue

**Screenshot:** `screenshots/03-tariffs.png` (full), `screenshots/03-tariffs-viewport.png`

The UK energy tariff database, revenue calculator, and portfolio tariff optimisation engine.

**Key data:**
- 15+ UK energy tariffs tracked (Octopus Intelligent Flux, Agile, Flux, and all major suppliers)
- Time-of-use rates, standing charges, import/export rates
- Real-time tariff alerts

**7 tabs:**
1. **Tariff Database** -- All tariffs with import/export rates, standing charges, arbitrage spreads, and Kraken control flags
2. **Rate Timeline** -- 24-hour rate visualisation showing peak/off-peak windows
3. **Revenue Calculator** -- Select a battery system + tariff, see three-scenario daily/monthly/annual revenue projections broken down by revenue stream
4. **Comparison** -- Side-by-side tariff revenue projections
5. **Monitor** -- Live alerts (e.g., "Agile spread narrowed 30%")
6. **Historical** -- Past rate data and trends
7. **Portfolio Sweep** -- Bulk optimiser: "Which tariff should each property be on?" with projected revenue impact per home

---

### 3.4 Financial Modelling

**Screenshot:** `screenshots/04-finance.png` (full), `screenshots/04-finance-viewport.png`

The financial engine of the platform. Per-home and portfolio-level projections across 10--20 years with 14 adjustable assumption parameters.

**Assumption parameters include:** Energy inflation, battery degradation, IOF spread changes, Saving Sessions frequency, flexibility revenue, hardware costs, homeowner churn, deployment pace, interest rates, cycles/day, solar self-consumption, and maintenance costs.

**8 tabs:**
1. **Model Builder** -- Per-home 10-year projection: Gross Revenue, Homeowner Payment, Maintenance, Insurance, Net Revenue, Cumulative Revenue, Battery Capacity %, ROI -- all in three scenarios
2. **Portfolio Model** -- Aggregate across multiple homes with 10-year portfolio P&L
3. **Sensitivity Analysis** -- Tornado charts showing which variables move IRR/NPV the most
4. **Scenarios** -- Side-by-side comparison: Payback Period, IRR, NPV, Annual Net Revenue, DSCR with traffic-light covenant compliance
5. **Break-Even** -- Calculates payback months (e.g., Garden Standard on Flux: likely 92 months; Garage King: 68 months)
6. **Assumptions** -- Editable assumption sets per scenario
7. **Investor Summary** -- Formatted report with executive summary, key metrics, covenant compliance, and charts ready for lenders
8. **Tracker** -- Actual vs projected revenue with variance analysis

---

### 3.5 Grid Intelligence

**Screenshot:** `screenshots/05-grid.png` (full), `screenshots/05-grid-viewport.png`

Interactive mapping of the ENWL (Electricity North West) distribution network across East Lancashire, with property prospecting and deployment planning.

**Key data:**
- 15 ENWL substations mapped with capacity (MVA), current load (%), and constraint status
- 129 target properties scored across 5 factors (grid constraint, property type, solar potential, household income, social capital)
- 5 active flexibility tenders worth £338k/yr combined
- Average property score: 53/100

**4 tabs:**
1. **Grid Map** -- Full interactive Leaflet map with substation markers (green/yellow/red by constraint status), property prospect pins (colour-coded by score grade A--F), flexibility tender zones, and click-through detail panels
2. **Property Finder** -- Filterable/sortable table of all 129 target properties with score breakdowns and three-scenario revenue estimates
3. **Substations** -- Detailed substation dashboard: capacity, load, constraint status, flexibility tenders, max new connections
4. **Deployment Planner** -- Phased deployment roadmap across 10 years with target homes, substations, timelines, and capex per phase

---

### 3.6 Strategy & Moat

**Screenshot:** `screenshots/06-strategy.png` (full), `screenshots/06-strategy-viewport.png`

Competitive intelligence, partnership pipeline, emerging technology tracking, and strategic moat building.

**Key data:**
- 7 competitors analysed with threat levels and differentiators
- 5 partnerships tracked through pipeline stages
- 8 emerging technologies on radar
- 12 moat-building actions tracked
- 5-year strategic roadmap across 4 phases

**5 tabs:**
1. **Competitor Map** -- 2D positioning chart (Price vs Scale) with competitors plotted and threat-level colour coding
2. **Partnership Pipeline** -- Funnel view: Prospecting -> Negotiating -> Agreed -> Active, with potential homes per partner
3. **Technology Radar** -- Quadrant chart (Relevance vs Maturity): Adopt / Monitor / Avoid recommendations for each emerging tech
4. **Moat Scorecard** -- 5 moat dimensions (Cost, Technology, Brand, Network, Data) rated 1--5 with action tracking
5. **Strategy Timeline** -- Gantt chart showing initiatives across Phase 1 (2026--27) through Phase 4 (2029--30)

---

### 3.7 Funding & Investment

**Screenshot:** `screenshots/07-funding.png` (full), `screenshots/07-funding-viewport.png`

Investment readiness toolkit: lender targeting, deal structuring, covenant tracking, stress testing, and virtual data room.

**Key data:**
- 13 lenders in database (banks, alternative lenders, family offices)
- Loan ranges: £100k--£5M
- 8--10 financial covenants tracked (DSCR, LTV, interest coverage)
- 20+ data room documents with status tracking
- Active investor pipeline with stages and commitment amounts

**6 tabs:**
1. **Lender Database** -- All 13 lenders with rate expectations, DSCR requirements, max loan sizes
2. **Deal Structurer** -- Interactive tool: input homes, tariff, funding structure -> calculates DSCR, covenant compliance (green/amber/red), and generates term sheet
3. **Covenant Tracker** -- Dashboard showing all covenant compliance across three scenarios with traffic-light status
4. **Investor Pipeline** -- Pipeline view: Warm Lead -> Interested -> Term Sheet -> Funded, with total pipeline value
5. **Stress Tests** -- "What if tariff spread compresses 30%?" / "What if hardware costs increase 20%?" -- recalculates DSCR and covenant compliance
6. **Data Room** -- 20+ documents with status (Draft / Ready / Shared / Signed) and "Ready to pitch?" completion percentage

---

### 3.8 Legal & Compliance

**Screenshot:** `screenshots/08-legal.png` (full), `screenshots/08-legal-viewport.png`

Regulatory compliance tracking, G99 grid connection pipeline, certification management, and contract library.

**Key data:**
- 23 compliance requirements tracked (MCS, G99, DNO, BS standards)
- 9 G99 grid connection applications in pipeline
- 14 legal risks scored by probability and impact
- Contract templates (ESA, installer NDA, partner agreements)
- Regulatory calendar with upcoming deadlines

**6 tabs:**
1. **Compliance** -- Checklist: all 23 requirements with status (Not Started / In Progress / Done), responsible person, due dates
2. **G99 Pipeline** -- Application tracker: Draft -> Submitted -> Approved -> Connected, with ENWL references and SLA timelines
3. **Certifications** -- MCS and other certification status per home, with certificate references and renewal dates
4. **Contracts** -- Template library: ESA (10-year homeowner contract), installer agreements, NDAs
5. **Risk Register** -- 14 legal risks with probability/impact scoring, mitigation strategies, and status
6. **Calendar** -- Upcoming regulatory events, policy reviews, tariff consultations, and grid code updates

---

### 3.9 Customer Acquisition

**Screenshot:** `screenshots/09-customers.png` (full), `screenshots/09-customers-viewport.png`

Lead management CRM, sales pipeline, referral engine, and acquisition analytics.

**Key data:**
- 35+ leads across 7 pipeline stages
- Lead scoring model (property grade, phase, garden access, income, solar potential)
- 8 referral sources with conversion rates
- 4 active marketing campaigns with ROI tracking
- 3 club partnerships (Rovers Community Trust, local groups)

**8 tabs:**
1. **Lead Pipeline** -- CRM funnel: New (4) -> Contacted (8) -> Qualified (6) -> Proposal (5) -> Contracted (3) -> Installing (2) -> Live (7)
2. **Lead Scoring** -- Automated scoring with grades A--F (hot/warm/cold)
3. **Referrals** -- Source analysis: leads sourced, converted, conversion rate, CPA per channel
4. **Campaigns** -- Campaign tracker with budget, spend, leads generated, and ROI per campaign
5. **Clubs** -- Partnership management with potential homes and revenue attribution
6. **Revenue Attribution** -- Which acquisition channel drives which revenue?
7. **Sales Materials** -- Proposal templates, brochures, elevator pitch, FAQ
8. **Email Templates** -- Welcome, qualification, proposal, installation, and go-live emails

---

### 3.10 Portfolio Management

**Screenshot:** `screenshots/10-portfolio.png` (full), `screenshots/10-portfolio-viewport.png`

Live property register, system monitoring, and revenue tracking for all deployed homes.

**Key data:**
- Live properties with full system specs, tariff assignment, homeowner payments
- G99 references, MCS certificates, event timelines
- Actual vs projected revenue with variance analysis
- System health monitoring (degradation, temperature, cycles)

**Features:**
- **Portfolio Dashboard** -- KPI cards (total homes, portfolio capacity, monthly revenue, avg payback progress, portfolio DSCR), property table, portfolio map, revenue chart, alerts panel
- **Property Detail** (click-through per home) -- Full specs, event timeline (qualified -> contracted -> installed -> live), revenue tabs (three-scenario vs actual), system health tabs, action buttons (change tariff, update payment, schedule maintenance)
- **Portfolio Map** -- Leaflet map with pins coloured by status (green=live, yellow=maintenance, red=alert)
- **Bulk Operations** -- Bulk tariff changes, payment updates, status updates with preview of revenue impact
- **Alerts** -- Revenue underperformance, accelerated degradation, maintenance due, tariff optimisation opportunities, contract renewals

---

### 3.11 Risk & Opportunities

**Screenshot:** `screenshots/11-risk.png` (full), `screenshots/11-risk-viewport.png`

Enterprise risk and opportunity register with impact modelling and stress testing.

**Key data:**
- 48 risks across 6 categories (Tariff & Revenue, Technology, Regulatory, Operational, Market, Financial)
- 43 opportunities across 5 categories (Revenue Enhancement, Hardware, Market, Partnerships, Strategic)
- Each scored by probability (1--5) and impact (1--5)
- Net expected position: £3,510,600

**7 tabs:**
1. **Overview** -- Risk heat map (probability x impact scatter) and Opportunity heat map side by side, Net Position waterfall chart, materialisation timeline
2. **Register** -- Full sortable/filterable table of all risks and opportunities with detail panels
3. **Risk Models** -- 4 modellers in a 2x2 grid: Tariff Change, Energy Price, Technology Failure, Regulatory Change -- plus Combined Stress Test
4. **Opp Models** -- Hardware Cost, Revenue Enhancement, and Market Expansion modellers
5. **Scenarios** -- Combined stress testing across all three scenarios (baseline vs stressed)
6. **Mitigation** -- Action register: mitigation strategy, owner, status, coverage progress
7. **Export** -- One-click PDF export for board presentations and investor materials

---

### 3.12 Product Design (Own-Brand Battery)

**Screenshot:** `screenshots/12-product-design.png` (full), `screenshots/12-product-design-viewport.png`

Roadmap for RoseStack's own-brand sodium-ion battery system, targeting Year 5 launch (2030).

**Key data:**
- 6 sodium-ion cell suppliers evaluated (CATL, BYD, etc.)
- Best cell: CATL at 175 Wh/kg, 10,000 cycles
- 6 inverter options evaluated for Na-Ion compatibility
- 9 regulatory/certification milestones (total budget ~£850k)
- Target cost: £280/kWh (vs current Sigenergy £295, Givenergy £280)
- 5 manufacturing models compared (in-house, OEM, hybrid)

**6 tabs:**
1. **Cell Comparison** -- Side-by-side Na-Ion cell options with energy density, cycle count, cost, thermal properties, production status
2. **Pack Designer** -- Interactive system design: select cell, BMS, enclosure -> calculates capacity, weight, cost, dimensions
3. **Cost Model** -- Manufacturing economics: COGS, gross margin, vs competitors
4. **Inverter Compatibility** -- Compatibility matrix for Na-Ion cells with recommended pairings
5. **Regulatory Roadmap** -- Gantt chart: BS 16632 -> CE marking -> MCS -> DNO approval (Q1 2027 to Q2 2030)
6. **Manufacturing** -- Go-to-market options: in-house (£2M capex), OEM white-label, hybrid (recommended)

---

## 4. Three-Scenario Financial Standard

Every financial output in the platform displays three projections. This is non-negotiable.

| Scenario | Colour | Purpose |
|----------|--------|---------|
| **Best Case** | Green (#10B981) | Tailwinds materialise -- rates improve, costs fall, deployment accelerates |
| **Likely Case** | Blue (#3B82F6) | Conservative but realistic -- always displayed most prominently |
| **Worst Case** | Amber (#F59E0B) | Headwinds hit -- spreads compress, costs rise, churn increases |

**Key assumptions (Likely Case):**
- Energy inflation: 5% p.a.
- Battery degradation: 2% p.a.
- Saving Sessions: 12/year at £2.25/kWh
- Flexibility revenue: £500/home/year
- Cycles per day: 2
- Solar self-consumption: 35%
- Homeowner churn: 1% p.a.
- Interest rate: Base + 2.5%

**Financial metrics displayed:** Payback Period (months), IRR (%), NPV (£), DSCR (x), Annual Net Revenue (£)

**Covenant compliance uses traffic lights:**
- Green: All three scenarios above threshold
- Amber: Likely + Best above, Worst below
- Red: Likely case below threshold

---

## 5. Revenue Model

RoseStack generates revenue from 5 streams:

| Stream | Share | Description |
|--------|-------|-------------|
| **Flux Arbitrage** | 85% | Buy cheap overnight (17.90p), sell at peak (30.68p) via Octopus Flux |
| **Grid Services** | 6% | Saving Sessions, ENWL flexibility, Capacity Market via aggregators |
| **ENWL Flexibility** | 4% | Local network flexibility tenders via Piclo Flex |
| **Saving Sessions** | 8% | National Grid ESO demand response events |
| **SEG Export** | 5% | Smart Export Guarantee payments for exported energy |

**Corrected revenue figures (Flux tariff, March 2026):**

| Stack | Monthly Net (Likely) | Annual Net (Likely) | Payback |
|-------|---------------------|---------------------|---------|
| Garden Standard (160kWh/40kW) | £963 | £11,562 | 92 months |
| Garage King (192kWh/96kW) | £1,295 | £15,538 | 68 months |
| Full Package (192kWh + 6kWp solar) | £1,334 | £16,002 | 71 months |
| Quiet Neighbour (80kWh/20kW) | £433 | £5,191 | 108 months |
| Single-Phase Starter (54kWh/11.5kW) | £267 | £3,209 | 129 months |

*Note: Old figures (£625/month, 18-month payback) were incorrect and have been removed.*

---

## 6. Design System

- **Theme:** Dark mode primary (Eclipse UI Kit inspired)
- **Brand accent:** Rose red (#B91C4D)
- **Chart palette:** Cyan (#06B6D4), Emerald (#10B981), Amber (#F59E0B), Violet (#8B5CF6), Blue (#3B82F6), Pink (#EC4899)
- **Typography:** Bold headings with secondary/tertiary text hierarchy
- **Layout:** Fixed left sidebar (12-module navigation), responsive grid content area
- **Mobile:** Responsive -- grids adapt from 2 columns on mobile to 4--6 on desktop

---

## 7. Screenshot Index

All screenshots are in `docs/screenshots/`. Two versions of each page:
- `*-viewport.png` -- Above-the-fold view (1440x900 at 2x resolution)
- `*.png` -- Full page capture (scrolled)

| # | Module | Files |
|---|--------|-------|
| 1 | Dashboard | `01-dashboard.png`, `01-dashboard-viewport.png` |
| 2 | Hardware | `02-hardware.png`, `02-hardware-viewport.png` |
| 3 | Tariffs | `03-tariffs.png`, `03-tariffs-viewport.png` |
| 4 | Finance | `04-finance.png`, `04-finance-viewport.png` |
| 5 | Grid Intelligence | `05-grid.png`, `05-grid-viewport.png` |
| 6 | Strategy & Moat | `06-strategy.png`, `06-strategy-viewport.png` |
| 7 | Funding | `07-funding.png`, `07-funding-viewport.png` |
| 8 | Legal & Compliance | `08-legal.png`, `08-legal-viewport.png` |
| 9 | Customer Acquisition | `09-customers.png`, `09-customers-viewport.png` |
| 10 | Portfolio | `10-portfolio.png`, `10-portfolio-viewport.png` |
| 11 | Risk & Opportunities | `11-risk.png`, `11-risk-viewport.png` |
| 12 | Product Design | `12-product-design.png`, `12-product-design-viewport.png` |

---

## 8. Notes for the Business Plan Author

- The platform is a **working prototype** (v0.1.0, Phase 1 complete). All data shown is seeded/realistic but not live production data.
- The three-scenario standard should be reflected throughout the business plan -- investors expect to see Best / Likely / Worst projections.
- The Grid Intelligence map (screenshot 05) is particularly compelling for visual presentations -- it shows real ENWL substations and prospecting data across East Lancashire.
- The Risk & Opportunities module (screenshot 11) demonstrates sophisticated risk management -- the heat maps and net position waterfall are investor-grade.
- The Product Design module shows the Year 5 ambition (own-brand sodium-ion battery) which is a strong strategic narrative.
- Key financial headline: **£963/month likely revenue per home (Garden Standard on Flux), 92-month payback, targeting 100 homes over 8 years.** Premium stack (Garage King): £1,295/month, 68-month payback.
