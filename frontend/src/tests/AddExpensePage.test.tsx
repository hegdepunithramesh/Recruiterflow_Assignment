import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../app/router'
import { createAppStore } from '../app/store'
import { STORAGE_KEY } from '../utils/persistence'

function renderForm() {
  const store = createAppStore()
  const user = userEvent.setup()

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/expenses/new']}>
        <AppShell />
      </MemoryRouter>
    </Provider>,
  )

  return { store, user }
}

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Description'), 'Team lunch')
  await user.type(screen.getByLabelText('Amount'), '100')
  await user.selectOptions(screen.getByLabelText('Paid by'), 'm1')
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-10' } })
  await user.selectOptions(screen.getByLabelText('Category'), 'Food')
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

describe('add expense form', () => {
  it('renders all three split types', async () => {
    const { user } = renderForm()

    expect(screen.getByLabelText('Equal')).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Aarav' })).toBeInTheDocument()

    await user.click(screen.getByLabelText('Exact amounts'))
    expect(screen.getByLabelText('Aarav amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Rohan amount')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Percentages'))
    expect(screen.getByLabelText('Aarav percentage')).toBeInTheDocument()
    expect(screen.getByLabelText('Rohan percentage')).toBeInTheDocument()
  })

  it('shows multiple field errors with accessible associations on an invalid submit', async () => {
    const { user } = renderForm()

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(screen.getByText('Paid by is required')).toBeInTheDocument()
    expect(screen.getByText('Date is required')).toBeInTheDocument()
    expect(screen.getByText('Category is required')).toBeInTheDocument()
    expect(screen.getByText('Select at least one member')).toBeInTheDocument()

    const description = screen.getByLabelText('Description')
    expect(description).toHaveAttribute('aria-invalid', 'true')
    expect(description).toHaveAttribute('aria-describedby', 'description-error')
    expect(screen.getByText('Description is required')).toHaveAttribute('id', 'description-error')
  })

  it('preserves entered values when validation fails', async () => {
    const { user } = renderForm()

    await user.type(screen.getByLabelText('Description'), 'Keep this text')
    await user.type(screen.getByLabelText('Amount'), '100')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByLabelText('Description')).toHaveValue('Keep this text')
    expect(screen.getByLabelText('Amount')).toHaveValue('100')
  })

  it('shows a running exact total and a running percentage total', async () => {
    const { user } = renderForm()

    await user.type(screen.getByLabelText('Amount'), '100')
    await user.click(screen.getByLabelText('Exact amounts'))
    await user.type(screen.getByLabelText('Aarav amount'), '87.50')
    expect(screen.getByText('₹12.50 left to assign')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Percentages'))
    await user.type(screen.getByLabelText('Aarav percentage'), '90')
    expect(screen.getByText('10% left to assign')).toBeInTheDocument()
  })

  it('saves a valid equal split, navigates to Expenses and shows the success message', async () => {
    const { user, store } = renderForm()

    await fillCommonFields(user)
    await user.click(screen.getByRole('checkbox', { name: 'Aarav' }))
    await user.click(screen.getByRole('checkbox', { name: 'Diya' }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByText('Expense added successfully.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Expenses', level: 1 })).toBeInTheDocument()
    expect(store.getState().expenses).toHaveLength(7)

    const added = store.getState().expenses[6]
    expect(added.description).toBe('Team lunch')
    expect(added.amount).toBe(10000)
    expect(added.split).toEqual({ type: 'equal', memberIds: ['m1', 'm2'] })
  })

  it('saves a valid exact split', async () => {
    const { user, store } = renderForm()

    await fillCommonFields(user)
    await user.click(screen.getByLabelText('Exact amounts'))
    await user.type(screen.getByLabelText('Aarav amount'), '60')
    await user.type(screen.getByLabelText('Diya amount'), '40')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(store.getState().expenses).toHaveLength(7)
    expect(store.getState().expenses[6].split).toEqual({
      type: 'exact',
      shares: { m1: 6000, m2: 4000, m3: 0, m4: 0, m5: 0 },
    })
  })

  it('saves a valid percentage split', async () => {
    const { user, store } = renderForm()

    await fillCommonFields(user)
    await user.click(screen.getByLabelText('Percentages'))
    await user.type(screen.getByLabelText('Aarav percentage'), '60')
    await user.type(screen.getByLabelText('Diya percentage'), '40')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(store.getState().expenses).toHaveLength(7)
    expect(store.getState().expenses[6].split).toEqual({
      type: 'percent',
      shares: { m1: 60, m2: 40, m3: 0, m4: 0, m5: 0 },
    })
  })

  it('does not save anything when the form is cancelled', async () => {
    const { user, store } = renderForm()

    await fillCommonFields(user)
    await user.click(screen.getByRole('checkbox', { name: 'Aarav' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('heading', { name: 'Expenses', level: 1 })).toBeInTheDocument()
    expect(screen.queryByText('Expense added successfully.')).not.toBeInTheDocument()
    expect(store.getState().expenses).toHaveLength(6)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
