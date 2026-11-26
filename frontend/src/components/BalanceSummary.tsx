import { useMemo } from 'react'
import { useAppSelector } from '../app/hooks'
import { selectAllExpenses, selectAllMembers } from '../features/expenses/expenseSelectors'
import { calculateBalances } from '../utils/balances'
import { formatPaise } from '../utils/money'

function balanceText(balance: number): string {
  if (balance > 0) {
    return `Gets back ${formatPaise(balance)}`
  }

  if (balance < 0) {
    return `Owes ${formatPaise(Math.abs(balance))}`
  }

  return 'Settled up'
}

function balanceClass(balance: number): string {
  if (balance > 0) {
    return 'balance-card__value--positive'
  }

  if (balance < 0) {
    return 'balance-card__value--negative'
  }

  return 'balance-card__value--zero'
}

export function BalanceSummary() {
  const members = useAppSelector(selectAllMembers)
  const expenses = useAppSelector(selectAllExpenses)

  // Derived from all expenses, never stored in Redux and never affected by the filter.
  const balances = useMemo(() => calculateBalances(expenses, members), [expenses, members])
  const totalPaise = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  )

  return (
    <section className="balances" aria-labelledby="balances-heading">
      <div className="section-head">
        <div>
          <h2 id="balances-heading">Balances</h2>
          <p className="section-note">Across the whole trip</p>
        </div>
        <p className="overview-total">
          <span className="overview-total__label">Total spent</span>
          <strong>{formatPaise(totalPaise)}</strong>
        </p>
      </div>
      <ul className="balance-grid">
        {members.map((member) => {
          const balance = balances[member.id]

          return (
            <li className="balance-card" key={member.id}>
              <span className="balance-card__name">{member.name}</span>
              <span className={`balance-card__value ${balanceClass(balance)}`}>
                {balanceText(balance)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
