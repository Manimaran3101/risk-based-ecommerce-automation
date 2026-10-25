# Risk-Based E-Commerce Automation

A small Playwright + TypeScript test suite for an online shop. I did not try to automate
every page. I tested the parts where a bug costs money or orders, and I explain below why
I left the rest out.

- **App under test:** [Tricentis Demo Web Shop](https://demowebshop.tricentis.com), a public nopCommerce demo
- **Stack:** Playwright 1.64, TypeScript (strict), GitHub Actions in the Playwright Docker image
- **Size:** 4 API tests + 15 UI tests

I built this with help from an AI assistant. I made the design choices, ran and debugged the
tests, and can explain all of it.

## Why this shop

The brief named `hoteller-theta.vercel.app`. When I explored it (headless), I saw that it is
a server-rendered copy of a hotel *search* site with all JavaScript removed. There is no cart,
no checkout, no coupons, no prices in the results and no API. Only a GET search form works.
None of the risks from the brief exist there, and if I mocked a whole shop around static HTML,
I would only test my own code. My second choice, `automationintesting.online`, had its room
API returning HTTP 500 at that time. The Tricentis shop has all the risks from the brief.

## The risks and where they are tested

The full scoring is in **[docs/risk-matrix.md](docs/risk-matrix.md)**. Short version:

| Risk | Test (file) | Real or simulated |
| --- | --- | --- |
| Product selection → price → checkout → confirmation | `critical-path` › guest buys a product… `@smoke` | Real, 3 browsers |
| Price shown = price charged, fees added | `critical-path`, `pricing` › quantity / several lines | Real |
| Price changes after the page was loaded | `pricing` › stale product-page price | **Simulated** page, real server check |
| Cart persistence and isolation | `cart` › reload + second tab, other shopper, remove | Real |
| Invalid coupon | `coupon` › invalid coupon rejected, total unchanged | Real |
| Checkout validation | `checkout-validation` › terms, required fields | Real |
| Rejected payment | `checkout-validation` › card fails checksum | Real |
| Rejected payment (decline at confirm) | `simulated-failures` › payment declined | **Simulated** |
| Expired card | `checkout-validation` › expired card, **finding F-1** | Real, `test.fail()` |
| Stock change | `simulated-failures` › stock runs out | **Simulated** |
| Quantity / stock rules on the server | `api/cart-rules` › zero, boundary, unknown product | Real (HTTP) |
| Expired session | `checkout-validation` › session expires mid-checkout | Real (cookies deleted) |

The "simulated" tests use `page.route()` to replace one server answer with the same response
shape the shop really sends. Their names start with `[simulated]`, so it is clear that they
don't prove the server really behaves like that.

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

The HTML report is in `playwright-report/`. Open it with `npx playwright show-report`.

## Folders

```
src/
  api/storefront-api.ts    client for the add-to-cart endpoint, for fast cart setup
  actions/shop-actions.ts  shopper actions: selectProduct, applyCoupon, checkoutAsGuest, pay, placeOrder
  pages/cart-page.ts       page object (only for the 2 pages that many tests use)
  pages/checkout-page.ts
  data/products.ts         the 2 products the tests use + shop constants
  data/customers.ts        new fake guest per test, test card numbers
  fixtures.ts              storefront, customer, shop fixtures
tests/
  api/                     server rules, no browser
  e2e/                     UI tests
docs/
  risk-matrix.md           likelihood × impact → how much to test, findings
  diagnostics.md           example: trace + screenshot → cause → fix
```

### Why it is so small

- **Two page objects, not ten.** Only the cart and checkout are used by many tests. A product
  page that is used in one action doesn't need its own class.
- **Shopper actions** like `shop.placeGuestOrder(customer, { method: 'Cash On Delivery (COD)' })`
  make the tests read like the steps a shopper does. Page objects have the locators, the
  actions have the order of the steps.
- **No custom reporter, logger, config layer or base classes.** Playwright already has
  fixtures, steps, traces and reports.

## How it is built

### Fixtures and test data

Every test gets a new browser context, so a new guest cookie and its **own empty cart**. The
`customer` fixture makes a new fake guest (`qa.<random>@example.com`). Nothing is shared, so
the tests can run in parallel and in any order. The `storefront` fixture uses `page.request`,
which has the same cookies as the page. So one HTTP call fills the cart of *this* browser, and
the UI test can start at the step it tests, without clicking through the shop every time.
Only the critical path selects the product in the UI, because product selection is part of
what it tests.

### Locators

The shop has no `data-testid`s, so I use this order:

1. **Role + accessible name** (`getByRole('button', { name: 'Apply coupon' })`), what the user sees.
2. **Label** (`getByLabel('First name:')`), always **inside its checkout step**, because the
   billing and shipping forms have the same labels.
3. **Form attributes** when there is no label: the coupon input's `name`, the payment radio
   `value` (`Payments.CashOnDelivery`). The server reads these, so they change less often
   than CSS classes.
4. Never: position (`nth(2)`), layout classes, XPath.

Example: on my first run I got *strict mode violation: "Add to cart" resolved to 6 elements*,
because product pages also show "customers also bought" boxes. I fixed it by scoping to
`.product-essential`. I did not use `.first()`, because that could click the wrong product if
the layout changes.

### Retries

Set in `playwright.config.ts`:

| | Retries | Trace | Why |
| --- | --- | --- | --- |
| Local | 0 | `retain-on-failure` | I want to look at a local failure, not hide it |
| CI | 2 | `on-first-retry` | It is a public demo over the internet, so a network problem can happen. A test that passes on retry is still shown as **flaky** in the report |

Retries don't fix slow tests or bad waits. In [docs/diagnostics.md](docs/diagnostics.md) the
one slow test got a longer timeout, not a retry. Workers are 2, because many people use this
demo shop.

### CI artifacts

`.github/workflows/e2e.yml` runs in the `mcr.microsoft.com/playwright` image (browsers already
installed) on push, pull request, every night and by hand (choose `all`, `@smoke` or
`@regression`). It always uploads the **HTML report**, and when tests fail also
**`test-results/`** with traces and screenshots.

### Tags

- `@smoke`: the risk-9 purchase (on every browser) + the product price check.
  It answers "can a customer buy something at the right price right now?"
- `@regression`: everything else in the risk matrix.

### Browsers

| Project | Runs | Why |
| --- | --- | --- |
| `api` | API tests | Server rules don't need a browser |
| `chromium` (desktop) | everything | Most customers, the full suite runs once here |
| `firefox` (desktop) | `@smoke` | Second engine for the purchase: forms and AJAX can work differently |
| `mobile-safari` (iPhone 14, WebKit) | `@smoke` | Many shoppers use Safari on a phone, and it is a different engine and screen size |

I only run the smoke test on Firefox and mobile Safari. Totals, coupons and quantity limits
are calculated **on the server**, so running them in 3 browsers tests the same thing 3 times.
Browser differences show up in the UI flow, so that is the test I run everywhere.

## Why I don't test the payment provider

The card option in this shop is a form inside the shop (nopCommerce "Manual" processing).
There is no payment provider, and I only use the standard test number `4111 1111 1111 1111`.
In a real shop the card form would be an iframe from a provider like Stripe or Adyen, and I
would stop at the same point.

My part is: send the right amount and currency, show the provider's answer correctly
(success, decline, error, timeout), never create an order when the payment failed, and keep
the cart when the payment fails. The `simulated-failures` › payment declined test checks this.

The provider's part is fraud checks, 3-D Secure, card network and settlement. If a sandbox
iframe accepts `4242…`, it only shows that the sandbox works. Clicking through the provider's
iframe in UI tests also makes them slow and flaky when the provider changes their UI, and it
can be against their terms. This is better covered by contract tests against the provider's
sandbox API (request shape, webhooks, idempotency) and by monitoring payment success in
production.

## Which checks are better at API or unit level

| Check | Better level | Why not E2E |
| --- | --- | --- |
| Quantity rules (0, max 10 000, unknown product) | **API**, done in `tests/api` | Server rule, an HTTP call takes milliseconds |
| Product price check | **API**, done | One request per product instead of a browser |
| Discount maths (%, fixed, caps, stacking, expiry, once per customer) | **Unit / service** | Many combinations, each would be a full checkout in E2E. E2E keeps one "invalid code" check |
| Tax and shipping per country | **Unit / service** | Table tests with many inputs |
| Card number checksum, expiry rules | **Unit / component** (validator) | Simple function. E2E keeps one rejection per rule to show it is connected to the UI. F-1 shows the expiry rule is missing |
| Address form error messages | **Component** | Only one form. E2E keeps one "all required fields" check |
| Out-of-stock race, payment decline | **API / integration** with a backend I can control | I can't put the public demo in those states. E2E checks the UI reaction (simulated) |
| Cart merge on login, order history | **API + one E2E** | Needs accounts, out of scope on a shared demo |

In short: E2E checks that the parts work together on the purchase path. The detailed rules
are better tested at API or unit level.

## Known findings

- **F-1** An expired card is accepted at the payment step. Tracked with `test.fail()`.
- **F-2** The shipping/payment radio buttons and the terms checkbox have no labels (accessibility).

Details in [docs/risk-matrix.md](docs/risk-matrix.md#findings-from-building-the-suite).
