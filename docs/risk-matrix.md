# Risk matrix

How test effort was decided for the Tricentis Demo Web Shop. Each area gets a
**likelihood** (how easily it breaks: complexity, change rate, moving parts) and an
**impact** (what a failure costs: money, orders, trust, legal) on a 1–3 scale.
**Risk = likelihood × impact** sets the test depth.

| Score | Depth |
| --- | --- |
| 6–9 | **Deep**: happy path + failure paths, on several layers, in the smoke set |
| 3–4 | **Targeted**: one or two checks of the rule that matters |
| 1–2 | **None / shallow**: rely on cheaper means (link checker, monitoring, manual look) |

## Matrix

| Area | Likelihood | Impact | Risk | Depth | Tests |
| --- | :-: | :-: | :-: | --- | --- |
| **Checkout & order confirmation** | 3 – six-step AJAX flow, address/payment rules, session state | 3 – no order = no revenue; a wrong order = refund + support cost | **9** | Deep | `critical-path` (3 browsers), `checkout-validation` (5), `simulated-failures` (decline) |
| **Pricing & totals** | 2 – server-calculated, but quantity, fees and multi-line sums interact | 3 – wrong charge is a money and legal problem | **6** | Deep | `pricing` (3 incl. stale-price simulation), COD fee check in `critical-path`, catalogue contract (API) |
| **Payment details (in-app card form)** | 2 – format/expiry validation | 3 – bad data reaches the payment step | **6** | Deep, on our side only | checksum rejection, expired card (**finding F-1**), simulated decline. Provider internals out of scope, see README |
| **Cart persistence & isolation** | 2 – cookie-based guest session | 3 – lost cart = lost sale; leaked cart = privacy issue | **6** | Deep | `cart` (reload + second tab, cross-shopper isolation, removal) |
| **Inventory / quantity rules** | 2 – server rules, out-of-stock races | 2 – oversell or blocked sale | **4** | Targeted | API: zero, boundary 10 000 / 10 001, unknown product. UI: simulated out-of-stock message |
| **Discount codes** | 2 – rule engine | 2 – revenue leak or angry customer | **4** | Targeted | invalid code rejected, total unchanged. Valid-code maths: not possible here (no known code, no admin), belongs at API/unit level |
| **Session expiry** | 2 | 2 – order lost mid-checkout | **4** | Targeted | real cookie drop mid-checkout → server refuses step |
| Product search, category browsing | 2 | 2 – shopper can still navigate or use direct links | 4 | Indirect | covered by product selection on the critical path; no dedicated tests |
| Registration / login | 2 | 2 | 4 | Out of scope (deliberate) | guest checkout covers the money path; creating accounts on a shared public demo adds data we cannot clean up |
| Newsletter, wishlist, compare, reviews | 1 | 1 | **1** | None | no money path depends on them |
| **Footer links** (About, Sitemap, RSS…) | 1 – static, rarely change | 1 – a broken link costs a click, not an order | **1** | None | a crawler/link checker in monitoring does this better and cheaper than a browser test |

### Why checkout gets ~70 % of the UI tests and footer links get none

- **Checkout** concentrates the most moving parts (six AJAX steps, server
  validation, session state, payment) *and* the highest cost of failure: every
  defect there is lost revenue or a wrong charge. Defects also hide in the
  *paths between* steps, which only an end-to-end test exercises.
- **Footer links** are static HTML. They break rarely, the damage is one extra
  click, and the cheap check (HTTP status of each href) needs no browser. Writing
  browser tests for them would add run time and maintenance for almost no reduction
  in risk. "Not testing it" is a decision, not an omission.

## Findings from building the suite

| ID | Finding | Severity | Evidence |
| --- | --- | --- | --- |
| F-1 | **Expired card accepted.** A card that expired last month passes the payment-info step and reaches "Confirm order". | High (in a real shop the provider would decline later, producing a failed order after the shopper believed they were done) | `checkout-validation.spec.ts` › expired card, marked `test.fail()` so it turns red when fixed |
| F-2 | **Shipping and payment radio buttons have no `<label>`.** Screen readers announce unnamed radios; tests have to select them by value. Same for the terms-of-service checkbox. | Medium (accessibility) | `checkout-page.ts`, `cart-page.ts` comments |

## How the matrix is used

- `@smoke` = the risk-9 journey on every browser + the catalogue price contract.
  Runs on every push; must stay under a few minutes.
- `@regression` = everything else in the matrix. Runs on Chromium on every push
  and nightly.
- When a new feature arrives, score it here first; the score decides whether it
  gets tests at all, and on which layer.
