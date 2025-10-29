export function formatCurrency(
  value: number,
  currency: string,
  locale = "pt-BR",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toFixed(2)
  }
}

export function formatPrice(value: number, currency: string): string {
  return formatCurrency(value, currency)
}

export function formatTimeLabel(time: string): string {
  if (!time) return ""
  const [hours, minutes] = time.split(":")
  if (!hours || !minutes) return time
  return `${hours}:${minutes}`
}
