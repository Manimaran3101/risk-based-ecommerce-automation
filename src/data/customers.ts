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

// New fake guest for each test. Unique email so orders don't mix; example.com never reaches a real person.
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

// Card data for the shop's "Manual" card method (no payment provider). 4111 1111 1111 1111 is the Visa test number.
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
