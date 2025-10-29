import { CartLineItem, calculateCartTotals } from "./cart"
import { formatCurrency } from "./format"
import { sanitizePhoneNumber } from "./phone"
import type { RestaurantConfig } from "./types"

export type ConsumptionType = "dine-in" | "pickup"

type BuildMessageParams = {
  lineItems: CartLineItem[]
  config: RestaurantConfig
  customerName: string
  notes?: string
  consumptionType: ConsumptionType
}

const CONSUMPTION_LABEL: Record<ConsumptionType, string> = {
  "dine-in": "Consumo no local",
  pickup: "Retirada no local",
}

function buildMessageBody({
  lineItems,
  config,
  customerName,
  notes,
  consumptionType,
}: BuildMessageParams): string {
  const { subtotal, totalQuantity } = calculateCartTotals(lineItems)
  const lines = [
    `Olá *${config.restaurantName}*!`,
    `Cliente: *${customerName.trim()}*`,
    "",
    "Pedido:",
  ]

  lineItems.forEach((item) => {
    lines.push(
      `• ${item.quantity}x ${item.product.name} — ${formatCurrency(item.lineTotal, config.currency)}`,
    )

    if (item.product.description) {
      lines.push(`  ${item.product.description}`)
    }
  })

  lines.push("")
  lines.push(
    `Total de itens: *${totalQuantity}* — Total: *${formatCurrency(subtotal, config.currency)}*`,
  )
  lines.push(`Modalidade: *${CONSUMPTION_LABEL[consumptionType]}*`)

  if (notes && notes.trim().length > 0) {
    lines.push("")
    lines.push("Observações:")
    lines.push(notes.trim())
  }

  if (config.welcomeMessage) {
    lines.push("")
    lines.push(config.welcomeMessage)
  }

  return lines.join("\n")
}

export function buildWhatsAppMessage(params: BuildMessageParams) {
  const message = buildMessageBody(params)
  const phone = sanitizePhoneNumber(params.config.whatsappNumber)

  return {
    phone,
    message,
    url:
      phone.length > 0
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`,
  }
}
