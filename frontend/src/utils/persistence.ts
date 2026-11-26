import type { Expense } from '../features/expenses/expenseTypes'

export const STORAGE_KEY = 'trip-splitter-expenses'

const CATEGORIES: readonly string[] = ['Food', 'Travel', 'Stay', 'Activities', 'Other']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPaiseShares(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return false
  }

  return Object.values(value).every(
    (share) => typeof share === 'number' && Number.isSafeInteger(share) && share >= 0,
  )
}

function isPercentShares(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return false
  }

  return Object.values(value).every(
    (percent) =>
      typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100,
  )
}

function isExpenseSplit(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  switch (value.type) {
    case 'equal':
      return (
        Array.isArray(value.memberIds) &&
        value.memberIds.length > 0 &&
        value.memberIds.every((id) => typeof id === 'string')
      )
    case 'exact':
      return isPaiseShares(value.shares)
    case 'percent':
      return isPercentShares(value.shares)
    default:
      return false
  }
}

function isExpense(value: unknown): value is Expense {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.description === 'string' &&
    typeof value.amount === 'number' &&
    Number.isSafeInteger(value.amount) &&
    value.amount >= 0 &&
    typeof value.paidBy === 'string' &&
    value.paidBy.length > 0 &&
    typeof value.date === 'string' &&
    DATE_PATTERN.test(value.date) &&
    typeof value.category === 'string' &&
    CATEGORIES.includes(value.category) &&
    isExpenseSplit(value.split)
  )
}

/** Structural check only; split rules stay in the pure Phase 2 utilities. */
export function isExpenseArray(value: unknown): value is Expense[] {
  return Array.isArray(value) && value.every(isExpense)
}

function readStoredValue(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function loadExpenses(fallback: readonly Expense[]): Expense[] {
  const saved = readStoredValue()

  if (saved === null) {
    return [...fallback]
  }

  try {
    const parsed: unknown = JSON.parse(saved)

    if (isExpenseArray(parsed)) {
      return parsed
    }
  } catch {
    // Malformed JSON falls through to the bundled sample data.
  }

  return [...fallback]
}

export function saveExpenses(expenses: readonly Expense[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
  } catch {
    // Storage can be disabled or full; the in-memory store still works.
  }
}
