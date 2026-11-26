import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../app/router'
import { createAppStore } from '../app/store'
import { ExpenseTable } from '../components/ExpenseTable'
import type { Expense } from '../features/expenses/expenseTypes'
import { initializeExpenses } from '../features/expenses/expensesSlice'
import sampleData from '../data/sample-data.json'

const expenses: Expense[] = [
  {
    id: 'e-old',
    description: 'Old dinner',
    amount: 10000,
    paidBy: 'm1',
    date: '2026-03-10',
    category: 'Food',
    split: { type: 'equal', memberIds: ['m1', 'm2'] },
  },
  {
    id: 'e-mid',
    description: 'Mid cab',
    amount: 20000,
    paidBy: 'm2',
    date: '2026-03-12',
    category: 'Travel',
    split: { type: 'equal', memberIds: ['m2', 'm3'] },
  },
  {
    id: 'e-new',
    description: 'New stay',
    amount: 30000,
    paidBy: 'm3',
    date: '2026-03-15',
    category: 'Stay',
    split: { type: 'equal', memberIds: ['m3', 'm4'] },
  },
]

function renderAt(path: string, data: readonly Expense[] = expenses) {
  const store = createAppStore()
  store.dispatch(initializeExpenses(data))
  const user = userEvent.setup()

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppShell />
      </MemoryRouter>
    </Provider>,
  )

  return { store, user }
}

function tableRows() {
  return within(screen.getByRole('table')).getAllByRole('row')
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

describe('expenses dashboard', () => {
  it('renders all five member balances', () => {
    renderAt('/')

    const summary = within(screen.getByRole('region', { name: 'Balances' }))
    expect(summary.getByText('Aarav')).toBeInTheDocument()
    expect(summary.getByText('Diya')).toBeInTheDocument()
    expect(summary.getByText('Kabir')).toBeInTheDocument()
    expect(summary.getByText('Meera')).toBeInTheDocument()
    expect(summary.getByText('Rohan')).toBeInTheDocument()
    expect(summary.getAllByText('Gets back ₹50.00')).toHaveLength(3)
    expect(summary.getByText('Owes ₹150.00')).toBeInTheDocument()
    expect(summary.getByText('Settled up')).toBeInTheDocument()
  })

  it('lists expenses newest date first', () => {
    renderAt('/')
    const rows = tableRows()

    expect(rows[1]).toHaveTextContent('New stay')
    expect(rows[2]).toHaveTextContent('Mid cab')
    expect(rows[3]).toHaveTextContent('Old dinner')
  })

  it('filters by category and updates the total without changing balances', async () => {
    const { user } = renderAt('/')

    expect(screen.getByLabelText('Total of shown expenses')).toHaveTextContent('₹600.00')

    await user.selectOptions(screen.getByLabelText('Category'), 'Travel')

    expect(tableRows()).toHaveLength(2)
    expect(screen.getByRole('cell', { name: 'Mid cab' })).toBeInTheDocument()
    expect(screen.queryByText('New stay')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Total of shown expenses')).toHaveTextContent('₹200.00')
    expect(screen.getByText('Owes ₹150.00')).toBeInTheDocument()
  })

  it('deletes an expense after confirmation and updates the table, total and balances', async () => {
    const { user, store } = renderAt('/')

    await user.click(screen.getByRole('button', { name: 'Delete New stay' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('New stay')

    await user.click(within(dialog).getByRole('button', { name: 'Delete expense' }))

    expect(screen.queryByText('New stay')).not.toBeInTheDocument()
    expect(store.getState().expenses).toHaveLength(2)
    expect(screen.getByLabelText('Total of shown expenses')).toHaveTextContent('₹300.00')
    expect(screen.getByText('Owes ₹100.00')).toBeInTheDocument()
  })

  it('dismisses the confirmation dialog with Escape and with Cancel', async () => {
    const { user, store } = renderAt('/')

    await user.click(screen.getByRole('button', { name: 'Delete Old dinner' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getState().expenses).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Delete Old dinner' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getState().expenses).toHaveLength(3)
  })

  it('shows a clear state when there are no expenses', () => {
    renderAt('/', [])

    expect(screen.getByText(/No expenses yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Total of shown expenses')).toHaveTextContent('₹0.00')
  })

  it('shows a clear state when no expense matches the selected category', async () => {
    const { user } = renderAt('/', [expenses[0], expenses[1]])

    await user.selectOptions(screen.getByLabelText('Category'), 'Stay')

    expect(screen.getByText(/No expenses in Stay/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Total of shown expenses')).toHaveTextContent('₹0.00')
    expect(screen.getByText('Owes ₹100.00')).toBeInTheDocument()
  })

  it('shows unknown payers without crashing', () => {
    const unknown: Expense = { ...expenses[0], paidBy: 'm-unknown' }

    render(
      <ExpenseTable
        expenses={[unknown]}
        members={sampleData.members}
        onDelete={() => undefined}
      />,
    )

    expect(screen.getByRole('cell', { name: 'Unknown member' })).toBeInTheDocument()
  })
})

describe('routing', () => {
  it('marks Expenses active on the dashboard', () => {
    renderAt('/')

    expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Add expense' })).not.toHaveAttribute('aria-current')
  })

  it('marks Add expense active on the temporary placeholder route', () => {
    renderAt('/expenses/new')

    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText(/add expense form arrives/i)).toBeInTheDocument()
  })

  it('shows Not Found with a link back for unknown routes', async () => {
    const { user } = renderAt('/does-not-exist')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to Expenses' }))

    expect(screen.getByRole('heading', { name: 'Expenses', level: 1 })).toBeInTheDocument()
  })
})
