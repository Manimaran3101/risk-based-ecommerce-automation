import { expect, test } from '@playwright/test';
import { StorefrontApi } from '../../src/api/storefront-api';
import { MAX_QUANTITY_PER_LINE, products } from '../../src/data/products';

// Server rules tested with HTTP only, no browser needed.
// Each test has its own request context, so its own guest cookie and cart.
test.describe('Cart rules (storefront endpoint)', () => {
  test('catalogue prices match the test data', { tag: ['@smoke'] }, async ({ request }) => {
    for (const product of Object.values(products)) {
      const html = await (await request.get(`/${product.slug}`)).text();
      const match = html.match(new RegExp(`class="price-value-${product.id}"\\s*>\\s*([\\d.,]+)`));
      expect(match, `price element for ${product.name}`).not.toBeNull();
      expect(Number(match![1].replace(/,/g, '')), `${product.name} price`).toBe(product.price);
    }
  });

  test('quantity must be positive', { tag: ['@regression'] }, async ({ request }) => {
    const result = await new StorefrontApi(request).addToCart(products.book, 0);
    expect(result).toEqual({ success: false, messages: ['Quantity should be positive'] });
  });

  test('quantity limit is enforced at the boundary', { tag: ['@regression'] }, async ({ request }) => {
    const api = new StorefrontApi(request);

    const atLimit = await api.addToCart(products.book, MAX_QUANTITY_PER_LINE);
    expect(atLimit.success, 'exactly the limit is allowed').toBe(true);

    const overLimit = await api.addToCart(products.book, 1);
    expect(overLimit).toEqual({
      success: false,
      messages: [`The maximum quantity allowed for purchase is ${MAX_QUANTITY_PER_LINE}.`],
    });
  });

  test('an unknown product is not added', { tag: ['@regression'] }, async ({ request }) => {
    const result = await new StorefrontApi(request).addToCart({ id: 999_999, slug: '', name: 'ghost', price: 0 });
    expect(result.success).toBe(false);
  });
});
