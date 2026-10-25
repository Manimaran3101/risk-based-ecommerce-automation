import { expect, type Locator, type Page } from '@playwright/test';
import { parseMoney } from '../money';

/**
 * The cart is where price, quantity and discount risks meet, and several tests
 * read the same rows and totals, so it earns a page object.
 */
export class CartPage {
  readonly emptyMessage: Locator;
  readonly couponMessage: Locator;
  readonly headerCartQuantity: Locator;

  constructor(private readonly page: Page) {
    this.emptyMessage = page.getByText('Your Shopping Cart is empty!');
    this.couponMessage = page.locator('.coupon-box .message');
    this.headerCartQuantity = page.locator('#topcartlink .cart-qty');
  }

  async open(): Promise<void> {
    await this.page.goto('/cart');
  }

  /** A cart line, found by the product link it contains (what a shopper reads). */
  line(productName: string): Locator {
    return this.page
      .locator('tr.cart-item-row')
      .filter({ has: this.page.getByRole('link', { name: productName, exact: true }) });
  }

  async unitPrice(productName: string): Promise<number> {
    return parseMoney(await this.line(productName).locator('.product-unit-price').innerText());
  }

  async lineTotal(productName: string): Promise<number> {
    return parseMoney(await this.line(productName).locator('.product-subtotal').innerText());
  }

  async setQuantity(productName: string, quantity: number): Promise<void> {
    await this.line(productName).locator('input.qty-input').fill(String(quantity));
    await this.page.getByRole('button', { name: 'Update shopping cart' }).click();
  }

  async remove(productName: string): Promise<void> {
    await this.line(productName).locator('input[name="removefromcart"]').check();
    await this.page.getByRole('button', { name: 'Update shopping cart' }).click();
  }

  /** Reads one row of the totals table, e.g. "Sub-Total:" or "Total:". */
  async total(label: 'Sub-Total:' | 'Total:'): Promise<number> {
    const row = this.page
      .locator('.cart-total tr')
      .filter({ has: this.page.locator('.cart-total-left', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) });
    return parseMoney(await row.locator('.cart-total-right').innerText());
  }

  async applyCoupon(code: string): Promise<void> {
    // The coupon field has no <label>; its name attribute is the form contract.
    await this.page.locator('input[name="discountcouponcode"]').fill(code);
    await this.page.getByRole('button', { name: 'Apply coupon' }).click();
  }

  async acceptTermsOfService(): Promise<void> {
    // The checkbox has no <label> element either, so its id is the most stable handle.
    await this.page.locator('#termsofservice').check();
  }

  async proceedToCheckout(): Promise<void> {
    await this.page.getByRole('button', { name: 'Checkout' }).click();
  }

  async expectHeaderQuantity(quantity: number): Promise<void> {
    await expect(this.headerCartQuantity).toHaveText(`(${quantity})`);
  }
}
