import { configureStore } from '@reduxjs/toolkit'
import type { Middleware } from '@reduxjs/toolkit'
import type { Expense, Member } from '../features/expenses/expenseTypes'
import expensesReducer, {
  addExpense,
  deleteExpense,
  sampleExpenses,
} from '../features/expenses/expensesSlice'
import membersReducer from '../features/members/membersSlice'
import { loadExpenses, saveExpenses } from '../utils/persistence'

export interface RootState {
  members: Member[]
  expenses: Expense[]
}

// Reducers stay pure: persistence is a side effect applied after an action succeeds.
const persistExpenses: Middleware<object, RootState> = (storeApi) => (next) => (action) => {
  const result = next(action)

  if (addExpense.match(action) || deleteExpense.match(action)) {
    saveExpenses(storeApi.getState().expenses)
  }

  return result
}

export function createAppStore() {
  return configureStore({
    reducer: {
      members: membersReducer,
      expenses: expensesReducer,
    },
    preloadedState: {
      expenses: loadExpenses(sampleExpenses),
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(persistExpenses),
  })
}

export const store = createAppStore()

export type AppDispatch = typeof store.dispatch
