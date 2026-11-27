# GST Tax Invoice Readiness — STEPUP

> Internal implementation and release checklist. This document is not legal or tax advice, a tax invoice, or evidence that STEPUP is GST-registered.

## Current application safeguards

- Checkout tax is zero unless the company explicitly enables tax collection and confirms accountant-reviewed tax treatment.
- Enabling tax also requires company-confirmed seller identity and a GSTIN that passes format validation.
- GSTIN format validation is not verification against GSTN records.
- The printable customer document is an order summary, not a GST tax invoice.
- Existing orders must not be recalculated when seller settings or tax configuration change.
- No tax classification, rate, HSN code, place-of-supply treatment, or tax split should be inferred from product names or customer location alone.

## Company and accountant inputs required before implementation

Record and independently verify each applicable item with the company's accountant or authorised tax professional:

- Legal seller name and principal/additional place-of-business address to appear on the invoice.
- GST registration status and GSTIN, checked against official GST records; record who checked it and when in the company's controlled compliance records.
- Whether the seller is required/eligible to issue a GST tax invoice for the specific transaction, or whether a different document is required.
- Product-wise HSN classification and applicable rate, supported by the accountant's determination.
- Whether the transaction is intra-State or inter-State, and the correct CGST/SGST or IGST treatment.
- Treatment of discounts, shipping/packing charges, and any other charge included in the taxable value.
- Required invoice series/numbering convention and financial-year handling.
- Any applicable reverse-charge, export, e-commerce-operator, or other transaction-specific fields.
- The authorised signatory / digital-signature approach, if applicable.

Do not store credentials, GST portal passwords, OTPs, or private authentication material in STEPUP.

## Required order-time snapshot

A future invoice implementation should snapshot the values used for that order so later edits to company settings or product records cannot rewrite historical documents.

At minimum, design and accountant-approve a snapshot containing:

- Seller identity and GST registration details used for the transaction.
- Invoice number and invoice date, generated under the approved numbering convention.
- Customer billing details required for the transaction.
- Each line's product description, quantity, unit value, discount allocation, HSN, taxable value, and approved tax rate.
- Tax components and amounts (CGST/SGST or IGST as applicable).
- Shipping/other charges and their approved tax treatment.
- Invoice total, rounding method, currency, and payment/order references.
- A record of the calculation-rule version and the actor/system event that generated the invoice.

The schema and fields must be reviewed against current requirements before implementation. Do not assume every listed field applies to every sale.

## Release gates

A GST tax invoice must remain unavailable unless all of the following are true:

1. Company identity is complete and explicitly confirmed by an authorised company administrator.
2. GST registration is verified by the company against official records, not merely regex-validated.
3. Accountant-approved product tax classifications and transaction rules are present.
4. The backend calculates the correct tax components using server-side, tested rules.
5. Invoice numbering is concurrency-safe and unique under the approved series.
6. The immutable order-time tax and seller snapshot is persisted transactionally with the order/invoice.
7. Invoice rendering uses only the persisted snapshot and clearly identifies the seller.
8. Tests cover intra-State/inter-State treatment, discounts, shipping, rounding, missing configuration, duplicate generation, retries, and historical immutability.
9. A qualified reviewer approves the generated examples before production activation.

If any gate is missing, show the existing order summary and do not label it a GST tax invoice.

## Implementation sequencing

1. Obtain written accountant/company decisions for the inputs above.
2. Review current order, seller-snapshot, checkout-pricing, and invoice code against those decisions.
3. Propose an additive schema and backend calculation service.
4. Add automated tests and a non-production review workflow.
5. Obtain explicit approval before running any database migration or enabling production tax.
6. Obtain company and accountant sign-off before displaying GST tax invoices to customers.

## Operational ownership

The company owns GST registration, source documents, tax determinations, invoice series, accountant review, and production activation. Engineering validation can prevent incomplete configuration; it cannot certify tax compliance.
