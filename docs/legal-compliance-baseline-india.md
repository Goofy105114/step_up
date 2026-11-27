# STEPUP — India e-commerce and health-information baseline

**Status:** Engineering implementation guidance, not a legal opinion.  
**Reviewed:** 27 November 2026.  
**Important:** These are baseline controls for an India-facing footwear e-commerce website. A qualified Indian lawyer and the business owner must review the final policies against STEPUP's actual legal entity, sales model, suppliers, GST registration, fulfilment operations and data flows.

## 1. What we used and why

| Website policy/control | Source and rule | How STEPUP applies it |
|---|---|---|
| Legal name, principal address, customer-care and grievance contacts | Consumer Protection (E-Commerce) Rules, 2020, Rule 4(2), as amended by the 2026 amendment | Collect and display the real operator name, principal address and customer-care/grievance details. The 2026 amendment is stated to commence **1 January 2027**. Keep values blank until the company confirms them. |
| Complaint acknowledgement and resolution | 2020 Rules, Rule 4(5); 2026 amendment repeats the 48-hour acknowledgement and one-month redressal timeline | Add complaint-handling commitments and operational tracking. Do not publish an unstaffed or fictitious email/phone number. |
| Cancellation/refund transparency and unfair trade practices | Consumer Protection Act, 2019 and E-Commerce Rules, 2020, including Rule 4 and Rule 6 | Explain cancellation, refund, return and exchange processes; do not use terms that waive statutory consumer remedies or impose undisclosed charges. |
| Product package/listing disclosures | Legal Metrology (Packaged Commodities) Rules, 2011, including Rule 6 and applicable amendments | Product catalogue must support accurate manufacturer/packer/importer details, country of origin where applicable, generic product name, MRP inclusive of taxes, consumer-care details and other applicable declarations. Applicability and exact fields must be confirmed per product/package. |
| Personal-data notice, purpose limitation, consent and grievance mechanism | Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025, including staged commencement notifications | Explain the data collected and purpose, provide usable privacy/contact channels, restrict access, set retention and deletion processes, and separate optional marketing consent from order processing. Review staged commencement dates; do not assume every provision is already in force. |
| Fit/comfort profile safeguards | Conservative privacy-by-design practices informed by the DPDP framework and health-information principles | Treat foot measurements, arch preferences and comfort responses as sensitive in practice: collect only what the fit feature needs, make the feature optional, explain its purpose, restrict admin access, avoid exposing individual profiles, and provide correction/deletion workflows. Do not present the tool as diagnosis or treatment. |
| Health claims and product descriptions | Consumer Protection Act, 2019 and CCPA misleading-advertisement/endorsement guidance | Do not claim a shoe cures, prevents or treats a condition without substantiation and applicable approvals. Do not fabricate clinical endorsements, test results or research. Clearly state that fit guidance is not medical advice. |

## 2. Current legal timing that matters

- The Consumer Protection (E-Commerce) (Amendment) Rules, 2026 were notified on 9 September 2026 and state an effective date of **1 January 2027**. They update the information to be prominently displayed, including legal name, principal geographic address, website details and customer-care/grievance contact details. Plan to meet this before the effective date.
- The DPDP Rules, 2025 were notified on 13 November 2025 with phased commencement: Rules 1, 2 and 17–21 immediately; Rule 4 after one year; Rules 3, 5–16, 22 and 23 after eighteen months. The Act's own commencement notification also phases provisions. Engineering should prepare now and legal counsel should map applicable dates and any subsequent corrigenda/orders.
- GSTIN is not a universal website field that should be invented. Display GST registration details and issue tax invoices as legally applicable to the actual seller and transaction. Confirm registration status, correct HSN/rate, place-of-supply treatment and invoice requirements with the company's tax professional before setting checkout tax rules.
- Do not label STEPUP as a healthcare provider, clinic, pharmacy or medical-device seller unless the business actually has the required status and product classification.

## 3. Implementation choices in this branch

1. Four policy documents are stored in the existing database-backed store_settings system: Privacy, Terms, Shipping, and Returns & Refunds.
2. The migration inserts the documents as **drafts** with ON CONFLICT DO NOTHING; it does not overwrite existing company settings.
3. Public endpoints return only policies explicitly marked published.
4. Admin endpoints require the admin role; the UI warns against publishing incomplete policies, and the API rejects common company-specific placeholders.
5. Checkout requires explicit, unticked acknowledgement of the four published policies. If required documents are not published, checkout is blocked rather than taking payment under missing terms.
6. No migration has been run against production, no deployment has been made, and no company details/GSTIN/delivery promises/return window have been invented.

## 4. Company facts that must be supplied before publication

- Legal operator name and entity type; principal/registered address and branch addresses as applicable.
- Customer-care email and phone, grievance officer's name/designation and direct contact details.
- Whether GST-registered; verified GSTIN, registered state, invoice details, applicable HSN and rates from the tax professional.
- Actual dispatch SLA, delivery estimates, serviceable PIN codes, carrier and tracking process.
- Return/exchange window, item-condition rules, exceptions, return-shipping allocation, pickup/self-ship process, refund timelines and COD refund method.
- Target age group and whether minors may create accounts or submit fit profiles.
- Actual personal-data inventory, purposes, third-party processors, retention schedule, account deletion/contact process and security incident process.
- Evidence for any health, comfort, performance, sustainability or clinical claims shown on product pages.

## 5. Primary sources

1. [Consumer Protection (E-Commerce) Rules, 2020 — Department of Consumer Affairs Gazette PDF](https://consumeraffairs.gov.in/public/upload/files/E%20commerce%20rules_1732703966.pdf)
2. [Consumer Protection (E-Commerce) (Amendment) Rules, 2026 — Department of Consumer Affairs Gazette PDF](https://consumeraffairs.gov.in/public/upload/files/E%20Commerce%20Amendment%20Rules%202026_1789128659.pdf)
3. [Department of Consumer Affairs — Legal Metrology (Packaged Commodities) Rules and amendments](https://consumeraffairs.gov.in/pages/legal-metrology-act/)
4. [Legal Metrology — overview of package declarations](https://consumeraffairs.gov.in/index.php/pages/legal-metrology-overview)
5. [Digital Personal Data Protection Act, 2023 — MeitY official PDF](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
6. [Digital Personal Data Protection Rules, 2025 — Gazette of India PDF](https://egazette.gov.in/WriteReadData/2025/267650.pdf)
7. [DPDP Act commencement notification, G.S.R. 843(E), 13 November 2025](https://egazette.gov.in/WriteReadData/2025/267649.pdf)

Check the latest Gazette corrigenda, commencement notifications, state-specific requirements and product-specific rules before launch.
