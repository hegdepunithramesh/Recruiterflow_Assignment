import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import sampleData from '../../data/sample-data.json'
import { isExpenseArray } from '../../utils/persistence'
import type { Expense } from './expenseTypes'

function sampleExpensesFromData(): Expense[] {
  if (!isExpenseArray(sampleData.expenses)) {
    throw new Error('Bundled sample expenses are structurally invalid')
  }

  return sampleData.expenses
}

export const sampleExpenses = sampleExpensesFromData()

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: sampleExpenses,
  reducers: {
    initializeExpenses: (_state, action: PayloadAction<readonly Expense[]>) => [...action.payload],
    addExpense: (state, action: PayloadAction<Expense>) => {
      state.push(action.payload)
    },
    deleteExpense: (state, action: PayloadAction<string>) =>
      state.filter((expense) => expense.id !== action.payload),
  },
})

export const { initializeExpenses, addExpense, deleteExpense } = expensesSlice.actions
export default expensesSlice.reducer
