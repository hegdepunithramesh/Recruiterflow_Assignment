import { Link, NavLink } from 'react-router-dom'

function linkClass(isActive: boolean): string {
  return isActive ? 'nav__link nav__link--active' : 'nav__link'
}

export function Navbar() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          Trip Splitter
        </Link>
        <nav aria-label="Primary">
          <ul className="nav__list">
            <li>
              <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
                Expenses
              </NavLink>
            </li>
            <li>
              <NavLink to="/expenses/new" className={({ isActive }) => linkClass(isActive)}>
                Add expense
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
