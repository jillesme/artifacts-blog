import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'

function todayLine(): string {
  const d = new Date()
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' })
  const month = d.toLocaleDateString(undefined, { month: 'long' })
  const day = d.getDate()
  const year = d.getFullYear()
  return `${weekday}, ${month} ${day}, ${year}`
}

export default function Header() {
  return (
    <header className="masthead px-4">
      {/* ── Top eyebrow: dateline · edition · weather (NYT-style) ──────── */}
      <div className="measure-wide hidden items-center justify-between border-b border-[var(--rule-soft)] py-2 text-[11px] sm:flex">
        <p className="smallcaps m-0 !text-[10px]">
          Vol. I &nbsp;·&nbsp; No. 01 &nbsp;·&nbsp; {todayLine()}
        </p>
        <p className="smallcaps m-0 !text-[10px]">
          Edge edition &nbsp;·&nbsp; Pushed continuously
        </p>
      </div>

      {/* ── Nameplate ─────────────────────────────────────────────────── */}
      <div className="measure-wide flex flex-col items-center gap-2 pt-6 text-center sm:pt-7">
        <p className="kicker">The Git-Backed Broadsheet</p>
        <Link
          to="/"
          aria-label="The Cloudflare Artifacts — home"
          className="nameplate text-[clamp(2.4rem,7.2vw,4.8rem)] no-underline"
        >
          The <em>Cloudflare</em> Artifacts
        </Link>
        <p className="smallcaps mt-1">
          Every entry is a real Git repository · est. MMXXVI
        </p>
      </div>

      <div className="measure-wide mt-5">
        <div className="double-rule" />
      </div>

      {/* ── Section nav ──────────────────────────────────────────────── */}
      <div className="measure-wide flex items-center justify-between gap-4 py-3">
        <nav
          aria-label="Primary"
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
        >
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
            activeOptions={{ exact: true }}
          >
            Front Page
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

      <div className="measure-wide">
        <div className="rule" />
      </div>
    </header>
  )
}
