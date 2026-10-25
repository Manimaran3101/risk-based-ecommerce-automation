import { test as base } from '@playwright/test';
import { ShopActions } from './actions/shop-actions';
import { StorefrontApi } from './api/storefront-api';
import { buildCustomer, type Customer } from './data/customers';

interface ShopFixtures {
  /** Add-to-cart endpoint with this test's cookies, fills this browser's cart. */
  storefront: StorefrontApi;
  /** New guest for this test. */
  customer: Customer;
  shop: ShopActions;
}

// Every test gets a new browser context, so a new guest and an empty cart. Tests can run in parallel.
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
