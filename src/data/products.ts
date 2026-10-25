// Products used in the tests: simple (no size/colour), always in stock.
// If the shop changes a price, the price smoke test in tests/api fails first.
export interface Product {
  id: number;
  slug: string;
  name: string;
  price: number;
}

export const products = {
  book: { id: 13, slug: 'computing-and-internet', name: 'Computing and Internet', price: 10 },
  laptop: { id: 31, slug: '141-inch-laptop', name: '14.1-inch Laptop', price: 1590 },
} satisfies Record<string, Product>;

/** Extra fee for "Cash On Delivery". */
export const CASH_ON_DELIVERY_FEE = 7;

/** Max quantity per cart line (server rule). */
export const MAX_QUANTITY_PER_LINE = 10_000;
