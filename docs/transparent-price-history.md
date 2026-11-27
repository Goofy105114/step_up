# STEPUP transparent price-history implementation

## Purpose
Record product price changes and show a prior-price comparison only when the database contains sufficient history to support it. This is intended to support the prior-price disclosure requirement in the Consumer Protection (E-Commerce) (Amendment) Rules, 2026, effective 1 January 2027. It is an engineering control, not a legal opinion.

## How it works
- `backend/src/db/product-price-history-migration.sql` creates an append-oriented price-history ledger with validity windows.
- Existing products receive a `migration_baseline` row at the time this migration is applied. It is never backdated and does not prove any earlier prices.
- A database trigger records inserts and changes to `products.base_price` or `products.sale_price`, closing the previous validity window and opening a new one.
- Admins can inspect the history and eligibility from the product editor.
- The public product detail API returns the 30-day pre-change lowest price only if recorded history covers the full period before the current price became effective.
- The product page only displays a percentage-off badge and crossed-out prior price when the evidence supports the comparison. Otherwise, it displays the current price without a comparative discount claim.

## Safety and limitations
- No historical data is fabricated, inferred or backfilled.
- Products with less than 30 days of recorded pre-change history do not receive a prior-price comparison.
- The ledger currently covers product base and sale prices. Variant price adjustments, coupon prices, shipping, taxes, and customer-specific promotions are separate pricing dimensions and are not represented as product list-price history.
- The feature does not yet create a complete 30-day time-series for every customer-visible coupon/promotion or keep a separate immutable promotion campaign record. Those are follow-up items if STEPUP announces such offers.
- History is only trustworthy after the migration is applied and the trigger is active. The API's history-dependent endpoints require that migration; deploy backend and frontend together only after the database migration has been reviewed and applied in the approved environment.
- No production migration or deployment is performed by this PR.

## Review checklist
1. Review and approve the additive SQL migration.
2. Apply it first in a staging database and verify existing product baselines are timestamped at migration time.
3. Change a test product's base price and sale price; verify prior rows close and new rows are recorded.
4. Verify no discount badge appears with incomplete history.
5. Verify a discount badge appears only when the current price is below the lowest price in the full preceding 30-day window.
6. Review coupon and campaign pricing before enabling public promotional claims.

## Data access
RLS is enabled and direct `anon` and `authenticated` table privileges are revoked. The backend accesses the table using the server database connection. Never expose the service database credential to the browser.
