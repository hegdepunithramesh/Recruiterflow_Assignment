import sampleData from '../data/sample-data.json'
import type { Expense, ExpenseSplit, Member } from '../features/expenses/expenseTypes'
import { calculateShares } from './split'
import { hasAtMostTwoDecimals, isExpenseCategory } from './validation'

export const STORAGE_KEY = 'trip-splitter-expenses'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** Rejects unknown members by checking every split id against the predefined members. */
function isExpenseSplit(value: unknown, memberIds: ReadonlySet<string>): value is ExpenseSplit {
  if (!isRecord(value)) {
    return false
  }

  switch (value.type) {
    case 'equal':
      return (
        Array.isArray(value.memberIds) &&
        value.memberIds.length > 0 &&
        value.memberIds.every((id) => typeof id === 'string' && memberIds.has(id)) &&
        new Set(value.memberIds).size === value.memberIds.length
      )
    case 'exact':
    case 'percent': {
      const shares = value.shares

      if (!isRecord(shares) || Object.keys(shares).length === 0) {
        return false
      }

      return Object.entries(shares).every(([id, share]) => {
        if (!memberIds.has(id) || typeof share !== 'number') {
          return false
        }

        return value.type === 'exact'
          ? Number.isSafeInteger(share) && share >= 0
          : Number.isFinite(share) && share >= 0 && share <= 100 && hasAtMostTwoDecimals(share)
      })
    }
    default:
      return false
  }
}

function isExpense(value: unknown, members: readonly Member[]): value is Expense {
  if (!isRecord(value)) {
    return false
  }

  if (typeof value.id !== 'string' || value.id.length === 0) {
    return false
  }

  if (
    typeof value.description !== 'string' ||
    value.description.length === 0 ||
    value.description.length > 60
  ) {
    return false
  }

  if (
    typeof value.amount !== 'number' ||
    !Number.isSafeInteger(value.amount) ||
    value.amount <= 0
  ) {
    return false
  }

  if (typeof value.paidBy !== 'string' || !members.some((member) => member.id === value.paidBy)) {
    return false
  }

  if (typeof value.date !== 'string' || !isValidDate(value.date)) {
    return false
  }

  if (typeof value.category !== 'string' || !isExpenseCategory(value.category)) {
    return false
  }

  const memberIds = new Set(members.map((member) => member.id))

  if (!isExpenseSplit(value.split, memberIds)) {
    return false
  }

  const candidate: Expense = {
    id: value.id,
    description: value.description,
    amount: value.amount,
    paidBy: value.paidBy,
    date: value.date,
    category: value.category,
    split: value.split,
  }

  // Reuse the pure calculator so exact sums and 100% totals are enforced in one place.
  try {
    calculateShares(candidate, members)
  } catch {
    return false
  }

  return true
}

/** Validates saved data against the predefined members; an empty array stays valid. */
export function isExpenseArray(
  value: unknown,
  members: readonly Member[] = sampleData.members,
): value is Expense[] {
  return Array.isArray(value) && value.every((item) => isExpense(item, members))
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
