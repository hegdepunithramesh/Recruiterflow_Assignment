import type { ExactSplit, Expense, Member, PercentSplit } from '../features/expenses/expenseTypes'

/** 100 percentage points, each expressed in hundredths, so 100% = 10,000 units. */
const PERCENT_SCALE = 10_000

function assertValidAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error('Expense amount must be a non-negative integer in paise')
  }
}

/** Trip order decides who receives a leftover paisa, regardless of split order. */
function orderedMembers(members: readonly Member[], selectedIds: readonly string[]): Member[] {
  if (selectedIds.length === 0) {
    throw new Error('At least one member must be selected for a split')
  }

  const selected = new Set(selectedIds)
  const ordered = members.filter((member) => selected.has(member.id))

  if (ordered.length !== selectedIds.length) {
    throw new Error('Split contains an unknown or duplicate member id')
  }

  return ordered
}

function splitEqually(amount: number, selected: readonly Member[]): Record<string, number> {
  const base = Math.floor(amount / selected.length)
  let leftover = amount - base * selected.length
  const shares: Record<string, number> = {}

  for (const member of selected) {
    shares[member.id] = base

    if (leftover > 0) {
      shares[member.id] += 1
      leftover -= 1
    }
  }

  return shares
}

function splitExactly(
  amount: number,
  split: ExactSplit,
  selected: readonly Member[],
): Record<string, number> {
  const shares: Record<string, number> = {}
  let total = 0

  for (const member of selected) {
    const share = split.shares[member.id]

    if (!Number.isSafeInteger(share) || share < 0) {
      throw new Error(`Exact share for ${member.id} must be non-negative integer paise`)
    }

    shares[member.id] = share
    total += share
  }

  if (total !== amount) {
    throw new Error(`Exact shares total ${total} paise but the expense is ${amount} paise`)
  }

  return shares
}

function hasAtMostTwoDecimals(value: number): boolean {
  const text = String(value)
  const decimalIndex = text.indexOf('.')

  return decimalIndex === -1
    ? !text.includes('e')
    : text.length - decimalIndex - 1 <= 2
}

function splitByPercent(
  amount: number,
  split: PercentSplit,
  selected: readonly Member[],
): Record<string, number> {
  if (!Number.isSafeInteger(amount * PERCENT_SCALE)) {
    throw new Error('Expense amount is too large for percentage allocation')
  }

  const units: Record<string, number> = {}
  let totalUnits = 0

  for (const member of selected) {
    const percent = split.shares[member.id]

    if (!Number.isFinite(percent) || percent < 0 || percent > 100 || !hasAtMostTwoDecimals(percent)) {
      throw new Error(`Invalid percentage for ${member.id}: ${percent}`)
    }

    units[member.id] = Math.round(percent * 100)
    totalUnits += units[member.id]
  }

  if (totalUnits !== PERCENT_SCALE) {
    throw new Error(`Percentages must total 100, got ${totalUnits / 100}`)
  }

  const shares: Record<string, number> = {}
  const remainders: Array<{ id: string; remainder: number }> = []
  let allocated = 0

  for (const member of selected) {
    const scaledAmount = amount * units[member.id]
    const share = Math.floor(scaledAmount / PERCENT_SCALE)

    shares[member.id] = share
    allocated += share
    remainders.push({ id: member.id, remainder: scaledAmount - share * PERCENT_SCALE })
  }

  // Largest remainder receives the next paisa; a stable sort keeps trip order on ties.
  const ranked = [...remainders].sort((left, right) => right.remainder - left.remainder)
  let leftover = amount - allocated

  for (const item of ranked) {
    if (leftover === 0) {
      break
    }

    shares[item.id] += 1
    leftover -= 1
  }

  return shares
}

/** Returns integer paise shares for every selected member of an expense. */
export function calculateShares(expense: Expense, members: readonly Member[]): Record<string, number> {
  assertValidAmount(expense.amount)

  switch (expense.split.type) {
    case 'equal': {
      const selected = orderedMembers(members, expense.split.memberIds)
      return splitEqually(expense.amount, selected)
    }
    case 'exact': {
      const selected = orderedMembers(members, Object.keys(expense.split.shares))
      return splitExactly(expense.amount, expense.split, selected)
    }
    case 'percent': {
      const selected = orderedMembers(members, Object.keys(expense.split.shares))
      return splitByPercent(expense.amount, expense.split, selected)
    }
  }
}
