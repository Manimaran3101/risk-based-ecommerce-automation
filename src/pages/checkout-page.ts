import { expect, type Locator, type Page } from '@playwright/test';
import type { Customer, TestCard } from '../data/customers';
import { parseMoney } from '../money';

type Step = 'billing' | 'shipping' | 'shipping-method' | 'payment-method' | 'payment-info' | 'confirm-order';

export type PaymentMethod = 'Cash On Delivery (COD)' | 'Check / Money Order' | 'Credit Card';

// The shipping and payment radios have no <label> (F-2 in docs/risk-matrix.md),
// so I select them by value (the names the server expects).
const paymentSystemNames: Record<PaymentMethod, string> = {
  'Cash On Delivery (COD)': 'Payments.CashOnDelivery',
  'Check / Money Order': 'Payments.CheckMoneyOrder',
  'Credit Card': 'Payments.Manual',
};

// Checkout with six steps on one page, each with its own "Continue" button.
// Locators are inside their step, because "Continue", "First name:" etc. are on the page more than once.
export class CheckoutPage {
  constructor(private readonly page: Page) {}

  step(name: Step): Locator {
    return this.page.locator(`#checkout-step-${name}`);
  }

  async checkoutAsGuest(): Promise<void> {
    await this.page.getByRole('button', { name: 'Checkout as Guest' }).click();
    await expect(this.step('billing')).toBeVisible();
  }

  async fillBillingAddress(customer: Customer): Promise<void> {
    const billing = this.step('billing');
    await billing.getByLabel('First name:').fill(customer.firstName);
    await billing.getByLabel('Last name:').fill(customer.lastName);
    await billing.getByLabel('Email:').fill(customer.email);
    await billing.getByLabel('Country:').selectOption({ label: customer.country });
    await billing.getByLabel('City:').fill(customer.city);
    await billing.getByLabel('Address 1:').fill(customer.address1);
    await billing.getByLabel('Zip / postal code:').fill(customer.zip);
    await billing.getByLabel('Phone number:').fill(customer.phone);
  }

  /** Clicks Continue in the step and waits for the next step. */
  async continueFrom(step: Step, next?: Step): Promise<void> {
    await this.step(step).getByRole('button', { name: 'Continue' }).click();
    if (next) await expect(this.step(next)).toBeVisible();
  }

  async chooseShippingMethod(name: 'Ground' | 'Next Day Air' | '2nd Day Air'): Promise<void> {
    await this.step('shipping-method').locator(`input[name="shippingoption"][value^="${name}___"]`).check();
  }

  async choosePaymentMethod(method: PaymentMethod): Promise<void> {
    await this.step('payment-method').locator(`input[value="${paymentSystemNames[method]}"]`).check();
  }

  async fillCard(card: TestCard): Promise<void> {
    const info = this.step('payment-info');
    await info.getByLabel('Cardholder name').fill(card.holder);
    await info.getByLabel('Card number').fill(card.number);
    await info.getByLabel('Expiration date').selectOption(card.month);
    await info.locator('#ExpireYear').selectOption(card.year); // same label as the month
    await info.getByLabel('Card code').fill(card.cvv);
  }

  fieldErrors(step: Step): Locator {
    return this.step(step).locator('.field-validation-error');
  }

  paymentErrors(): Locator {
    return this.step('payment-info').locator('.validation-summary-errors li');
  }

  async confirmedTotal(): Promise<number> {
    return parseMoney(await this.step('confirm-order').locator('.order-total').innerText());
  }

  async confirmOrder(): Promise<void> {
    await this.step('confirm-order').getByRole('button', { name: 'Confirm' }).click();
  }
}
