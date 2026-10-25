import { randomUUID } from 'node:crypto';

export interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  city: string;
  address1: string;
  zip: string;
  phone: string;
}

/**
 * A fresh, obviously fake guest for every test. The unique email keeps orders
 * from different tests (and different people running this suite against the same
 * public demo) apart, and example.com can never deliver mail to a real person.
 */
export function buildCustomer(overrides: Partial<Customer> = {}): Customer {
  const id = randomUUID().slice(0, 8);
  return {
    firstName: 'Ada',
    lastName: `Tester-${id}`,
    email: `qa.${id}@example.com`,
    country: 'Germany',
    city: 'Berlin',
    address1: 'Teststrasse 1',
    zip: '10115',
    phone: '030123456',
    ...overrides,
  };
}

/**
 * Card data for the shop's built-in "Manual" credit-card method. The shop only
 * validates the format locally; nothing is sent to a payment provider.
 * 4111 1111 1111 1111 is the industry-wide Visa test number, not a real card.
 */
export interface TestCard {
  holder: string;
  number: string;
  cvv: string;
  month: string;
  year: string;
}

export const testCards = {
  validFormat: { holder: 'Ada Tester', number: '4111111111111111', cvv: '123', month: '12', year: '2030' },
  failsChecksum: { holder: 'Ada Tester', number: '4111111111111112', cvv: '123', month: '12', year: '2030' },
} satisfies Record<string, TestCard>;
