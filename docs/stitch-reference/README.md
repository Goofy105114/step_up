# STEPUP Stitch UI reference

This folder documents the supplied Stitch reference pack used to align the STEPUP website.

## Brand and implementation rules
- The repository brand remains **STEPUP**. "SoleEase" appears only in the supplied design export and must not be used as the production brand.
- Use the Stitch screens and their accompanying `code.html` files as the visual source of truth for layout, spacing, typography, component hierarchy, imagery composition and responsive behaviour.
- All product, category, customer, order, cart, wishlist, clinical, laboratory and dashboard data must come from the existing API/database. Never reproduce demo values from the Stitch mockups as real application data.
- Use INR (₹) consistently throughout customer-facing commerce flows.
- Preserve the current React/Vite frontend, Express API, Render backend, database records and existing environment configuration.
- Do not modify `StepUpApp/`; it is a separate mobile app.
- The original `refrences documents/` folder remains read-only.

## Screen-to-route mapping

| Stitch reference screen | STEPUP route / implementation area |
|---|---|
| Orthopedic arch-support sandals landing | `/` |
| Shop by condition / arch support | `/shop-by-condition` |
| Sandal product detail | `/product/:slug` |
| Slipper product detail | `/product/:slug` |
| Interactive arch footwear assessment | `/find-your-fit` |
| Cart / medical summary | `/cart` |
| Streamlined checkout | `/checkout` |
| Order confirmation and tracking | `/orders/:id` |
| Wishlist / saved calibrations | `/wishlist` |
| Patient registration / biometric profile | `/register`, `/profile` |
| Patient login / prescription access | `/login` |
| Password reset / recovery | `/forgot-password` |
| Patient portal / health profile | `/profile` |
| Clinical studies / whitepapers | `/clinical-studies` |
| Admin clinical operations / gait dashboard | `/admin` |
| Admin orders / prescription fulfilment | `/admin/orders` |
| Admin patient profiles / gait records | `/admin/patient-profiles` |
| Admin SKU calibration creator | `/admin/products/new` |
| Admin SKU arch profile manager | `/admin/products` |
| Admin clinical laboratory settings | `/admin/lab-settings` |

## Visual alignment checklist
- Header follows the Stitch composition: announcement strip, STEPUP identity, five purpose-led navigation links, catalogue search, wishlist, bag and account actions.
- Keep the header responsive and accessible; mobile navigation must expose the same destinations.
- Use the imagery and visual hierarchy from the corresponding Stitch screen exports, but bind actual catalogue/product images to API-provided image URLs. A mockup's sample product or customer data is not production data.
- Maintain the shared visual language across storefront, patient portal and admin surfaces.
- Treat the supplied screenshots as visual references, not production assets or evidence of real clinical outcomes.

## Current implementation note
The first implementation slice is the shared navigation/header in `frontend/src/components/layout/Navbar.tsx`. It replaces the previous generic footwear-category navigation with the Stitch-inspired information architecture while retaining STEPUP branding and existing route/API integrations. The rest of the screens are being aligned incrementally so each UI is backed by the existing working data flows.


## Extracted visual reference

The supplied Stitch screen exports were extracted and reviewed. A compact contact sheet is committed at [`stitch-ui-montage.jpg`](./stitch-ui-montage.jpg) for quick visual comparison during implementation. Individual screen exports and their `code.html` files remain the source reference in the original uploaded archive; this montage is documentation only and is not used as a live storefront product image. The homepage uses a specific editorial footwear image URL extracted from the Stitch landing-page HTML as a visual fallback only; a real catalogue product image takes precedence whenever available.
