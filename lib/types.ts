export type Category = {
  id: string
  name: string
  slug: string
  order: number
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string
  price: number
  categoryId: string
  available: boolean
  tags: string[]
}

export type OpeningHourWindow = {
  opensAt: string
  closesAt: string
}

export type OpeningHour = {
  dayOfWeek: number
  windows: OpeningHourWindow[]
}

export type RestaurantConfig = {
  restaurantName: string
  logoUrl: string
  whatsappNumber: string
  timezone: string
  currency: string
  accentColor?: string
  welcomeMessage?: string
}

export type MenuData = {
  categories: Category[]
  products: Product[]
  openingHours: OpeningHour[]
  config: RestaurantConfig
}
