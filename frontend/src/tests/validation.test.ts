import { describe, expect, it } from 'vitest'
import type { Member } from '../features/expenses/expenseTypes'
import {
  amountInPaise,
  exactAllocation,
  hasErrors,
  percentAllocation,
  validateAmount,
  validateCategory,
  validateDate,
  validateDescription,
  validateExpenseForm,
  validatePaidBy,
} from '../utils/validation'
import type { ExpenseFormValues } from '../utils/validation'

const members: Member[] = [
  { id: 'm1', name: 'Aarav' },
  { id: 'm2', name: 'Diya' },
  { id: 'm3', name: 'Kabir' },
  { id: 'm4', name: 'Meera' },
  { id: 'm5', name: 'Rohan' },
]

const today = '2026-03-10'

function form(overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues {
  return {
    description: 'Dinner',
    amount: '100',
    paidBy: 'm1',
    date: '2026-03-10',
    category: 'Food',
    splitType: 'equal',
    selectedMemberIds: ['m1'],
    exactAmounts: {},
    percentages: {},
    ...overrides,
  }
}

describe('description validation', () => {
  it('requires a description and limits it to 60 characters', () => {
    expect(validateDescription('')).toBe('Description is required')
    expect(validateDescription('   ')).toBe('Description is required')
    expect(validateDescription('x'.repeat(61))).toBe('Description must be at most 60 characters')
    expect(validateDescription('x'.repeat(60))).toBeUndefined()
  })
})

describe('amount validation', () => {
  it('requires an amount', () => {
    expect(validateAmount('')).toBe('Amount is required')
  })

  it('rejects zero and negative amounts with the required message', () => {
    expect(validateAmount('0')).toBe('Amount must be more than ₹0')
    expect(validateAmount('-5')).toBe('Amount must be more than ₹0')
  })

  it('rejects amounts above ₹10,00,000', () => {
    expect(validateAmount('1000000')).toBeUndefined()
    expect(validateAmount('1000000.01')).toBe('Amount must be at most ₹10,00,000')
  })

  it('rejects more than two decimal places and parses valid rupees', () => {
    expect(validateAmount('12.345')).toBe('Amount must have at most 2 decimal places')
    expect(validateAmount('abc')).toBe('Enter a valid amount in rupees')
    expect(validateAmount('₹1,250.50')).toBeUndefined()
    expect(amountInPaise('₹1,250.50')).toBe(125050)
  })
})

describe('required selection validation', () => {
  it('validates payer, date and category', () => {
    expect(validatePaidBy('', members)).toBe('Paid by is required')
    expect(validatePaidBy('m9', members)).toBe('Paid by must be a trip member')
    expect(validatePaidBy('m1', members)).toBeUndefined()

    expect(validateDate('', today)).toBe('Date is required')
    expect(validateDate('2026-03-11', today)).toBe('Date cannot be in the future')
    expect(validateDate(today, today)).toBeUndefined()

    expect(validateCategory('')).toBe('Category is required')
    expect(validateCategory('Music')).toBe('Choose a valid category')
    expect(validateCategory('Travel')).toBeUndefined()
  })
})

describe('split validation', () => {
  it('requires at least one selected member for an equal split', () => {
    const errors = validateExpenseForm(form({ selectedMemberIds: [] }), members, today)

    expect(errors.split).toBe('Select at least one member')
  })

  it('reports exact amounts left to assign and over-assigned in paise', () => {
    const below = validateExpenseForm(
      form({ splitType: 'exact', exactAmounts: { m1: '87.50' } }),
      members,
      today,
    )
    expect(below.split).toBe('₹12.50 left to assign')

    const above = validateExpenseForm(
      form({ splitType: 'exact', exactAmounts: { m1: '120' } }),
      members,
      today,
    )
    expect(above.split).toBe('₹20.00 over-assigned')

    const exact = exactAllocation({ m1: '60', m2: '40' }, members)
    expect(exact.total).toBe(10000)
    expect(Object.keys(exact.errors)).toHaveLength(0)
  })

  it('rejects invalid exact amounts per member', () => {
    const errors = validateExpenseForm(
      form({ splitType: 'exact', exactAmounts: { m1: '12.345', m2: '-5' } }),
      members,
      today,
    )

    expect(errors.shareErrors?.m1).toBeDefined()
    expect(errors.shareErrors?.m2).toBeDefined()
  })

  it('reports percentages left to assign and over-assigned', () => {
    const below = validateExpenseForm(
      form({ splitType: 'percent', percentages: { m1: '90' } }),
      members,
      today,
    )
    expect(below.split).toBe('10% left to assign')

    const above = validateExpenseForm(
      form({ splitType: 'percent', percentages: { m1: '60', m2: '50' } }),
      members,
      today,
    )
    expect(above.split).toBe('10% over-assigned')
  })

  it('rejects percentages outside 0–100 or with more than two decimals', () => {
    const allocation = percentAllocation({ m1: '101', m2: '-1', m3: '33.333' }, members)

    expect(allocation.errors.m1).toBeDefined()
    expect(allocation.errors.m2).toBeDefined()
    expect(allocation.errors.m3).toBeDefined()
  })
})

describe('collecting errors', () => {
  it('reports every broken field at once', () => {
    const errors = validateExpenseForm(
      form({
        description: '',
        amount: '',
        paidBy: '',
        date: '',
        category: '',
        selectedMemberIds: [],
      }),
      members,
      today,
    )

    expect(hasErrors(errors)).toBe(true)
    expect(errors.description).toBeDefined()
    expect(errors.amount).toBeDefined()
    expect(errors.paidBy).toBeDefined()
    expect(errors.date).toBeDefined()
    expect(errors.category).toBeDefined()
    expect(errors.split).toBeDefined()
  })

  it('has no errors for a valid form', () => {
    expect(hasErrors(validateExpenseForm(form(), members, today))).toBe(false)
  })
})
