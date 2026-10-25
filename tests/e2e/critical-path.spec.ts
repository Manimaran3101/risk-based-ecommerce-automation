import { CASH_ON_DELIVERY_FEE, products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

/**
 * The money path, end to end through the real UI: product selection -> price ->
 * guest checkout -> order confirmation. This is the one journey that runs on
 * every browser in the matrix.
 */
test.describe('Critical path: guest purchase', () => {
  test('guest buys a product and gets an order number for the right total', { tag: ['@smoke'] }, async ({
    page,
    shop,
    customer,
  }, testInfo) => {
    // A full purchase is ~25 round-trips to a public demo. On mobile WebKit it
    // once completed correctly but took longer than the 60 s default (see
    // docs/diagnostics.md). The budget is raised for this one journey only,
    // instead of globally, and no retry is used to hide it.
    test.setTimeout(120_000);
    const book = products.book;

    const shownPrice = await test.step('select the product', () => shop.selectProduct(book));
    expect(shownPrice, 'product page price').toBe(book.price);

    await test.step('cart charges the price that was shown', async () => {
      await shop.cart.open();
      expect(await shop.cart.unitPrice(book.name)).toBe(shownPrice);
      expect(await shop.cart.total('Sub-Total:')).toBe(shownPrice);
    });

    const order = await test.step('check out as guest, pay on delivery', () =>
      shop.placeGuestOrder(customer, { method: 'Cash On Delivery (COD)' }),
    );

    await test.step('confirmation is final and consistent', async () => {
      expect(order.orderNumber).toMatch(/^\d+$/);
      // The confirm step showed subtotal + the COD fee the shop adds.
      expect(order.confirmedTotal).toBe(book.price + CASH_ON_DELIVERY_FEE);
      // Diagnostics example: keep visual evidence of the confirmation in the
      // report even when the test passes (screenshots on failure are automatic).
      await testInfo.attach(`order-${order.orderNumber}-confirmation`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    });

    await test.step('cart is emptied after the order', async () => {
      await shop.cart.open();
      await expect(shop.cart.emptyMessage).toBeVisible();
    });
  });
});
