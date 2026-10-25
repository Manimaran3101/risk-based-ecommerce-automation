import type { APIRequestContext } from '@playwright/test';
import type { Product } from '../data/products';

export interface AddToCartResult {
  success: boolean;
  messages: string[];
}

/**
 * Thin client for the storefront's own AJAX endpoint (the one the "Add to cart"
 * button calls). The shop has no public REST API, so this is the only server
 * entry point we use for test setup.
 *
 * When built from `page.request`, it shares the page's cookies, so items added
 * here land in that browser session's cart: setup in milliseconds, then the UI
 * test starts where the risk actually is.
 */
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

  /** Setup helper: fail loudly if seeding did not work, so the test never runs on a wrong cart. */
  async seedCart(...lines: Array<{ product: Product; quantity?: number }>): Promise<void> {
    for (const { product, quantity = 1 } of lines) {
      const result = await this.addToCart(product, quantity);
      if (!result.success) {
        throw new Error(`Could not seed cart with ${product.name}: ${result.messages.join('; ')}`);
      }
    }
  }
}
