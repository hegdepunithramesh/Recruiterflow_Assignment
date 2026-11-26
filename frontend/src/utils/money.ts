/** Accepts plain or Indian-grouped rupees with at most two decimal places. */
const AMOUNT_PATTERN = /^(?:₹\s*)?(\d+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.(\d{1,2}))?$/

/** Parses a rupee string into integer paise. Invalid input is rejected, never rounded. */
export function parseRupees(input: string): number {
  const match = AMOUNT_PATTERN.exec(input.trim())

  if (match === null) {
    throw new Error(`Invalid rupee amount: "${input}"`)
  }

  const digits = match[1].replace(/,/g, '')
  const fraction = match[2] === undefined ? '00' : match[2].padEnd(2, '0')
  const paise = Number(digits + fraction)

  if (!Number.isSafeInteger(paise)) {
    throw new Error(`Rupee amount is too large: "${input}"`)
  }

  return paise
}

/** Formats integer paise as ₹1,00,000.00 using string grouping to avoid rounding. */
export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new Error(`Invalid paise amount: ${paise}`)
  }

  const sign = paise < 0 ? '-' : ''
  const digits = String(Math.abs(paise)).padStart(3, '0')
  const rupeeDigits = digits.slice(0, -2)
  const paiseDigits = digits.slice(-2)
  const lastThree = rupeeDigits.slice(-3)
  const earlier = rupeeDigits.slice(0, -3)
  const groupedRupees = earlier.length > 0
    ? `${earlier.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree

  return `${sign}₹${groupedRupees}.${paiseDigits}`
}
