# RoseStack — Algorithm IP Protection Strategy

**Prepared:** April 2026
**Owner:** Dave Middleton
**Status:** Draft — review before any investor disclosure or technical hiring

---

## 1. What We're Protecting

RoseStack's primary IP assets are:

1. **Dispatch Algorithm** — the half-hourly battery scheduling engine (`/src/modules/tariffs/dispatch-matrix.ts`) that optimises charge/discharge cycles across Agile, IOF, and Flux tariffs while prioritising Saving Sessions, solar generation, and flexibility market windows.

2. **Revenue Modelling Engine** — the three-scenario financial model (`/src/shared/utils/scenarios.ts`) with CAPACITY_RESERVE, SAVING_SESSIONS, and REVENUE_MIX constants calibrated to the RoseStack fleet profile.

3. **Property Scoring Model** — the geospatial prospecting algorithm (`/src/modules/grid/scoring.ts`) that ranks properties by deployment viability (EPC data, phase type, substation headroom, g99 probability).

4. **Fleet Optimisation Logic** — the portfolio-level dispatch and tariff-switching coordination across all deployed homes.

---

## 2. Trade Secret Protection

**Default posture: treat all algorithm code as trade secrets.**

Trade secrets have no registration requirement, have indefinite duration, and are the most practical protection for software businesses at the seed stage.

Actions required:

- [ ] Mark all source repositories as `CONFIDENTIAL — ROSESTACK ENERGY LTD — NOT FOR DISTRIBUTION`
- [ ] Ensure all repositories are private on GitHub
- [ ] Never publish or open-source the dispatch algorithm, scoring model, or revenue engine
- [ ] Document algorithm development history (commit log, design decisions) to establish provenance
- [ ] Restrict source code access: only Dave Middleton, Josh Knight, and any directly employed developers with NDA in place

---

## 3. Patent Consideration

**Dispatch algorithm:** The core charge/discharge greedy-pair algorithm is likely not patentable in isolation (standard optimisation). However, a **novel combination** of:

- Tariff-specific CAPACITY_RESERVE management (per `dispatch-matrix.ts`)
- Saving Session pre-charge protocol (T-6h, T-0 discharge, T+session resume)
- Portfolio-level fleet coordination with G99 export limit enforcement
- Real-time Kraken/Agile API integration for half-hourly re-dispatch

...may be patentable as a **method patent** (UK: GB patent, via IPO; international: PCT via EPO).

**Recommendation:** Consult a UK patent attorney (e.g. Mathys & Squire, Murgitroyd, or Marks & Clerk) before:
- Publishing any technical details publicly
- Disclosing algorithm specifics to investors without an NDA
- Hiring any contractors who could file a competing application

**Cost estimate:** £5,000–15,000 to file a UK patent application; £30,000–60,000 for PCT international filing.

---

## 4. NDA Requirements for Technical Staff

**Mandatory before any technical disclosure:**

| Role | NDA Required | Key Clauses |
|------|-------------|-------------|
| Employed software developers | Yes — employment contract | IP assignment, confidentiality, non-compete (reasonable scope) |
| Contractors / freelancers | Yes — standalone NDA before engagement | IP assignment, confidentiality, no-use after engagement |
| Technical advisors | Yes — advisory NDA | Confidentiality, no IP conflict |
| Investors (pre-term sheet) | Yes — standard NDA or investment NDA | Confidentiality only (no IP assignment) |
| Grant evaluators | Check grant terms — most public grants require publication | Discuss with Innovate UK/UKRI before disclosure |

**NDA template:** Have solicitor draft a technical NDA that covers:
- Definition of Confidential Information (expressly includes algorithms, source code, financial models)
- Non-disclosure to third parties
- IP assignment: any improvements developed by contractor vest in RoseStack
- Return/destruction of confidential materials on termination
- Duration: 5 years from disclosure date

---

## 5. Open-Source Risk

**Do not use GPL-licensed libraries** in the dispatch algorithm or revenue engine. GPL propagates — if we ever open-source any GPL-dependent code, the entire derivative work (including our algorithms) must be open-sourced.

Current stack uses:
- Next.js / React — MIT ✓
- Drizzle ORM — Apache 2.0 ✓
- Recharts — MIT ✓
- Leaflet — BSD-2-Clause ✓

Verify all new dependencies before adding them with `npm info <package> license`.

---

## 6. Competitive Intelligence Risk

RoseStack's algorithm advantage depends on competitors not knowing:
- Our CAPACITY_RESERVE values per tariff type
- Our SAVING_SESSIONS calibration model
- Our property scoring weights

**Do not publish:** reverse-engineerable data in marketing materials, investor decks without NDA, or technical blog posts until patent protection is in place (if pursued).

---

*Last reviewed: April 2026. Next review: before Series A raise or any technical public disclosure.*
