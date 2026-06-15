export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 px-4 pb-16 pt-12 text-[var(--ink-soft)]">
      <div className="measure-wide">
        <div className="double-rule mb-10" />

        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand block */}
          <div>
            <p className="nameplate text-2xl text-[var(--ink)]">
              The <em>Cloudflare</em> Artifacts Wiki
            </p>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed">
              Set in <em>Fraunces</em>, <em>Newsreader</em>, and{' '}
              <em>Inter</em>. Composed on Cloudflare Workers. Each page is
              a real Git repository — edit, revise, fork, clone. Paper is
              optional.
            </p>
          </div>

          {/* Sections */}
          <div>
            <p className="kicker mb-3">Sections</p>
            <ul className="m-0 list-none space-y-2 p-0 text-[15px]">
              <li>
                <a href="/" className="no-underline hover:underline">
                  Index
                </a>
              </li>
              <li>
                <a href="/new" className="no-underline hover:underline">
                  New Page
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="no-underline hover:underline"
                >
                  About
                </a>
              </li>
            </ul>
          </div>

          {/* Edition */}
          <div className="sm:text-right">
            <p className="kicker mb-3">This edition</p>
            <p className="folio m-0">MMXXVI · № {year}</p>
            <p className="byline mt-2 text-sm">
              Artifacts · D1 · TanStack Start
            </p>
            <p
              className="mt-3 inline-block rounded-full border border-[var(--rule)] px-3 py-1 text-[11px]"
              style={{
                fontFamily: 'var(--font-grotesk)',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--cf-orange-deep)',
              }}
            >
              ● Live on the edge
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--rule)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="folio m-0">
            © {year} — All commits the property of their authors.
          </p>
            <p className="folio m-0">"All the knowledge that's fit to push."</p>
        </div>
      </div>
    </footer>
  )
}
