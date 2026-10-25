import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

test.describe('Pricing', () => {
  test('changing quantity recalculates line total and subtotal', { tag: ['@regression'] }, async ({
    storefront,
    shop,
  }) => {
    const book = products.book;
    await storefront.seedCart({ product: book });
    await shop.cart.open();

    await shop.cart.setQuantity(book.name, 3);

    expect(await shop.cart.lineTotal(book.name)).toBe(book.price * 3);
    expect(await shop.cart.total('Sub-Total:')).toBe(book.price * 3);
  });

  test('a cart with several products sums every line', { tag: ['@regression'] }, async ({ storefront, shop }) => {
    const { book, laptop } = products;
    await storefront.seedCart({ product: book, quantity: 2 }, { product: laptop });
    await shop.cart.open();

    expect(await shop.cart.lineTotal(book.name)).toBe(book.price * 2);
    expect(await shop.cart.lineTotal(laptop.name)).toBe(laptop.price);
    expect(await shop.cart.total('Sub-Total:')).toBe(book.price * 2 + laptop.price);
  });

  // [SIMULATED] The price changes after the product page was loaded. I can't change the real
  // price, so I change the HTML. The cart must still use the server price.
  test('[simulated] a stale product-page price never reaches the cart', { tag: ['@regression'] }, async ({
    page,
    shop,
  }) => {
    const book = products.book;
    const stalePrice = '5.00';
    await page.route(`**/${book.slug}`, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        new RegExp(`(class="price-value-${book.id}"\\s*>)\\s*[\\d.,]+`),
        `$1 ${stalePrice}`,
      );
      await route.fulfill({ response, body: html });
    });

    const shownPrice = await shop.selectProduct(book);
    expect(shownPrice, 'the simulation must actually show the stale price').toBe(Number(stalePrice));

    await shop.cart.open();
    expect(await shop.cart.unitPrice(book.name)).toBe(book.price);
  });
});
