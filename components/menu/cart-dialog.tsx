"use client"

import { useEffect, useMemo, useState } from "react"
import { UtensilsCrossed, Utensils } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { buildCartLineItems, calculateCartTotals } from "@/lib/cart"
import { formatPrice } from "@/lib/format"
import { buildWhatsAppMessage, ConsumptionType } from "@/lib/whatsapp"
import type { MenuData, Product } from "@/lib/types"
import { useCartStore } from "@/store/cart-store"

type CartDialogStep = "cart" | "mode" | "confirm"

type CartDialogProps = {
  menuData: MenuData
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditProduct: (product: Product) => void
}

const CONSUMPTION_OPTIONS: Array<{
  type: ConsumptionType
  title: string
  description: string
  icon: React.ReactNode
}> = [
  {
    type: "dine-in",
    title: "Consumo no local",
    description: "Pedido será servido na mesa do cliente.",
    icon: <Utensils className="size-5" />,
  },
  {
    type: "pickup",
    title: "Retirada no local",
    description: "Cliente retira o pedido no balcão.",
    icon: <UtensilsCrossed className="size-5" />,
  },
]

export function CartDialog({
  menuData,
  open,
  onOpenChange,
  onEditProduct,
}: CartDialogProps) {
  const { products, config } = menuData
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)

  const [step, setStep] = useState<CartDialogStep>("cart")
  const [consumptionType, setConsumptionType] =
    useState<ConsumptionType>("dine-in")
  const [customerName, setCustomerName] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  const lineItems = useMemo(
    () => buildCartLineItems(items, products),
    [items, products],
  )

  const { subtotal, totalQuantity } = useMemo(
    () => calculateCartTotals(lineItems),
    [lineItems],
  )

  const hasItems = lineItems.length > 0

  useEffect(() => {
    const scheduler =
      typeof queueMicrotask === "function"
        ? queueMicrotask
        : (fn: () => void) => {
            window.setTimeout(fn, 0)
          }

    if (open) {
      scheduler(() => {
        setStep("cart")
        setError(null)
      })
    } else {
      scheduler(() => {
        setCustomerName("")
        setNotes("")
        setConsumptionType("dine-in")
      })
    }
  }, [open])

  const handleEdit = (productId: string) => {
    const product = products.find((item) => item.id === productId)
    if (!product) return

    onEditProduct(product)
    onOpenChange(false)
  }

  const handleContinueToMode = () => {
    if (!hasItems) return
    setError(null)
    setStep("mode")
  }

  const handleContinueToConfirm = () => {
    setError(null)
    setStep("confirm")
  }

  const handleSendOrder = () => {
    if (customerName.trim().length === 0) {
      setError("Informe o nome do cliente para continuar.")
      return
    }

    const { url } = buildWhatsAppMessage({
      lineItems,
      config,
      customerName,
      notes,
      consumptionType,
    })

    window.open(url, "_blank", "noreferrer")
    onOpenChange(false)
  }

  const handleBack = () => {
    if (step === "mode") {
      setStep("cart")
    } else if (step === "confirm") {
      setStep("mode")
    }
    setError(null)
  }

  const renderCartStep = () => (
    <div className="flex h-full flex-col gap-4">
      <DialogHeader className="items-start text-left">
        <DialogTitle className="text-lg font-semibold">
          Meu carrinho
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Revise seus itens antes de finalizar o pedido.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {!hasItems && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted p-6 text-sm text-muted-foreground">
            Seu carrinho está vazio.
          </div>
        )}
        {lineItems.map(({ product, quantity, lineTotal }) => (
          <div
            key={product.id}
            className="flex items-start justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div>
              <h3 className="text-sm font-semibold">{product.name}</h3>
              <p className="text-xs text-muted-foreground">
                {quantity}x {formatPrice(product.price, config.currency)}
              </p>
              <p className="mt-1 text-sm font-medium text-primary">
                {formatPrice(lineTotal, config.currency)}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs font-medium">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => handleEdit(product.id)}
              >
                Editar
              </button>
              <button
                type="button"
                className="text-destructive underline-offset-4 hover:underline"
                onClick={() => removeItem(product.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-base font-semibold">
            {formatPrice(subtotal, config.currency)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            className="h-12 rounded-full"
            disabled={!hasItems}
            onClick={handleContinueToMode}
          >
            Finalizar pedido ({totalQuantity})
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Continuar comprando
          </Button>
        </div>
      </div>
    </div>
  )

  const renderModeStep = () => (
    <div className="flex h-full flex-col gap-6">
      <DialogHeader className="items-start text-left">
        <DialogTitle className="text-lg font-semibold">
          Como será a entrega?
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Escolha se o pedido será consumido no local ou se o cliente irá retirar.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        {CONSUMPTION_OPTIONS.map((option) => {
          const isActive = option.type === consumptionType
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => setConsumptionType(option.type)}
              className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-full ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {option.icon}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{option.title}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Button
          className="h-12 rounded-full"
          onClick={handleContinueToConfirm}
        >
          Continuar
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-12 rounded-full"
          onClick={handleBack}
        >
          Voltar
        </Button>
      </div>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="flex h-full flex-col gap-4">
      <DialogHeader className="items-start text-left">
        <DialogTitle className="text-lg font-semibold">
          Finalizar pedido
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Informe os dados do cliente e confirme o envio para o WhatsApp.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Nome do cliente *
          </label>
          <Input
            placeholder="Ex: João Silva"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Observações (opcional)
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            placeholder="Ex: Retirar cebola do hambúrguer"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="rounded-2xl bg-muted/50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-base font-semibold">
              {formatPrice(subtotal, config.currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Modalidade:{" "}
            {CONSUMPTION_OPTIONS.find(
              (option) => option.type === consumptionType,
            )?.title ?? ""}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Button className="h-12 rounded-full" onClick={handleSendOrder}>
          Enviar pedido via WhatsApp
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-12 rounded-full"
          onClick={handleBack}
        >
          Voltar
        </Button>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (step) {
      case "cart":
        return renderCartStep()
      case "mode":
        return renderModeStep()
      case "confirm":
        return renderConfirmStep()
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-w-md flex-col gap-6 overflow-hidden rounded-t-3xl border-none bg-background px-6 py-6 sm:h-auto sm:max-w-lg sm:rounded-3xl sm:border">
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}
