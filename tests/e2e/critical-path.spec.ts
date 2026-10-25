import { CASH_ON_DELIVERY_FEE, products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

// The purchase end to end in the UI: select product, price, guest checkout, confirmation.
// This is the only test that runs on every browser.
test.describe('Critical path: guest purchase', () => {
  test('guest buys a product and gets an order number for the right total', { tag: ['@smoke'] }, async ({
    page,
    shop,
    customer,
  }, testInfo) => {
    // Long test (about 25 requests), it was too slow for 60 s on mobile WebKit. See docs/diagnostics.md.
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
      // Confirm step total = price + COD fee.
      expect(order.confirmedTotal).toBe(book.price + CASH_ON_DELIVERY_FEE);
      // Screenshot of the confirmation in the report, also when the test passes.
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
