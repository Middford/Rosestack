# RoseStack Platform — CLAUDE.md

## Project
RoseStack Energy — a Lancashire-based battery storage deployment and management platform.
Full specification: `/docs/ORCHESTRATION.md`

## Key Business Context
- RoseStack owns battery systems installed in homeowners' gardens (100-200kWh per home)
- Revenue from energy arbitrage on Octopus Intelligent Flux, Saving Sessions, and Piclo Flex
- Target: 100 homes over 8 years across East Lancashire
- Founders: Dave Middleton and Josh Knight (both employed full-time elsewhere)
- Brand colour: Rose red (#B91C4D)

## Tech Stack Decision
The Orchestrator (Agent 0) will evaluate and select the optimal stack. Requirements:
- Real-time data from battery systems (MQTT/WebSocket)
- Financial modelling with complex calculations
- Mapping and geospatial data
- AI agent integration (LLM API calls)
- Mobile-responsive dashboards
- TypeScript strict mode throughout

## Three-Scenario Financial Standard (NON-NEGOTIABLE)
Every financial output in the entire platform MUST show three projections:
- **Best Case** (Green) — tailwinds materialise
- **Likely Case** (Blue) — conservative but realistic (prominent display)
- **Worst Case** (Red/Amber) — headwinds hit

All modules use the shared scenario engine at `/src/shared/utils/scenarios.ts`. Nobody builds their own projection logic.

## Sub-Agent Routing Rules

**Parallel dispatch** (ALL conditions must be met):
- Agents are in the same build phase (see Build Sequence in ORCHESTRATION.md)
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
| 0 (Orchestrator) | /, /src/shared/, /src/app/layout.tsx, /src/app/page.tsx, /migrations/ |
| 1 (Hardware) | /src/modules/hardware/, /src/app/hardware/ |
| 2 (Tariffs) | /src/modules/tariffs/, /src/app/tariffs/ |
| 3 (Finance) | /src/modules/finance/, /src/app/finance/ |
| 4 (Grid) | /src/modules/grid/, /src/app/grid/ |
| 5 (Strategy) | /src/modules/strategy/, /src/app/strategy/ |
| 6 (Funding) | /src/modules/funding/, /src/app/funding/ |
| 7 (Legal) | /src/modules/legal/, /src/app/legal/ |
| 8 (Customers) | /src/modules/customers/, /src/app/customers/ |
| 9 (Portfolio) | /src/modules/portfolio/, /src/app/portfolio/ |
| 10 (Risk) | /src/modules/risk/, /src/app/risk/ |

## Build Sequence

```
Phase 1: Agent 0 (Orchestrator) — scaffold, schema, design system, scenario engine
Phase 2 (parallel): Agents 1, 2, 4, 7
Phase 3 (parallel): Agents 3, 8
Phase 4 (parallel): Agents 5, 6, 9, 10
Phase 5: Integration — wire up navigation, main dashboard, verify everything
```

## Git Rules
- Each agent works on branch: `agent/[number]-[name]`
- Never commit directly to main (except Agent 0 during Phase 1)
- Agent 0 merges branches after each phase completes

## Quality Standards
- TypeScript strict mode
- All API routes have Zod input validation
- Parameterised database queries only
- Unit tests for all financial calculations
- Mobile-first responsive design
- All AI agent outputs stored with timestamps and source citations
- Secrets in environment variables only

## Design System
- Based on Eclipse UI Kit (dark mode primary) + Hyper Charts from Dave's Figma account
- Brand accent: Rose red (#B91C4D)
- Dark mode default, light mode toggle available
- All charts use Eclipse colour scheme, not library defaults
