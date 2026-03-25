# RoseStack Energy — Multi-Agent Build Orchestration

## Project Overview

**RoseStack Energy** is a Lancashire-based battery storage business that deploys large-scale residential battery systems (100–200kWh per home) into three-phase properties. Revenue comes from energy arbitrage on Octopus Intelligent Flux (IOF), Saving Sessions, and grid flexibility markets via Piclo Flex. The company retains ownership of the hardware and pays homeowners a monthly fee.

This document orchestrates the overnight build of the **RoseStack Platform** — a full-stack web application that serves as both the operational backbone of the business AND embeds specialised AI research agents for ongoing strategic intelligence.

**Founder context:** Dave Middleton is a non-developer building through AI-assisted development. The platform must be production-ready, well-documented, and maintainable. Dave's existing projects (Construstack, QuidStack) use Next.js/TypeScript stacks — but the agents should recommend the optimal stack for THIS project's specific needs (real-time monitoring, IoT data ingestion, financial modelling, mapping).

---

## Architecture Principles

1. **Monorepo preferred** — all agents work in one repository with clear module boundaries
2. **Each agent owns a directory** — no agent modifies another agent's files
3. **Shared types live in `/src/shared/`** — all agents import from here, none write to it except Agent 0 (Orchestrator)
4. **Database migrations are sequential** — agents propose migrations, only one applies them
5. **API routes follow convention** — `/api/[module]/[action]`
6. **Environment variables documented** — every agent lists what env vars their module needs
7. **Tests alongside code** — each agent writes tests for their own module
8. **Git discipline** — each agent works on their own feature branch: `agent/[number]-[name]`
9. **Three-scenario standard** — every financial output in the entire application MUST show three projections: **Best Case**, **Likely Case**, and **Worst Case**. This is non-negotiable and applies everywhere a £ figure or projection is displayed. See "Three-Scenario Financial Standard" below for full specification.

---

## Three-Scenario Financial Standard

**CRITICAL: This applies to EVERY module that displays financial data. No exceptions.**

Every financial projection, revenue figure, payback calculation, ROI, NPV, IRR, DSCR, or cash flow chart in the platform must present three scenarios side by side:

| Scenario | Colour | Purpose |
|----------|--------|---------|
| **Best Case** | Green | What happens when tailwinds materialise — hardware costs drop, rates improve, flexibility revenue unlocks, referrals exceed targets |
| **Likely Case** | Blue | Base assumptions — the model we'd show a careful lender. Conservative but realistic. |
| **Worst Case** | Red/Amber | What happens when headwinds hit — tariff rates compress, degradation accelerates, deployment slows, costs increase |

### Default Assumptions Per Scenario

These are starting defaults. Users can override any assumption per scenario.

| Assumption | Worst Case | Likely Case | Best Case |
|-----------|-----------|-------------|-----------|
| Energy inflation | 2% p.a. | 5% p.a. | 8% p.a. |
| Battery degradation | 3% p.a. | 2% p.a. | 1.5% p.a. |
| IOF spread change | -20% from current | No change | +15% from current |
| Saving Sessions per year | 10 (reduced) | 25 (current) | 40 (expanded) |
| Saving Sessions rate | £2.00/kWh | £3.50/kWh | £5.00/kWh |
| Flexibility revenue | £0 (not available) | £500/home/yr | £2,000/home/yr |
| Hardware cost change | +10% (supply issues) | No change | -20% (price drop) |
| Installation cost change | +15% (labour shortage) | No change | -10% (efficiency gains) |
| Homeowner churn | 5% p.a. | 1% p.a. | 0% |
| Deployment pace | 50% of target | 100% of target | 120% of target |
| Interest rate on debt | Base + 4% | Base + 2.5% | Base + 1.5% |
| Cycles per day | 1.5 | 2 | 2.5 (triple cycling emerging) |
| Solar self-consumption | 20% | 35% | 50% |
| Maintenance cost | +25% above estimate | As estimated | -15% (volume discount) |

### How It Displays

**Charts:** Three lines on every projection chart — green (best), blue (likely), red (worst). The area between best and worst should be lightly shaded to show the range of outcomes. The likely case line should be slightly bolder/thicker.

**Summary Cards:** Where a single number is shown (e.g., "Monthly Revenue: £2,667"), display it as:
```
Monthly Revenue
£3,180 ← Best
£2,667 ← Likely  (prominent, larger font)
£1,890 ← Worst
```

**Tables:** For projection tables (Year 1–10), show three columns per metric or use tabs to switch between scenarios, with a "Compare All" view that shows all three side by side.

**Payback Period:** Show as a range — "Payback: 14–26 months (likely: 18 months)"

**Traffic Lights:** Wherever DSCR or covenant metrics are shown:
- All three scenarios above covenant = 🟢
- Likely and Best above, Worst below = 🟡
- Likely below covenant = 🔴

### Where It Applies (Every Module)

| Module | What gets three scenarios |
|--------|-------------------------|
| **Agent 2 (Tariffs)** | Revenue calculator output — daily, monthly, annual revenue per tariff |
| **Agent 3 (Finance)** | Every financial model: per-home P&L, portfolio model, sensitivity analysis, break-even analysis, investor summary |
| **Agent 4 (Grid)** | Estimated revenue per property in property finder (show range, not single number) |
| **Agent 6 (Funding)** | DSCR projections, covenant tracking, stress test outputs, investor materials |
| **Agent 8 (Customers)** | Homeowner proposal PDF — show "your savings could be £X–£Y per year" across the three scenarios |
| **Agent 9 (Portfolio)** | Add Property wizard Step 4 (auto-generated projection), property detail revenue tab, portfolio dashboard revenue chart, portfolio summary PDF |
| **Agent 10 (R&O)** | All scenario modelling outputs, combined stress tests, net position waterfall |
| **Main Dashboard** | Hero stats should show likely with best/worst as smaller range indicators |

### Shared Scenario Engine (Agent 0 builds this)

Agent 0 must create a shared scenario engine in `/src/shared/utils/scenarios.ts` that:

1. Defines the `ScenarioAssumptions` type with all adjustable parameters
2. Provides three default assumption sets: `BEST_CASE`, `LIKELY_CASE`, `WORST_CASE`
3. Exports a `calculateScenario(systemConfig, tariff, assumptions)` function that returns a full `YearlyProjection[]`
4. Exports a `calculateAllScenarios(systemConfig, tariff)` function that returns `{ best: YearlyProjection[], likely: YearlyProjection[], worst: YearlyProjection[] }`
5. Allows any assumption to be overridden per scenario
6. All agents import from this shared engine — nobody builds their own projection logic

This ensures every module shows consistent numbers. If you change a likely-case assumption in settings, it ripples through every chart, card, and table in the entire platform.

---

## Agent Registry

| # | Agent Name | Branch | Directory | Purpose |
|---|-----------|--------|-----------|---------|
| 0 | Orchestrator | `main` | `/` root + `/src/shared/` | Project scaffold, shared types, DB schema, merge coordination |
| 1 | Hardware Specialist | `agent/1-hardware` | `/src/modules/hardware/` | Battery, inverter, solar PV, heat pump database and comparison engine |
| 2 | Tariff Expert | `agent/2-tariffs` | `/src/modules/tariffs/` | UK energy tariff database, rate engine, revenue calculator |
| 3 | Financial Modeller | `agent/3-finance` | `/src/modules/finance/` | Financial projections, scenario modelling, sensitivity analysis |
| 4 | Grid Expert | `agent/4-grid` | `/src/modules/grid/` | UK grid data, substation mapping, 3-phase prospecting, flexibility markets |
| 5 | Strategy & Moat | `agent/5-strategy` | `/src/modules/strategy/` | Partnership opportunities, emerging tech tracker, competitive intelligence |
| 6 | Financing & Investment | `agent/6-funding` | `/src/modules/funding/` | Lender readiness, deal structuring, investor materials, stress testing |
| 7 | Legal & Compliance | `agent/7-legal` | `/src/modules/legal/` | Regulatory tracker, certification pipeline, contract templates, compliance |
| 8 | Customer Acquisition | `agent/8-customers` | `/src/modules/customers/` | Lead management, referral engine, sales pipeline, tariff authority management |
| 9 | Portfolio Manager | `agent/9-portfolio` | `/src/modules/portfolio/` | Live property register, system assignment, real-time performance, revenue tracking |
| 10 | Risk & Opportunities Manager | `agent/10-risk` | `/src/modules/risk/` | Threat & opportunity identification, impact modelling, mitigation/capture tracking, scenario stress testing |

---

## Agent 0: Orchestrator (RUNS FIRST)

**Branch:** `main`
**Responsibility:** Sets up the entire project scaffold before any other agent starts.

### Tasks

1. **Evaluate and select tech stack** based on RoseStack's specific requirements:
   - Real-time data from battery systems (MQTT/WebSocket)
   - Financial modelling with complex calculations
   - Mapping and geospatial data (substations, postcodes, property locations)
   - AI agent integration (LLM API calls for research agents)
   - Multi-tenant potential (future SaaS licensing)
   - Mobile-responsive dashboards (Dave will check from his phone at Sellafield)
   - Consider: Next.js vs Remix vs SvelteKit, Drizzle vs Prisma, PostgreSQL vs Supabase, mapping libraries (Mapbox/Leaflet/deck.gl), charting (Recharts/D3/Plotly), real-time (Socket.io/Pusher/Supabase Realtime)
   - Document the decision and rationale in `/docs/ARCHITECTURE.md`

2. **Scaffold the project:**
   ```
   /rosestack-platform/
   ├── /src/
   │   ├── /app/                    # Routes / pages
   │   │   ├── /dashboard/          # Main fleet dashboard
   │   │   ├── /hardware/           # Hardware comparison tool
   │   │   ├── /tariffs/            # Tariff analysis
   │   │   ├── /finance/            # Financial modelling
   │   │   ├── /grid/               # Grid map & prospecting
   │   │   ├── /strategy/           # Strategy intelligence
   │   │   ├── /funding/            # Investment readiness
   │   │   ├── /legal/              # Compliance tracker
   │   │   ├── /customers/          # CRM & sales pipeline
   │   │   ├── /portfolio/          # Live property register & performance
   │   │   ├── /risk/               # Risk management & scenario modelling
   │   │   └── /api/                # API routes
   │   ├── /modules/                # Agent-owned business logic
   │   │   ├── /hardware/
   │   │   ├── /tariffs/
   │   │   ├── /finance/
   │   │   ├── /grid/
   │   │   ├── /strategy/
   │   │   ├── /funding/
   │   │   ├── /legal/
   │   │   ├── /customers/
   │   │   ├── /portfolio/
   │   │   └── /risk/
   │   ├── /shared/                 # Shared types, utils, UI components
   │   │   ├── /types/
   │   │   ├── /ui/                 # Design system components
   │   │   ├── /utils/
   │   │   └── /db/                 # Database client & schema
   │   └── /agents/                 # AI research agent configs
   │       ├── /hardware-researcher/
   │       ├── /tariff-analyst/
   │       ├── /grid-analyst/
   │       ├── /strategy-scout/
   │       ├── /finance-modeller/
   │       ├── /funding-advisor/
   │       ├── /legal-monitor/
   │       ├── /customer-intel/
   │       └── /risk-monitor/
   ├── /docs/
   │   ├── ARCHITECTURE.md
   │   ├── AGENTS.md
   │   └── DEPLOYMENT.md
   ├── /migrations/
   ├── /tests/
   ├── .env.example
   ├── package.json
   └── README.md
   ```

3. **Define shared types** in `/src/shared/types/`:
   ```typescript
   // Core domain types all agents use
   
   interface Home {
     id: string;
     address: string;
     postcode: string;
     latitude: number;
     longitude: number;
     phase: '1-phase' | '3-phase';
     substationId?: string;
     systemId?: string;
     homeownerId?: string;
     status: 'prospect' | 'qualified' | 'contracted' | 'installed' | 'live' | 'churned';
     epcRating?: string;
     propertyType?: string;
     gardenAccess?: boolean;
     installDate?: Date;
     contractEndDate?: Date;
   }

   interface BatterySystem {
     id: string;
     homeId: string;
     inverterModel: string;
     batteryModules: number;
     totalCapacityKwh: number;
     batteryChemistry: 'LFP' | 'NMC' | 'NaIon' | 'Other';
     solarPvKwp?: number;
     heatPumpModel?: string;
     installCost: number;
     annualMaintenanceCost: number;
     warrantyYears: number;
     degradationRatePercent: number;
     maxChargeRateKw: number;
     maxDischargeRateKw: number;
     roundTripEfficiency: number;
   }

   interface Tariff {
     id: string;
     supplier: string;
     name: string;
     type: 'fixed' | 'variable' | 'agile' | 'flux' | 'time-of-use';
     importRates: TariffRate[];
     exportRates: TariffRate[];
     standingChargePencePerDay: number;
     validFrom: Date;
     validTo?: Date;
     eligibilityRequirements?: string[];
   }

   interface TariffRate {
     periodStart: string; // HH:MM
     periodEnd: string;   // HH:MM
     ratePencePerKwh: number;
     season?: 'summer' | 'winter' | 'all';
   }

   interface Substation {
     id: string;
     name: string;
     dnoRegion: string;
     latitude: number;
     longitude: number;
     capacityMva?: number;
     currentLoadPercent?: number;
     constraintStatus: 'unconstrained' | 'approaching' | 'constrained';
     flexibilityTenderActive: boolean;
     connectedHomes?: number;
     maxNewConnections?: number;
   }

   interface FinancialScenario {
     id: string;
     name: string;
     systemConfig: BatterySystem;
     tariff: Tariff;
     assumptions: FinancialAssumptions;
     projections: YearlyProjection[];
   }

   interface FinancialAssumptions {
     energyInflationPercent: number;
     batteryDegradationPercent: number;
     savingSessionsPerYear: number;
     savingSessionRatePencePerKwh: number;
     homeownerPaymentPerMonth: number;
     maintenanceCostPerYear: number;
     insuranceCostPerYear: number;
     cyclesPerDay: number;
     solarGenerationKwhPerYear?: number;
     flexibilityRevenuePerKwhPerYear?: number;
   }

   interface YearlyProjection {
     year: number;
     grossRevenue: number;
     homeownerPayment: number;
     maintenance: number;
     insurance: number;
     netRevenue: number;
     cumulativeRevenue: number;
     batteryCapacityRemaining: number;
     roi: number;
   }

   interface Lead {
     id: string;
     homeId: string;
     name: string;
     phone?: string;
     email?: string;
     source: 'referral' | 'door-knock' | 'website' | 'club' | 'social' | 'other';
     referredBy?: string;
     status: 'new' | 'contacted' | 'qualified' | 'proposal-sent' | 'contracted' | 'lost';
     notes: string[];
     createdAt: Date;
     updatedAt: Date;
   }

   // Three-Scenario Financial Standard — used by EVERY module
   type ScenarioType = 'best' | 'likely' | 'worst';

   interface ScenarioAssumptions {
     type: ScenarioType;
     energyInflationPercent: number;
     batteryDegradationPercent: number;
     iofSpreadChangePercent: number;       // e.g. -20 for worst, 0 for likely, +15 for best
     savingSessionsPerYear: number;
     savingSessionRatePencePerKwh: number;
     flexibilityRevenuePerHomePerYear: number;
     hardwareCostChangePercent: number;    // e.g. +10 for worst, 0 for likely, -20 for best
     installCostChangePercent: number;
     homeownerChurnPercent: number;
     deploymentPacePercent: number;        // 50 = half speed, 100 = on target, 120 = ahead
     interestRateSpreadPercent: number;    // spread above base rate
     cyclesPerDay: number;
     solarSelfConsumptionPercent: number;
     maintenanceCostChangePercent: number;
   }

   interface ThreeScenarioProjection {
     best: YearlyProjection[];
     likely: YearlyProjection[];
     worst: YearlyProjection[];
   }

   interface ThreeScenarioSummary {
     best: { paybackMonths: number; tenYearIrr: number; tenYearNpv: number; annualNetRevenue: number; dscr: number };
     likely: { paybackMonths: number; tenYearIrr: number; tenYearNpv: number; annualNetRevenue: number; dscr: number };
     worst: { paybackMonths: number; tenYearIrr: number; tenYearNpv: number; annualNetRevenue: number; dscr: number };
   }
   ```

4. **Create the database schema** — initial migration covering all core tables
5. **Build the shared scenario engine** in `/src/shared/utils/scenarios.ts`:
   - Implements `BEST_CASE_DEFAULTS`, `LIKELY_CASE_DEFAULTS`, `WORST_CASE_DEFAULTS` assumption sets
   - Exports `calculateScenario(systemConfig, tariff, assumptions): YearlyProjection[]`
   - Exports `calculateAllScenarios(systemConfig, tariff, overrides?): ThreeScenarioProjection`
   - Exports `summariseScenarios(projection: ThreeScenarioProjection): ThreeScenarioSummary`
   - All financial logic lives here — no other agent builds their own projection calculations
   - Must have comprehensive unit tests with known expected outputs for each scenario
6. **Build the design system** — based on the **Eclipse UI Kit** (light & dark mode) + **Hyper Charts** data visualisation kit, both by Setproduct and available in Dave's Figma account:

   **Figma Source:** Claude Code already has Figma MCP access configured. The agent should:
   1. Connect to Dave's Figma account via the Figma MCP
   2. Locate the **Eclipse UI Kit** (light and dark mode) — 1,100+ component variants, 74 dashboard templates
   3. Locate the **Hyper Charts** kit — 1,000+ editable data visualisation blocks, 25+ chart types
   4. Read the design tokens, colour system, typography, component specs, and chart patterns directly from Figma
   5. Implement them in code — extract exact hex values, spacing, border radii, shadows, font stacks
   
   **Eclipse provides the full UI foundation:**
   - Component library: buttons, inputs, cards, tables, navigation, modals, dropdowns, badges, tabs — all with dark and light mode variants
   - Dashboard templates: analytics, banking, investments, kanban, task tracker patterns — many directly applicable to RoseStack's modules
   - Auto-layout based, responsive desktop and mobile templates
   - Dark mode as primary (for the internal platform), light mode available for any homeowner-facing materials
   
   **Hyper Charts provides the data visualisation layer:**
   - Area charts, line charts, bar charts (horizontal & vertical) — for revenue projections, portfolio growth, three-scenario Best/Likely/Worst overlays
   - Heatmaps — for the Risk & Opportunities 5×5 heat map matrix and grid constraint mapping
   - Radar/spider charts — for sensitivity analysis and system comparison
   - Donut/pie charts — for revenue stream breakdowns, portfolio composition
   - Treemaps — for portfolio revenue by area/substation
   - Gantt charts — for deployment timeline and strategy roadmap
   - Sankey diagrams — for energy flow visualisation (grid → battery → home → export)
   - Candlestick/financial charts — for Agile rate history and wholesale price tracking
   - Bubble charts — for property scoring visualisation (size = revenue, colour = risk, position = location)
   - All charts available in dark and light themes, scaled for desktop, tablet, and mobile
   
   **Implementation approach:**
   - Claude Code reads the Eclipse Figma file via MCP, extracts the full colour system, typography scale, spacing system, and component patterns
   - Build a Tailwind config with all Eclipse design tokens mapped to semantic names
   - Create a shared component library in `/src/shared/ui/` that mirrors Eclipse's component patterns
   - For every chart in the platform, reference the Hyper Charts Figma file to match the visual style — then implement using Recharts, D3, or Plotly with the Eclipse colour palette applied
   - **All charts must use the Eclipse colour scheme** — don't use Recharts/D3 defaults, override with Eclipse tokens
   - Dark mode as default, light mode toggle available
   
   **RoseStack brand adaptation on top of Eclipse:**
   - Primary accent: adapt Eclipse's primary colour to **RoseStack rose red (#B91C4D)** — this is the brand colour, used for the logo, primary CTAs, and active navigation states
   - Keep Eclipse's existing accent system for functional colours: green/cyan for positive values, red/amber for warnings, blue for informational
   - Logo placeholder: Red rose icon + stacked battery modules motif, placed in the sidebar header
   
   **Chart selection guidance for each module:**
   
   | Module | Key Charts (from Hyper Charts patterns) |
   |--------|----------------------------------------|
   | Hardware | Radar chart (system comparison), bar chart (cost comparison), compatibility matrix |
   | Tariffs | 24-hour rate timeline (area chart), revenue comparison (grouped bar), Agile rate history (candlestick) |
   | Finance | Three-line projection (Best/Likely/Worst area chart with shaded range), waterfall (cash flow), payback curve |
   | Grid | Heatmap (substation constraints on map), bubble chart (property scores), treemap (deployment density) |
   | Strategy | Radar chart (technology readiness), Gantt (strategy timeline), pipeline funnel |
   | Funding | Stacked bar (funding sources), DSCR line chart with covenant threshold, waterfall (deal structure) |
   | Legal | Progress bars (compliance status), timeline (G99 pipeline), checklist dashboard |
   | Customers | Funnel (sales pipeline), stacked bar (lead sources), line chart (conversion rates over time) |
   | Portfolio | Revenue area chart (three scenarios + actuals), donut (portfolio composition), map with property pins, KPI strip |
   | Risk & Opps | 5×5 heatmap (risk matrix), 5×5 heatmap (opportunity matrix), waterfall (net position), Gantt (risk timeline) |
   
   **Typography:** Use Eclipse's font stack as specified in the Figma file. If not specified, choose a distinctive premium pair that matches the Eclipse aesthetic.
   - Navigation: Sidebar with module icons matching Eclipse's nav patterns, dark background, active state with rose accent

6. **Set up AI agent infrastructure** in `/src/agents/`:
   - Shared agent runner that calls Anthropic/OpenAI APIs
   - Each research agent has a system prompt, tools config, and output parser
   - Agents can be triggered manually (button click) or on schedule (cron)
   - Agent outputs are stored in the database with timestamps
   - Agent results feed into the relevant module's UI

---

## Agent 1: Hardware Specialist

**Branch:** `agent/1-hardware`
**Directory:** `/src/modules/hardware/`
**Pages:** `/src/app/hardware/`

### Scope

A comprehensive database and comparison engine for all hardware relevant to RoseStack deployments: batteries, inverters, solar PV panels, heat pumps, BMS, enclosures, cabling, and ancillary equipment.

### Data to Research and Seed

Using web search and the embedded AI research agent, build a database covering:

**Battery Systems (residential-scale, 5kWh+ modules):**
- Sigenergy SigenStack (current preferred — 12kWh modules, LFP)
- Tesla Powerwall 3
- BYD Battery-Box Premium HVS/HVM
- GivEnergy All-in-One / GivBattery
- Huawei LUNA2000
- Pylontech Force H2
- Fox ESS ECS series
- SolaX Triple Power
- Sunsynk ECCO range
- Alpha ESS SMILE series
- CATL Naxtra (sodium-ion — emerging tech, potential game-changer)
- Fogstar batteries (UK-based alternative)

For each, capture: capacity per module, max modules per string, chemistry (LFP/NMC/NaIon), cycle life, degradation rate, round-trip efficiency, charge/discharge rate, IP rating, weight, operating temperature range, warranty, UK wholesale price (or best estimate), MCS certification status, compatibility with IOF, compatibility with major inverters.

**Inverters (hybrid, three-phase capable):**
- Sigenergy M1 (100kW three-phase hybrid — current preferred)
- GivEnergy Giv-HY series
- SolaX X3-Hybrid
- Fox ESS H3 series
- Sunsynk 3-phase hybrid
- Huawei SUN2000 series
- Fronius Symo GEN24
- SMA Sunny Tripower
- Victron MultiPlus-II

For each: max PV input, max battery capacity, number of MPPT trackers, hybrid capability, three-phase support, G99 compliance, IOF compatibility, Octopus API integration, Home Assistant compatibility, price, warranty.

**Solar PV:**
- Current leading panel manufacturers and efficiency ratings
- Optimal panel choices for Lancashire (latitude, weather profile)
- Panel + battery + inverter compatibility matrices
- Self-consumption vs export optimisation for different system sizes

**Heat Pumps (relevant for Octopus Cosy tariff stacking):**
- Mitsubishi Ecodan range
- Daikin Altherma
- Samsung EHS
- Vaillant Arotherm
- Grant Aerona3
- Integration with battery systems and smart tariffs
- COP ratings in Lancashire climate conditions

### UI Components to Build

1. **Hardware Catalogue** — searchable, filterable table of all equipment with key specs
2. **System Builder** — drag-and-drop or wizard to configure a complete system (battery + inverter + solar + heat pump), showing total cost, capacity, compatibility warnings
3. **Comparison Tool** — side-by-side comparison of up to 4 systems on key metrics
4. **Cost Tracker** — price history and current best prices from UK suppliers
5. **Compatibility Matrix** — visual grid showing which batteries work with which inverters, and which combinations are IOF-eligible

### Embedded AI Research Agent

**Name:** Hardware Researcher
**Trigger:** Manual + weekly scheduled
**Purpose:** Search for new battery/inverter products, price changes, new MCS certifications, sodium-ion developments, manufacturer announcements
**Output:** Summary report with flagged changes, stored in database, surfaced on dashboard

---

## Agent 2: Tariff Expert

**Branch:** `agent/2-tariffs`
**Directory:** `/src/modules/tariffs/`
**Pages:** `/src/app/tariffs/`

### Scope

Complete UK energy tariff intelligence — every tariff relevant to battery arbitrage, with exact rates, time windows, eligibility criteria, and revenue calculations.

### Data to Research and Seed

**Core Tariffs (with EXACT current rates and time windows):**

- **Octopus Intelligent Flux (IOF)** — the primary revenue tariff
  - Import rates by time period (overnight cheap, daytime standard, peak)
  - Export rates by time period (peak export premium)
  - Exact time windows for each period
  - Eligibility: battery size requirements, MCS certification, Octopus account
  - How the Kraken platform controls charge/discharge
  
- **Octopus Flux** — standard Flux (non-intelligent)
  - Same structure as IOF but without Kraken optimisation
  
- **Octopus Agile** — half-hourly variable pricing
  - API endpoint for live rates
  - Historical rate distribution (average, min, max, percentiles)
  - Plunge pricing frequency and value
  
- **Octopus Intelligent Go** — EV-focused but relevant for battery charging
  
- **Octopus Cosy** — heat pump tariff with cheap windows
  - Stacking potential: Cosy + battery + heat pump

- **E.ON Next Smart Flex / E.ON Drive**
- **British Gas Electric Drivers**
- **OVO Energy tariffs**
- **EDF / Octopus wholesale tariffs**
- **SEG (Smart Export Guarantee)** — all supplier rates

**Grid Services Revenue:**
- **Saving Sessions** — historical data on sessions per year, rates per kWh, total earnings
- **Demand Flexibility Service (DFS)** — ESO programme, rates, eligibility
- **Capacity Market** — how it works, rates, minimum portfolio size
- **ENWL Flexibility Tenders** — current active tenders in Lancashire, rates per kW/kWh
- **Balancing Mechanism** — access routes for small batteries, aggregator requirements
- **Piclo Flex** — how to register, tender process, revenue expectations

### Revenue Calculator Engine

Build a calculator that takes:
- **Inputs:** Battery capacity (kWh), charge/discharge rate (kW), round-trip efficiency (%), tariff selection, cycles per day, solar generation (optional), degradation rate
- **Outputs:** Daily revenue breakdown (import cost, export revenue, spread), monthly revenue, annual revenue, revenue by stream (arbitrage, saving sessions, flexibility, SEG)
- **Scenarios:** Best case, likely case, worst case based on rate sensitivity

### UI Components to Build

1. **Tariff Database** — all tariffs with current rates, sortable by arbitrage spread
2. **Rate Timeline** — visual 24-hour timeline showing import/export rates for selected tariff, with shaded charge/discharge windows
3. **Revenue Calculator** — interactive tool: select system + tariff → see daily/monthly/annual revenue
4. **Revenue Comparison** — compare revenue across tariffs for the same system
5. **Tariff Monitor** — alerts when tariff rates change, new tariffs launch, or arbitrage spreads move significantly
6. **Historical Rates** — Agile rate history, Saving Sessions history, flexibility market rates over time
7. **Portfolio Tariff Optimisation Sweep** — daily automated scan across all live properties in Agent 9's portfolio:
   - Compares each property's current tariff against all eligible alternatives
   - Flags any property where switching would increase revenue by >5% (configurable threshold)
   - Shows: current tariff, recommended tariff, revenue uplift (Best/Likely/Worst), and a one-click "approve switch" action
   - Approved switches are logged in Agent 9 (Portfolio) against the property timeline
   - Requires Letter of Authority in the ESA (Agent 7) to execute without homeowner involvement
   - Tracks post-switch performance to validate the recommendation was correct

### Embedded AI Research Agent

**Name:** Tariff Analyst
**Trigger:** Daily (rates can change)
**Purpose:** Monitor Octopus API for rate changes, scan energy news for new tariff launches, track regulatory changes affecting export rates, monitor Saving Sessions announcements
**Output:** Rate change alerts, new tariff summaries, arbitrage spread trends

---

## Agent 3: Financial Modeller

**Branch:** `agent/3-finance`
**Directory:** `/src/modules/finance/`
**Pages:** `/src/app/finance/`

### Scope

Takes hardware costs from Agent 1 and tariff revenues from Agent 2, builds comprehensive financial models for every system/tariff combination. This is the engine that proves the business case to lenders and investors.

### Core Models to Build

**CRITICAL: All models below MUST use the shared scenario engine from `/src/shared/utils/scenarios.ts` and output Best/Likely/Worst projections as per the Three-Scenario Financial Standard. Agent 3 does NOT build its own projection logic — it consumes the shared engine and presents the three-scenario outputs.**

1. **Per-Home P&L Model:**
   - Capital cost (hardware + installation + G99 + MCS + ancillaries)
   - Annual revenue (arbitrage + saving sessions + flexibility + SEG)
   - Annual costs (homeowner payment, maintenance, insurance, monitoring, degradation)
   - Net annual profit per home — **shown as Best / Likely / Worst**
   - Payback period — **shown as range: "14–26 months (likely: 18)"**
   - 10-year and 20-year IRR — **three values**
   - NPV at various discount rates — **three values per rate**

2. **Portfolio Model (10–100 homes):**
   - Deployment schedule (homes per year)
   - Cumulative capex and funding requirements
   - Revenue ramp as portfolio grows
   - Operating costs at scale (volume discounts, shared maintenance)
   - Cash flow waterfall — when does the portfolio become cash-flow positive?
   - Debt service coverage ratio (DSCR) — critical for lenders
   - Loan amortisation schedules

3. **Sensitivity Analysis:**
   - Energy price scenarios (+5%, +10%, -5%, -10%)
   - Battery degradation scenarios (1%, 2%, 3% per year)
   - Tariff rate changes (IOF rates reduced by 10%, 20%)
   - Installation cost changes
   - Interest rate sensitivity on debt
   - Saving Sessions participation rate
   - Flexibility market revenue (0%, 25%, 50%, 100% of estimated)

4. **Scenario Comparator:**
   - Side-by-side comparison: Sigenergy system on IOF vs GivEnergy on Flux vs BYD on Agile
   - Each system/tariff combination shows all three scenarios (Best/Likely/Worst)
   - Traffic light system: 🟢 all three scenarios profitable, 🟡 worst case marginal, 🔴 worst case loss-making

5. **Break-Even Analysis:**
   - At what electricity price does the model break even?
   - At what degradation rate does a system become unprofitable?
   - Minimum portfolio size for business viability

### UI Components to Build

1. **Model Builder** — select system config + tariff + assumptions → generates full 10-year projection with Best/Likely/Worst lines on every chart
2. **Interactive Charts** — revenue over time (three lines + shaded range), cumulative cash flow (three lines), payback visualisation (shaded band showing range), portfolio growth
3. **Scenario Dashboard** — cards showing key metrics for each saved scenario, with Best/Likely/Worst on every card and colour-coded traffic lights
4. **Sensitivity Spider Chart** — drag sliders for each variable, see real-time impact on all three scenarios simultaneously
5. **Assumption Editor** — edit the default assumptions for each scenario (Best/Likely/Worst), changes ripple through every model and chart platform-wide via the shared engine
6. **Investor Summary Generator** — one-click export of key financials to PDF showing all three scenarios (lenders need to see the worst case is survivable)
7. **Portfolio Tracker** — as homes go live, track actual vs projected revenue, with actual performance plotted against the Best/Likely/Worst range

### Embedded AI Research Agent

**Name:** Finance Modeller
**Trigger:** Monthly + on-demand
**Purpose:** Research current lending rates for asset finance, EFG scheme updates, energy price forecasts (Cornwall Insight, BEIS), battery cost trend data, comparable business valuations
**Output:** Updated assumptions, market benchmarks, recommended model adjustments

---

## Agent 4: UK Grid Expert

**Branch:** `agent/4-grid`
**Directory:** `/src/modules/grid/`
**Pages:** `/src/app/grid/`

### Scope

UK electricity grid intelligence — substation data, network constraints, flexibility market opportunities, and property prospecting to identify the best deployment targets.

### Data Sources to Integrate

1. **ENWL Open Data:**
   - Substation locations and capacity in the Electricity North West region
   - Network constraint data
   - Low Carbon Technology (LCT) connection data
   - G99 application volumes by area
   - Flexibility tender locations and values

2. **EPC Register:**
   - Open data from DLUHC
   - Filter for property types likely to be 3-phase (large detached, 4+ bed)
   - EPC ratings (relevant for insulation quality and heat pump suitability)
   - Current heating system type

3. **Ordnance Survey / Postcode Data:**
   - Postcode to substation mapping
   - Property density by postcode
   - Deprivation indices (relevant for social housing opportunities)

4. **Piclo Flex:**
   - Current active flexibility tenders in ENWL territory
   - Historical tender values
   - Registered assets in Lancashire

5. **National Grid ESO:**
   - Capacity Market register
   - Balancing Services Use of System (BSUoS) data
   - Future energy scenarios

### Property Prospecting Engine

Build a scoring algorithm that identifies the best target properties:

**Scoring criteria:**
- Phase type (3-phase confirmed = highest score, likely 3-phase = medium)
- Property age and type (pre-1970 large detached = likely 3-phase)
- EPC band (B/C preferred — well insulated, lower heating demand)
- Garden access (from satellite/planning data if available)
- Substation proximity and constraint status
- Postcode affluence indicators (homeowners who can say yes quickly)
- Distance from existing RoseStack homes (cluster deployments reduce install costs)
- Flexibility market value in that substation area

### UI Components to Build

1. **Grid Map** — interactive map (Mapbox or Leaflet) showing:
   - ENWL substations colour-coded by constraint status
   - Existing RoseStack homes (when deployed)
   - Target postcodes heat-mapped by opportunity score
   - Flexibility tender zones overlaid
   - Click a substation → see capacity, connected homes, available headroom

2. **Property Finder** — search by postcode or area, returns scored list of target properties with:
   - Address, property type, EPC rating
   - 3-phase likelihood score
   - Nearest substation and status
   - Estimated revenue at that location
   - Distance from nearest existing RoseStack home

3. **Substation Dashboard** — table of all ENWL substations in target area with:
   - Capacity utilisation
   - Number of connected homes
   - G99 application status
   - Flexibility tender value
   - RoseStack saturation (how many homes we have vs potential)

4. **Deployment Planner** — given a target of X homes in Year Y, recommend optimal deployment sequence by substation/postcode area

### Embedded AI Research Agent

**Name:** Grid Analyst
**Trigger:** Weekly
**Purpose:** Monitor ENWL for new flexibility tenders, track G99 processing times, scan for DNO policy changes, monitor P483 implementation, identify new constrained areas
**Output:** New opportunity alerts, constraint status changes, regulatory updates

---

## Agent 5: Strategy & Moat

**Branch:** `agent/5-strategy`
**Directory:** `/src/modules/strategy/`
**Pages:** `/src/app/strategy/`

### Scope

Competitive intelligence, partnership opportunities, emerging technology tracking, and strategic moat building.

### Research Areas

1. **Competitor Tracking:**
   - Other battery deployers in Lancashire/Northwest
   - National competitors (Moixa/Lunar Energy, Social Energy, Powervault fleet operations)
   - Octopus's own deployment plans (they could become a competitor)
   - Installer networks and their capacity

2. **Partnership Opportunities:**
   - ENWL direct partnership for flexibility services
   - Sports clubs (cricket, bowling, rugby clubs in East Lancashire) — as referral networks AND commercial deployment sites
   - Housing developers — new-build partnerships where battery is included from day one
   - Social housing providers — large portfolios, single decision-maker
   - Solar installers — referral partnerships
   - EV charger installers — cross-sell opportunity

3. **Emerging Technology:**
   - Sodium-ion battery commercialisation timeline (CATL Naxtra, Faradion/Reliance)
   - V2G/V2H maturity (relevant for homes with EVs — Dave has ID Buzz and EQA)
   - Solid-state batteries
   - AI-optimised trading algorithms
   - Perovskite solar cells
   - Hydrogen storage (longer-term)

4. **Moat Strategies:**
   - Substation exclusivity — saturate a substation area before competitors
   - Own-brand hardware (RoseStack 12kWh module) — reduce dependency on Sigenergy
   - Software platform licensing to other deployers
   - Data advantage — real-world performance data from portfolio
   - Homeowner lock-in through ESA contracts and referral networks
   - Regulatory relationships — be the local expert ENWL calls

5. **Expansion Pathways:**
   - Geographic: Lancashire → Northwest → National
   - Vertical: Deployment → Product → Software → Aggregation
   - Adjacent: Commercial/industrial storage, EV charging hubs, community energy schemes

### UI Components to Build

1. **Competitor Map** — known competitors plotted on map with estimated portfolio size
2. **Partnership Pipeline** — Kanban board tracking partnership conversations
3. **Technology Radar** — visual radar chart showing emerging tech by maturity and relevance
4. **Moat Scorecard** — checklist of moat-building actions with status (done/in-progress/planned)
5. **Strategy Timeline** — Gantt-style view of strategic initiatives across Phase 1/2/3/4

### Embedded AI Research Agent

**Name:** Strategy Scout
**Trigger:** Weekly
**Purpose:** Scan energy industry news, competitor announcements, funding rounds, regulatory consultations, technology breakthroughs, partnership opportunities
**Output:** Weekly intelligence briefing with actionable insights

---

## Agent 6: Financing & Investment Readiness

**Branch:** `agent/6-funding`
**Directory:** `/src/modules/funding/`
**Pages:** `/src/app/funding/`

### Scope

Investment readiness, lender targeting, deal structuring, and stress-testing the financial model through a funder's lens.

### Research Areas

1. **UK Asset Finance Market:**
   - Lenders who finance energy infrastructure
   - Green energy funds and their investment criteria
   - Enterprise Finance Guarantee (EFG) scheme — current terms, limits (£1.2M cap?), eligible lenders
   - British Business Bank programmes
   - Community energy finance (e.g., Abundance Investment, Ethex)

2. **Deal Structures:**
   - Asset finance (HP/lease) — most likely first route
   - Revenue-based financing
   - Equity investment (angel, SEIS/EIS eligibility)
   - Peer-to-peer lending
   - Community share offers
   - Crowdfunding (Crowdcube, Seedrs)
   - Mezzanine / blended finance

3. **Lender Requirements:**
   - Typical DSCR covenants for energy assets
   - Security packages expected (charge on batteries, assignment of revenue contracts)
   - Track record requirements (how much proof of concept data before first drawdown?)
   - Personal guarantee expectations
   - Insurance requirements

4. **Investor Materials:**
   - Pitch deck template (for equity investors)
   - Information memorandum template (for debt lenders)
   - Financial model output pack
   - Data room checklist

### UI Components to Build

1. **Lender Database** — searchable list of potential funders with criteria, contact info, status
2. **Deal Structurer** — input funding requirement → suggest optimal deal structure with pros/cons
3. **Covenant Tracker** — as loans are drawn, track DSCR and other covenants in real-time
4. **Investor Pipeline** — CRM for investor relationships (contacted, NDA signed, data room access, term sheet, committed)
5. **Stress Test Dashboard** — one-click stress test: what happens to DSCR if energy prices drop 20%? If degradation is 3% instead of 2%? Visual traffic lights.
6. **Data Room** — organised document repository with access controls for different investors

### Embedded AI Research Agent

**Name:** Funding Advisor
**Trigger:** Monthly
**Purpose:** Monitor new green finance products, EFG scheme changes, interest rate movements, comparable deals in energy storage sector, SEIS/EIS rule changes
**Output:** Funding landscape update, new opportunities flagged, rate benchmarks

---

## Agent 7: Legal & Compliance

**Branch:** `agent/7-legal`
**Directory:** `/src/modules/legal/`
**Pages:** `/src/app/legal/`

### Scope

Regulatory compliance tracking, certification pipeline management, contract template library, and risk register.

### Compliance Areas to Track

1. **MCS Certification:**
   - Requirements for battery installation certification
   - Approved installer register
   - Annual audit requirements
   - Cost and timeline

2. **G99/G98 Grid Connection:**
   - Application process for ENWL
   - Thresholds (G98 up to 16A per phase, G99 above)
   - Processing times (currently 6-12 weeks for G99?)
   - Required documents and design submissions
   - Commissioning and connection agreements

3. **Electrical Regulations:**
   - BS 7671 (IET Wiring Regulations) — relevant sections for battery storage
   - Battery storage fire safety standards
   - Planning permission thresholds for battery installations
   - Building regulations requirements

4. **Energy Services Agreement (ESA):**
   - Template structure for homeowner contracts
   - Key clauses: 10-year term, monthly payment, access rights, insurance, termination, equipment removal, property sale provisions
   - **Letter of Authority (LoA) clause — CRITICAL:** Grants RoseStack permission to view the homeowner's energy account, switch tariffs on their behalf, communicate with the energy supplier, manage G99/SEG registrations, and be notified if the homeowner changes supplier. This enables portfolio-wide tariff optimisation without homeowner involvement.
   - Supplier change notification clause: homeowner must notify RoseStack before switching energy supplier, and RoseStack must approve that the new supplier supports the battery configuration
   - Land Registry charge registration process
   - Consumer credit considerations (does the ESA trigger FCA regulation?)

5. **FCA Considerations:**
   - If taking investment: financial promotion rules
   - If offering energy services on credit: consumer credit licence?
   - SEIS/EIS scheme compliance
   - Crowdfunding regulations

6. **SEG Registration:**
   - Process for registering as SEG generator
   - Required meter configuration
   - Export payment arrangements

7. **Insurance:**
   - Product liability
   - Professional indemnity
   - Public liability
   - Battery-specific insurance (fire, theft, damage)
   - Homeowner property insurance implications

### UI Components to Build

1. **Compliance Dashboard** — checklist of all regulatory requirements with status (compliant/pending/action needed/not applicable)
2. **G99 Pipeline** — track each home's G99 application from submission to approval
3. **Certification Tracker** — MCS, SEG, and other certification statuses
4. **Contract Library** — store and version ESA templates, NDA, investor agreements
5. **Risk Register** — identify, score, and track legal/regulatory risks
6. **Regulatory Calendar** — upcoming deadlines, consultation responses, renewal dates

### Embedded AI Research Agent

**Name:** Legal Monitor
**Trigger:** Weekly
**Purpose:** Scan Ofgem consultations, BEIS policy announcements, MCS rule changes, fire safety regulation updates, FCA guidance relevant to energy services, planning law changes
**Output:** Regulatory change alerts, compliance action items

---

## Agent 8: Customer Acquisition

**Branch:** `agent/8-customers`
**Directory:** `/src/modules/customers/`
**Pages:** `/src/app/customers/`

### Scope

Lead management, sales pipeline, referral engine, and tariff authority management. No homeowner portal — homeowner communication is handled through automated emails and direct contact.

### Core Features

1. **Lead Management (CRM):**
   - Lead capture from multiple sources (website form, referral link, door-knock, club introduction)
   - Lead scoring based on Agent 4's property scoring algorithm
   - Pipeline stages: New → Contacted → Qualified (3-phase confirmed, garden access, interested) → Proposal Sent → Contracted → Installation Scheduled → Live
   - Activity logging (calls, visits, emails)
   - Follow-up reminders
   - Referral source tracking

2. **Referral Engine:**
   - Each contracted homeowner gets a unique referral link (rosestack.co.uk/refer/[code])
   - Referral rewards: £200 for referrer, £100 for referee (from business plan)
   - Stacking rewards: 1st referral = £200, 2nd = £250, 3rd = £300 (incentivise multiple referrals)
   - Leaderboard showing top referrers
   - Automated referral tracking and reward processing

3. **Sales Materials:**
   - Homeowner Pack generator (personalised PDF with their address, estimated system size, projected savings)
   - Proposal builder (system spec + financial projections for that specific home)
   - Comparison tool (what they'd pay buying their own vs RoseStack proposition)

4. **Club/Partnership CRM:**
   - Track conversations with cricket, bowling, rugby club committees
   - Sponsorship arrangements and their referral pipeline
   - Commercial site assessments for club installations (Phase 2)

### Homeowner Communication (NO separate portal)

The homeowner's day-to-day energy experience is through the Octopus app (or whichever supplier they're on). RoseStack's proposition is "you don't need to think about any of this." Building a parallel portal duplicates what the supplier already provides and creates unnecessary development and maintenance overhead.

**Instead, homeowner touchpoints are lightweight and email-driven:**

1. **Monthly Statement Email** — automated PDF sent monthly showing: this month's payment (£100), cumulative payments to date, system status (healthy/maintenance needed), referral reward balance. RoseStack branded, warm tone, one page.

2. **Referral Link** — unique URL per homeowner (rosestack.co.uk/refer/[code]) that lands on a simple static page explaining the proposition. No login required. Referral tracking is handled internally in Agent 8's CRM.

3. **Welcome Pack Email** — sent at installation: what to expect, how the system works (simple language), who to contact, maintenance schedule, referral link.

4. **Annual Summary Email** — year-end PDF: total payments received, estimated CO2 saved, system health, contract anniversary, referral summary.

5. **Support** — dedicated email address or phone number, not a portal. Maintenance requests logged directly into Portfolio module (Agent 9) by RoseStack team.

### Tariff Management Authority

**This is a key strategic capability.** The ESA must include a **Letter of Authority (LoA)** granting RoseStack permission to:

- View the homeowner's energy account with their supplier
- Switch the homeowner's tariff on their behalf
- Communicate with the supplier regarding the battery system
- Manage G99/SEG registrations associated with the property

**Why this matters:**
- Agent 2 (Tariff Expert) continuously monitors all tariffs across the portfolio
- When a better tariff becomes available for a property (e.g., Octopus launches a new product, or a home's usage pattern suits Agile better than IOF), RoseStack can switch without needing to contact the homeowner
- Portfolio-wide tariff optimisation becomes a background operation, not a manual task
- The Octopus Kraken API already supports third-party fleet management — this is how commercial operators work

**Implementation in the platform:**
- Agent 2 runs a daily "tariff optimisation sweep" across all live properties
- Flags any property where switching tariff would increase revenue by >5%
- Presents recommendations in a queue for founder approval (initially manual, automate later)
- Once approved, executes the switch via supplier API or manual process
- Logs the change in Agent 9 (Portfolio) against that property's timeline
- Tracks revenue impact of the switch in subsequent months

**Legal requirement:** The LoA clause must be drafted by the solicitor as part of the ESA. Agent 7 (Legal) should flag this as a required ESA clause. The LoA should also cover situations where the homeowner moves supplier — RoseStack needs to be notified and involved to ensure the new supplier supports the battery configuration.

### UI Components to Build (Internal)

1. **Lead Pipeline** — Kanban board with drag-and-drop between stages
2. **Lead Scoring** — property score + engagement score + referral source quality
3. **Referral Dashboard** — total referrals, conversion rate, rewards paid, top referrers
4. **Campaign Tracker** — door-knock routes, areas covered, conversion by area
5. **Revenue Attribution** — which acquisition channel produces the highest-value homes?

### Embedded AI Research Agent

**Name:** Customer Intel
**Trigger:** Monthly
**Purpose:** Research local demographic data, property market trends in target postcodes, community events (club AGMs, local shows), social media sentiment about energy costs in Lancashire, competitor marketing activity
**Output:** Target area recommendations, messaging insights, event opportunities

---

## Agent 9: Portfolio Manager

**Branch:** `agent/9-portfolio`
**Directory:** `/src/modules/portfolio/`
**Pages:** `/src/app/portfolio/`

### Scope

This is the operational heart of RoseStack. When a property moves from "lead" to "contracted" to "installed" to "live," it lives here. This module connects a real property to real hardware, a real tariff, and pulls all the modelling data to show what that property is earning — projected and (eventually) actual.

### Add Property Workflow

A step-by-step wizard that walks through everything needed to register a live deployment:

**Step 1: Property Details**
- Address (autocomplete from postcode lookup)
- Postcode
- Property type (detached, semi, terrace, bungalow, farm, commercial)
- Number of bedrooms
- Phase type (single-phase / three-phase — confirm with DNO letter or electrician)
- EPC rating (pull from EPC API if available)
- Garden location and access (front, rear, side, driveway)
- Nearest substation (auto-populated from Grid module, Agent 4)
- Homeowner name and contact details
- ESA contract reference number
- ESA start date and end date
- Monthly homeowner payment amount
- Referral source (who referred them — links to Customer module, Agent 8)
- Notes field

**Step 2: Hardware Assignment**
- Select inverter from Hardware catalogue (Agent 1)
  - Pre-populated with full spec: model, max PV input, max battery, 3-phase support
- Select battery modules from Hardware catalogue (Agent 1)
  - Number of modules
  - Auto-calculates: total capacity (kWh), total weight, total cost
- Select solar PV array (if applicable)
  - Panel model, number of panels, total kWp, orientation, tilt
- Select heat pump (if applicable)
  - Model, COP rating, integration type
- Total hardware cost — auto-summed from catalogue prices
- Installation cost (manual entry — varies by property)
- G99 application cost
- MCS certification cost
- Ancillary costs (cabling, enclosure, civils, scaffolding if needed)
- **Total capital cost per property** — all-in figure, auto-calculated

**Step 3: Tariff Assignment**
- Select primary tariff from Tariff database (Agent 2)
  - Pre-populated with current rates and time windows
- Cycling strategy: single cycle / double cycle / Kraken-managed
- Solar self-consumption estimate (if solar installed)
- Saving Sessions participation: yes/no, estimated sessions per year
- Flexibility market participation: yes/no, estimated revenue
- SEG registration: yes/no, SEG rate

**Step 4: Financial Projection (Auto-Generated — Three Scenarios)**

This is where the magic happens. The system takes:
- Hardware costs from Step 2
- Tariff rates and revenue model from Step 3
- Calls the shared scenario engine: `calculateAllScenarios(systemConfig, tariff)`

And auto-generates **Best / Likely / Worst** for every metric:

| Output | Display |
|--------|---------|
| **Daily Revenue Breakdown** | Import cost, export revenue, spread — three columns (Best / Likely / Worst) |
| **Monthly Revenue** | Gross, homeowner payment, net — three values with Likely prominent |
| **Annual Revenue** | Year 1–10 chart with three lines (green/blue/red) + shaded range band |
| **Payback Period** | Shown as range: "14–26 months (likely: 18)" |
| **10-Year IRR** | Three values: e.g. "72% / 57% / 38%" |
| **10-Year NPV** | Three values at configurable discount rate |
| **Lifetime Revenue** | Three values over ESA contract period |
| **Break-Even Energy Price** | Shown for worst case — "even in worst case, profitable above X p/kWh" |
| **DSCR Contribution** | Three values — traffic light: 🟢 all above covenant, 🟡 worst below, 🔴 likely below |

**Step 5: Review & Confirm**
- Summary card showing everything: property, hardware, tariff, three-scenario revenue projection
- Clear visual: "Even in the worst case, this property pays back in [X] months and generates £[Y]/year"
- "Add to Portfolio" button
- Property status set to 'installed' or 'live' depending on whether system is commissioned

### Property Detail Page

Once a property is in the portfolio, clicking it shows a full detail page:

**Header:** Address, status badge (installed/live/maintenance/offline), days since install

**Tabs:**

1. **Overview**
   - Property photo (upload)
   - System summary card: inverter, battery capacity, solar kWp, heat pump
   - Key metrics: monthly revenue (projected or actual), payback progress, capacity remaining
   - ESA contract details: start date, end date, monthly payment, remaining term
   - Homeowner details and contact info

2. **Revenue**
   - Monthly revenue chart (projected line + actual bars when live data available)
   - Revenue breakdown by stream: arbitrage, saving sessions, flexibility, SEG
   - Cumulative revenue vs cumulative cost chart (the "payback curve")
   - Revenue vs projection variance — are we beating or missing the model?
   - Annual summary table with YoY comparison

3. **System Performance**
   - Battery health: current capacity vs original, degradation trend
   - Cycling data: cycles per day, depth of discharge, charge/discharge rates
   - Efficiency: actual round-trip efficiency vs manufacturer spec
   - Solar generation (if applicable): daily/monthly/annual kWh
   - Heat pump performance (if applicable): COP tracking
   - Placeholder for live monitoring integration (mySigen API, GivEnergy API, etc.)

4. **Financial**
   - Full 10-year projection table for THIS property
   - Sensitivity sliders: adjust energy inflation, degradation, tariff rates — see impact in real-time
   - Scenario comparison: "What if we switched this home to Agile instead of IOF?"
   - Cost log: maintenance events, insurance renewals, any unplanned costs

5. **Compliance**
   - G99 status and reference number
   - MCS certificate reference
   - SEG registration status
   - Insurance policy details
   - Next inspection/maintenance date
   - Document uploads (G99 approval letter, MCS cert, ESA signed copy, photos)

6. **Timeline**
   - Chronological log of everything: lead created → qualified → contracted → G99 submitted → G99 approved → installed → commissioned → live
   - Maintenance events
   - Tariff changes
   - Revenue milestones (first £1K, first £10K, payback achieved)

### Portfolio Dashboard (at `/portfolio`)

The top-level view showing all properties at once:

**Summary Stats Bar:**
- Total homes: [X] live / [Y] installed / [Z] in pipeline
- Total portfolio capacity: [X] kWh
- This month's revenue: £[X] (projected or actual)
- Average payback progress: [X]% across portfolio
- Portfolio DSCR: [X.XX]

**Property Table:**
| Address | Status | System | Capacity | Tariff | Monthly Revenue | Payback | Actions |
|---------|--------|--------|----------|--------|-----------------|---------|---------|
| 14 Oak Lane, BB2 | 🟢 Live | Sigenergy 204kWh | 204 kWh | IOF | £2,667 | 68% | View / Edit |
| 7 Mill Close, BB5 | 🟡 Installed | GivEnergy 120kWh | 120 kWh | Flux | £1,800 | 0% | View / Edit |

Filterable by: status, tariff, substation area, postcode, install date range, revenue range

**Portfolio Map:**
- All properties plotted on map with colour-coded pins (green = live, yellow = installed, grey = pipeline)
- Click a pin → mini summary card with key metrics
- Cluster view when zoomed out

**Portfolio Revenue Chart:**
- Stacked area chart showing revenue growth as homes come online over time
- Projection overlay showing planned deployment vs actual

**Alerts Panel:**
- Properties underperforming vs model (>10% below projected revenue)
- Upcoming ESA renewals (within 12 months of contract end)
- Maintenance due
- G99 applications pending >8 weeks
- Battery degradation ahead of schedule

### Bulk Operations

- **Bulk tariff change:** "What if we moved all IOF homes to Agile?" — model the impact across the whole portfolio before deciding
- **Bulk export:** Download entire portfolio data as CSV/Excel for lender reporting
- **Portfolio summary PDF:** One-click generation of a portfolio summary document for investors/lenders — pulls latest data, formats it professionally

### Integration Points (How Agent 9 Connects to Everything)

| Pulls FROM | Data | Purpose |
|-----------|------|---------|
| Agent 1 (Hardware) | Equipment specs + costs | Auto-populates system config when assigning hardware |
| Agent 2 (Tariffs) | Current rates + time windows | Auto-populates tariff details, calculates revenue |
| Agent 3 (Finance) | Assumptions + projection engine | Generates per-property 10-year financials |
| Agent 4 (Grid) | Substation data, property scores | Auto-assigns nearest substation, shows constraint status |
| Agent 6 (Funding) | DSCR requirements, covenant thresholds | Flags if portfolio DSCR drops below lender covenants |
| Agent 7 (Legal) | Compliance checklist, certification status | Shows per-property compliance status |
| Agent 8 (Customers) | Lead/referral data | Links property back to acquisition source |

| Feeds INTO | Data | Purpose |
|-----------|------|---------|
| Main Dashboard | Portfolio totals, revenue, property count | Hero stats on main dashboard |
| Agent 3 (Finance) | Actual performance data | Calibrates projection models with real results |
| Agent 5 (Strategy) | Deployment density by area | Informs substation saturation strategy |
| Agent 6 (Funding) | Live portfolio metrics | Provides lenders with real-time portfolio health |

---

## Agent 10: Risk & Opportunities Manager

**Branch:** `agent/10-risk`
**Directory:** `/src/modules/risk/`
**Pages:** `/src/app/risk/`

### Scope

Identifies, quantifies, and tracks every risk AND opportunity that could impact RoseStack's business model — modelled exactly like a CVR Risk & Opportunities register. Each item gets a probability, financial impact, mitigation/capture strategy, and trigger threshold. The AI research agent continuously monitors for emerging threats and tailwind opportunities.

### Risk Categories to Seed

**1. Tariff & Revenue Risks**

| Risk | Description | Potential Impact |
|------|-------------|-----------------|
| IOF rate reduction | Octopus reduces import/export spread on Intelligent Flux | Direct revenue reduction — model the impact of 10%, 20%, 50% spread compression |
| IOF discontinuation | Octopus withdraws the IOF tariff entirely | Catastrophic — need to model fallback to Agile/Flux/standard tariffs and residual revenue |
| Agile price convergence | Day/night price spread narrows as more batteries enter the market | Reduces arbitrage opportunity across all time-of-use tariffs |
| Export rate collapse | SEG and export rates driven down by oversupply of distributed generation | Impacts all export revenue streams |
| Saving Sessions cancelled | National Grid ESO discontinues Demand Flexibility Service | Removes £2,000–4,000/yr per home revenue stream |
| Tariff eligibility change | Octopus changes battery size or MCS requirements for IOF | Could disqualify existing or planned systems |
| Standing charge increases | Significant standing charge rises eat into net revenue | Marginal but cumulative across portfolio |

**2. Energy Market Risks**

| Risk | Description | Potential Impact |
|------|-------------|-----------------|
| Wholesale price crash | Gas/electricity wholesale prices fall significantly (e.g. post-war peace, massive renewable buildout) | Narrows arbitrage spread — all tariff rates are ultimately linked to wholesale |
| Negative pricing frequency | Increasing periods of negative wholesale prices | Could mean paying to export during some windows |
| Capacity market rule changes | Ofgem/ESO change minimum thresholds or de-rate small batteries | Could exclude RoseStack portfolio from capacity market revenue |
| Flexibility market saturation | Too many batteries registered on Piclo Flex in ENWL territory | Drives down flexibility tender prices |
| Grid balancing changes | Shift from frequency response to other balancing mechanisms | Changes which services batteries can profitably provide |

**3. Regulatory & Policy Risks**

| Risk | Description | Potential Impact |
|------|-------------|-----------------|
| VAT on battery storage | Government removes 0% VAT on residential battery installations | Increases capex by 20% overnight |
| Planning restrictions | Local authority introduces planning requirements for large battery installations | Delays deployments, adds cost, some properties become ineligible |
| Fire safety regulation | New regulations mandate minimum separation distances or enclosure standards | Could make some garden installations impossible, increase enclosure costs |
| FCA regulation of ESA | FCA determines the Energy Services Agreement is a regulated credit agreement | Requires FCA authorisation — significant compliance cost and delay |
| MCS scheme changes | MCS certification requirements tightened or costs increased | Increases per-installation compliance cost |
| G99 processing delays | ENWL processing times extend beyond 12 weeks | Delays revenue start, increases working capital requirement |
| Consumer protection changes | New consumer regulations affect long-term energy service contracts | Could require ESA restructuring or give homeowners easier exit rights |
| P483 reversal or limitation | Ofgem reverses or limits domestic battery participation in flexibility markets | Removes a key future revenue stream |

**4. Technology Risks**

| Risk | Description | Potential Impact |
|------|-------------|-----------------|
| Accelerated battery degradation | Batteries degrade faster than manufacturer specs (real-world vs lab conditions) | Revenue declines faster, replacement needed earlier, model breaks |
| Inverter failure rates | Higher than expected inverter failure rate in the field | Maintenance cost increase, revenue downtime |
| Manufacturer bankruptcy | Sigenergy (or chosen manufacturer) goes bust — no warranty, no spare parts | Stranded assets, need to re-platform to alternative hardware |
| Cybersecurity breach | Battery management system or cloud platform hacked | Revenue loss during downtime, reputational damage, potential safety issue |
| Software platform failure | mySigen or Octopus Kraken platform outage prevents charge/discharge optimisation | Revenue loss during outage period |
| Technology leapfrog | New battery technology (solid-state, sodium-ion) makes current LFP systems obsolete or uncompetitive | Existing portfolio locked into older tech at higher cost |

**5. Operational Risks**

| Risk | Description | Potential Impact |
|------|-------------|-----------------|
| Installer capacity | Can't find enough qualified MCS installers to hit deployment targets | Deployment schedule slips, revenue ramp delayed |
| Homeowner churn | Homeowners want to exit ESA early (house sale, dissatisfaction, divorce) | Revenue loss, asset recovery cost, potential legal disputes |
| Theft or vandalism | Battery system stolen or damaged | Insurance claim, revenue downtime, replacement cost |
| Property access issues | Homeowner refuses access for maintenance or monitoring | System performance degrades, potential contract breach |
| Homeowner switches supplier | Homeowner changes energy supplier without notifying RoseStack — new supplier may not support IOF or battery configuration | Revenue loss, system may stop optimising, requires ESA clause enforcement |
| Key person risk | Dave or Josh unable to continue (illness, other commitments) | Business continuity threat — both founders employed full-time elsewhere |
| Subcontractor failure | Installation subcontractor goes bust or delivers poor quality | Delays, rectification costs, warranty disputes |

**6. Financial Risks**

| Risk | Description | Potential Impact |
|------|-------------|-----------------|
| Interest rate rise | Base rate increases push up asset finance costs | Higher debt service, lower net margin per home |
| EFG scheme withdrawal | Government withdraws Enterprise Finance Guarantee scheme | First facility may not be possible without personal guarantee |
| Lender covenant breach | Portfolio DSCR drops below lender covenant threshold | Loan acceleration, forced asset sale, business failure |
| Currency risk | Battery hardware priced in USD/CNY — sterling weakness increases capex | Higher per-home capital cost |
| Insurance cost escalation | Insurers increase premiums for residential battery systems (fire risk perception) | Reduces net margin |
| Cash flow gap | Revenue timing doesn't match debt service payments | Working capital crunch in early years |

**7. Competitive Risks**

| Risk | Description | Potential Impact |
|------|-------------|-----------------|
| Octopus self-deployment | Octopus Energy deploys its own battery fleet to homeowners | Direct competition with deeper pockets and tariff control |
| National player enters Lancashire | Social Energy, Moixa, or similar scales into East Lancashire | Competes for same 3-phase homes and substation capacity |
| Installer disintermediation | Heatable or other installers copy the model and cut out RoseStack | Lose control of the value chain |
| Homeowner self-install | Battery costs fall enough that homeowners buy their own systems | Reduces addressable market for lease/ESA model |
| Utility company response | E.ON, British Gas, or EDF launch competing residential battery schemes | Well-funded competition with existing customer bases |

### Opportunity Categories to Seed

**1. Hardware Cost Reduction Opportunities**

| Opportunity | Description | Potential Upside |
|-------------|-------------|-----------------|
| LFP battery price decline | Global LFP cell prices continuing to fall (down ~70% since 2020) | Every 10% capex reduction = faster payback, higher ROI, more homes fundable per £ |
| Sodium-ion commercialisation | CATL Naxtra and others bring Na-ion to market at 30–40% below LFP | 204kWh system could drop from ~£48K to ~£30K — payback under 12 months |
| Inverter commoditisation | More 3-phase hybrid inverters entering UK market drives prices down | Reduces per-home capex, widens supplier options |
| Second-life EV batteries | Retired EV batteries (70–80% remaining capacity) become available cheaply | Potential ultra-low-cost systems for flexibility-only deployments |
| Chinese manufacturer direct | Bypass UK distributors and import battery/inverter direct from manufacturers | 20–40% cost reduction on hardware at volume |
| Volume purchasing power | As portfolio grows, negotiate better hardware pricing | 50+ systems = significant leverage with Sigenergy or alternatives |

**2. Revenue Enhancement Opportunities**

| Opportunity | Description | Potential Upside |
|-------------|-------------|-----------------|
| Additional Saving Sessions | ESO increases number of Saving Sessions per year (currently ~25) | Each additional session = ~£150–700 per home depending on rate and capacity |
| Saving Sessions rate increase | ESO increases per-kWh payment rate for DFS events | Direct revenue uplift across entire portfolio |
| IOF rate improvement | Octopus widens the spread as grid stress increases | Direct revenue increase — model 10%, 20% spread widening |
| New premium tariffs | Octopus or competitors launch new battery-optimised tariffs with better spreads | Potential to switch portfolio to higher-revenue tariff |
| Triple cycling | Battery technology improvements allow 3 cycles per day instead of 2 | Up to 50% revenue increase per home from same hardware |
| Seasonal optimisation | Exploit winter/summer rate differentials more aggressively | Higher revenue in winter when spreads are typically wider |
| Stacking Cosy + IOF | Homes with heat pumps qualify for Octopus Cosy tariff windows alongside IOF | Additional cheap-rate charging windows = more arbitrage cycles |

**3. Grid & Flexibility Market Opportunities**

| Opportunity | Description | Potential Upside |
|-------------|-------------|-----------------|
| ENWL flexibility expansion | ENWL expands flexibility procurement as grid stress grows with EV adoption | More tender opportunities, higher prices per kW in constrained areas |
| P483 full implementation | Full domestic battery participation in flexibility markets beds in | Unlocks £500–2,000/yr per home from flexibility alone |
| Capacity Market access | Portfolio reaches minimum threshold for Capacity Market participation | £20–40/kW/year — potentially £4,000–8,000/yr for a 204kWh system |
| Balancing Mechanism access | Aggregators open BM participation to smaller battery portfolios | Highest-value grid service — £100+/MWh during system stress events |
| BiTraDER (ENWL secondary trading) | ENWL's secondary flexibility trading platform goes live in Lancashire | Additional revenue stream from peer-to-peer flexibility trading |
| V2G integration | Vehicle-to-Grid matures — homes with EVs add car battery to the arbitrage pool | 40–80kWh additional capacity per home at zero hardware cost |
| Grid constraint worsening | More EVs and heat pumps overload local substations | Increases DNO willingness to pay for flexibility = higher tender prices |

**4. Policy & Regulatory Tailwinds**

| Opportunity | Description | Potential Upside |
|-------------|-------------|-----------------|
| Government battery storage incentive | UK government introduces grant or tax relief for residential battery storage | Reduces capex, potentially makes 1-phase homes viable |
| Mandated new-build batteries | Building regulations require battery storage in new homes | Massive new market for RoseStack deployment or SaaS licensing |
| Carbon border adjustments | Carbon pricing makes fossil fuel electricity more expensive | Widens the renewable/storage arbitrage spread |
| Local authority partnerships | Councils seeking to meet net zero targets fund community battery schemes | Bulk deployment contracts with guaranteed revenue |
| Green mortgage products | Lenders offer better rates for homes with battery storage | Increases homeowner willingness to host RoseStack systems |
| BUS grant expansion | Boiler Upgrade Scheme expanded to include battery storage alongside heat pumps | Reduces homeowner/deployer capex |

**5. Business Model Opportunities**

| Opportunity | Description | Potential Upside |
|-------------|-------------|-----------------|
| SaaS licensing | License the RoseStack platform to other battery deployers nationally | Recurring revenue with near-zero marginal cost |
| White-label hardware | Develop RoseStack-branded battery modules using Chinese OEM manufacturing | Control the supply chain, higher margins, brand value |
| Installer network | Build a network of certified RoseStack installers across the northwest | Scale deployments without hiring, earn margin on installation |
| Data monetisation | Anonymised portfolio performance data valuable to DNOs, energy traders, researchers | Revenue from data that's already being collected |
| Franchise model | License the entire RoseStack model to operators in other DNO regions | National scale without national overhead |
| Community energy schemes | Structure community-owned battery projects using cooperative model | Access community energy funding, goodwill, and different customer segments |
| Commercial/industrial pivot | Adapt the model for businesses, farms, schools with larger systems | Higher per-site revenue (£8–15K/yr), simpler sales process (one decision-maker) |
| EV charging integration | Add EV charging to RoseStack homes — charge from battery at off-peak rates | Additional revenue stream + makes the proposition more attractive to homeowners |

**6. Competitive Advantage Opportunities**

| Opportunity | Description | Potential Upside |
|-------------|-------------|-----------------|
| First-mover substation lock-in | Saturate constrained substations before competitors arrive | Monopoly position in the highest-value grid areas |
| Real-world performance data | 12+ months of auditable data from Dave's own system | Competitive moat — competitors can only offer projections, we have proof |
| Homeowner referral network | Each installed home generates referrals from neighbours | Organic growth engine with near-zero acquisition cost |
| ENWL relationship | Become ENWL's preferred residential flexibility partner in East Lancashire | Priority access to flexibility tenders, influence on future procurement design |
| Installer loyalty | Lock in best MCS installers with volume guarantees before competitors | Capacity moat — competitors can't deploy if installers are committed to us |

### Scoring Engine (Risks AND Opportunities)

Each item is scored on two axes:

**Probability:** 1 (Very Unlikely) → 5 (Almost Certain)
**Impact:** 1 (Negligible) → 5 (Transformative)

**Score = Probability × Impact**

**For Risks:**

| Score Range | Rating | Action Required |
|-------------|--------|-----------------|
| 1–4 | Low (Green) | Monitor quarterly |
| 5–9 | Medium (Amber) | Active mitigation plan required |
| 10–15 | High (Orange) | Escalate to founders, mitigation in progress |
| 16–25 | Critical (Red) | Immediate action, potential business-threatening |

**For Opportunities:**

| Score Range | Rating | Action Required |
|-------------|--------|-----------------|
| 1–4 | Low (Blue) | Note and review quarterly |
| 5–9 | Medium (Teal) | Develop capture plan |
| 10–15 | High (Green) | Actively pursuing, resource allocated |
| 16–25 | Transformative (Gold) | Strategic priority — could reshape the business |

### Opportunity Modelling Engine

Mirror of the risk modelling engine, but for upside scenarios:

**Hardware Cost Reduction Modeller:**
- Input: current hardware cost → modelled reduced cost (slider: -10%, -20%, -30%, -50%)
- Output: new payback period, new ROI, additional homes fundable per £ of capital, portfolio NPV uplift
- Visualisation: payback curve comparison (current cost vs reduced cost)

**Revenue Enhancement Modeller:**
- Input: toggle on additional revenue streams or adjust existing rates upward
- Output: per-home and portfolio revenue uplift, new DSCR, accelerated payback
- Scenarios: "Saving Sessions doubled," "IOF spread +20%," "Flexibility revenue unlocked," "Triple cycling enabled"

**Market Expansion Modeller:**
- Input: new market segments (commercial, new-build, social housing) with estimated volume and revenue
- Output: portfolio growth trajectory, capex requirement, revenue diversification chart

**Combined Tailwind Scenario:**
- "Best Case": battery costs drop 30% + Saving Sessions double + flexibility revenue unlocked + 3 referrals per home
- Shows: accelerated deployment, earlier profitability, higher exit valuation

**Net Risk/Opportunity Position:**
- Aggregate all risks and opportunities into a single view
- Net expected value: sum of (probability × financial impact) for all items
- If net positive, the business has more upside than downside exposure — powerful for investor conversations
- Waterfall chart: starting revenue → subtract risk impacts → add opportunity uplifts → net position

### Risk Modelling Engine

For each quantifiable risk, the agent builds a financial impact model:

**Tariff Change Modeller:**
- Input: current tariff rates → modelled new rates (slider or manual entry)
- Output: impact on per-home revenue, portfolio revenue, payback period, DSCR
- Visualisation: waterfall chart showing revenue change, traffic-light on DSCR

**Energy Price Scenario Modeller:**
- Input: wholesale price trajectory (Cornwall Insight scenarios or custom)
- Output: projected tariff rate changes → revenue impact across portfolio
- Scenarios: Net Zero (gradual decline), Crisis (spike then fall), Stagnation (flat), Collapse

**Technology Failure Modeller:**
- Input: degradation rate override, failure probability, replacement cost
- Output: portfolio-level maintenance budget, revenue reduction, warranty claim forecast

**Regulatory Change Modeller:**
- Input: toggle specific regulatory changes on/off
- Output: capex impact, revenue impact, compliance cost, timeline delay

**Combined Stress Test:**
- "Perfect Storm" scenario: what happens if IOF rates drop 20% AND degradation is 3% AND interest rates rise 2% AND Saving Sessions are cancelled — all at once?
- Shows portfolio break-even point and whether the business survives
- Feeds directly into Agent 6 (Funding) for lender stress test reporting

### Mitigation & Capture Register

**For each risk**, track:
- **Mitigation strategy** — what are we doing to reduce probability or impact?
- **Mitigation owner** — who is responsible? (Dave, Josh, or future team member)
- **Mitigation status** — Not Started / In Progress / Implemented / Tested
- **Residual risk score** — risk score after mitigation applied
- **Trigger threshold** — what event or data point would escalate this risk?
- **Contingency plan** — if mitigation fails, what's Plan B?

**For each opportunity**, track:
- **Capture strategy** — what actions are needed to realise this opportunity?
- **Capture owner** — who is responsible?
- **Capture status** — Not Started / Researching / In Progress / Captured / Missed
- **Expected value** — probability × financial upside (£ per year or one-off)
- **Trigger threshold** — what event or data point would activate pursuit?
- **Dependencies** — what needs to happen first? (e.g., "portfolio of 20+ homes before approaching ENWL for direct contract")
- **Investment required** — does capturing this opportunity require capital or time?

### UI Components to Build

1. **Risk & Opportunity Heat Map** — two 5×5 matrices side by side. Left: risks (red/amber/green). Right: opportunities (gold/green/blue). Dots are plotted for each item, click to drill in. This is the hero visual — one glance tells you the business's risk/opportunity profile.

2. **Combined Register Table** — toggle between Risks / Opportunities / All. Sortable, filterable list with: ID, name, type (risk/opportunity), category, probability, impact, score, rating, owner, status, last reviewed date

3. **Detail Page** — for each risk or opportunity:
   - Description and rationale
   - Score with history chart (has it gone up or down over time?)
   - Financial impact/upside model (specific to that item)
   - Mitigation/capture plan with status
   - Trigger thresholds and alert configuration
   - Related items (e.g., "battery cost reduction" opportunity is the inverse of "battery cost increase" risk)
   - AI research agent notes (latest intelligence)

4. **Scenario Dashboard** — pre-built scenarios combining multiple items:
   - **Downside scenarios:**
     - "Tariff Squeeze" — IOF rates drop + Agile spread narrows
     - "Regulatory Tightening" — new planning rules + MCS cost increase + G99 delays
     - "Technology Shock" — accelerated degradation + manufacturer exits market
     - "Market Competition" — Octopus self-deploys + national player enters
     - "Perfect Storm" — worst case across all categories simultaneously
   - **Upside scenarios:**
     - "Hardware Windfall" — battery costs drop 30% + volume discounts kick in
     - "Revenue Boom" — Saving Sessions doubled + flexibility markets open + IOF spread widens
     - "Regulatory Tailwind" — government incentive + mandated new-build batteries
     - "Market Domination" — first-mover lock-in + referral network + ENWL partnership
     - "Best Case" — best case across all categories simultaneously
   - Each scenario shows: revenue impact, DSCR impact, payback change, portfolio valuation change

5. **Net Position Waterfall** — single chart showing: base case revenue → subtract all risk-adjusted impacts → add all opportunity-adjusted uplifts → net expected position. This is the chart that tells an investor "even accounting for everything that could go wrong, the expected value is still strongly positive."

6. **Risk/Opportunity Timeline** — Gantt-style view showing when items are most likely to materialise, with risks above the line and opportunities below

7. **Reporting** — one-click PDF export of full R&O register + heat maps + net position waterfall for inclusion in lender packs and investor materials

### Integration Points

| Pulls FROM | Data | Purpose |
|-----------|------|---------|
| Agent 2 (Tariffs) | Current rates, rate change history | Detects tariff risk triggers automatically |
| Agent 3 (Finance) | Financial models, sensitivity data | Quantifies financial impact of each risk |
| Agent 4 (Grid) | Flexibility market data, DNO policy | Monitors grid-related risk triggers |
| Agent 5 (Strategy) | Competitor intelligence | Feeds competitive risk assessment |
| Agent 6 (Funding) | DSCR covenants, lender requirements | Ensures risk modelling meets lender expectations |
| Agent 7 (Legal) | Regulatory changes | Auto-flags new regulatory risks |
| Agent 9 (Portfolio) | Live portfolio performance | Detects real-world risk triggers (degradation ahead of model, revenue below forecast) |

| Feeds INTO | Data | Purpose |
|-----------|------|---------|
| Agent 6 (Funding) | Full R&O register, stress tests, heat maps, net position waterfall | Lender reporting and investment readiness — lenders see both threats AND upside |
| Agent 9 (Portfolio) | Risk alerts + opportunity flags per property and per substation area | Property-level risk flags and opportunity indicators on portfolio dashboard |
| Main Dashboard | Net R&O position + top risk + top opportunity | R&O summary card on main dashboard |

### Embedded AI Research Agent

**Name:** Risk & Opportunity Monitor
**Trigger:** Daily for market risks/opportunities, weekly for regulatory/competitive, monthly for technology
**Purpose:** Scan Ofgem announcements, Octopus blog/tariff pages, energy industry press, BEIS consultations, battery safety incidents, competitor funding announcements, wholesale market data, battery price indices, government policy announcements, green finance news — flag anything that changes the probability or impact of a registered risk or opportunity, or identifies a new item not yet in the register
**Output:** Risk/opportunity intelligence alerts with recommended score adjustments, new item proposals for founder review, net position trend updates

---

## Build Sequence

The agents should execute in this order to respect dependencies:

```
Phase 1 (Parallel):
  Agent 0: Orchestrator — scaffold, schema, design system
  
Phase 2 (Parallel — after Agent 0 completes):
  Agent 1: Hardware Specialist — no dependencies beyond shared types
  Agent 2: Tariff Expert — no dependencies beyond shared types
  Agent 4: Grid Expert — no dependencies beyond shared types
  Agent 7: Legal & Compliance — no dependencies beyond shared types
  
Phase 3 (Parallel — after Agents 1 + 2 complete):
  Agent 3: Financial Modeller — needs hardware costs + tariff rates
  Agent 8: Customer Acquisition — needs property scoring from Agent 4
  
Phase 4 (After Agents 1 + 2 + 3 + 4 + 7 + 8 complete):
  Agent 9: Portfolio Manager — pulls from almost everything, this is the integration layer
  Agent 10: Risk & Opportunities Manager — needs tariff data, financial models, grid data, legal intel, portfolio data
  Agent 5: Strategy & Moat — benefits from all other modules existing
  Agent 6: Financing & Investment — needs financial models from Agent 3 + portfolio from Agent 9 + risk register from Agent 10
```

---

## Main Dashboard

Once all agents have built their modules, the main dashboard at `/dashboard` should aggregate key metrics from every module:

**Hero Stats (top of dashboard):**
- Total homes deployed / target
- Portfolio monthly revenue (actual if live, projected if pre-launch)
- Average payback period across portfolio
- Pipeline value (leads × estimated revenue)

**Module Cards:**
- **Portfolio: Primary card — total homes, monthly revenue, payback progress, map thumbnail**
- Hardware: "Best current system" summary + cost
- Tariffs: "Current IOF spread" + daily revenue per home
- Finance: "Portfolio ROI" + DSCR status
- Grid: Map thumbnail showing deployment coverage + constrained substations
- Strategy: "This week's intel" — top 3 items from Strategy Scout
- Funding: "Funding pipeline" — total committed / target
- Legal: "Compliance status" — green/amber/red
- Risk: "R&O Position" — dual heat map thumbnail + net position indicator (positive/negative) + top risk and top opportunity
- Customers: "Pipeline" — leads by stage, this month's conversions

---

## Environment Variables Required

```env
# Database
DATABASE_URL=

# Auth (Clerk or similar)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI Agents
ANTHROPIC_API_KEY=
OPENAI_API_KEY=  # optional, if using GPT for any agent

# Mapping
MAPBOX_ACCESS_TOKEN=  # or Leaflet (free, no key needed)

# Energy APIs
OCTOPUS_API_KEY=  # for live tariff rates
OCTOPUS_ACCOUNT_NUMBER=  # for portfolio monitoring

# Notifications
RESEND_API_KEY=  # or SendGrid, for alerts

# Deployment
VERCEL_TOKEN=  # or Railway
```

---

## Key Business Context for All Agents

Every agent should understand these fundamentals:

1. **The core proposition:** RoseStack owns battery systems installed in homeowners' gardens. Homeowners get zero electricity bills + £100/month. RoseStack keeps all revenue above that.

2. **Revenue per home:** ~£32,000/year gross from IOF arbitrage + Saving Sessions on a 204kWh Sigenergy system. This is based on published tariff rates, not projections.

3. **Capital cost per home:** ~£47,800 (hardware + installation + G99 + ancillaries). Payback: ~1.7 years.

4. **Target:** 100 homes over 8 years across Lancashire. Phase 1 focus: East Lancashire (Blackburn, Burnley, Ribble Valley).

5. **Founders:** Dave Middleton (Commercial Manager, nuclear infrastructure background, NEC4 expert) and Josh Knight (Senior QS, procurement and cost management). Both employed full-time — not drawing salaries from RoseStack.

6. **Three-phase requirement:** The system needs 3-phase power supply. This limits the target market to larger properties (typically 4+ bed detached, pre-1970s builds, or rural properties).

7. **Phased approach:**
   - Phase 1: Domestic IOF homes (proven revenue)
   - Phase 2: Commercial sites via Piclo Flex (clubs, farms)
   - Phase 3: Own-brand hardware + software licensing
   - Phase 4: National expansion + SaaS platform

8. **The name:** RoseStack — from Lancashire's red rose + batteries literally stacking. The brand should feel premium, local, and trustworthy.

---

## Quality Standards

- All code must be TypeScript with strict mode
- All API routes must have input validation (Zod)
- All database queries must use parameterised queries (no raw SQL injection risk)
- All financial calculations must have unit tests with known expected outputs
- All UI must be responsive (mobile-first — Dave will check dashboards from his phone at Sellafield)
- All AI agent outputs must be stored with timestamps and source citations
- All secrets in environment variables, never committed
- README updated by each agent with their module's documentation

---

## Final Integration Checklist

After all agents complete, verify:

- [ ] All modules (including Portfolio) appear in sidebar navigation
- [ ] Portfolio "Add Property" wizard pulls hardware from Agent 1, tariffs from Agent 2, financials from Agent 3
- [ ] Adding a property auto-generates 10-year projections
- [ ] Portfolio dashboard shows all properties with live metrics
- [ ] Main dashboard aggregates data from all modules (Portfolio as hero card)
- [ ] Shared types are consistent across all modules
- [ ] Database migrations run cleanly in sequence
- [ ] AI research agents can be triggered from their module pages
- [ ] Homeowner email templates (monthly statement, welcome pack, annual summary) generate correctly
- [ ] Tariff optimisation sweep runs across portfolio and flags recommendations
- [ ] Letter of Authority clause flagged in Agent 7 legal requirements
- [ ] Design system is consistent across all pages
- [ ] Dark mode works everywhere
- [ ] Mobile responsive on all pages
- [ ] Environment variables documented in `.env.example`
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Production build succeeds

---

## How to Execute: Claude Code Multi-Agent Setup

This section tells you exactly how to run this build using Claude Code's parallel execution capabilities. There are two mechanisms: **Agent Teams** (multiple Claude instances that can communicate and coordinate) and **Custom Agents** (persistent specialist definitions that can be spawned as sub-agents). We use both.

### Step 1: Enable Agent Teams

Agent Teams is experimental. Enable it before starting:

```bash
# Option A: Environment variable (temporary, current session only)
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# Option B: Settings.json (persistent)
# Add to ~/.claude/settings.json:
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Step 2: Set Up the Project CLAUDE.md

Create `CLAUDE.md` in your project root. This is the master instruction file that every Claude Code instance reads. Paste or reference this entire orchestration document, plus add these routing rules:

```markdown
# RoseStack Platform — CLAUDE.md

## Project
RoseStack Energy — battery storage deployment and management platform.
See /docs/ORCHESTRATION.md for full specification.

## Sub-Agent Routing Rules

**Parallel dispatch** (ALL conditions must be met):
- Agents are in the same build phase (see Build Sequence)
- No shared file overlap between agents
- Each agent works exclusively in their own /src/modules/[name]/ directory

**Sequential dispatch** (ANY condition triggers):
- Agent depends on another agent's output (e.g., Agent 3 needs Agent 1 + 2)
- Agent needs to modify shared types in /src/shared/
- Database migrations must be applied in order

**Never parallel:**
- Agent 0 (Orchestrator) runs alone first — everything depends on it
- Database migrations — always sequential
- /src/shared/ modifications — only Agent 0

## Domain Boundaries (No File Overlap)

| Agent | Owns exclusively |
|-------|-----------------|
| 0 | /, /src/shared/, /src/app/layout.tsx, /src/app/page.tsx, /migrations/ |
| 1 | /src/modules/hardware/, /src/app/hardware/ |
| 2 | /src/modules/tariffs/, /src/app/tariffs/ |
| 3 | /src/modules/finance/, /src/app/finance/ |
| 4 | /src/modules/grid/, /src/app/grid/ |
| 5 | /src/modules/strategy/, /src/app/strategy/ |
| 6 | /src/modules/funding/, /src/app/funding/ |
| 7 | /src/modules/legal/, /src/app/legal/ |
| 8 | /src/modules/customers/, /src/app/customers/ |
| 9 | /src/modules/portfolio/, /src/app/portfolio/ |
| 10 | /src/modules/risk/, /src/app/risk/ |

## Three-Scenario Rule
Every financial output MUST show Best/Likely/Worst. Use the shared engine at /src/shared/utils/scenarios.ts. Never build your own projection logic.

## Git Rules
- Each agent works on branch: agent/[number]-[name]
- Never commit directly to main
- Agent 0 merges branches after each phase completes
```

### Step 3: Create Custom Agent Definitions

Create `.claude/agents/` in your project. Each agent gets a markdown file that defines its role, so Claude Code can spawn them as specialist sub-agents.

```
.claude/agents/
├── hardware-specialist.md
├── tariff-expert.md
├── financial-modeller.md
├── grid-expert.md
├── strategy-moat.md
├── financing-investment.md
├── legal-compliance.md
├── customer-acquisition.md
├── portfolio-manager.md
└── risk-opportunities.md
```

**Example: `.claude/agents/hardware-specialist.md`**

```markdown
---
name: Hardware Specialist
description: Researches and builds the battery, inverter, solar PV, and heat pump database
---

You are Agent 1: Hardware Specialist for the RoseStack Energy platform.

## Your Directory
You ONLY modify files in:
- /src/modules/hardware/
- /src/app/hardware/

## Your Task
Read the full Agent 1 specification in /docs/ORCHESTRATION.md and build everything described there:
1. Database seed with all battery systems, inverters, solar panels, heat pumps
2. Hardware catalogue UI with search and filters
3. System builder wizard
4. Comparison tool (side-by-side, up to 4 systems)
5. Cost tracker
6. Compatibility matrix
7. Embedded AI research agent configuration

## Dependencies
- Import shared types from /src/shared/types/
- Import UI components from /src/shared/ui/
- Import database client from /src/shared/db/
- Use the shared scenario engine from /src/shared/utils/scenarios.ts

## Rules
- TypeScript strict mode
- All prices in pence (integer) to avoid floating point
- All data seeded via web search for current 2026 UK pricing
- Never modify files outside your directories
- Write tests for all data transformation functions
```

**Create similar files for each of the 10 agents**, each pointing to their section in the orchestration doc and listing their specific directories, tasks, dependencies, and rules.

### Step 4: Execution Sequence

**Phase 1 — Orchestrator (single session, ~30–60 minutes)**

Open one Claude Code terminal:

```bash
cd /path/to/rosestack-platform
claude

# Then tell Claude:
"You are Agent 0: Orchestrator. Read /docs/ORCHESTRATION.md and execute all
Agent 0 tasks: evaluate and select the tech stack, scaffold the project,
define shared types, create the database schema, build the shared scenario
engine, and build the design system. Work on the main branch. When complete,
push to main and confirm all shared infrastructure is in place."
```

Wait for this to complete. Everything else depends on it.

**Phase 2 — Four parallel agents (~1–2 hours)**

Now use Agent Teams. In your Claude Code session:

```
"Create an agent team for Phase 2 of the RoseStack build. Spawn 4 teammates:

Teammate 1: Hardware Specialist — use the .claude/agents/hardware-specialist.md
agent definition. Work on branch agent/1-hardware. Build everything in the
Agent 1 section of /docs/ORCHESTRATION.md.

Teammate 2: Tariff Expert — use the .claude/agents/tariff-expert.md agent
definition. Work on branch agent/2-tariffs. Build everything in the Agent 2
section including the portfolio tariff optimisation sweep.

Teammate 3: Grid Expert — use the .claude/agents/grid-expert.md agent
definition. Work on branch agent/4-grid. Build everything in the Agent 4
section including the property prospecting engine.

Teammate 4: Legal & Compliance — use the .claude/agents/legal-compliance.md
agent definition. Work on branch agent/7-legal. Build everything in the Agent 7
section including the Letter of Authority ESA clause.

Each teammate works ONLY in their own directories. No shared file modifications.
When all four complete, report back."
```

Once all four report complete, merge their branches:

```bash
git checkout main
git merge agent/1-hardware
git merge agent/2-tariffs
git merge agent/4-grid
git merge agent/7-legal
```

**Phase 3 — Two parallel agents (~1–2 hours)**

```
"Create an agent team for Phase 3. Spawn 2 teammates:

Teammate 1: Financial Modeller — branch agent/3-finance. Needs the hardware
data from Agent 1 and tariff data from Agent 2 (now merged to main).
Build everything in Agent 3 section. Use the shared scenario engine for
all Best/Likely/Worst projections.

Teammate 2: Customer Acquisition — branch agent/8-customers. Needs the
property scoring from Agent 4 (now merged to main). Build everything in
Agent 8 section including referral engine and email templates."
```

Merge when complete:

```bash
git merge agent/3-finance
git merge agent/8-customers
```

**Phase 4 — Four parallel agents (~1–2 hours)**

```
"Create an agent team for Phase 4. Spawn 4 teammates:

Teammate 1: Portfolio Manager — branch agent/9-portfolio. This is the
integration layer. Build the Add Property wizard, property detail pages,
portfolio dashboard, and all integration points from Agent 9.

Teammate 2: Risk & Opportunities Manager — branch agent/10-risk. Build the
full R&O register with all seeded risks and opportunities, scoring engine,
modelling engine, heat maps, and scenario dashboard from Agent 10.

Teammate 3: Strategy & Moat — branch agent/5-strategy. Build the competitive
intelligence, partnership pipeline, technology radar, and strategy timeline
from Agent 5.

Teammate 4: Financing & Investment — branch agent/6-funding. Build the lender
database, deal structurer, covenant tracker, stress test dashboard, and data
room from Agent 6."
```

Final merge:

```bash
git merge agent/9-portfolio
git merge agent/10-risk
git merge agent/5-strategy
git merge agent/6-funding
```

**Phase 5 — Integration (single session, ~30–60 minutes)**

```
"All agent branches are merged. Now act as the integration agent:

1. Wire up the sidebar navigation with all 10 modules
2. Build the main dashboard aggregating data from all modules
3. Verify all shared types are consistent
4. Run all database migrations in sequence
5. Fix any TypeScript errors from cross-module integration
6. Verify the three-scenario standard is applied everywhere
7. Test the Add Property wizard end-to-end
8. Run the full test suite
9. Verify production build succeeds
10. Run through the Final Integration Checklist in /docs/ORCHESTRATION.md"
```

### Alternative: Sub-Agents Instead of Agent Teams

If Agent Teams feels too experimental or you want more control, you can achieve parallel execution with **sub-agents** instead. In a single Claude Code session:

```
"I need you to build the RoseStack platform. Read /docs/ORCHESTRATION.md.

Start with Agent 0 tasks yourself (scaffold, schema, design system).

Then for Phase 2, spawn 4 parallel sub-agents using the custom agent
definitions in .claude/agents/:
- hardware-specialist.md → builds Agent 1
- tariff-expert.md → builds Agent 2
- grid-expert.md → builds Agent 4
- legal-compliance.md → builds Agent 7

Each sub-agent works only in their own directories. Wait for all 4 to
complete before moving to Phase 3.

Continue through all phases as described in the Build Sequence."
```

Sub-agents work independently and report back summaries. They can't communicate with each other (unlike Agent Teams teammates), but for this project that's fine — the agents are designed to be independent within each phase.

### Alternative: Manual Parallel Terminals

If you prefer maximum control, open multiple terminal windows:

```bash
# Terminal 1 (after Phase 1 is done)
cd rosestack-platform && git checkout -b agent/1-hardware
claude -p "You are Agent 1: Hardware Specialist. Read /docs/ORCHESTRATION.md Agent 1 section. Build everything described. Only modify files in /src/modules/hardware/ and /src/app/hardware/."

# Terminal 2
cd rosestack-platform && git checkout -b agent/2-tariffs
claude -p "You are Agent 2: Tariff Expert. Read /docs/ORCHESTRATION.md Agent 2 section. Build everything described. Only modify files in /src/modules/tariffs/ and /src/app/tariffs/."

# Terminal 3
cd rosestack-platform && git checkout -b agent/4-grid
claude -p "You are Agent 4: Grid Expert. Read /docs/ORCHESTRATION.md Agent 4 section. Build everything described. Only modify files in /src/modules/grid/ and /src/app/grid/."

# Terminal 4
cd rosestack-platform && git checkout -b agent/7-legal
claude -p "You are Agent 7: Legal & Compliance. Read /docs/ORCHESTRATION.md Agent 7 section. Build everything described. Only modify files in /src/modules/legal/ and /src/app/legal/."
```

Each terminal is an independent Claude Code session on its own branch. Merge when all complete.

### Cost and Time Estimates

| Phase | Agents | Estimated Time | Estimated API Cost |
|-------|--------|---------------|-------------------|
| 1: Orchestrator | 1 | 30–60 min | $5–15 |
| 2: Hardware, Tariffs, Grid, Legal | 4 parallel | 60–120 min | $20–60 |
| 3: Finance, Customers | 2 parallel | 60–120 min | $10–30 |
| 4: Portfolio, R&O, Strategy, Funding | 4 parallel | 60–120 min | $20–60 |
| 5: Integration | 1 | 30–60 min | $5–15 |
| **Total** | | **4–8 hours wall clock** | **$60–180** |

Running sequentially (one agent at a time) would take 15–25 hours. Parallel execution cuts this to one evening/overnight.

### Tips for Overnight Execution

1. **Use `--no-interrupts` mode** if available — prevents agents stopping to ask questions
2. **Set up JARVIS on the GEEKOM** — your existing OpenClaw setup can monitor progress and report via WhatsApp
3. **Use `git worktrees`** instead of branches if running manual parallel terminals — each agent gets its own working directory, zero merge conflicts during work:
   ```bash
   git worktree add ../rosestack-agent-1 -b agent/1-hardware
   git worktree add ../rosestack-agent-2 -b agent/2-tariffs
   git worktree add ../rosestack-agent-4 -b agent/4-grid
   git worktree add ../rosestack-agent-7 -b agent/7-legal
   ```
4. **Check Anthropic API usage limits** — 11 agents running in parallel will consume significant tokens. Ensure your plan or API budget supports this.
5. **Use Sonnet for sub-agents** if cost is a concern — set `CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-4-5-20250929` to run sub-agents on Sonnet while the lead runs on Opus. Saves ~80% on sub-agent costs without sacrificing quality on well-scoped tasks.
6. **Review in the morning** — don't try to review while agents are running. Let them finish, then review each branch before merging. The orchestration document is designed so that each agent's output is independently reviewable.
