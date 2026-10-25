import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

/**
 * [SIMULATED] Failure paths the public demo cannot produce on demand: we cannot
 * empty its stock or make its payment step decline. page.route() replaces only
 * the server's answer, using the exact response shape the shop really sends
 * (checked by tests/api/cart-rules.spec.ts and the shop's checkout script).
 *
 * What these tests prove: the shopper is told and no order is created.
 * What they do NOT prove: that the real server would send that answer. That is a
 * server/API-level check, and it is why they are labelled "simulated".
 */
test.describe('Simulated failure paths', () => {
  test('[simulated] stock runs out between viewing and adding to cart', { tag: ['@regression'] }, async ({
    page,
    shop,
  }) => {
    const book = products.book;
    await page.route('**/addproducttocart/details/**', (route) =>
      route.fulfill({ json: { success: false, message: ['Out of stock'] } }),
    );

    await page.goto(`/${book.slug}`);
    await page.locator('.product-essential').getByRole('button', { name: 'Add to cart' }).click();

    await expect(page.locator('#bar-notification.error')).toContainText('Out of stock');
    await shop.cart.expectHeaderQuantity(0);
  });

  test('[simulated] the payment is declined when the order is confirmed', { tag: ['@regression'] }, async ({
    page,
    storefront,
    shop,
    customer,
  }) => {
    const declineMessage = 'Your payment was declined. No money has been taken.';
    await page.route('**/checkout/OpcConfirmOrder/**', (route) =>
      route.fulfill({ json: { error: true, message: declineMessage } }),
    );
    await storefront.seedCart({ product: products.book });
    await shop.checkoutAsGuest(customer);
    await shop.pay({ method: 'Cash On Delivery (COD)' });

    // The shop reports the error with window.alert(). Accept it inside the handler:
    // an open alert blocks the page, so the click itself would never finish.
    let alertText = '';
    page.once('dialog', async (dialog) => {
      alertText = dialog.message();
      await dialog.accept();
    });
    await shop.checkout.confirmOrder();
    await expect.poll(() => alertText).toBe(declineMessage);

    // Shopper stays on checkout with the order step still open, free to retry.
    await expect(page).toHaveURL(/onepagecheckout/);
    await expect(shop.checkout.step('confirm-order')).toBeVisible();
  });
});
