import { testCards } from '../../src/data/customers';
import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

test.describe('Checkout validation', () => {
  test.beforeEach(async ({ storefront }) => {
    await storefront.seedCart({ product: products.book });
  });

  test('checkout is blocked until the terms of service are accepted', { tag: ['@regression'] }, async ({
    page,
    shop,
  }) => {
    await shop.cart.open();
    await shop.cart.proceedToCheckout();

    await expect(page.getByText('Please accept the terms of service before the next step.')).toBeVisible();
    await expect(page).toHaveURL(/\/cart$/);
  });

  test('billing address lists every missing required field', { tag: ['@regression'] }, async ({ shop }) => {
    await shop.cart.open();
    await shop.cart.acceptTermsOfService();
    await shop.cart.proceedToCheckout();
    await shop.checkout.checkoutAsGuest();

    await shop.checkout.continueFrom('billing');

    await expect(shop.checkout.fieldErrors('billing')).toHaveText([
      'First name is required.',
      'Last name is required.',
      'Email is required.',
      'Country is required.',
      'City is required',
      'Street address is required',
      'Zip / postal code is required',
      'Phone is required',
    ]);
    await expect(shop.checkout.step('shipping')).toBeHidden();
  });

  test('a card number that fails the checksum is rejected before the order step', { tag: ['@regression'] }, async ({
    shop,
    customer,
  }) => {
    await shop.checkoutAsGuest(customer);

    await shop.pay({ method: 'Credit Card', card: testCards.failsChecksum });

    await expect(shop.checkout.paymentErrors()).toHaveText(['Wrong card number']);
    await expect(shop.checkout.step('confirm-order')).toBeHidden();
  });

  test('an expired card is rejected before the order step', { tag: ['@regression'] }, async ({
    shop,
    customer,
  }) => {
    // Known defect, found while building this suite: the shop accepts an expiry
    // date in the past. test.fail() keeps the test honest - it asserts the correct
    // behaviour, is reported as "expected to fail", and turns red the day the shop
    // fixes it, so the annotation cannot go stale silently.
    test.fail(true, 'Known defect: expired card accepted at payment-info step (docs/risk-matrix.md, finding F-1)');

    const lastMonth = new Date();
    lastMonth.setDate(1);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const expired = {
      ...testCards.validFormat,
      month: String(lastMonth.getMonth() + 1),
      year: String(lastMonth.getFullYear()),
    };

    await shop.checkoutAsGuest(customer);
    await shop.pay({ method: 'Credit Card', card: expired });

    await expect(shop.checkout.paymentErrors()).not.toHaveCount(0, { timeout: 5_000 });
    await expect(shop.checkout.step('confirm-order')).toBeHidden();
  });

  test('a session that expires mid-checkout cannot place an order', { tag: ['@regression'] }, async ({
    page,
    context,
    shop,
    customer,
  }) => {
    await shop.checkoutAsGuest(customer);

    // Real behaviour, no mocking: dropping the cookies is what a session timeout
    // looks like to the server - it no longer knows this guest or their cart.
    await context.clearCookies();
    let alertText = '';
    page.once('dialog', async (dialog) => {
      alertText = dialog.message();
      await dialog.accept();
    });
    await shop.checkout.choosePaymentMethod('Cash On Delivery (COD)');
    await shop.checkout.continueFrom('payment-method');

    // The server no longer finds a cart for this visitor and refuses the step.
    await expect.poll(() => alertText).toBe('Your cart is empty');
    await expect(shop.checkout.step('payment-info')).toBeHidden();
    await shop.cart.open();
    await expect(shop.cart.emptyMessage).toBeVisible();
  });
});
