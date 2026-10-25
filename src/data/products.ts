/**
 * The few catalogue items the suite relies on. Chosen because they are simple
 * products (no size/colour attributes), always in stock, and cheap to reason about.
 *
 * `price` is the expected catalogue price. If the shop changes it, the
 * catalogue-contract smoke test fails first and tells you so in one place,
 * instead of every pricing test failing with a confusing total.
 */
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

/** Fee the shop adds when "Cash On Delivery" is the payment method. */
export const CASH_ON_DELIVERY_FEE = 7;

/** The shop's server-side quantity limit per cart line. */
export const MAX_QUANTITY_PER_LINE = 10_000;
