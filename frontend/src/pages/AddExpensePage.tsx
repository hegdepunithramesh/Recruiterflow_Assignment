import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { selectAllMembers } from '../features/expenses/expenseSelectors'
import { addExpense } from '../features/expenses/expensesSlice'
import type { Expense, ExpenseSplit } from '../features/expenses/expenseTypes'
import { formatPaise, parseRupees } from '../utils/money'
import { calculateShares } from '../utils/split'
import {
  amountInPaise,
  exactAllocation,
  formatUnits,
  hasErrors,
  isExpenseCategory,
  percentAllocation,
  todayISODate,
  validateExpenseForm,
} from '../utils/validation'
import type { ExpenseFormValues, FormErrors } from '../utils/validation'

function initialValues(memberIds: readonly string[]): ExpenseFormValues {
  const shares: Record<string, string> = {}

  for (const id of memberIds) {
    shares[id] = ''
  }

  return {
    description: '',
    amount: '',
    paidBy: '',
    date: '',
    category: '',
    splitType: 'equal',
    selectedMemberIds: [],
    exactAmounts: { ...shares },
    percentages: { ...shares },
  }
}

function createExpenseId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) {
    return null
  }

  return (
    <p id={id} className="field__error">
      {message}
    </p>
  )
}

export function AddExpensePage() {
  const members = useAppSelector(selectAllMembers)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [values, setValues] = useState<ExpenseFormValues>(() =>
    initialValues(members.map((member) => member.id)),
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const submittedRef = useRef(false)

  const amountPaise = amountInPaise(values.amount)
  const exact = exactAllocation(values.exactAmounts, members)
  const percent = percentAllocation(values.percentages, members)

  function update<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function toggleMember(id: string) {
    setValues((current) => ({
      ...current,
      selectedMemberIds: current.selectedMemberIds.includes(id)
        ? current.selectedMemberIds.filter((memberId) => memberId !== id)
        : [...current.selectedMemberIds, id],
    }))
  }

  function setExactAmount(id: string, value: string) {
    setValues((current) => ({
      ...current,
      exactAmounts: { ...current.exactAmounts, [id]: value },
    }))
  }

  function setPercentage(id: string, value: string) {
    setValues((current) => ({
      ...current,
      percentages: { ...current.percentages, [id]: value },
    }))
  }

  function splitHint(): string {
    if (values.splitType === 'equal') {
      return 'Split equally between the selected members. Any leftover paisa goes to the first selected member in trip order.'
    }

    if (values.splitType === 'exact') {
      if (amountPaise === null) {
        return 'Enter an amount to see how much is left to assign.'
      }

      const difference = amountPaise - exact.total

      if (difference > 0) {
        return `${formatPaise(difference)} left to assign`
      }

      if (difference < 0) {
        return `${formatPaise(-difference)} over-assigned`
      }

      return 'Fully assigned.'
    }

    const difference = 10_000 - percent.totalUnits

    if (difference > 0) {
      return `${formatUnits(difference)}% left to assign`
    }

    if (difference < 0) {
      return `${formatUnits(-difference)}% over-assigned`
    }

    return '100% assigned.'
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (submittedRef.current) {
      return
    }

    submittedRef.current = true

    const nextErrors = validateExpenseForm(values, members, todayISODate())
    setErrors(nextErrors)

    if (hasErrors(nextErrors)) {
      submittedRef.current = false
      return
    }

    let amount: number

    try {
      amount = parseRupees(values.amount.trim())
    } catch {
      submittedRef.current = false
      return
    }

    if (!isExpenseCategory(values.category)) {
      submittedRef.current = false
      return
    }

    let split: ExpenseSplit

    if (values.splitType === 'equal') {
      const selectedIds = members
        .filter((member) => values.selectedMemberIds.includes(member.id))
        .map((member) => member.id)

      split = { type: 'equal', memberIds: selectedIds }
    } else if (values.splitType === 'exact') {
      split = { type: 'exact', shares: exact.paise }
    } else {
      split = { type: 'percent', shares: percent.values }
    }

    const expense: Expense = {
      id: createExpenseId(),
      description: values.description.trim(),
      amount,
      paidBy: values.paidBy,
      date: values.date,
      category: values.category,
      split,
    }

    try {
      calculateShares(expense, members)
    } catch (error) {
      setErrors({
        ...nextErrors,
        split: error instanceof Error ? error.message : 'Invalid split allocation',
      })
      submittedRef.current = false
      return
    }

    dispatch(addExpense(expense))
    navigate('/', { state: { message: 'Expense added successfully.' } })
  }

  return (
    <>
      <div className="page-header">
        <p className="eyebrow">New entry</p>
        <h1>Add expense</h1>
        <p className="subtitle">Record a shared cost and choose how to split it.</p>
      </div>

      <form className="expense-form" onSubmit={handleSubmit} noValidate>
        <section className="form-section" aria-labelledby="details-heading">
          <h2 id="details-heading" className="form-section__title">
            Expense details
          </h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              value={values.description}
              onChange={(event) => update('description', event.target.value)}
              aria-invalid={errors.description !== undefined}
              aria-describedby={errors.description === undefined ? undefined : 'description-error'}
            />
            <FieldError id="description-error" message={errors.description} />
          </div>

          <div className="field field--amount">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={values.amount}
              onChange={(event) => update('amount', event.target.value)}
              aria-invalid={errors.amount !== undefined}
              aria-describedby={errors.amount === undefined ? undefined : 'amount-error'}
            />
            <FieldError id="amount-error" message={errors.amount} />
          </div>
          </div>
        </section>

        <section className="form-section" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="form-section__title">
            Payment details
          </h2>
          <div className="form-grid">
          <div className="field">
            <label htmlFor="paidBy">Paid by</label>
            <select
              id="paidBy"
              value={values.paidBy}
              onChange={(event) => update('paidBy', event.target.value)}
              aria-invalid={errors.paidBy !== undefined}
              aria-describedby={errors.paidBy === undefined ? undefined : 'paidBy-error'}
            >
              <option value="">Select a member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <FieldError id="paidBy-error" message={errors.paidBy} />
          </div>

          <div className="field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={values.date}
              onChange={(event) => update('date', event.target.value)}
              aria-invalid={errors.date !== undefined}
              aria-describedby={errors.date === undefined ? undefined : 'date-error'}
            />
            <FieldError id="date-error" message={errors.date} />
          </div>

          <div className="field field--wide">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={values.category}
              onChange={(event) => update('category', event.target.value)}
              aria-invalid={errors.category !== undefined}
              aria-describedby={errors.category === undefined ? undefined : 'category-error'}
            >
              <option value="">Select a category</option>
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Stay">Stay</option>
              <option value="Activities">Activities</option>
              <option value="Other">Other</option>
            </select>
            <FieldError id="category-error" message={errors.category} />
          </div>
          </div>
        </section>

        <section className="form-section" aria-labelledby="split-heading">
          <h2 id="split-heading" className="form-section__title">
            Split configuration
          </h2>
          <fieldset className="field field--wide">
            <legend>Split type</legend>
            <div className="split-options">
              <label
                className={
                  values.splitType === 'equal'
                    ? 'split-option split-option--active'
                    : 'split-option'
                }
              >
                <input
                  type="radio"
                  name="splitType"
                  value="equal"
                  checked={values.splitType === 'equal'}
                  onChange={() => update('splitType', 'equal')}
                />
                Equal
              </label>
              <label
                className={
                  values.splitType === 'exact'
                    ? 'split-option split-option--active'
                    : 'split-option'
                }
              >
                <input
                  type="radio"
                  name="splitType"
                  value="exact"
                  checked={values.splitType === 'exact'}
                  onChange={() => update('splitType', 'exact')}
                />
                Exact amounts
              </label>
              <label
                className={
                  values.splitType === 'percent'
                    ? 'split-option split-option--active'
                    : 'split-option'
                }
              >
                <input
                  type="radio"
                  name="splitType"
                  value="percent"
                  checked={values.splitType === 'percent'}
                  onChange={() => update('splitType', 'percent')}
                />
                Percentages
              </label>
            </div>
          </fieldset>

          <div className="split-panel">
          {values.splitType === 'equal' && (
            <fieldset className="field">
              <legend>Members</legend>
              <div className="member-grid">
                {members.map((member) => (
                  <label className="check" key={member.id}>
                    <input
                      type="checkbox"
                      checked={values.selectedMemberIds.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                    />
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {values.splitType === 'exact' && (
            <div className="member-grid">
              {members.map((member) => (
                <div className="field" key={member.id}>
                  <label htmlFor={`exact-${member.id}`}>{member.name} amount</label>
                  <input
                    id={`exact-${member.id}`}
                    type="text"
                    inputMode="decimal"
                    value={values.exactAmounts[member.id] ?? ''}
                    onChange={(event) => setExactAmount(member.id, event.target.value)}
                    aria-invalid={errors.shareErrors?.[member.id] !== undefined}
                    aria-describedby={
                      errors.shareErrors?.[member.id] === undefined
                        ? undefined
                        : `exact-error-${member.id}`
                    }
                  />
                  <FieldError
                    id={`exact-error-${member.id}`}
                    message={errors.shareErrors?.[member.id]}
                  />
                </div>
              ))}
            </div>
          )}

          {values.splitType === 'percent' && (
            <div className="member-grid">
              {members.map((member) => (
                <div className="field" key={member.id}>
                  <label htmlFor={`percent-${member.id}`}>{member.name} percentage</label>
                  <input
                    id={`percent-${member.id}`}
                    type="number"
                    step="0.01"
                    value={values.percentages[member.id] ?? ''}
                    onChange={(event) => setPercentage(member.id, event.target.value)}
                    aria-invalid={errors.shareErrors?.[member.id] !== undefined}
                    aria-describedby={
                      errors.shareErrors?.[member.id] === undefined
                        ? undefined
                        : `percent-error-${member.id}`
                    }
                  />
                  <FieldError
                    id={`percent-error-${member.id}`}
                    message={errors.shareErrors?.[member.id]}
                  />
                </div>
              ))}
            </div>
          )}

          <p className="field__hint split-status" aria-live="polite">
            {splitHint()}
          </p>
          <FieldError id="split-error" message={errors.split} />
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Save expense
          </button>
          <button type="button" className="btn" onClick={() => navigate('/')}>
            Cancel
          </button>
        </div>
      </form>
    </>
  )
}
