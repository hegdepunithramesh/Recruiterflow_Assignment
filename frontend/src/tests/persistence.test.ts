import { beforeEach, describe, expect, it } from 'vitest'
import type { Expense } from '../features/expenses/expenseTypes'
import { isExpenseArray, loadExpenses, STORAGE_KEY } from '../utils/persistence'

const validExpense: Expense = {
  id: 'e1',
  description: 'Valid expense',
  amount: 10000,
  paidBy: 'm1',
  date: '2026-03-10',
  category: 'Food',
  split: { type: 'equal', memberIds: ['m1', 'm2'] },
}

const exactExpense: Expense = {
  ...validExpense,
  id: 'e2',
  amount: 10000,
  split: { type: 'exact', shares: { m1: 6000, m2: 4000 } },
}

const percentExpense: Expense = {
  ...validExpense,
  id: 'e3',
  split: { type: 'percent', shares: { m1: 60, m2: 40 } },
}

function save(value: unknown): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    typeof value === 'string' ? value : JSON.stringify(value),
  )
}

function savedValue(): unknown {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === null ? null : JSON.parse(raw)
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('persisted expense validation', () => {
  it('falls back to sample expenses for invalid JSON', () => {
    save('{not json')

    expect(loadExpenses([validExpense])).toEqual([validExpense])
  })

  it('rejects expenses with missing required properties', () => {
    save([{ id: 'e1', amount: 10000 }])

    expect(isExpenseArray(savedValue())).toBe(false)
    expect(loadExpenses([validExpense])).toEqual([validExpense])
  })

  it('rejects an unknown payer id', () => {
    save([{ ...validExpense, paidBy: 'm9' }])

    expect(isExpenseArray(savedValue())).toBe(false)
    expect(loadExpenses([validExpense])).toEqual([validExpense])
  })

  it('rejects unknown split-member ids', () => {
    save([{ ...validExpense, split: { type: 'equal', memberIds: ['m1', 'm9'] } }])

    expect(isExpenseArray(savedValue())).toBe(false)
    expect(loadExpenses([validExpense])).toEqual([validExpense])

    save([{ ...exactExpense, split: { type: 'exact', shares: { m9: 10000 } } }])

    expect(isExpenseArray(savedValue())).toBe(false)
  })

  it('rejects invalid split types', () => {
    save([{ ...validExpense, split: { type: 'split-evenly', memberIds: ['m1'] } }])

    expect(isExpenseArray(savedValue())).toBe(false)
    expect(loadExpenses([validExpense])).toEqual([validExpense])

    save([{ ...validExpense, split: { type: 'equal', shares: { m1: 10000 } } }])

    expect(isExpenseArray(savedValue())).toBe(false)
  })

  it('rejects exact splits whose shares do not match the amount', () => {
    save([{ ...exactExpense, split: { type: 'exact', shares: { m1: 5000, m2: 4000 } } }])

    expect(isExpenseArray(savedValue())).toBe(false)
    expect(loadExpenses([validExpense])).toEqual([validExpense])

    save([{ ...exactExpense, split: { type: 'exact', shares: { m1: 7000, m2: 4000 } } }])

    expect(isExpenseArray(savedValue())).toBe(false)
  })

  it('rejects invalid percentage totals and values', () => {
    save([{ ...percentExpense, split: { type: 'percent', shares: { m1: 40, m2: 40 } } }])

    expect(isExpenseArray(savedValue())).toBe(false)
    expect(loadExpenses([validExpense])).toEqual([validExpense])

    save([{ ...percentExpense, split: { type: 'percent', shares: { m1: 101 } } }])

    expect(isExpenseArray(savedValue())).toBe(false)
  })

  it('keeps a valid empty saved array empty', () => {
    save([])

    expect(isExpenseArray(savedValue())).toBe(true)
    expect(loadExpenses([validExpense])).toEqual([])
  })

  it('accepts valid persisted expenses unchanged', () => {
    const persisted = [validExpense, exactExpense, percentExpense]
    save(persisted)

    expect(isExpenseArray(savedValue())).toBe(true)
    expect(loadExpenses([validExpense])).toEqual(persisted)
  })

  it('rejects invalid categories, amounts and dates', () => {
    save([{ ...validExpense, category: 'Unknown' }])
    expect(isExpenseArray(savedValue())).toBe(false)

    save([{ ...validExpense, amount: 0 }])
    expect(isExpenseArray(savedValue())).toBe(false)

    save([{ ...validExpense, date: '2026-02-30' }])
    expect(isExpenseArray(savedValue())).toBe(false)
  })
})
