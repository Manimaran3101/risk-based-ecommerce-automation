import { products } from '../../src/data/products';
import { CartPage } from '../../src/pages/cart-page';
import { expect, test } from '../../src/fixtures';

test.describe('Cart persistence', () => {
  test('cart survives a reload and a second tab in the same session', { tag: ['@regression'] }, async ({
    page,
    context,
    storefront,
    shop,
  }) => {
    const book = products.book;
    await storefront.seedCart({ product: book, quantity: 2 });

    await shop.cart.open();
    await page.reload();
    expect(await shop.cart.lineTotal(book.name)).toBe(book.price * 2);

    const secondTab = new CartPage(await context.newPage());
    await secondTab.open();
    expect(await secondTab.lineTotal(book.name)).toBe(book.price * 2);
    await secondTab.expectHeaderQuantity(2);
  });

  test('one shopper never sees another shopper\'s cart', { tag: ['@regression'] }, async ({
    browser,
    storefront,
  }) => {
    await storefront.seedCart({ product: products.laptop });

    const otherShopper = await browser.newContext();
    try {
      const otherCart = new CartPage(await otherShopper.newPage());
      await otherCart.open();
      await expect(otherCart.emptyMessage).toBeVisible();
    } finally {
      await otherShopper.close();
    }
  });

  test('removing the last item empties the cart', { tag: ['@regression'] }, async ({ storefront, shop }) => {
    await storefront.seedCart({ product: products.book });
    await shop.cart.open();

    await shop.cart.remove(products.book.name);

    await expect(shop.cart.emptyMessage).toBeVisible();
    await shop.cart.expectHeaderQuantity(0);
  });
});
