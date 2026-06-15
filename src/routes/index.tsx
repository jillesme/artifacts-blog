import { createFileRoute, Link } from '@tanstack/react-router'
import { listPages } from '../server/pages'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => listPages(),
})

function formatDate(ts: number): string {
  return new Date(ts)
    .toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase()
}

function Home() {
  const pages = Route.useLoaderData()

  return (
    <main className="measure-wide px-4 pb-16 pt-8 sm:pt-12">
      {/* ── Cover / lede — clean white editorial, orange used as a typographic
            accent in the kicker tab and the headline italic. ─────────── */}
      <section className="ink-in" aria-labelledby="cover-title">
        <div className="hero-rails">
          <span className="hero-tab">Wiki index</span>
        </div>

        <div className="grid gap-10 pt-10 sm:grid-cols-[1.35fr_1fr] sm:gap-14 sm:pt-14">
          <div>
            <p className="kicker mb-4">Collaborative pages · Revision 01</p>
            <h1
              id="cover-title"
              className="display text-[clamp(2.6rem,7.5vw,5.5rem)] font-semibold text-[var(--ink)]"
            >
              Every page
              <br />
              <em
                className="font-normal italic text-[var(--cf-orange)]"
                style={{
                  fontVariationSettings:
                    '"opsz" 144, "SOFT" 100, "WONK" 1',
                }}
              >
                is a git repo.
              </em>
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/new" className="btn-primary">
                Create a page →
              </Link>
              <Link to="/about" className="btn-ghost">
                About the demo
              </Link>
            </div>
          </div>

          <aside
            className="border-l-2 border-[var(--cf-orange)] pl-6 text-[15px] leading-relaxed text-[var(--ink-soft)] sm:pl-8"
            aria-label="From the maintainers"
          >
            <p className="kicker mb-3">From the maintainers</p>
            <p className="m-0">
              A small experiment. Each wiki page is stored in
              its own Cloudflare Artifacts repository — a real,
              cloneable Git remote. Edits become commits.{' '}
              <em>Forking</em> a page spins up a new repo that diverges
              on its own. Contributors can <code>git clone</code> any page to
              their laptop. Plain text, with every change preserved.
            </p>
            <p className="byline mt-4 text-sm">— The wiki maintainers</p>
          </aside>
        </div>
      </section>

      <div className="triple-rule mt-14" />

      {/* ── Feature columns ──────────────────────────────────────────── */}
      <section className="grid gap-10 py-14 sm:grid-cols-3 sm:gap-12">
        {[
          {
            kicker: '§ I',
            title: 'Commits, not saves',
            body: 'Every edit pushes a new commit to main. Nothing is lost; every past revision renders on its own URL.',
          },
          {
            kicker: '§ II',
            title: 'Forks, not copies',
            body: 'A fork creates an entirely new Artifacts repo with independent history. Readers become contributors.',
          },
          {
            kicker: '§ III',
            title: 'Plain-text, portable',
            body: 'The Worker mints you a short-lived read/write token and hands you a git clone command. The page is yours.',
          },
        ].map((col, idx) => (
          <article
            key={col.title}
            className="rise flex flex-col gap-3 border-t-[3px] border-[var(--cf-orange)] pt-4"
            style={{ animationDelay: `${idx * 90 + 120}ms` }}
          >
            <p className="kicker">{col.kicker}</p>
            <h2 className="display text-2xl font-semibold text-[var(--ink)]">
              {col.title}
            </h2>
            <p className="m-0 text-[15px] leading-relaxed text-[var(--ink-soft)]">
              {col.body}
            </p>
          </article>
        ))}
      </section>

      <div className="dinkus" aria-hidden>
        ❦ ❦ ❦
      </div>

      {/* ── Contents / wiki index ────────────────────────────────────── */}
      <section aria-labelledby="contents-heading" className="pb-8">
        <header className="mb-8 flex items-end justify-between gap-4 border-b border-[var(--rule)] pb-4">
          <div>
            <p className="kicker mb-1">The wiki index</p>
            <h2
              id="contents-heading"
              className="display text-3xl font-semibold sm:text-4xl"
            >
              <span className="text-[var(--ink)]">Recently changed </span>
              <em
                className="font-normal italic text-[var(--cf-orange)]"
                style={{
                  fontVariationSettings:
                    '"opsz" 144, "SOFT" 100, "WONK" 1',
                }}
              >
                pages
              </em>
            </h2>
          </div>
          <p className="folio">
            {pages.length === 0
              ? 'awaiting first page'
              : `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}`}
          </p>
        </header>

        {pages.length === 0 ? (
          <div className="border-y border-[var(--rule)] py-14 text-center">
            <p className="byline mb-5 text-lg">
              The index is ready, the first page is blank.
            </p>
            <Link to="/new" className="btn-primary">
              Create the first page →
            </Link>
          </div>
        ) : (
          <ol className="toc m-0 list-none p-0">
            {pages.map((page, idx) => (
              <li
                key={page.id}
                className="toc-entry rise border-b border-[var(--rule)] py-7 pl-16"
                style={{ animationDelay: `${idx * 60 + 80}ms` }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="folio m-0">{formatDate(page.updated_at)}</p>
                  <span className="folio text-[var(--rule)]">·</span>
                  <p className="byline m-0 text-sm">created by {page.author}</p>
                  {page.forked_from ? (
                    <span className="tag tag-moss">
                      fork of {page.forked_from}
                    </span>
                  ) : null}
                  <span className="ml-auto tag tag-accent">
                    @{page.current_sha.slice(0, 7)}
                  </span>
                </div>

                <h3 className="display mt-2 text-2xl font-semibold leading-tight text-[var(--ink)] sm:text-3xl">
                  <Link
                    to="/wiki/$slug"
                    params={{ slug: page.slug }}
                    search={{ v: undefined }}
                    className="text-[var(--ink)] no-underline transition hover:text-[var(--cf-orange-deep,#e2570d)]"
                  >
                    {page.title}
                  </Link>
                </h3>

                {page.summary ? (
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
                    {page.summary}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <Link
                    to="/wiki/$slug"
                    params={{ slug: page.slug }}
                    search={{ v: undefined }}
                    className="font-semibold uppercase tracking-wider text-[var(--cf-orange-deep,#e2570d)] no-underline"
                    style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.78rem', letterSpacing: '0.14em' }}
                  >
                    Open →
                  </Link>
                  <Link
                    to="/wiki/$slug/history"
                    params={{ slug: page.slug }}
                    className="text-[var(--ink-soft)] no-underline hover:text-[var(--ink)]"
                    style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}
                  >
                    History
                  </Link>
                  <Link
                    to="/wiki/$slug/edit"
                    params={{ slug: page.slug }}
                    className="text-[var(--ink-soft)] no-underline hover:text-[var(--ink)]"
                    style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  )
}
