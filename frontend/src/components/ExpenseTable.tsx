import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Expense, ExpenseSplit, Member } from '../features/expenses/expenseTypes'
import { formatPaise } from '../utils/money'

interface ExpenseTableProps {
  expenses: readonly Expense[]
  members: readonly Member[]
  onDelete: (id: string) => void
}

function participantCount(split: ExpenseSplit): number {
  switch (split.type) {
    case 'equal':
      return split.memberIds.length
    case 'exact':
    case 'percent':
      return Object.keys(split.shares).length
  }
}

function splitLabel(split: ExpenseSplit): string {
  const count = participantCount(split)
  const noun = count === 1 ? 'person' : 'people'

  switch (split.type) {
    case 'equal':
      return `Equally, ${count} ${noun}`
    case 'exact':
      return `Exact amounts, ${count} ${noun}`
    case 'percent':
      return `Percentages, ${count} ${noun}`
  }
}

function payerName(paidBy: string, members: readonly Member[]): string {
  return members.find((member) => member.id === paidBy)?.name ?? 'Unknown member'
}

interface ConfirmDeleteDialogProps {
  description: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDeleteDialog({ description, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onCancel()
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const first = cancelRef.current
    const second = confirmRef.current

    if (first === null || second === null) {
      return
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      second.focus()
    } else if (!event.shiftKey && document.activeElement === second) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-backdrop" onKeyDown={handleKeyDown}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <h3 id="delete-dialog-title">Delete expense</h3>
        <p id="delete-dialog-description">Delete “{description}”? This cannot be undone.</p>
        <div className="dialog__actions">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" className="btn btn--danger" onClick={onConfirm}>
            Delete expense
          </button>
        </div>
      </div>
    </div>
  )
}

export function ExpenseTable({ expenses, members, onDelete }: ExpenseTableProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const sorted = [...expenses].sort((left, right) => right.date.localeCompare(left.date))
  const pendingExpense = sorted.find((expense) => expense.id === pendingId)

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Description</th>
              <th scope="col">Category</th>
              <th scope="col">Paid by</th>
              <th scope="col" className="amount">
                Amount
              </th>
              <th scope="col">Split</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((expense) => (
              <tr key={expense.id}>
                <td className="date-cell">{expense.date}</td>
                <td>{expense.description}</td>
                <td className="category">{expense.category}</td>
                <td>{payerName(expense.paidBy, members)}</td>
                <td className="amount">{formatPaise(expense.amount)}</td>
                <td>{splitLabel(expense.split)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn--danger"
                    aria-label={`Delete ${expense.description}`}
                    onClick={() => setPendingId(expense.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pendingExpense !== undefined && (
        <ConfirmDeleteDialog
          description={pendingExpense.description}
          onCancel={() => setPendingId(null)}
          onConfirm={() => {
            onDelete(pendingExpense.id)
            setPendingId(null)
          }}
        />
      )}
    </>
  )
}
