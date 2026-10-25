# Risk matrix

How I decided how much to test in the Tricentis Demo Web Shop. Each area gets a
**likelihood** (how easy it breaks: complexity, how often it changes, how many parts) and an
**impact** (what a bug costs: money, orders, trust, legal), from 1 to 3.
**Risk = likelihood × impact** decides how deep I test.

| Score | Depth |
| --- | --- |
| 6–9 | **Deep**: happy path + failure paths, on several layers, in the smoke set |
| 3–4 | **Targeted**: one or two checks of the rule that matters |
| 1–2 | **None / little**: cheaper checks are enough (link checker, monitoring, a quick manual look) |

## Matrix

| Area | Likelihood | Impact | Risk | Depth | Tests |
| --- | :-: | :-: | :-: | --- | --- |
| **Checkout & order confirmation** | 3: six AJAX steps, address/payment rules, session | 3: no order = no money; a wrong order = refund + support work | **9** | Deep | `critical-path` (3 browsers), `checkout-validation` (5), `simulated-failures` (decline) |
| **Pricing & totals** | 2: calculated on the server, but quantity, fees and several lines work together | 3: a wrong charge is a money and legal problem | **6** | Deep | `pricing` (3 incl. stale-price simulation), COD fee check in `critical-path`, catalogue contract (API) |
| **Payment details (in-app card form)** | 2: format/expiry checks | 3: bad data gets to the payment step | **6** | Deep, on our side only | checksum rejection, expired card (**finding F-1**), simulated decline. Provider internals out of scope, see README |
| **Cart persistence & isolation** | 2: guest session in a cookie | 3: lost cart = lost sale; someone else sees the cart = privacy problem | **6** | Deep | `cart` (reload + second tab, cross-shopper isolation, removal) |
| **Inventory / quantity rules** | 2: server rules, stock running out | 2: selling too much or blocking a sale | **4** | Targeted | API: zero, boundary 10 000 / 10 001, unknown product. UI: simulated out-of-stock message |
| **Discount codes** | 2: discount rules | 2: lost money or an angry customer | **4** | Targeted | invalid code rejected, total unchanged. Valid-code maths: not possible here (no known code, no admin), belongs at API/unit level |
| **Session expiry** | 2 | 2: order lost during checkout | **4** | Targeted | real cookie drop mid-checkout → server refuses step |
| Product search, category browsing | 2 | 2: shopper can still use the menu or links | 4 | Indirect | covered by product selection on the critical path; no dedicated tests |
| Registration / login | 2 | 2 | 4 | Out of scope | guest checkout covers the money path; creating accounts on a shared public demo adds data we cannot clean up |
| Newsletter, wishlist, compare, reviews | 1 | 1 | **1** | None | no money path depends on them |
| **Footer links** (About, Sitemap, RSS…) | 1: static, they rarely change | 1: a broken link costs a click, not an order | **1** | None | a link checker in monitoring is better and cheaper than a browser test |

### Why checkout gets about half of the UI tests and footer links get none

Checkout has the most parts (six AJAX steps, server validation, session, payment), and a
bug there costs the most: lost money or a wrong charge. Bugs can also be in the steps
between pages, and only an end-to-end test goes through those. 7 of the 15 UI tests are
about checkout (10 with the pricing tests).

Footer links are static HTML. They rarely break, a broken one costs one extra click, and
a simple HTTP status check of each link needs no browser. Browser tests for them would
make the run longer and need maintenance, but would not lower the risk much. So I chose
not to test them.

## Findings from building the suite

| ID | Finding | Severity | Evidence |
| --- | --- | --- | --- |
| F-1 | **Expired card accepted.** A card that expired last month passes the payment-info step and reaches "Confirm order". | High (in a real shop the provider would decline it later, so the order fails after the shopper thinks it is done) | `checkout-validation.spec.ts` › expired card, marked `test.fail()` so it turns red when fixed |
| F-2 | **Shipping and payment radio buttons have no `<label>`.** A screen reader reads them without a name, and my tests have to select them by value. Same for the terms of service checkbox. | Medium (accessibility) | `checkout-page.ts`, `cart-page.ts` comments |

## How the matrix is used

- `@smoke` = the risk-9 purchase on every browser + the product price check.
  Runs on every push and should take only a few minutes.
- `@regression` = everything else in the matrix. Runs on Chromium on every push
  and every night.
- For a new feature I would score it here first. The score decides if it gets tests,
  and at which level.
