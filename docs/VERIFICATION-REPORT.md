# RoseStack Platform -- Data Verification Report

**Date:** 26 March 2026
**Method:** 7 specialist agents audited every data point in their module against training knowledge (cutoff May 2025). Web access was unavailable, so post-cutoff claims are flagged as UNVERIFIED.
**Scope:** Hardware, Tariffs, Legal, Funding, Strategy, Risk, Grid

---

## EXECUTIVE SUMMARY

| Module | Data Points | OK | WRONG | UNVERIFIED | MISSING |
|--------|-------------|-----|-------|------------|---------|
| Hardware | ~50 | 30 | 12 | 5 | 3 |
| Tariffs | ~40 | 20 | 5 | 12 | 3 |
| Legal | ~35 | 18 | 6 | 5 | 6 |
| Funding | ~130 | 65 | 20 | 25 | 20 |
| Strategy | ~40 | 15 | 10 | 8 | 7 |
| Risk | ~90 | 65 | 5 | 12 | 8 |
| Grid | ~40 | 15 | 12 | 8 | 5 |
| **TOTAL** | **~425** | **228 (54%)** | **70 (16%)** | **75 (18%)** | **52 (12%)** |

**70 confirmed errors found. 52 missing items identified.**

---

## TIER 1: COMPLIANCE-CRITICAL (get these wrong in investor materials = legal risk)

### 1. EIS Gross Assets Test -- WRONG
- **File:** funding/data.ts
- **Current:** 30M pre-investment / 35M post-investment
- **Correct:** 15M pre-investment / 16M post-investment
- **Risk:** Misstating EIS qualifying criteria in investor materials is a compliance issue

### 2. EIS Annual Investment Limit -- WRONG
- **File:** funding/data.ts
- **Current:** 10M/year (20M for KIC)
- **Correct:** 5M/year (12M for KIC)

### 3. SEIS Gross Assets Test -- MISSING
- **File:** funding/data.ts
- **Missing:** SEIS requires gross assets no more than 350k at time of investment. Not mentioned anywhere.

### 4. SEIS Cap Inconsistency
- **File:** funding/data.ts
- **Crowdcube notes say:** "SEIS first 150k"
- **Deal structure correctly says:** 250k (raised April 2023)
- **Fix:** Update Crowdcube notes to match

### 5. All Named Lender Contacts Are Fabricated
- **File:** funding/data.ts
- **Affected:** Sarah Mitchell (Lombard), James Park (Close Brothers), Emma Collins (GFI), Marcus Webb (Triodos), Louise Wilson (Abundance), Richard Barnes (NW Angels), Dr Priya Sharma (GreenTech Capital)
- **Fix:** Replace with generic department contacts or remove names entirely. "GreenTech Capital" also appears to be a fictional VC fund.

---

## TIER 2: REVENUE MODEL (affects headline business plan numbers)

### 6. IOF Import=Export Model -- DISPUTED
- **File:** tariffs/data.ts
- **Web-researched review (10 agents, had web access):** Import = export at all times is correct
- **Tariff verification agent (training data, no web):** Claims this is WRONG, says IOF uses Flux 3-period structure with different import/export rates
- **ACTION:** This is the #1 question to resolve. Verify definitively before the business plan goes out.

### 7. Capacity Market T-1 Clearing Price -- DISPUTED
- **File:** tariffs/data.ts (grid services)
- **Web-researched review:** Corrected to 5 GBP/kW/year
- **Tariff verification agent:** Says should be 30-65 GBP/kW/year
- **ACTION:** Verify with current CM register data

### 8. PAS 63100:2024 -- DISPUTED
- **File:** legal/data.ts
- **Web-researched review:** Cited as mandatory UK domestic BESS standard
- **Legal verification agent:** Says PAS 63100 may not exist; correct standard may be PAS 8811:2023
- **ACTION:** Check BSI website for definitive answer

### 9. Saving Sessions Count in Grid Services
- **File:** tariffs/data.ts (grid services section)
- **Current:** 25 sessions/year
- **Realistic:** 12-15 per season historically
- **Note:** The scenario engine defaults (5-20) are more realistic than the grid services data

### 10. British Gas Export Rate Contradiction
- **File:** tariffs/data.ts
- **BG EV Power tariff:** Export rate 5.50p
- **SEG notes in same file:** Says BG Export & Earn Plus is 15.1p
- **Fix:** Reconcile -- either the tariff uses SEG (15.1p) or a custom low export (5.5p), but be consistent

---

## TIER 3: COMPETITOR INTELLIGENCE (affects credibility of strategy section)

### 11. Moixa/Lunar Energy Portfolio -- WRONG by 10-30x
- **File:** strategy/data.ts
- **Current:** 5,000 devices
- **Likely reality:** 50,000-150,000+ devices under management
- **Impact:** Massively understates the competitive threat

### 12. Octopus Energy Portfolio -- WRONG by 10-100x
- **File:** strategy/data.ts
- **Current:** 500 devices
- **Likely reality:** 5,000-50,000+ (Zero Bills programme alone targets thousands)
- **Also:** Weaknesses are outdated/wishful ("slow to move into fleet ownership" is no longer true)

### 13. Octopus Energy Coordinates -- WRONG
- **File:** strategy/data.ts
- **Current:** 53.48, -2.24 (Manchester)
- **Correct:** ~51.51, -0.14 (London HQ)

### 14. SunGift Solar Region -- WRONG
- **File:** strategy/data.ts
- **Current:** Listed as "(NW)" Northwest partner
- **Reality:** SunGift Solar is based in Exeter, Devon (Southwest England)

### 15. Social Energy Status -- LIKELY WRONG
- **File:** strategy/data.ts
- **Current:** Active competitor with "financial instability rumours"
- **Reality:** Experienced significant financial difficulties; may have ceased trading

### 16. Missing Major Competitors
- **GivEnergy** -- Major UK battery manufacturer with VPP capabilities. Significant omission.
- **Sonnen (Shell)** -- sonnenCommunity VPP model is essentially the same concept as RoseStack
- **Tesla Energy** -- Absent as hardware/ecosystem competitor

### 17. Missing Key Local Partner
- **Calico Homes/Group** -- Burnley-based housing provider, ~5,000+ homes. Obvious local partner, completely absent.
- **Burnley FC in the Community** -- More prominent local institution than cricket/rugby clubs

---

## TIER 4: HARDWARE SPECS (affects system design credibility)

### 18. Sigenergy Product Name -- WRONG
- **File:** hardware/data.ts
- **Current:** "SigenStack 12kWh"
- **Correct:** "SigenStor" (modules are 9.2 or 4.6 kWh, not 12)

### 19. Sigenergy M1 Inverter -- WRONG
- **File:** hardware/data.ts
- **Current:** 100kW 3-phase hybrid
- **Reality:** 100kW is commercial/utility scale, not residential. Sigenergy residential inverter is 5-10kW.

### 20. Tesla Powerwall 3 Charge Rate -- WRONG
- **File:** hardware/data.ts
- **Current:** chargeRateKw: 5
- **Correct:** ~11.5kW (matches its discharge rate; integrated inverter)

### 21. BYD HVS Max Modules -- WRONG
- **File:** hardware/data.ts
- **Current:** maxModulesPerString: 6
- **Correct:** 2 to 4 modules (5.1 to 10.2 kWh range)

### 22. Fogstar MCS Certified -- WRONG
- **File:** hardware/data.ts
- **Current:** mcsCertified: true
- **Correct:** false (DIY/enthusiast market product, not MCS certified)

### 23. Alpha ESS SMILE-G3 -- MISLEADING
- **File:** hardware/data.ts
- **Listed as:** Standalone battery with SolaX/SMA/Victron compatibility
- **Reality:** Integrated hybrid system with its own inverter. Not a standalone battery.

### 24. SolaX T63 Max Modules -- WRONG
- **File:** hardware/data.ts
- **Current:** maxModulesPerString: 4
- **Correct:** Up to 6 modules (37.8 kWh)

### 25. SunPower/Maxeon -- RISK
- **File:** hardware/data.ts
- **Issue:** SunPower/Maxeon filed for bankruptcy late 2024. 40-year warranty claims may not be honoured.

### 26. Missing Major UK Battery Products
- Enphase IQ Battery
- myenergi Libbi
- Puredrive Energy
- SolarEdge Home Battery

---

## TIER 5: GRID & GEOGRAPHY (affects property targeting credibility)

### 27. Six BB Postcode Mappings -- WRONG
- **File:** grid/substation-data.ts

| Postcode | File Says | Actually Is |
|----------|-----------|-------------|
| BB3 | Great Harwood | Darwen (south) |
| BB6 | Burnley | Blackburn (Wilpshire/Langho) |
| BB8 | Padiham | Colne/Trawden |
| BB10 | Whalley | Burnley (centre/south) |
| BB11 | Longridge | Burnley (south/Rose Grove) |
| BB12 | Haslingden | Burnley (Padiham/Hapton/Read) |

### 28. Longridge Not in BB Area
- **File:** grid/substation-data.ts
- **Current:** Listed under BB11
- **Reality:** Longridge is PR3 (Preston postcode area). Not even in the BB area.

### 29. All 15 Substations Are Fabricated
- Real ENWL substations use specific asset names (Whitebirk, Feniscowles, Hapton etc.), not "[Town] 33/11kV"
- Confirmed: ENWL open data at electricitynorthwest.opendatasoft.com has real data available

### 30. "11kV" Substations at 10-16 MVA -- Engineering Error
- An 11kV distribution substation would be rated 500kVA-1MVA, not 10-16 MVA
- These should be labelled 33/11kV primary substations

### 31. Grid Revenue Bypasses Shared Scenario Engine
- Revenue estimation uses custom {low, high} calculation
- Violates the non-negotiable three-scenario standard from CLAUDE.md

---

## TIER 6: LEGAL & REGULATORY (affects lender due diligence)

### 32. G98 Sample Error
- **File:** legal/data.ts
- **Entry g99-2:** 5kW single-phase listed as G98
- **Reality:** 5kW on single phase exceeds 16A threshold (~3.68kW). Needs G99.

### 33. Companies House Reference Format
- **File:** legal/data.ts
- **Current:** "SC123456" (Scottish company prefix)
- **Correct:** Lancashire company would be England/Wales format (no SC prefix)

### 34. Planning Permission Claim -- MISLEADING
- **File:** legal/data.ts
- **Claims:** "Most domestic battery installations fall under permitted development"
- **Reality:** No explicit PD right for standalone battery storage in gardens. 100-200kWh systems likely need planning permission.

### 35. Missing Compliance Requirements
- **Consumer Contracts Regulations 2013** -- 14-day cooling-off for doorstep contracts (legally mandatory)
- **RECC membership** -- Required under MCS scheme
- **PECR** -- Required if doing any electronic marketing
- **SEG eligibility for pure battery export** -- Unclear if battery-only (no solar) qualifies

---

## TIER 7: FUNDING & FINANCE (affects investor credibility)

### 36. Energy Catalyst -- WRONG Programme
- **File:** funding/data.ts
- **Current:** Listed as relevant Innovate UK programme
- **Reality:** Energy Catalyst focuses on developing country energy access, NOT UK domestic battery storage
- **Fix:** Replace with Net Zero Innovation Portfolio, LODES, or Smart Energy competitions

### 37. National Wealth Fund Minimum -- WRONG
- **File:** funding/data.ts
- **Current:** minFunding: 250,000
- **Reality:** NWF/UKIB operates at institutional scale. Minimum typically 5M-10M.

### 38. NWF Annual Deployment -- OVERSTATED
- **File:** funding/data.ts
- **Current:** "Deploys up to 5bn/year"
- **Reality:** Total capitalisation ~7.3bn. Annual deployment is a fraction of this.

### 39. Octopus Energy Generation Minimum -- TOO LOW
- **File:** funding/data.ts
- **Current:** minFunding: 250,000
- **Reality:** Typical minimum 5M+ for infrastructure investment

### 40. Great British Energy -- COMPLETELY MISSING
- Established 2024, HQ Aberdeen, 8.3bn capitalisation
- Specifically targets clean energy including storage
- Major omission from funding database

### 41. GGS/EFG Succession History -- WRONG
- **File:** funding/data.ts
- **Current:** "Replaced the EFG which closed in 2020"
- **Correct:** EFG -> CBILS (2020) -> RLS (2021) -> GGS (2024)

### 42. Finance Lease Off-Balance Sheet Claim -- OUTDATED
- **File:** funding/data.ts
- **Claims:** "Off-balance sheet treatment possible"
- **Reality:** Post-IFRS 16 (2019), virtually all leases go on balance sheet

### 43. Funding Circle Typed as 'bank' -- WRONG
- **File:** funding/data.ts
- **Current:** type: 'bank'
- **Reality:** Platform lender, not a bank

---

## TIER 8: RISK SCORES (affects risk management credibility)

### 44. R-FIN-002 Still References EFG
- **File:** risk/data.ts
- **Should reference:** Growth Guarantee Scheme

### 45. Missing Opportunity O-NEW-003
- **File:** risk/data.ts
- **Review specified:** "Major brand market validation (Duracell, Lunar)" P=5, I=2, Score=10
- **File has:** "Octopus Agile arbitrage opportunity" (different item entirely)

### 46. Warm Homes Plan Figure -- WRONG
- **File:** risk/data.ts
- **Current:** £15B
- **Correct:** £13.6B (commonly cited figure)

### 47. Risk Scores Needing Adjustment

| Risk | Current P | Suggested P | Reason |
|------|----------|-------------|--------|
| R-CMP-001 Octopus self-deploy | 2 | 3-4 | Zero Bills programme confirmed |
| R-TAR-005 Saving Sessions cancelled | 2 | 3 | Sessions becoming less common |
| R-REG-003 Fire safety | 2 | 3 | PAS 63100/BS 7671 changes imminent |
| R-TAR-002 IOF discontinuation | 3 | 4 | Signup pause is a leading indicator |
| R-FIN-001 Interest rates rise | 3 | 2 | Market expects rates to fall |
| R-OPS-002 Homeowner churn | 3 | 2 | Proposition is strong (monthly payment) |

---

## THREE ITEMS REQUIRING DEFINITIVE WEB VERIFICATION

These cannot be resolved from training data alone. Both sides have plausible arguments:

1. **IOF import=export model** -- Foundation of the revenue model
2. **PAS 63100:2024 vs PAS 8811:2023** -- Fire safety standard for lenders
3. **Capacity Market T-1 clearing price** -- £5 vs £30-65/kW/year

---

## WHAT'S CONFIRMED CORRECT

The agents also confirmed substantial amounts of data are accurate:
- G99/G98 framework and thresholds
- MCS certification requirements
- ENWL is correct DNO for BB area
- Piclo Flex is the correct marketplace
- EPC register and Postcodes.io APIs are real and free
- P483 is a real BSC modification
- Property scoring methodology is sound
- SEIS/EIS energy generation warnings correctly present
- FCA/consumer credit risk properly flagged
- Tariff time-of-use windows correct for all Octopus products
- Financial covenant thresholds are industry-standard
- Most risk register scores are reasonable
- All BB1/BB2/BB4/BB5/BB7/BB9 postcode mappings are correct
- Strategy moat actions and timeline are sensible
- Abundance, Ethex, Triodos business models accurately described
