import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

/**
 * Discount rules. Only the rejection path can be exercised honestly here: the
 * public demo has no published valid coupon and we have no admin access to
 * create one. The maths of a *valid* discount (percentages, caps, expiry,
 * one-per-customer) belongs in unit/API tests of the discount service anyway;
 * see README > "Which checks belong at API or component level".
 */
test.describe('Discount codes', () => {
  test('an invalid coupon is rejected and the total is unchanged', { tag: ['@regression'] }, async ({
    storefront,
    shop,
  }) => {
    await storefront.seedCart({ product: products.laptop });
    await shop.cart.open();
    const totalBefore = await shop.cart.total('Total:');

    const message = await shop.applyCoupon(`NOT-A-REAL-CODE-${Date.now()}`);

    expect(message).toBe("The coupon code you entered couldn't be applied to your order");
    expect(await shop.cart.total('Total:')).toBe(totalBefore);
  });
});
