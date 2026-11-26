import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../app/store'
import sampleData from '../data/sample-data.json'
import type { Expense } from '../features/expenses/expenseTypes'
import {
  addExpense,
  deleteExpense,
  initializeExpenses,
  sampleExpenses,
} from '../features/expenses/expensesSlice'
import expensesReducer from '../features/expenses/expensesSlice'
import {
  selectAllExpenses,
  selectAllMembers,
  selectExpenseById,
} from '../features/expenses/expenseSelectors'
import membersReducer from '../features/members/membersSlice'
import { isExpenseArray, loadExpenses, saveExpenses, STORAGE_KEY } from '../utils/persistence'

const extraExpense: Expense = {
  id: 'e-test',
  description: 'Test coffee',
  amount: 125050,
  paidBy: 'm2',
  date: '2026-03-16',
  category: 'Food',
  split: { type: 'equal', memberIds: ['m1', 'm2'] },
}

function readSaved(): unknown {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === null ? null : JSON.parse(raw)
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('initial state', () => {
  it('uses the exact sample data for members and expenses', () => {
    expect(membersReducer(undefined, { type: 'init' })).toEqual(sampleData.members)
    expect(expensesReducer(undefined, { type: 'init' })).toEqual(sampleData.expenses)

    const state = createAppStore().getState()
    expect(state.members).toEqual(sampleData.members)
    expect(state.expenses).toEqual(sampleData.expenses)
  })

  it('exposes the sample expenses through the selectors', () => {
    const state = createAppStore().getState()

    expect(selectAllMembers(state)).toEqual(sampleData.members)
    expect(selectAllExpenses(state)).toEqual(sampleData.expenses)
    expect(selectExpenseById(state, 'e4')).toEqual(sampleData.expenses[3])
    expect(selectExpenseById(state, 'missing')).toBeUndefined()
  })
})

describe('expense actions', () => {
  it('adds an expense', () => {
    const store = createAppStore()
    store.dispatch(addExpense(extraExpense))

    expect(store.getState().expenses).toHaveLength(7)
    expect(store.getState().expenses).toContainEqual(extraExpense)
  })

  it('deletes an expense by id', () => {
    const store = createAppStore()
    store.dispatch(deleteExpense('e2'))

    expect(store.getState().expenses).toHaveLength(5)
    expect(store.getState().expenses.some((expense) => expense.id === 'e2')).toBe(false)
  })

  it('initializes expenses from a supplied list', () => {
    const store = createAppStore()
    store.dispatch(initializeExpenses([extraExpense]))

    expect(store.getState().expenses).toEqual([extraExpense])
  })
})

describe('localStorage initialization', () => {
  it('loads structurally valid saved expenses', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([extraExpense]))

    expect(loadExpenses(sampleExpenses)).toEqual([extraExpense])
    expect(createAppStore().getState().expenses).toEqual([extraExpense])
  })

  it('uses sample expenses when nothing is saved', () => {
    expect(loadExpenses(sampleExpenses)).toEqual(sampleExpenses)
    expect(createAppStore().getState().expenses).toEqual(sampleExpenses)
  })

  it('uses sample expenses when the saved JSON is malformed', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')

    expect(loadExpenses(sampleExpenses)).toEqual(sampleExpenses)
    expect(createAppStore().getState().expenses).toEqual(sampleExpenses)
  })

  it('uses sample expenses when the saved data is structurally invalid', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'e-bad' }]))
    expect(loadExpenses(sampleExpenses)).toEqual(sampleExpenses)

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses: [] }))
    expect(loadExpenses(sampleExpenses)).toEqual(sampleExpenses)

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ ...extraExpense, category: 'Unknown' }]),
    )
    expect(loadExpenses(sampleExpenses)).toEqual(sampleExpenses)
  })

  it('treats an empty saved array as valid state', () => {
    window.localStorage.setItem(STORAGE_KEY, '[]')

    expect(loadExpenses(sampleExpenses)).toEqual([])
    expect(createAppStore().getState().expenses).toEqual([])
  })
})

describe('persistence side effects', () => {
  it('saves the full expense list after an add and after a delete', () => {
    const store = createAppStore()
    store.dispatch(addExpense(extraExpense))

    expect(readSaved()).toEqual([...sampleExpenses, extraExpense])

    store.dispatch(deleteExpense('e1'))

    expect(readSaved()).toEqual([...sampleExpenses.slice(1), extraExpense])
  })

  it('does not save on actions that leave expenses unchanged', () => {
    const store = createAppStore()
    store.dispatch(initializeExpenses([extraExpense]))

    expect(readSaved()).toBeNull()
  })

  it('survives localStorage being unavailable', () => {
    vi.stubGlobal('localStorage', undefined)

    expect(loadExpenses(sampleExpenses)).toEqual(sampleExpenses)
    expect(() => saveExpenses([extraExpense])).not.toThrow()

    const store = createAppStore()
    expect(store.getState().expenses).toEqual(sampleExpenses)
    expect(() => store.dispatch(addExpense(extraExpense))).not.toThrow()
    expect(store.getState().expenses).toContainEqual(extraExpense)
  })

  it('survives a storage write failure', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage full')
    })

    const store = createAppStore()
    expect(() => store.dispatch(deleteExpense('e1'))).not.toThrow()
    expect(store.getState().expenses).toHaveLength(5)
  })

  it('accepts a saved value that passes the structural validator', () => {
    const saved: unknown = [extraExpense]
    expect(isExpenseArray(saved)).toBe(true)
  })
})
