export function sanitizePhoneNumber(number: string): string {
  return number.replace(/[^\d]/g, "")
}
