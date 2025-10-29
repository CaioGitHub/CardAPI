"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { ShoppingCart, UtensilsCrossed } from "lucide-react"

import { CartDialog } from "@/components/menu/cart-dialog"
import { ProductDetailDialog } from "@/components/menu/product-detail-dialog"
import { Button } from "@/components/ui/button"
import { buildCartLineItems, calculateCartTotals } from "@/lib/cart"
import { formatPrice } from "@/lib/format"
import { getRestaurantStatus, getWeekdayLabel } from "@/lib/opening-hours"
import type { MenuData, Product } from "@/lib/types"
import { useCartStore } from "@/store/cart-store"

type MenuScreenProps = {
  menuData: MenuData
}

const ALL_CATEGORY_ID = "all"

type CategoryOption = {
  id: string
  name: string
}

function useCartHydration() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    useCartStore.persist.rehydrate()
    const unsub = useCartStore.persist.onFinishHydration(() => {
      setIsHydrated(true)
    })

    return () => {
      unsub()
    }
  }, [])

  return isHydrated
}

export function MenuScreen({ menuData }: MenuScreenProps) {
  const isHydrated = useCartHydration()
  const cartItems = useCartStore((state) => state.items)

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    ALL_CATEGORY_ID,
  )
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const categoriesWithProducts = menuData.categories.filter((category) =>
      menuData.products.some((product) => product.categoryId === category.id),
    )

    return [
      {
        id: ALL_CATEGORY_ID,
        name: "Todos",
      },
      ...categoriesWithProducts.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    ]
  }, [menuData.categories, menuData.products])

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === ALL_CATEGORY_ID) {
      return menuData.products
    }

    return menuData.products.filter(
      (product) => product.categoryId === selectedCategoryId,
    )
  }, [menuData.products, selectedCategoryId])

  const cartLineItems = useMemo(
    () => buildCartLineItems(cartItems, menuData.products),
    [cartItems, menuData.products],
  )
  const { totalQuantity, subtotal } = useMemo(
    () => calculateCartTotals(cartLineItems),
    [cartLineItems],
  )

  const [status, setStatus] = useState(() =>
    getRestaurantStatus(menuData.openingHours, menuData.config.timezone),
  )

  useEffect(() => {
    const updateStatus = () =>
      setStatus(
        getRestaurantStatus(menuData.openingHours, menuData.config.timezone),
      )

    updateStatus()

    const interval = window.setInterval(updateStatus, 60_000)
    return () => {
      window.clearInterval(interval)
    }
  }, [menuData.openingHours, menuData.config.timezone])

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col pb-24">
        <header className="sticky top-0 z-20 bg-background/95 px-4 pb-4 pt-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {menuData.config.logoUrl && menuData.config.logoUrl !== "/logo.svg" ? (
                <Image
                  src={menuData.config.logoUrl}
                  alt={menuData.config.restaurantName}
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UtensilsCrossed className="size-6" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  Cardápio digital
                </span>
                <h1 className="text-lg font-semibold">
                  {menuData.config.restaurantName}
                </h1>
              </div>
            </div>
            <div className="flex flex-col items-end text-sm">
              <span
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  status.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                <span
                  className={`size-2.5 rounded-full ${
                    status.isOpen ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                {status.label}
              </span>
              {!status.isOpen && status.nextOpen && (
                <span className="mt-1 text-xs text-muted-foreground">
                  Abre{" "}
                  {status.nextOpen.dayOfWeek !== status.currentDayIndex
                    ? `${getWeekdayLabel(status.nextOpen.dayOfWeek)} `
                    : ""}
                  às {status.nextOpen.opensAt}
                </span>
              )}
              {status.isOpen && status.closesAt && (
                <span className="mt-1 text-xs text-muted-foreground">
                  Fecha às {status.closesAt}
                </span>
              )}
            </div>
          </div>
          {menuData.config.welcomeMessage && (
            <p className="mt-4 text-sm text-muted-foreground">
              {menuData.config.welcomeMessage}
            </p>
          )}
        </header>

        <nav className="sticky top-[108px] z-10 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto">
            {categoryOptions.map((category) => {
              const isActive = selectedCategoryId === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleSelectCategory(category.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {category.name}
                </button>
              )
            })}
          </div>
        </nav>

        <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-2">
          <AnimatePresence initial={false} mode="popLayout">
            {filteredProducts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted p-10 text-center text-sm text-muted-foreground"
              >
                <p>Nenhum item disponível nesta categoria no momento.</p>
              </motion.div>
            ) : (
              filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  layout
                  type="button"
                  onClick={() => handleProductClick(product)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:shadow-md"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex-1 space-y-1">
                    <h2 className="text-base font-semibold">{product.name}</h2>
                    {product.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    <span className="block text-sm font-medium text-primary">
                      {formatPrice(product.price, menuData.config.currency)}
                    </span>
                  </div>
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-muted">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <UtensilsCrossed className="size-6" />
                      </div>
                    )}
                  </div>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {isHydrated && totalQuantity > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
          >
            <Button
              size="lg"
              className="flex w-full max-w-md items-center justify-between rounded-full px-6 py-6 text-base shadow-lg"
              onClick={() => setIsCartOpen(true)}
            >
              <span className="flex items-center gap-3 font-semibold">
                <ShoppingCart className="size-5" />
                Ver carrinho
              </span>
              <span className="flex items-center gap-3 text-sm font-medium">
                <span className="flex size-6 items-center justify-center rounded-full bg-background text-foreground">
                  {totalQuantity}
                </span>
                {formatPrice(subtotal, menuData.config.currency)}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedProduct && (
        <ProductDetailDialog
          product={selectedProduct}
          currency={menuData.config.currency}
          open={Boolean(selectedProduct)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProduct(null)
            }
          }}
        />
      )}
      <CartDialog
        menuData={menuData}
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        onEditProduct={setSelectedProduct}
      />
      {isCartOpen && (
        <span className="sr-only" aria-live="polite">
          Carrinho aberto
        </span>
      )}
    </div>
  )
}
