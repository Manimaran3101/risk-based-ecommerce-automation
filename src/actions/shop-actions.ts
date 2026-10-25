import { expect, type Page } from '@playwright/test';
import type { Customer, TestCard } from '../data/customers';
import type { Product } from '../data/products';
import { parseMoney } from '../money';
import { CartPage } from '../pages/cart-page';
import { CheckoutPage, type PaymentMethod } from '../pages/checkout-page';

export type Payment = { method: Exclude<PaymentMethod, 'Credit Card'> } | { method: 'Credit Card'; card: TestCard };

export interface PlacedOrder {
  orderNumber: string;
  confirmedTotal: number;
}

/**
 * Domain actions: what a shopper does, in the shop's own words. Tests read as
 * "select a product, check out as a guest, pay on delivery" and do not repeat
 * the 15 clicks behind each phrase. Page objects hold the locators; this class
 * holds the order of steps.
 */
export class ShopActions {
  readonly cart: CartPage;
  readonly checkout: CheckoutPage;

  constructor(private readonly page: Page) {
    this.cart = new CartPage(page);
    this.checkout = new CheckoutPage(page);
  }

  /** Product selection through the real UI. Returns the price the shopper saw. */
  async selectProduct(product: Product, quantity = 1): Promise<number> {
    await this.page.goto(`/${product.slug}`);
    await expect(this.page.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
    const shownPrice = parseMoney(await this.page.locator(`.price-value-${product.id}`).innerText());

    // Scoped: the page also lists "customers who bought this" boxes with their own buttons.
    const details = this.page.locator('.product-essential');
    await details.getByLabel('Qty:').fill(String(quantity));
    await details.getByRole('button', { name: 'Add to cart' }).click();
    await expect(this.page.locator('#bar-notification.success')).toContainText('added to your shopping cart');
    return shownPrice;
  }

  async applyCoupon(code: string): Promise<string> {
    await this.cart.open();
    await this.cart.applyCoupon(code);
    return (await this.cart.couponMessage.innerText()).trim();
  }

  /** From a filled cart to the payment-method step, shipping to the billing address. */
  async checkoutAsGuest(customer: Customer): Promise<void> {
    await this.cart.open();
    await this.cart.acceptTermsOfService();
    await this.cart.proceedToCheckout();
    await this.checkout.checkoutAsGuest();
    await this.checkout.fillBillingAddress(customer);
    await this.checkout.continueFrom('billing', 'shipping');
    await this.checkout.continueFrom('shipping', 'shipping-method');
    await this.checkout.chooseShippingMethod('Ground');
    await this.checkout.continueFrom('shipping-method', 'payment-method');
  }

  /** Chooses the payment method and fills its details; ends on the confirm step when valid. */
  async pay(payment: Payment): Promise<void> {
    await this.checkout.choosePaymentMethod(payment.method);
    await this.checkout.continueFrom('payment-method', 'payment-info');
    if (payment.method === 'Credit Card') {
      await this.checkout.fillCard(payment.card);
    }
    await this.checkout.continueFrom('payment-info');
  }

  async placeOrder(): Promise<PlacedOrder> {
    await expect(this.checkout.step('confirm-order')).toBeVisible();
    const confirmedTotal = await this.checkout.confirmedTotal();
    await this.checkout.confirmOrder();
    await this.page.waitForURL('**/checkout/completed/**');
    await expect(this.page.getByText('Your order has been successfully processed!')).toBeVisible();
    const orderLine = await this.page.getByText(/Order number:/).innerText();
    const orderNumber = orderLine.replace(/\D/g, '');
    return { orderNumber, confirmedTotal };
  }

  async placeGuestOrder(customer: Customer, payment: Payment): Promise<PlacedOrder> {
    await this.checkoutAsGuest(customer);
    await this.pay(payment);
    return this.placeOrder();
  }
}
