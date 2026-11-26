import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { BalanceSummary } from '../components/BalanceSummary'
import { ExpenseTable } from '../components/ExpenseTable'
import type { ExpenseCategory } from '../features/expenses/expenseTypes'
import { selectAllExpenses, selectAllMembers } from '../features/expenses/expenseSelectors'
import { deleteExpense } from '../features/expenses/expensesSlice'
import { formatPaise } from '../utils/money'

const CATEGORIES: readonly ExpenseCategory[] = ['Food', 'Travel', 'Stay', 'Activities', 'Other']
const CATEGORY_VALUES: readonly string[] = CATEGORIES

type CategoryFilter = ExpenseCategory | 'All'

function isCategory(value: string): value is ExpenseCategory {
  return CATEGORY_VALUES.some((category) => category === value)
}

function parseCategoryFilter(value: string): CategoryFilter {
  if (value === 'All') {
    return 'All'
  }

  return isCategory(value) ? value : 'All'
}

function readSuccessMessage(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'message' in state &&
    typeof state.message === 'string'
  ) {
    return state.message
  }

  return null
}

export function ExpensesPage() {
  const expenses = useAppSelector(selectAllExpenses)
  const members = useAppSelector(selectAllMembers)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const [category, setCategory] = useState<CategoryFilter>('All')
  const successMessage = readSuccessMessage(location.state)

  const visibleExpenses = useMemo(
    () =>
      category === 'All'
        ? expenses
        : expenses.filter((expense) => expense.category === category),
    [expenses, category],
  )
  const totalPaise = useMemo(
    () => visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [visibleExpenses],
  )

  return (
    <>
      <div className="page-header">
        <p className="eyebrow">Goa trip · 2026</p>
        <h1>Expenses</h1>
        <p className="subtitle">Shared costs and what everyone is owed.</p>
      </div>

      {successMessage !== null && (
        <p className="notice notice--success" role="status">
          {successMessage}
        </p>
      )}

      <BalanceSummary />

      <section className="expenses-section" aria-labelledby="expenses-heading">
        <div className="section-head">
          <h2 id="expenses-heading">All expenses</h2>
          <div className="filter-field">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => setCategory(parseCategoryFilter(event.target.value))}
            >
              <option value="All">All categories</option>
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="total" aria-label="Total of shown expenses">
          Total shown <strong>{formatPaise(totalPaise)}</strong>
        </p>

        {visibleExpenses.length === 0 ? (
          <p className="empty-state">
            {expenses.length === 0
              ? 'No expenses yet. Add an expense to start tracking the trip.'
              : `No expenses in ${category}.`}
          </p>
        ) : (
          <ExpenseTable
            expenses={visibleExpenses}
            members={members}
            onDelete={(id) => dispatch(deleteExpense(id))}
          />
        )}
      </section>
    </>
  )
}
