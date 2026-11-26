import type { ExpenseCategory, Member } from '../features/expenses/expenseTypes'
import { formatPaise, parseRupees } from './money'

/** ₹10,00,000 expressed in paise. */
export const MAX_AMOUNT_PAISE = 100_000_000
const PERCENT_SCALE = 10_000
const CATEGORIES: readonly string[] = ['Food', 'Travel', 'Stay', 'Activities', 'Other']

export type SplitType = 'equal' | 'exact' | 'percent'

export interface ExpenseFormValues {
  description: string
  amount: string
  paidBy: string
  date: string
  category: string
  splitType: SplitType
  selectedMemberIds: string[]
  exactAmounts: Record<string, string>
  percentages: Record<string, string>
}

export interface FormErrors {
  description?: string
  amount?: string
  paidBy?: string
  date?: string
  category?: string
  split?: string
  shareErrors?: Record<string, string>
}

export interface ExactAllocation {
  paise: Record<string, number>
  errors: Record<string, string>
  total: number
}

export interface PercentAllocation {
  values: Record<string, number>
  units: Record<string, number>
  totalUnits: number
  errors: Record<string, string>
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return CATEGORIES.some((category) => category === value)
}

export function todayISODate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/** Returns null instead of throwing so validation and live hints can share the parser. */
export function amountInPaise(value: string): number | null {
  try {
    return parseRupees(value.trim())
  } catch {
    return null
  }
}

export function validateDescription(value: string): string | undefined {
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return 'Description is required'
  }

  if (trimmed.length > 60) {
    return 'Description must be at most 60 characters'
  }

  return undefined
}

export function validateAmount(value: string): string | undefined {
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return 'Amount is required'
  }

  if (trimmed.startsWith('-')) {
    return 'Amount must be more than ₹0'
  }

  if (/\.\d{3,}$/.test(trimmed)) {
    return 'Amount must have at most 2 decimal places'
  }

  const paise = amountInPaise(trimmed)

  if (paise === null) {
    return 'Enter a valid amount in rupees'
  }

  if (paise <= 0) {
    return 'Amount must be more than ₹0'
  }

  if (paise > MAX_AMOUNT_PAISE) {
    return 'Amount must be at most ₹10,00,000'
  }

  return undefined
}

export function validatePaidBy(value: string, members: readonly Member[]): string | undefined {
  if (value.length === 0) {
    return 'Paid by is required'
  }

  if (!members.some((member) => member.id === value)) {
    return 'Paid by must be a trip member'
  }

  return undefined
}

export function validateDate(value: string, today: string = todayISODate()): string | undefined {
  if (value.length === 0) {
    return 'Date is required'
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'Enter a valid date'
  }

  if (value > today) {
    return 'Date cannot be in the future'
  }

  return undefined
}

export function validateCategory(value: string): string | undefined {
  if (value.length === 0) {
    return 'Category is required'
  }

  if (!isExpenseCategory(value)) {
    return 'Choose a valid category'
  }

  return undefined
}

/** Blank inputs count as zero so a partially filled split can show a running total. */
export function exactAllocation(values: Record<string, string>, members: readonly Member[]): ExactAllocation {
  const paise: Record<string, number> = {}
  const errors: Record<string, string> = {}
  let total = 0

  for (const member of members) {
    const raw = values[member.id] ?? ''

    if (raw.trim().length === 0) {
      paise[member.id] = 0
      continue
    }

    const parsed = amountInPaise(raw)

    if (parsed === null || parsed < 0) {
      errors[member.id] = 'Enter a non-negative amount with at most 2 decimals'
      paise[member.id] = 0
      continue
    }

    paise[member.id] = parsed
    total += parsed
  }

  return { paise, errors, total }
}

function hasAtMostTwoDecimals(value: number): boolean {
  const text = String(value)
  const decimalIndex = text.indexOf('.')

  return decimalIndex === -1
    ? !text.includes('e')
    : text.length - decimalIndex - 1 <= 2
}

/** Percentages are kept in hundredths so totals compare exactly, as in split.ts. */
export function percentAllocation(values: Record<string, string>, members: readonly Member[]): PercentAllocation {
  const result: PercentAllocation = { values: {}, units: {}, totalUnits: 0, errors: {} }

  for (const member of members) {
    const raw = values[member.id] ?? ''

    if (raw.trim().length === 0) {
      result.values[member.id] = 0
      result.units[member.id] = 0
      continue
    }

    const percent = Number(raw)

    if (
      !Number.isFinite(percent) ||
      percent < 0 ||
      percent > 100 ||
      !hasAtMostTwoDecimals(percent)
    ) {
      result.errors[member.id] = 'Enter a percentage from 0 to 100 with at most 2 decimals'
      result.values[member.id] = 0
      result.units[member.id] = 0
      continue
    }

    result.values[member.id] = percent
    result.units[member.id] = Math.round(percent * 100)
    result.totalUnits += result.units[member.id]
  }

  return result
}

/** Converts hundredths of a percent into a short display value, e.g. 3333 -> "33.33". */
export function formatUnits(units: number): string {
  const whole = Math.floor(units / 100)
  const fraction = units % 100

  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`
}

export function validateExpenseForm(
  values: ExpenseFormValues,
  members: readonly Member[],
  today: string = todayISODate(),
): FormErrors {
  const errors: FormErrors = {
    description: validateDescription(values.description),
    amount: validateAmount(values.amount),
    paidBy: validatePaidBy(values.paidBy, members),
    date: validateDate(values.date, today),
    category: validateCategory(values.category),
  }

  if (values.splitType === 'equal') {
    const selected = values.selectedMemberIds

    if (selected.length === 0) {
      errors.split = 'Select at least one member'
    } else if (selected.some((id) => !members.some((member) => member.id === id))) {
      errors.split = 'Selected members must be trip members'
    }
  }

  if (values.splitType === 'exact') {
    const allocation = exactAllocation(values.exactAmounts, members)

    if (Object.keys(allocation.errors).length > 0) {
      errors.shareErrors = allocation.errors
    } else {
      const paise = amountInPaise(values.amount.trim())

      if (paise !== null && paise > 0) {
        const difference = paise - allocation.total

        if (difference > 0) {
          errors.split = `${formatPaise(difference)} left to assign`
        } else if (difference < 0) {
          errors.split = `${formatPaise(-difference)} over-assigned`
        }
      }
    }
  }

  if (values.splitType === 'percent') {
    const allocation = percentAllocation(values.percentages, members)

    if (Object.keys(allocation.errors).length > 0) {
      errors.shareErrors = allocation.errors
    } else if (allocation.totalUnits < PERCENT_SCALE) {
      errors.split = `${formatUnits(PERCENT_SCALE - allocation.totalUnits)}% left to assign`
    } else if (allocation.totalUnits > PERCENT_SCALE) {
      errors.split = `${formatUnits(allocation.totalUnits - PERCENT_SCALE)}% over-assigned`
    }
  }

  return errors
}

export function hasErrors(errors: FormErrors): boolean {
  return (
    errors.description !== undefined ||
    errors.amount !== undefined ||
    errors.paidBy !== undefined ||
    errors.date !== undefined ||
    errors.category !== undefined ||
    errors.split !== undefined ||
    (errors.shareErrors !== undefined && Object.keys(errors.shareErrors).length > 0)
  )
}
