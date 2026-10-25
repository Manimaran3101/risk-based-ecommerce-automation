import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

// [SIMULATED] I can't empty the demo's stock or make the payment fail, so page.route()
// returns the error in the same format the shop uses. These tests check that the shopper
// sees the error and no order is made. They don't prove the real server sends this answer.
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

    // The shop shows the error in an alert. Accept it in the handler, or the click never finishes.
    let alertText = '';
    page.once('dialog', async (dialog) => {
      alertText = dialog.message();
      await dialog.accept();
    });
    await shop.checkout.confirmOrder();
    await expect.poll(() => alertText).toBe(declineMessage);

    // Shopper stays on checkout and can try again.
    await expect(page).toHaveURL(/onepagecheckout/);
    await expect(shop.checkout.step('confirm-order')).toBeVisible();
  });
});
