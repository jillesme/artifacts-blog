import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="masthead px-4">
      <div className="measure-wide flex flex-col gap-3 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:py-6">
        <Link
          to="/"
          className="group flex items-baseline gap-3 no-underline"
          aria-label="Artifacts Blog — home"
        >
          <span
            className="display text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-[28px]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30' }}
          >
            Artifacts
          </span>
          <span className="smallcaps hidden sm:inline">
            · a git-backed blog
          </span>
        </Link>

        <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
          <nav
            aria-label="Primary"
            className="flex items-center gap-5 text-sm sm:gap-6"
          >
            <Link
              to="/"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
              activeOptions={{ exact: true }}
            >
              Index
            </Link>
            <Link
              to="/new"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Compose
            </Link>
            <Link
              to="/about"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Colophon
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
      <div className="measure-wide">
        <div className="double-rule" />
      </div>
    </header>
  )
}
