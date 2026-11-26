import type { RootState } from '../../app/store'
import type { Expense } from './expenseTypes'

export const selectAllMembers = (state: RootState) => state.members

export const selectAllExpenses = (state: RootState) => state.expenses

export const selectExpenseById = (state: RootState, id: string): Expense | undefined =>
  state.expenses.find((expense) => expense.id === id)
