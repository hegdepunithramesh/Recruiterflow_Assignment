import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

// Placeholder smoke test. Replace with AddExpensePage tests when the page exists.
describe('AddExpensePage test placeholder', () => {
  it('renders through React Testing Library in jsdom', () => {
    render(<p>tooling smoke test</p>)

    expect(screen.getByText('tooling smoke test')).toBeInTheDocument()
  })
})
