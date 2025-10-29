'use server'

import { cache } from "react"

import { readSheet } from "./google-sheets"
import { getConfiguredTimezone } from "./google-sheets"
import { getOptionalEnv } from "./env"
import {
  Category,
  MenuData,
  OpeningHour,
  OpeningHourWindow,
  Product,
  RestaurantConfig,
} from "./types"

const SHEET_RANGE_PREFERENCES = {
  categories: [
    getOptionalEnv("GOOGLE_SHEETS_RANGE_CATEGORIES"),
    "categorias!A2:D",
    "Categorias!A2:D",
    "categorias!A2:A",
    "Categorias!A2:A",
  ],
  products: [
    getOptionalEnv("GOOGLE_SHEETS_RANGE_PRODUCTS"),
    "produtos!A2:I",
    "Produtos!A2:I",
    "Itens!A2:J",
    "Itens!A2:G",
  ],
  openingHours: [
    getOptionalEnv("GOOGLE_SHEETS_RANGE_OPENING_HOURS"),
    "horarios!A2:H",
    "Horarios!A2:H",
    "Horários!A2:H",
    "Horarios!A2:C",
    "Horários!A2:C",
  ],
  config: [
    getOptionalEnv("GOOGLE_SHEETS_RANGE_CONFIG"),
    "configuracao!A2:B",
    "Configuracao!A2:B",
    "Configurações!A2:B",
    "Config!A2:B",
  ],
} as const satisfies Record<string, Array<string | undefined>>

const DEFAULT_CONFIG: RestaurantConfig = {
  restaurantName: "Meu Restaurante",
  logoUrl: "/logo.svg",
  whatsappNumber: "",
  timezone: getConfiguredTimezone(),
  currency: "BRL",
}

const BOOLEAN_TRUE_VALUES = new Set([
  "true",
  "1",
  "yes",
  "y",
  "sim",
  "ativo",
  "open",
  "available",
])

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseNumber(raw: string | undefined, fallback = 0): number {
  if (!raw) return fallback
  const normalized = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseBoolean(raw: string | undefined, fallback = true): boolean {
  if (typeof raw !== "string" || raw.length === 0) {
    return fallback
  }

  return BOOLEAN_TRUE_VALUES.has(raw.trim().toLowerCase())
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function normalizeTime(raw: string | undefined): string {
  if (!raw) return ""
  const trimmed = raw.trim()
  if (!trimmed) return ""

  const colonMatch = trimmed.match(/^(\d{1,2})[:hH]?(\d{2})?$/)
  if (colonMatch) {
    const hours = Math.min(23, Math.max(0, Number.parseInt(colonMatch[1], 10)))
    const rawMinutes = colonMatch[2] ? Number.parseInt(colonMatch[2], 10) : 0
    const minutes = Math.min(59, Math.max(0, rawMinutes))
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, "")
  if (digitsOnly.length >= 3 && digitsOnly.length <= 4) {
    const hoursPart = digitsOnly.slice(0, digitsOnly.length - 2)
    const minutesPart = digitsOnly.slice(-2)
    const hours = Math.min(23, Math.max(0, Number.parseInt(hoursPart, 10)))
    const minutes = Math.min(59, Math.max(0, Number.parseInt(minutesPart, 10)))
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`
  }

  return ""
}

function parseCategories(rows: string[][]): Category[] {
  return rows
    .map((row, index): Category | null => {
      const cells = row.map((cell) => cell?.trim() ?? "")
      const rawName = cells[1] || cells[0]
      if (!rawName) return null

      const id = cells[0] || toSlug(rawName)
      const slug = cells[2] || toSlug(rawName)
      const order =
        cells[3] && cells[3].length > 0
          ? Number.parseInt(cells[3], 10) || index
          : index

      return {
        id: toSlug(id),
        name: rawName,
        slug,
        order,
      }
    })
    .filter((category): category is Category => Boolean(category))
    .sort((a, b) => a.order - b.order)
}

function parseProducts(rows: string[][]): Product[] {
  return rows
    .map((row) => {
      const cells = row.map((cell) => cell?.trim() ?? "")
      const name = cells[1] || cells[0]
      const description =
        cells.length >= 9 ? cells[3] : cells.length >= 3 ? cells[2] : ""
      const imageUrl =
        cells.length >= 9
          ? cells[4]
          : cells.length >= 7
            ? cells[6]
            : ""
      const price = parseNumber(
        cells.length >= 9 ? cells[5] : cells.length >= 4 ? cells[3] : "",
        0,
      )
      const categoryRef =
        cells.length >= 9
          ? cells[6]
          : cells.length >= 5
            ? cells[4]
            : ""
      const availableRaw =
        cells.length >= 9
          ? cells[7]
          : cells.length >= 6
            ? cells[5]
            : ""
      const tags =
        cells.length >= 9
          ? parseTags(cells[8])
          : []

      if (!name || !categoryRef) {
        return null
      }

      const id = cells[0] || toSlug(`${categoryRef}-${name}`)
      const slug = cells[2] || toSlug(name)
      const available = parseBoolean(availableRaw, true)
      const categoryId = toSlug(categoryRef)

      return {
        id,
        name,
        slug,
        description,
        imageUrl,
        price,
        categoryId,
        available,
        tags,
      } satisfies Product
    })
    .filter((product): product is Product => Boolean(product))
}

function parseOpeningHours(rows: string[][]): OpeningHour[] {
  return rows
    .map((row) => {
      const dayCell = row[0]?.trim() ?? ""
      let day: number | undefined

      if (/^\d+$/.test(dayCell)) {
        day = Number.parseInt(dayCell, 10)
      } else if (dayCell.length > 0) {
        const slugKey = toSlug(dayCell)
        const compactKey = slugKey.replace(/-/g, "")
        day =
          DAY_NAME_TO_INDEX[slugKey] ??
          DAY_NAME_TO_INDEX[compactKey] ??
          DAY_NAME_TO_INDEX[dayCell.toLowerCase()]
      }

      if (day === undefined || Number.isNaN(day)) return null
      if (day < 0 || day > 6) return null

      const windows: OpeningHourWindow[] = []

      for (let col = 1; col < row.length; col += 2) {
        const opens = normalizeTime(row[col])
        const closes = normalizeTime(row[col + 1])

        if (opens && closes) {
          windows.push({ opensAt: opens, closesAt: closes })
        }
      }

      return {
        dayOfWeek: day,
        windows,
      } satisfies OpeningHour
    })
    .filter((hour): hour is OpeningHour => hour !== null)
}

function parseConfig(rows: string[][]): RestaurantConfig {
  const entries = rows
    .map((row) => row.map((cell) => cell?.trim() ?? ""))
    .filter(([key]) => Boolean(key))

  const config: RestaurantConfig = { ...DEFAULT_CONFIG }

  for (const [key, value] of entries) {
    const normalizedKey = key.toLowerCase()

    switch (normalizedKey) {
      case "nome":
      case "restaurant_name":
      case "name":
        config.restaurantName = value || DEFAULT_CONFIG.restaurantName
        break
      case "logo":
      case "logo_url":
      case "logourl":
        config.logoUrl = value || DEFAULT_CONFIG.logoUrl
        break
      case "whatsapp":
      case "whatsapp_number":
      case "zap":
      case "telefone":
        config.whatsappNumber = value || DEFAULT_CONFIG.whatsappNumber
        break
      case "timezone":
      case "fuso":
      case "fuso_horario":
        config.timezone = value || DEFAULT_CONFIG.timezone
        break
      case "currency":
      case "moeda":
        config.currency = value || DEFAULT_CONFIG.currency
        break
      case "accent_color":
      case "primary_color":
      case "cor":
        config.accentColor = value
        break
      case "mensagem":
      case "welcome_message":
        config.welcomeMessage = value
        break
      default:
        break
    }
  }

  config.timezone = config.timezone || DEFAULT_CONFIG.timezone
  config.currency = config.currency || DEFAULT_CONFIG.currency

  return config
}

export const getMenuData = cache(async (): Promise<MenuData> => {
  const [categoryRows, productRows, openingRows, configRows] = await Promise.all(
    [
      readFirstAvailable(SHEET_RANGE_PREFERENCES.categories),
      readFirstAvailable(SHEET_RANGE_PREFERENCES.products),
      readFirstAvailable(SHEET_RANGE_PREFERENCES.openingHours),
      readFirstAvailable(SHEET_RANGE_PREFERENCES.config),
    ],
  )

  const categories = parseCategories(categoryRows)
  const products = parseProducts(productRows)
  const openingHours = parseOpeningHours(openingRows)
  const config = parseConfig(configRows)

  return {
    categories,
    products,
    openingHours,
    config,
  }
})
const DAY_NAME_TO_INDEX: Record<string, number> = {
  domingo: 0,
  dom: 0,
  sunday: 0,
  segunda: 1,
  "segunda-feira": 1,
  "segunda feira": 1,
  seg: 1,
  monday: 1,
  terça: 2,
  terca: 2,
  "terça-feira": 2,
  "terca-feira": 2,
  "terca feira": 2,
  ter: 2,
  tuesday: 2,
  quarta: 3,
  "quarta-feira": 3,
  "quarta feira": 3,
  qua: 3,
  wednesday: 3,
  quinta: 4,
  "quinta-feira": 4,
  "quinta feira": 4,
  qui: 4,
  thursday: 4,
  sexta: 5,
  "sexta-feira": 5,
  "sexta feira": 5,
  sex: 5,
  friday: 5,
  sábado: 6,
  sabado: 6,
  sab: 6,
  saturday: 6,
}

async function readFirstAvailable(rangeOptions: Array<string | undefined>) {
  for (const range of rangeOptions) {
    if (!range) continue
    try {
      const values = await readSheet(range)
      if (values.length > 0) {
        return values
      }
    } catch (error) {
      console.warn(`Failed to read sheet range "${range}":`, error)
    }
  }

  return []
}
