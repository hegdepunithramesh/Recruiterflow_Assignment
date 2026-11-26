import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { AddExpensePage } from '../pages/AddExpensePage'
import { ExpensesPage } from '../pages/ExpensesPage'
import { NotFoundPage } from '../pages/NotFoundPage'

/** Exported without BrowserRouter so tests can supply a MemoryRouter. */
export function AppShell() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="shell">
        <Routes>
          <Route path="/" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<AddExpensePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
