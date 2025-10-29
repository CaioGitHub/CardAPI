const REQUIRED_ENV_VARS = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_SHEETS_ID",
] as const

type RequiredEnv = (typeof REQUIRED_ENV_VARS)[number]

export type EnvShape = Record<RequiredEnv, string>

function readEnv(name: RequiredEnv): string {
  const value = process.env[name]

  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing environment variable "${name}". Check your .env configuration.`,
    )
  }

  return value
}

export function getEnv(): EnvShape {
  return REQUIRED_ENV_VARS.reduce((acc, key) => {
    acc[key] = readEnv(key)
    return acc
  }, {} as EnvShape)
}

export function getOptionalEnv(name: string, fallback = ""): string {
  const value = process.env[name]
  return value ? value : fallback
}
