# HV Connection Strategy — The Beeches & Fleet Deployment

**Date:** 2026-04-04
**Author:** Dave Middleton / Claude Analysis
**Status:** Research & Planning

---

## 1. The Problem: LV Voltage Rise at 200kW Export

When exporting 200kW onto a Low Voltage (400V) cable, the current flowing backwards through the cable impedance causes **voltage rise** at the property. If voltage exceeds the statutory limit (+10% above nominal, i.e. 253V per phase), it affects neighbours on the same LV circuit.

### Key factors:
- **Cable length** — longer = more impedance = more voltage rise
- **Cable cross-section** — thicker = less impedance
- **Other customers on the same LV feeder** — their supply quality is protected by regulation
- **200kW on LV = ~290 amps per phase at 400V** — most LV feeders serve entire streets on cables rated 200-400A total

### Likely ENWL outcome for LV connection:
ENWL will likely approve a G99 connection on LV but impose an **export limit of 50-100kW** based on their voltage study, even though the transformer has 471 kVA generation headroom.

---

## 2. UK Distribution Voltage Hierarchy

| Level | Voltage | What It Feeds |
|-------|---------|---------------|
| **EHV** | 33kV+ | Bulk supply points, large industrial |
| **HV** | 6.6kV or 11kV | Distribution network between substations |
| **LV** | 230V (single-phase) / 400V (three-phase) | Residential properties |

---

## 3. The HV Solution: Bypass LV Entirely

The ENWL construction drawing for The Beeches shows a **127m cable run down Bolton Road**. The 11kV HV cable runs along the same route as the LV connection — meaning HV infrastructure is already adjacent to the property.

### How it works:
1. Tee off the existing 11kV cable on Bolton Road
2. Install a private 11kV/400V transformer on the property
3. Batteries and inverters connect to *your* transformer's LV side
4. Export at 11kV — no voltage rise on the street's LV network
5. ENWL's only concern is 11kV network capacity (which handles megawatts)

### Advantages:
- Completely bypasses LV feeder voltage rise issues
- No impact on neighbours' supply quality
- Can export full 200-250kW without curtailment
- Future-proof for capacity expansion
- Simpler G99 assessment (no LV network study needed)

---

## 4. Containerised BESS — Game-Changing Economics

### Alibaba Pricing (Torepower, April 2026)

| Quantity | Price (USD) | Price (GBP approx) |
|----------|------------|-------------------|
| 1-2 units | $33,000 | £26,000 |
| 3+ units | $32,000 | £25,000 |

### Specifications:
- **Power:** 250kW
- **Capacity:** 500kWh / 600kWh / 700kWh / 800kWh options
- **Chemistry:** LFP (Grade A cells)
- **Cycle life:** 8,000 cycles
- **Size:** 1,550 x 1,300 x 2,300mm (smaller than a garden shed)
- **Weight:** 2.6 tonnes
- **Features:** On/off grid, real-time remote monitoring, BMS included
- **Customisation:** Available

---

## 5. Cost Comparison: LV Stacks vs HV Containerised BESS

### Option A: Individual LV Battery Stacks (Current Approach)

| Item | Cost |
|------|------|
| 4x Fogstar 48.3 stacks (64.4kWh) | £14,000 |
| 3x Solis 30K inverters | £9,000 |
| 3-phase upgrade | £5,000–£7,000 |
| G99 application + witness testing | £3,000–£5,000 |
| Installation + wiring | £5,000–£8,000 |
| **Total** | **£36,000–£43,000** |
| **Export limit (likely)** | **50–100kW** |
| **Estimated annual revenue** | **£6,000–£8,000** |
| **Payback** | **5–7 years** |

### Option B: Containerised BESS with HV Connection

| Item | Cost |
|------|------|
| Containerised BESS (250kW/500kWh) | £26,000 |
| Shipping from China | £3,000–£5,000 |
| HV tee-off existing 11kV cable | £5,000–£10,000 |
| Step-up transformer (if not included) | £8,000–£12,000 |
| HV switchgear (ring main unit) | £15,000–£20,000 |
| G99 application + commissioning | £5,000–£8,000 |
| Installation + civil works | £5,000–£10,000 |
| **Total** | **£67,000–£91,000** |
| **Export capacity** | **250kW (no LV constraints)** |
| **Estimated annual revenue** | **£18,000–£24,000** |
| **Payback** | **3–4 years** |

### Key Insight
The containerised BESS costs ~2x more but earns ~3-4x the revenue, resulting in a **shorter payback period**.

---

## 6. Fleet Scaling Economics

At £26K per unit (£25K at 3+ volume):

| Scale | Units | Total kWh | Total kW | Total CAPEX | Est. Annual Revenue |
|-------|-------|-----------|----------|-------------|-------------------|
| The Beeches (pilot) | 1 | 500 kWh | 250 kW | ~£80K | £18–24K |
| 10 homes | 10 | 5 MWh | 2.5 MW | ~£500K | £180–240K |
| 50 homes | 50 | 25 MWh | 12.5 MW | ~£2M | £900K–£1.2M |
| 100 homes | 100 | 50 MWh | 25 MW | ~£3.5M | £1.8–2.4M |

At 100 homes (25 MW), RoseStack would qualify for **VLP (Virtual Lead Party)** status for direct wholesale/balancing market access.

---

## 7. Legal Right to Connect — Electricity Act 1989

### Section 16: Duty to Connect

ENWL **cannot legally refuse** a connection if the customer is willing to pay for necessary upgrades.

- **Section 16** imposes a statutory duty on licensed distributors to make connections when requested
- **Section 16A** governs the terms negotiation (costs, timescales, technical conditions)
- DNOs can set conditions (reinforcement costs, export limits based on capacity) but **cannot outright refuse**

### Enforcement Route (if ENWL refuses):
1. **Formal complaint to ENWL** — triggers regulated complaints process
2. **Ofgem determination** — Section 23 allows Ofgem to determine disputes about connection terms
3. **Energy Ombudsman** — alternative dispute resolution
4. **Electricity Connections Significant Code Review** — Ofgem's ongoing reform programme

### ENWL's Possible Objections and Counters:

| Concern | Their Argument | Counter |
|---------|---------------|---------|
| Network capacity | "Transformer can't handle it" | 471 kVA headroom — data says otherwise |
| Voltage rise | "200kW causes voltage issues" | HV connection bypasses LV entirely |
| Residential classification | "Commercial-scale at residential" | No planning restriction; Electricity Act doesn't differentiate |
| Precedent | "If everyone did this..." | Each application assessed on its merits |

### G99 vs G100 Threshold

| Capacity | Standard | Process |
|----------|----------|---------|
| ≤11kW (3-phase) | **G98** | Notification only |
| 11kW–200kW | **G99** | Application + DNO assessment + witness testing |
| >200kW | **G100** | Full transmission-level assessment (much more complex) |

**Strategy:** Apply for exactly 200kW to stay within G99. Going above triggers G100 (National Grid ESO assessment, significantly more cost and time).

---

## 8. The Beeches — Infrastructure Data

| Parameter | Value |
|-----------|-------|
| Address | 14 The Beeches, Whalley (BB2 4LA area) |
| Coordinates | 53.720611, -2.483972 |
| Nearest transformer | 500 kVA |
| Generation headroom | 471 kVA |
| LV cable run | 127m down Bolton Road (per ENWL construction drawing) |
| HV (11kV) cable | Runs along same route as LV |
| Current phase | Single-phase (3-phase upgrade quoted at £6,821 inc. road crossing) |
| MPAN Supply Number | 1610022115710 |

---

## 9. Recommended Strategy for The Beeches

1. **Submit G99 application for 200kW export** — let ENWL do their assessment
2. **Request HV connection option** — cite the existing 11kV cable on Bolton Road
3. **Get formal quotes** for both LV (with export limit) and HV (with containerised BESS)
4. **Compare the business cases** using the three-scenario financial model
5. **If ENWL pushes back**, cite Section 16 duty to connect and request formal written reasons
6. **Escalate to Ofgem** if they refuse unreasonably

### Phase 2: Fleet Deployment
- Prove the model at The Beeches with containerised BESS + HV connection
- Use the pilot data to refine costs and revenue projections
- Scale with volume pricing from Chinese suppliers (£25K+ at 3+ units)
- Consider community BESS model: one larger HV container serving multiple nearby homes
- At 25MW+ fleet, apply for VLP status for direct market access

---

## 10. Open Questions

- [ ] Does the Torepower unit include a step-up transformer, or is that separate?
- [ ] What are the exact G99 requirements for an HV (11kV) connection vs LV?
- [ ] Can the containerised BESS be G99 type-tested, or does each install need individual testing?
- [ ] What is the import duty and VAT position on Chinese BESS imports for commercial use?
- [ ] Does the containerised unit meet UK fire safety requirements (NFPA 855 / BS EN 62619)?
- [ ] What insurance implications does an HV connection have vs LV?
- [ ] Can multiple homes share one HV-connected containerised BESS?

---

*This document captures research and analysis from April 2026. Costs and regulations should be verified before any investment decisions.*
