import { describe, expect, it } from 'vitest'
import type { Expense, ExpenseSplit, Member } from '../features/expenses/expenseTypes'
import { calculateShares } from '../utils/split'

const members: Member[] = [
  { id: 'm1', name: 'Aarav' },
  { id: 'm2', name: 'Diya' },
  { id: 'm3', name: 'Kabir' },
  { id: 'm4', name: 'Meera' },
  { id: 'm5', name: 'Rohan' },
]

function expense(amount: number, split: ExpenseSplit): Expense {
  return {
    id: 'e1',
    description: 'Test expense',
    amount,
    paidBy: 'm1',
    date: '2026-03-12',
    category: 'Other',
    split,
  }
}

function total(shares: Record<string, number>): number {
  return Object.values(shares).reduce((sum, share) => sum + share, 0)
}

describe('equal split', () => {
  it('splits ₹100 between three members with the extra paisa going to the first in trip order', () => {
    const shares = calculateShares(
      expense(10000, { type: 'equal', memberIds: ['m1', 'm2', 'm3'] }),
      members,
    )

    expect(shares).toEqual({ m1: 3334, m2: 3333, m3: 3333 })
    expect(total(shares)).toBe(10000)
  })

  it('uses trip order rather than the order of memberIds', () => {
    const shares = calculateShares(
      expense(10000, { type: 'equal', memberIds: ['m3', 'm1', 'm5'] }),
      members,
    )

    expect(shares).toEqual({ m1: 3334, m3: 3333, m5: 3333 })
  })

  it('splits ₹100 exactly between five members', () => {
    const shares = calculateShares(
      expense(10000, { type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'] }),
      members,
    )

    expect(shares).toEqual({ m1: 2000, m2: 2000, m3: 2000, m4: 2000, m5: 2000 })
  })

  it('rejects an empty member selection', () => {
    expect(() =>
      calculateShares(expense(10000, { type: 'equal', memberIds: [] }), members),
    ).toThrow(/at least one member/i)
  })

  it('rejects unknown member ids', () => {
    expect(() =>
      calculateShares(expense(10000, { type: 'equal', memberIds: ['m1', 'm9'] }), members),
    ).toThrow(/unknown/i)
  })
})

describe('exact split', () => {
  it('uses the provided paise shares', () => {
    const shares = calculateShares(
      expense(75000, { type: 'exact', shares: { m2: 50000, m3: 25000 } }),
      members,
    )

    expect(shares).toEqual({ m2: 50000, m3: 25000 })
  })

  it('rejects shares that exceed the expense amount', () => {
    expect(() =>
      calculateShares(expense(75000, { type: 'exact', shares: { m2: 50000, m3: 30000 } }), members),
    ).toThrow(/total/i)
  })

  it('rejects shares that fall below the expense amount', () => {
    expect(() =>
      calculateShares(expense(75000, { type: 'exact', shares: { m2: 50000, m3: 20000 } }), members),
    ).toThrow(/total/i)
  })

  it('rejects negative paise shares', () => {
    expect(() =>
      calculateShares(expense(75000, { type: 'exact', shares: { m2: 80000, m3: -5000 } }), members),
    ).toThrow(/non-negative/i)
  })

  it('rejects fractional paise shares', () => {
    expect(() =>
      calculateShares(expense(10000, { type: 'exact', shares: { m1: 5000.5, m2: 4999.5 } }), members),
    ).toThrow(/integer paise/i)
  })

  it('rejects unknown member ids in shares', () => {
    expect(() =>
      calculateShares(expense(10000, { type: 'exact', shares: { m9: 10000 } }), members),
    ).toThrow(/unknown/i)
  })
})

describe('percent split', () => {
  it('allocates a simple 60/40 split', () => {
    const shares = calculateShares(
      expense(10000, { type: 'percent', shares: { m1: 60, m2: 40 } }),
      members,
    )

    expect(shares).toEqual({ m1: 6000, m2: 4000 })
  })

  it('allocates 33.33%, 33.33%, 33.34% of ₹100 using largest remainders', () => {
    const shares = calculateShares(
      expense(10000, { type: 'percent', shares: { m1: 33.33, m2: 33.33, m3: 33.34 } }),
      members,
    )

    expect(shares).toEqual({ m1: 3333, m2: 3333, m3: 3334 })
    expect(total(shares)).toBe(10000)
  })

  it('allocates exactly the expense amount for an awkward paise total', () => {
    const shares = calculateShares(
      expense(149999, { type: 'percent', shares: { m1: 33.33, m2: 33.33, m3: 33.34 } }),
      members,
    )

    expect(shares).toEqual({ m1: 49995, m2: 49995, m3: 50009 })
    expect(total(shares)).toBe(149999)
  })

  it('breaks remainder ties using trip order', () => {
    const shares = calculateShares(
      expense(1, { type: 'percent', shares: { m2: 50, m1: 50 } }),
      members,
    )

    expect(shares).toEqual({ m1: 1, m2: 0 })
  })

  it('rejects percentages that do not total 100', () => {
    expect(() =>
      calculateShares(expense(10000, { type: 'percent', shares: { m1: 60, m2: 30 } }), members),
    ).toThrow(/total 100/i)
  })

  it('rejects percentages outside 0–100', () => {
    expect(() =>
      calculateShares(expense(10000, { type: 'percent', shares: { m1: 101, m2: 0 } }), members),
    ).toThrow(/invalid percentage/i)

    expect(() =>
      calculateShares(expense(10000, { type: 'percent', shares: { m1: -1, m2: 101 } }), members),
    ).toThrow(/invalid percentage/i)
  })

  it('rejects more than two decimal places', () => {
    expect(() =>
      calculateShares(
        expense(10000, { type: 'percent', shares: { m1: 33.333, m2: 66.667 } }),
        members,
      ),
    ).toThrow(/invalid percentage/i)
  })

  it('rejects unknown member ids in shares', () => {
    expect(() =>
      calculateShares(expense(10000, { type: 'percent', shares: { m9: 100 } }), members),
    ).toThrow(/unknown/i)
  })
})
