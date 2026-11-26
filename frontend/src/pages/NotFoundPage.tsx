import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="placeholder">
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <Link to="/">Back to Expenses</Link>
    </section>
  )
}
