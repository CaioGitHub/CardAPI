import { sheets_v4 } from "@googleapis/sheets"
import { JWT } from "google-auth-library"

import { getEnv, getOptionalEnv } from "./env"

let cachedSheetsClient: sheets_v4.Sheets | null = null

async function createSheetsClient(): Promise<sheets_v4.Sheets> {
  if (cachedSheetsClient) {
    return cachedSheetsClient
  }

  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } =
    getEnv()

  const privateKey = GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
    /\\n/g,
    "\n",
  ).replace(/-----BEGIN PRIVATE KEY-----\s*/, "-----BEGIN PRIVATE KEY-----\n")

  const auth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  cachedSheetsClient = new sheets_v4.Sheets({ auth })
  return cachedSheetsClient
}

export async function readSheet(range: string): Promise<string[][]> {
  const { GOOGLE_SHEETS_ID } = getEnv()
  const sheets = await createSheetsClient()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range,
    majorDimension: "ROWS",
  })

  return response.data.values ?? []
}

export function getConfiguredTimezone(): string {
  return (
    getOptionalEnv("MENU_TIMEZONE") ||
    getOptionalEnv("NEXT_PUBLIC_MENU_TIMEZONE") ||
    "America/Sao_Paulo"
  )
}
