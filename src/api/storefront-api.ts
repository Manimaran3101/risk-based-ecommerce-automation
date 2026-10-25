import type { APIRequestContext } from '@playwright/test';
import type { Product } from '../data/products';

export interface AddToCartResult {
  success: boolean;
  messages: string[];
}

// Calls the add-to-cart endpoint that the "Add to cart" button uses (the shop has no REST API).
// With page.request it has the same cookies as the page, so the items go into that browser's cart.
export class StorefrontApi {
  constructor(private readonly request: APIRequestContext) {}

  async addToCart(product: Product, quantity = 1): Promise<AddToCartResult> {
    const response = await this.request.post(`/addproducttocart/details/${product.id}/1`, {
      form: { [`addtocart_${product.id}.EnteredQuantity`]: String(quantity) },
    });
    if (!response.ok()) {
      throw new Error(`add-to-cart returned HTTP ${response.status()} for product ${product.id}`);
    }
    const body = (await response.json()) as { success?: boolean; message?: string | string[] };
    const messages = body.message === undefined ? [] : [body.message].flat();
    return { success: body.success === true, messages };
  }

  /** Fills the cart for a test. Throws if it did not work. */
  async seedCart(...lines: Array<{ product: Product; quantity?: number }>): Promise<void> {
    for (const { product, quantity = 1 } of lines) {
      const result = await this.addToCart(product, quantity);
      if (!result.success) {
        throw new Error(`Could not seed cart with ${product.name}: ${result.messages.join('; ')}`);
      }
    }
  }
}
