export type ExpenseCategory = 'Food' | 'Travel' | 'Stay' | 'Activities' | 'Other'

export interface Member {
  id: string
  name: string
}

export interface EqualSplit {
  type: 'equal'
  memberIds: string[]
}

export interface ExactSplit {
  type: 'exact'
  /** Paise per member id. */
  shares: Record<string, number>
}

export interface PercentSplit {
  type: 'percent'
  /** Percentage per member id, with at most two decimal places. */
  shares: Record<string, number>
}

export type ExpenseSplit = EqualSplit | ExactSplit | PercentSplit

export interface Expense {
  id: string
  description: string
  /** Integer paise, not rupees. */
  amount: number
  /** Member id. */
  paidBy: string
  /** YYYY-MM-DD. */
  date: string
  category: ExpenseCategory
  split: ExpenseSplit
}
