# RoseStack Platform — Architecture Decision Record

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | Dave's existing experience (Construstack, QuidStack), SSR + API routes in one framework, excellent TypeScript support, Vercel deployment |
| **Language** | TypeScript (strict mode) | Non-negotiable per spec. Strict mode catches errors early. |
| **ORM** | Drizzle ORM | Type-safe, SQL-first approach suits complex financial queries. Lighter than Prisma, better for raw performance. |
| **Database** | PostgreSQL (Neon serverless) | PostGIS support for geospatial queries (substation mapping), JSONB for flexible agent outputs, robust for financial data. Neon gives serverless scaling + branching for dev. |
| **Auth** | Clerk | Fast setup, Next.js App Router integration, handles MFA, session management. Internal platform only (no homeowner portal). |
| **Styling** | Tailwind CSS v4 | Utility-first, excellent dark mode support, customizable design tokens. Combined with Eclipse UI Kit patterns. |
| **UI Components** | shadcn/ui (customized) | Accessible, composable components as a base. Heavily customized to match Eclipse UI Kit aesthetic with RoseStack brand. |
| **Charting** | Recharts | React-native charting, fully customizable colours/themes, good TypeScript types. Supports area, line, bar, radar, treemap — all chart types needed. Supplemented with D3 for heatmaps and Sankey diagrams. |
| **Mapping** | Leaflet + React-Leaflet | Free (no API key), OpenStreetMap tiles, sufficient for UK property/substation mapping. Lightweight. |
| **Validation** | Zod | Runtime validation for API inputs, form data, and environment variables. Integrates with Drizzle for schema inference. |
| **Email** | Resend | Modern email API, React Email templates, simple setup. For homeowner statements and alerts. |
| **AI SDKs** | Anthropic SDK (primary) + OpenAI SDK (secondary) | Claude for research agents (better at analysis), GPT as fallback. Vercel AI SDK for streaming responses. |
| **Real-time** | Server-Sent Events (initial) | Start simple with SSE for live dashboard updates. Upgrade to WebSocket/Pusher when live battery monitoring is integrated. |
| **Testing** | Vitest | Fast, Vite-native, excellent TypeScript support, compatible with Jest API. |
| **Deployment** | Vercel | Zero-config Next.js deployment, preview branches, edge functions, cron jobs for AI agents. |
| **Package Manager** | pnpm | Fast, disk-efficient, strict dependency resolution. |

## Architecture Principles

1. **Monorepo** — single repository, module boundaries enforced by directory ownership
2. **Module isolation** — each agent's code lives in `/src/modules/[name]/` with its own types, services, and components
3. **Shared kernel** — `/src/shared/` contains types, UI components, utilities, and DB schema used by all modules
4. **API convention** — `/api/[module]/[action]` with Zod validation on every route
5. **Three-scenario standard** — all financial outputs use the shared scenario engine, never custom projection logic
6. **Database-first** — Drizzle schema is the source of truth, migrations are sequential
7. **Dark mode default** — Eclipse UI Kit dark theme as primary, light mode toggle available

## Directory Structure

```
/rosestack-platform/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── layout.tsx            # Root layout with sidebar nav
│   │   ├── page.tsx              # Main dashboard
│   │   ├── dashboard/            # Dashboard route
│   │   ├── hardware/             # Agent 1 pages
│   │   ├── tariffs/              # Agent 2 pages
│   │   ├── finance/              # Agent 3 pages
│   │   ├── grid/                 # Agent 4 pages
│   │   ├── strategy/             # Agent 5 pages
│   │   ├── funding/              # Agent 6 pages
│   │   ├── legal/                # Agent 7 pages
│   │   ├── customers/            # Agent 8 pages
│   │   ├── portfolio/            # Agent 9 pages
│   │   ├── risk/                 # Agent 10 pages
│   │   └── api/                  # API routes
│   ├── modules/                  # Agent-owned business logic
│   │   ├── hardware/
│   │   ├── tariffs/
│   │   ├── finance/
│   │   ├── grid/
│   │   ├── strategy/
│   │   ├── funding/
│   │   ├── legal/
│   │   ├── customers/
│   │   ├── portfolio/
│   │   └── risk/
│   ├── shared/                   # Shared kernel
│   │   ├── types/                # Domain types
│   │   ├── ui/                   # Design system components
│   │   ├── utils/                # Scenario engine, formatters
│   │   └── db/                   # Drizzle schema & client
│   └── agents/                   # AI research agent configs
│       ├── shared/               # Shared agent runner
│       ├── hardware-researcher/
│       ├── tariff-analyst/
│       ├── grid-analyst/
│       ├── strategy-scout/
│       ├── finance-modeller/
│       ├── funding-advisor/
│       ├── legal-monitor/
│       ├── customer-intel/
│       └── risk-monitor/
├── docs/
├── migrations/
├── tests/
├── .env.example
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

## Key Design Decisions

### Why Drizzle over Prisma
- Financial queries need raw SQL control (window functions, CTEs for projection aggregation)
- Drizzle's SQL-like API is more intuitive for complex joins
- Smaller bundle size, faster cold starts on Vercel
- Direct schema-to-TypeScript inference without code generation step

### Why Recharts over D3/Plotly
- React-first (no DOM manipulation conflicts with Next.js)
- Simpler API for the common chart types (area, line, bar, radar)
- Easy to apply Eclipse colour tokens via props
- D3 used only for specialised charts (heatmaps, Sankey) where Recharts lacks support

### Why Leaflet over Mapbox
- Free (no API key, no usage limits)
- OpenStreetMap data is excellent for UK coverage
- Sufficient for property pins, substation markers, and heatmap overlays
- Mapbox would add cost without meaningful benefit for this use case

### Why SSE over WebSocket initially
- Simpler to implement, works with Vercel serverless
- Battery monitoring integration is Phase 2+ (live data feeds not yet available)
- Upgrade path to WebSocket/Pusher is straightforward when needed
