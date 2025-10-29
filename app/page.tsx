import { MenuScreen } from "@/components/menu/menu-screen"
import { getMenuData } from "@/lib/menu-data"

async function fetchMenuDataSafely() {
  try {
    return await getMenuData()
  } catch (error) {
    console.error("Failed to load menu data", error)
    return null
  }
}

export default async function Home() {
  const menuData = await fetchMenuDataSafely()

  if (!menuData) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-sm text-muted-foreground">
        <div className="max-w-sm space-y-4 rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">
            Não foi possível carregar o cardápio
          </h1>
          <p>
            Verifique as configurações da planilha do Google Sheets e as variáveis
            de ambiente. Tente novamente mais tarde.
          </p>
        </div>
      </main>
    )
  }

  return <MenuScreen menuData={menuData} />
}
