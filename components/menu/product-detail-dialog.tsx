"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Minus, Plus, UtensilsCrossed } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatPrice } from "@/lib/format"
import type { Product } from "@/lib/types"
import { useCartStore } from "@/store/cart-store"

type ProductDetailDialogProps = {
  product: Product
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddedToCart?: () => void
}

const MIN_QUANTITY = 1
const MAX_QUANTITY = 99

export function ProductDetailDialog({
  product,
  currency,
  open,
  onOpenChange,
  onAddedToCart,
}: ProductDetailDialogProps) {
  const getItemQuantity = useCartStore((state) => state.getItemQuantity)
  const setItemQuantity = useCartStore((state) => state.setItemQuantity)
  const [quantity, setQuantity] = useState(MIN_QUANTITY)

  const existingQuantity = useMemo(
    () => getItemQuantity(product.id),
    [getItemQuantity, product.id],
  )

  useEffect(() => {
    const scheduler =
      typeof queueMicrotask === "function"
        ? queueMicrotask
        : (fn: () => void) => {
            window.setTimeout(fn, 0)
          }

    scheduler(() => {
      setQuantity(existingQuantity > 0 ? existingQuantity : MIN_QUANTITY)
    })
  }, [existingQuantity, product.id])

  const increase = () => {
    setQuantity((prev) => Math.min(prev + 1, MAX_QUANTITY))
  }

  const decrease = () => {
    setQuantity((prev) => Math.max(prev - 1, MIN_QUANTITY))
  }

  const totalPrice = useMemo(
    () => product.price * quantity,
    [product.price, quantity],
  )

  const handleAddToCart = () => {
    setItemQuantity(product.id, quantity)
    onAddedToCart?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-md flex-col gap-0 overflow-hidden rounded-t-3xl border-none bg-background p-0 sm:h-auto sm:max-w-lg sm:rounded-3xl sm:border sm:p-0">
        <div className="relative h-52 w-full overflow-hidden bg-muted sm:h-64">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="size-10" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <DialogHeader className="items-start gap-2 text-left">
            <DialogTitle className="text-xl font-semibold">
              {product.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {product.description || "Sem descrição disponível para este item."}
            </DialogDescription>
          </DialogHeader>

          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-3 py-1 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quantidade</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={decrease}
                  disabled={quantity <= MIN_QUANTITY}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-base font-semibold">
                  {quantity}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={increase}
                  disabled={quantity >= MAX_QUANTITY || !product.available}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            <Button
              className="h-14 rounded-full text-base font-semibold"
              onClick={handleAddToCart}
              disabled={!product.available}
            >
              {product.available
                ? `Adicionar • ${formatPrice(totalPrice, currency)}`
                : "Indisponível"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
