import { describe, expect, it } from 'vitest'
import type { Expense, ExpenseSplit, Member } from '../features/expenses/expenseTypes'
import { calculateBalances } from '../utils/balances'
import { formatPaise, parseRupees } from '../utils/money'

const members: Member[] = [
  { id: 'm1', name: 'Aarav' },
  { id: 'm2', name: 'Diya' },
  { id: 'm3', name: 'Kabir' },
  { id: 'm4', name: 'Meera' },
  { id: 'm5', name: 'Rohan' },
]

function expense(id: string, amount: number, paidBy: string, split: ExpenseSplit): Expense {
  return {
    id,
    description: `Expense ${id}`,
    amount,
    paidBy,
    date: '2026-03-12',
    category: 'Other',
    split,
  }
}

describe('balances', () => {
  it('counts the payer when they are included in the split', () => {
    const balances = calculateBalances(
      [expense('e1', 10000, 'm1', { type: 'equal', memberIds: ['m1', 'm2'] })],
      members,
    )

    expect(balances).toEqual({ m1: 5000, m2: -5000, m3: 0, m4: 0, m5: 0 })
  })

  it('counts the full amount when the payer is excluded from the split', () => {
    const balances = calculateBalances(
      [expense('e1', 10000, 'm4', { type: 'equal', memberIds: ['m1', 'm2', 'm3'] })],
      members,
    )

    expect(balances).toEqual({ m1: -3334, m2: -3333, m3: -3333, m4: 10000, m5: 0 })
  })

  it('accumulates several expenses with different split types', () => {
    const expenses = [
      expense('e1', 10000, 'm1', { type: 'equal', memberIds: ['m1', 'm2'] }),
      expense('e2', 9000, 'm2', { type: 'exact', shares: { m2: 4500, m3: 4500 } }),
    ]

    expect(calculateBalances(expenses, members)).toEqual({
      m1: 5000,
      m2: -500,
      m3: -4500,
      m4: 0,
      m5: 0,
    })
  })

  it('sums all balances to exactly zero', () => {
    const expenses = [
      expense('e1', 149999, 'm1', {
        type: 'percent',
        shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
      }),
      expense('e2', 10000, 'm2', { type: 'equal', memberIds: ['m1', 'm2', 'm3'] }),
      expense('e3', 75000, 'm4', { type: 'exact', shares: { m4: 25000, m5: 50000 } }),
    ]

    const balances = calculateBalances(expenses, members)

    expect(Object.values(balances).reduce((sum, balance) => sum + balance, 0)).toBe(0)
  })

  it('includes members with a zero balance', () => {
    const balances = calculateBalances(
      [expense('e1', 10000, 'm1', { type: 'equal', memberIds: ['m1', 'm2'] })],
      members,
    )

    expect(Object.keys(balances)).toEqual(members.map((member) => member.id))
    expect(balances.m5).toBe(0)
  })

  it('rejects an unknown payer', () => {
    expect(() =>
      calculateBalances(
        [expense('e1', 10000, 'm9', { type: 'equal', memberIds: ['m1', 'm2'] })],
        members,
      ),
    ).toThrow(/unknown payer/i)
  })
})

describe('money utilities', () => {
  it('parses ₹1,250.50 into 125050 paise', () => {
    expect(parseRupees('₹1,250.50')).toBe(125050)
    expect(parseRupees('1250.5')).toBe(125050)
    expect(parseRupees('1,00,000.00')).toBe(10000000)
  })

  it('formats paise in Indian currency format with two decimals', () => {
    expect(formatPaise(100000000)).toBe('₹10,00,000.00')
    expect(formatPaise(125050)).toBe('₹1,250.50')
    expect(formatPaise(1)).toBe('₹0.01')
  })

  it('formats negative balances and round-trips through the parser', () => {
    expect(formatPaise(-125050)).toBe('-₹1,250.50')
    expect(parseRupees(formatPaise(125050))).toBe(125050)
  })

  it('rejects invalid monetary input', () => {
    expect(() => parseRupees('')).toThrow(/invalid/i)
    expect(() => parseRupees('abc')).toThrow(/invalid/i)
    expect(() => parseRupees('1e3')).toThrow(/invalid/i)
    expect(() => parseRupees('₹1,00,00')).toThrow(/invalid/i)
  })

  it('rejects more than two decimal places', () => {
    expect(() => parseRupees('12.345')).toThrow(/invalid/i)
  })

  it('rejects negative amounts', () => {
    expect(() => parseRupees('-100')).toThrow(/invalid/i)
  })
})
