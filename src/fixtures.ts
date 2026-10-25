import { test as base } from '@playwright/test';
import { ShopActions } from './actions/shop-actions';
import { StorefrontApi } from './api/storefront-api';
import { buildCustomer, type Customer } from './data/customers';

interface ShopFixtures {
  /** Storefront endpoint sharing this test's browser cookies: seeds *this* session's cart. */
  storefront: StorefrontApi;
  /** A unique guest for this test only. */
  customer: Customer;
  shop: ShopActions;
}

/**
 * Isolation comes for free from Playwright: every test gets a brand-new browser
 * context, so a new guest cookie and therefore its own empty cart. Nothing is
 * shared between tests, which is why they can run in parallel and in any order.
 */
export const test = base.extend<ShopFixtures>({
  storefront: async ({ page }, use) => {
    await use(new StorefrontApi(page.request));
  },
  customer: async ({}, use) => {
    await use(buildCustomer());
  },
  shop: async ({ page }, use) => {
    await use(new ShopActions(page));
  },
});

export { expect } from '@playwright/test';
