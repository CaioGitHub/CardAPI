import type { CartItem } from "@/store/cart-store"

import type { Product } from "./types"

export type CartLineItem = {
  product: Product
  quantity: number
  lineTotal: number
}

export function buildCartLineItems(
  items: CartItem[],
  products: Product[],
): CartLineItem[] {
  const productMap = new Map(products.map((product) => [product.id, product]))

  return items
    .map(({ productId, quantity }) => {
      const product = productMap.get(productId)
      if (!product) return null

      return {
        product,
        quantity,
        lineTotal: product.price * quantity,
      } satisfies CartLineItem
    })
    .filter((item): item is CartLineItem => Boolean(item))
}

export function calculateCartTotals(lineItems: CartLineItem[]) {
  return lineItems.reduce(
    (acc, item) => {
      acc.totalQuantity += item.quantity
      acc.subtotal += item.lineTotal
      return acc
    },
    { totalQuantity: 0, subtotal: 0 },
  )
}
