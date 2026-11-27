# STEPUP — Annual dark-pattern self-audit checklist

**Purpose:** Internal readiness and evidence worksheet for STEPUP's India-facing footwear e-commerce website.  
**Status:** Working control document; not a legal certificate, legal opinion, or proof that an audit has been performed.  
**Owner:** STEPUP business owner must appoint an accountable reviewer before use.  
**Review trigger:** At least annually and after material changes to checkout, pricing, promotions, subscriptions, consent, ranking, or cancellation flows.

## Legal basis and timing

- Consumer Protection Act, 2019 and the Central Consumer Protection Authority's Guidelines for Prevention and Regulation of Dark Patterns, 2023: use the notified dark-pattern categories as the baseline for reviewing consumer journeys.
- Consumer Protection (E-Commerce) (Amendment) Rules, 2026: the notified annual self-audit requirement is scheduled to commence on **1 January 2027**. Confirm the final Gazette text, commencement status, prescribed manner, and any subsequent guidance with Indian counsel before treating this worksheet as satisfying the legal requirement.
- Consumer Protection (E-Commerce) Rules, 2020: maintain transparent disclosures, fair cancellation/refund practices, and grievance handling.

Official source documents are listed in `legal-compliance-baseline-india.md`.

## How to use this worksheet

1. Test the live or release-candidate website as a customer on desktop and mobile.
2. Record the exact URL, date/time, environment, browser/device, tester, and test account type for each test.
3. Save screenshots, screen recordings, checkout calculations, policy versions, and relevant configuration snapshots in the company's controlled evidence store. Do not put customer personal data in this repository.
4. Mark each control **Pass**, **Fail**, **Not applicable**, or **Not tested**. A control is not a pass merely because the reviewer did not notice a problem.
5. Create a remediation ticket for every failure, assign an owner and due date, retest after the fix, and retain both original and retest evidence.
6. Have the business owner and qualified Indian counsel review the completed audit. Do not publish a certificate or claim compliance until they approve the actual findings and the applicable legal format.

## Review checklist

| ID | Risk/control to test | Minimum evidence for a pass |
|---|---|---|
| DP-01 | False urgency: countdown timers, expiring offers, low-stock prompts | Evidence that every timer/stock claim is driven by a real, documented expiry or inventory value; no reset-on-refresh fake countdown |
| DP-02 | Basket sneaking: items, add-ons, insurance, donations or services added without clear choice | Clean-cart and checkout recordings showing every paid item is intentionally selected |
| DP-03 | Confirm shaming: guilt or pressure language used to reject an optional offer | Screenshots of neutral, equally clear accept/decline choices |
| DP-04 | Forced action: unrelated account, data, app install or marketing consent required to complete a purchase | Successful purchase-path test without optional marketing consent or unrelated data |
| DP-05 | Subscription trap: difficult cancellation or undisclosed recurring charge | Not applicable unless recurring billing exists; otherwise test clear terms and simple cancellation |
| DP-06 | Interface interference: hiding price, fees, decline controls or important terms | Screenshots of the full price breakdown and equally visible material choices |
| DP-07 | Bait and switch: advertised product/price differs at selection or checkout | Catalogue-to-cart-to-checkout comparison for sampled products and variants |
| DP-08 | Drip pricing: mandatory charges appear late | Cart and checkout captures proving all mandatory charges are disclosed before order placement |
| DP-09 | Disguised advertisement: paid placement presented as organic ranking | Ranking configuration and visible labels for every sponsored placement; mark N/A only if none exists |
| DP-10 | Nagging: repeated prompts after a user has declined | Repeated-session test showing optional prompts respect the user's choice |
| DP-11 | Trick wording or preselected consent | Consent controls start unticked; labels explain the actual consequence of each choice |
| DP-12 | Cancellation obstruction | Customer test showing cancellation is accessible and not materially harder than sign-up/order placement where applicable |
| DP-13 | Misleading price reduction | Product-level price-history evidence; for announced reductions, verify the applicable preceding-30-day lowest-price disclosure requirement from 1 Jan 2027 |
| DP-14 | Misleading health/comfort claims | Sampled product, fit and research content checked for substantiation; no unsupported cure, treatment, prevention or clinical claims |
| DP-15 | Privacy/fit-profile coercion | Fit-profile questions are optional where not essential; purpose is explained; marketing consent is separate; no unnecessary health details requested |
| DP-16 | Return/refund friction | Published eligibility, charges, timelines and steps match the actual operational workflow; no blanket waiver of statutory rights |

## Audit record

Complete this section for each annual review:

- Audit period:
- Website release/commit:
- Environment and URLs tested:
- Reviewer(s) and role(s):
- Business owner approving the report:
- Legal reviewer and review date:
- Total controls: 16
- Pass:
- Fail:
- Not applicable (with reasons):
- Not tested (with reasons):
- Findings and risk rating:
- Remediation owner and due date for each finding:
- Retest date and evidence reference:
- Final approval date:
- Evidence-store location (restricted access; no customer personal data):

## Release gate

Do not describe STEPUP as having passed its annual self-audit until the reviewer has tested the real deployed experience, recorded evidence for each applicable control, closed or formally assessed findings, and obtained the required business/legal approval. This worksheet alone is not an audit certificate.

## Important limitations

- This checklist is an engineering aid. It does not determine legal applicability, replace the official guidelines, or guarantee compliance.
- The 2026 amendment's commencement date and exact certificate/publication requirements must be reconfirmed before 1 January 2027 and at the time of the actual audit.
- Do not invent test results, reviewer names, business approvals, certificates, or evidence references.
- If STEPUP adds subscriptions, paid rankings, sponsored placements, referral incentives, or other monetisation, update the scope before launch.
