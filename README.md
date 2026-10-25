# Risk-Based E-Commerce Automation

A deliberately small Playwright + TypeScript suite for an online shop. The goal is
not to automate every page. It is to put test effort where a failure costs money
or orders, show why, and leave the rest alone on purpose.

- **App under test:** [Tricentis Demo Web Shop](https://demowebshop.tricentis.com), a public nopCommerce demo
- **Stack:** Playwright 1.64, TypeScript (strict), GitHub Actions in the official Playwright container
- **Size:** 4 API tests + 15 UI tests, ~1 minute on Chromium locally

## Choosing the target honestly

The brief named `hoteller-theta.vercel.app`. Exploring it (headless) showed it
is a server-rendered copy of an AI hotel-*search* site with all JavaScript
removed: no cart, checkout, coupons, prices in results or API. Only a GET search
form works. None of the requested commerce risks exist there, and mocking a whole
shop around static HTML would only test code we wrote ourselves. A second
candidate, `automationintesting.online`, had its room-detail API returning
HTTP 500 at the time. The Tricentis shop has every risk in the brief for real.

## The risks and where they are tested

Full scoring in **[docs/risk-matrix.md](docs/risk-matrix.md)**. Short version:

| Risk | Test (file) | Real or simulated |
| --- | --- | --- |
| Product selection → price → checkout → confirmation | `critical-path` › guest buys a product… `@smoke` | Real, 3 browsers |
| Price shown = price charged; fees added | `critical-path`, `pricing` › quantity / multi-line | Real |
| Price changes after the page was loaded | `pricing` › stale product-page price | **Simulated** page, real server assertion |
| Cart persistence & isolation | `cart` › reload + second tab, other shopper, remove | Real |
| Invalid coupon | `coupon` › invalid coupon rejected, total unchanged | Real |
| Checkout validation | `checkout-validation` › terms, required fields | Real |
| Rejected payment | `checkout-validation` › card fails checksum | Real |
| Rejected payment (decline at confirm) | `simulated-failures` › payment declined | **Simulated** |
| Expired card | `checkout-validation` › expired card, **finding F-1** | Real, `test.fail()` |
| Stock change | `simulated-failures` › stock runs out | **Simulated** |
| Quantity / stock rules on the server | `api/cart-rules` › zero, boundary, unknown product | Real (HTTP) |
| Expired session | `checkout-validation` › session expires mid-checkout | Real (cookies dropped) |

"Simulated" tests use `page.route()` to replace one server answer with the exact
response shape the shop really sends. Their names start with `[simulated]`, so
nobody mistakes them for proof that the server behaves that way.

## Run it

```bash
npm ci
```

```bash
npx playwright install chromium firefox webkit
```

```bash
npm test
```

```bash
npm run test:smoke
```

```bash
npm run test:regression
```

The HTML report is written to `playwright-report/`; open it with
`npx playwright show-report` when you want to browse it.

## Project layout

```
src/
  api/storefront-api.ts    add-to-cart endpoint client, used for fast cart setup
  actions/shop-actions.ts  domain actions: selectProduct, applyCoupon, checkoutAsGuest, pay, placeOrder
  pages/cart-page.ts       page object, only for the two pages several tests share
  pages/checkout-page.ts
  data/products.ts         the 2 catalogue items the suite relies on + shop constants
  data/customers.ts        unique fake guest per test, test card numbers
  fixtures.ts              storefront, customer, shop fixtures
tests/
  api/                     server rules, no browser
  e2e/                     UI tests
docs/
  risk-matrix.md           likelihood × impact → test depth, findings
  diagnostics.md           worked example: trace + screenshot → root cause → fix
```

### Why it is this small

- **Two page objects, not ten.** Only the cart and checkout are used by several
  tests. A product page used in one action does not need a class.
- **Domain actions** (`shop.placeGuestOrder(customer, { method: 'Cash On Delivery (COD)' })`)
  keep tests readable as business steps. Page objects hold locators; actions hold
  the order of steps.
- **No custom reporter, logger, config layer or base classes.** Playwright already
  provides fixtures, steps, traces and reports.

## Engineering evidence

### Fixtures and isolated data

Every test gets a new browser context → a new guest cookie → its **own empty cart**.
The `customer` fixture creates a unique, obviously fake guest
(`qa.<random>@example.com`). Nothing is shared, so tests run in parallel and in
any order. The `storefront` fixture uses `page.request`, which shares the page's
cookies: one HTTP call fills the cart of *this* browser session, so UI tests start
at the step they are testing instead of clicking through the catalogue every time.
The critical path is the exception: it selects the product through the UI on
purpose, because that is part of the risk.

### Stable locators

In order of preference, given what this shop's markup offers (it has no
`data-testid`s):

1. **Role + accessible name** (`getByRole('button', { name: 'Apply coupon' })`):
   what the user sees.
2. **Label** (`getByLabel('First name:')`), always **scoped to its checkout step**,
   because the billing and shipping forms use the same labels.
3. **Form contract attributes** where there is no label: the coupon input's `name`,
   the payment radios' `value` (`Payments.CashOnDelivery`). These are what the
   server reads, so they change far less often than CSS classes.
4. Never: positional selectors (`nth(2)`), layout classes, XPath.

A real example: the first run failed with *strict mode violation: "Add to cart"
resolved to 6 elements*, because product pages also show "customers also bought"
boxes. The fix was scoping to `.product-essential`, not `.first()`, which would
have silently clicked the wrong product if the layout changed.

### Retries policy

Set in `playwright.config.ts`:

| | Retries | Trace | Why |
| --- | --- | --- | --- |
| Local | 0 | `retain-on-failure` | A local failure should be looked at, not hidden |
| CI | 2 | `on-first-retry` | Public demo over the internet: a one-off network blip is possible. A pass on retry is still reported as **flaky** in the HTML report, so it stays visible |

Retries are not a fix for slowness or bad waits (see
[docs/diagnostics.md](docs/diagnostics.md): the one slow test got a larger time
budget, not a retry). Workers are capped at 2: the shop is shared by everyone who
practises on it.

### CI artifacts

`.github/workflows/e2e.yml` runs in `mcr.microsoft.com/playwright` (browsers
preinstalled, version-pinned) on push, pull request, nightly and on demand
(choose `all`, `@smoke` or `@regression`). It always uploads the **HTML report**
and, on failure, **`test-results/`** with traces and screenshots.

### Tags

- `@smoke`: the risk-9 journey (on every browser) + the catalogue price contract.
  Answers "can a customer buy something at the right price right now?"
- `@regression`: everything else in the risk matrix.

### Browser coverage

| Project | Runs | Why |
| --- | --- | --- |
| `api` | API tests | Server rules need no browser |
| `chromium` (desktop) | everything | Most customers; the full regression set runs once |
| `firefox` (desktop) | `@smoke` | Second engine for the money path: catches form/AJAX handling differences |
| `mobile-safari` (iPhone 14, WebKit) | `@smoke` | Mobile Safari is a large share of shoppers and a different engine + viewport |

Not running the whole suite on every browser is deliberate: totals, coupons and
quantity limits are calculated **on the server**. Running those three times
proves the same thing three times. Browser differences show up in the UI
journey, so that is what gets multiplied.

## Why we don't test third-party payment internals

This shop's card option is an in-app form (nopCommerce "Manual" processing): no
payment provider is involved, and we only use the industry test number
`4111 1111 1111 1111`. In a real shop the card form would be a provider's iframe
(Stripe, Adyen…), and the suite would still stop at the same boundary:

- **We own:** sending the right amount and currency, showing the provider's
  answer correctly (success, decline, error, timeout), never creating an order
  for a failed payment, and not losing the cart when payment fails.
  `simulated-failures` › payment declined tests exactly this.
- **The provider owns:** fraud checks, 3-D Secure, card network routing,
  authorisation and settlement. A sandbox iframe accepting `4242…` proves the
  sandbox is up, not that the payment network works. Driving the provider's
  iframe in UI tests also makes the suite slow and flaky because of someone else's
  UI changes, and it can breach the provider's terms.
- **How the boundary is covered properly:** contract tests against the provider's
  sandbox API at the integration layer (request shape, webhooks, idempotency),
  plus production monitoring of payment success rates.

## Which checks belong at API or component level

| Check | Better layer | Why not E2E |
| --- | --- | --- |
| Quantity rules (0, max 10 000, unknown product) | **API**, already done in `tests/api` | Pure server rule; HTTP call in ms, no rendering involved |
| Catalogue price contract | **API**, already done | One request per product instead of a browser |
| Discount maths (%, fixed, caps, stacking, expiry, once per customer) | **Unit / service** | Dozens of combinations; each would be a full checkout in E2E. E2E keeps one "invalid code is rejected" check |
| Tax and shipping calculation per country | **Unit / service** | Table-driven tests over many inputs |
| Card number checksum, expiry rules | **Unit / component** (validator) | Pure function. E2E keeps one rejection per rule to prove it is wired to the UI. F-1 shows the expiry rule is missing |
| Address form field validation messages | **Component** | Rendering one form; E2E keeps one "all required fields" check |
| Out-of-stock race, payment decline | **API / integration** with a controllable backend | The public demo cannot be put into those states. E2E covers the UI reaction (simulated) |
| Cart merge on login, order history | **API + one E2E** | Needs accounts; deliberately out of scope on a shared demo |

Rule of thumb: E2E proves the pieces are **wired together** on the money path;
the lower layers prove the **rules** exhaustively.

## Known findings

- **F-1** Expired card accepted at the payment step. Tracked with `test.fail()`.
- **F-2** Shipping/payment radios and the terms checkbox have no labels (accessibility).

Details in [docs/risk-matrix.md](docs/risk-matrix.md#findings-from-building-the-suite).
