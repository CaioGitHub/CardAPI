'use client'

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type CartItem = {
  productId: string
  quantity: number
}

type CartState = {
  items: CartItem[]
  addItem: (productId: string, quantity?: number) => void
  setItemQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
  getItemQuantity: (productId: string) => number
}

const STORAGE_KEY = "cardapi-cart"

const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  get length() {
    return 0
  },
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId, quantity = 1) => {
        if (quantity <= 0) return

        set((state) => {
          const existing = state.items.find((item) => item.productId === productId)

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === productId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            }
          }

          return {
            items: [...state.items, { productId, quantity }],
          }
        })
      },
      setItemQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.productId !== productId),
            }
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            ),
          }
        })
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }))
      },
      clear: () => {
        set({ items: [] })
      },
      getItemQuantity: (productId) => {
        const item = get().items.find((entry) => entry.productId === productId)
        return item?.quantity ?? 0
      },
    }),
    {
      name: STORAGE_KEY,
      storage:
        typeof window === "undefined"
          ? createJSONStorage(() => memoryStorage)
          : createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    },
  ),
)

export type { CartItem }
