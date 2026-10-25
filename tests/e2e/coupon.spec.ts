import { products } from '../../src/data/products';
import { expect, test } from '../../src/fixtures';

// Only the invalid coupon case: the demo has no valid coupon and I have no admin access.
// Valid discount maths is better tested at API/unit level (see README).
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
