import type { Expense, Member } from '../features/expenses/expenseTypes'
import { calculateShares } from './split'

/** Returns every member's balance in integer paise: paid minus allocated share. */
export function calculateBalances(
  expenses: readonly Expense[],
  members: readonly Member[],
): Record<string, number> {
  const balances: Record<string, number> = {}

  for (const member of members) {
    balances[member.id] = 0
  }

  for (const expense of expenses) {
    if (!Object.hasOwn(balances, expense.paidBy)) {
      throw new Error(`Unknown payer id: ${expense.paidBy}`)
    }

    balances[expense.paidBy] += expense.amount
    const shares = calculateShares(expense, members)

    for (const [memberId, share] of Object.entries(shares)) {
      balances[memberId] -= share
    }
  }

  return balances
}
