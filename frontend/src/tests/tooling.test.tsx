import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('frontend tooling', () => {
  it('renders a component in jsdom with React Testing Library', () => {
    render(<p>vitest is configured</p>)

    expect(screen.getByText('vitest is configured')).toBeInTheDocument()
  })
})
