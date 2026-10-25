# Worked example: diagnosing a failure with a trace and a screenshot

A real failure from building this suite, and how the artifacts led to the fix.

## Symptom

The `@smoke` critical path failed on **mobile-safari** (iPhone 14 emulation,
WebKit) with only:

```
Test timeout of 60000ms exceeded.
```

It passed when re-run on its own. Firefox had a similar one-off failure in the same
parallel run. Tempting conclusion: "flaky, add a retry". That would have hidden the
real cause.

## Step 1: the screenshot

`screenshot: 'only-on-failure'` attached the page as it was when the test was
killed:

![Failure screenshot: order confirmation page](images/mobile-timeout-failure.png)

The page shows **"Your order has been successfully processed! Order number:
2404903"**. So the shop worked and the test steps worked. Whatever failed, it was
not the checkout.

## Step 2: the trace

`trace: 'retain-on-failure'` (local) kept `trace.zip`. Opening it with
`npx playwright show-trace <path>` (or reading the step durations) showed:

| Step | Duration |
| --- | --- |
| select the product | 2.1 s |
| cart charges the price that was shown | 2.6 s |
| **check out as guest, pay on delivery** | **56.1 s** |
| ↳ navigate to cart / check terms / click Checkout / click "Checkout as Guest" | 5.8 s / 5.2 s / 6.6 s / 9.4 s |
| confirmation + cart emptied | 2.1 s |

Every action succeeded; individual clicks simply took 5–9 seconds. The test did
everything right but ran past its 60 s budget, while two browsers ran in parallel
on a 7.6 GB laptop against a public demo server.

## Step 3: decide the fix

| Option | Verdict |
| --- | --- |
| Add retries | ✗ Hides the slowness, and costs another full purchase on a shared demo |
| Raise the global timeout | ✗ Slows down detection of real hangs in every other test |
| Add `waitForTimeout` | ✗ Makes every run slower and still guesses |
| **Raise the budget for this one long journey** | ✓ A full purchase is ~25 round-trips; `test.setTimeout(120_000)` on that test only, with a comment pointing here |

After the change, the smoke set passed on all three browsers.

## What made this quick

- `screenshot: 'only-on-failure'` → instant answer to "did the app break?"
- `trace` → per-step timing instead of guessing
- `test.step()` names in the test → the trace reads like the risk ("check out as
  guest, pay on delivery"), not like a list of clicks
- In CI the same artifacts are uploaded (`playwright-report/`, `test-results/`),
  with `trace: 'on-first-retry'` so the recorded trace is exactly the attempt that
  failed.

## The other artifact type: evidence on success

`critical-path.spec.ts` also attaches a screenshot of the confirmation page with
`testInfo.attach('order-<number>-confirmation', …)` **when it passes**. In the HTML
report each run then shows which order number it created: useful when someone asks
"which test order is this?" on a shared environment.
