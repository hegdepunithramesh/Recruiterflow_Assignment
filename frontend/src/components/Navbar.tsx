import { Link, NavLink } from 'react-router-dom'

function linkClass(isActive: boolean, isAdd = false): string {
  const classes = isAdd ? 'nav__link nav__link--add' : 'nav__link'
  return isActive ? `${classes} nav__link--active` : classes
}

export function Navbar() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          TRIP / LEDGER
        </Link>
        <nav aria-label="Primary">
          <ul className="nav__list">
            <li>
              <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
                Expenses
              </NavLink>
            </li>
            <li>
              <NavLink to="/expenses/new" className={({ isActive }) => linkClass(isActive, true)}>
                Add expense
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
