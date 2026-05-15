import { createFileRoute, Link } from '@tanstack/react-router'
import { listPosts } from '../server/posts'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => listPosts(),
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
  const posts = Route.useLoaderData()

  return (
    <main className="measure-wide px-4 pb-16 pt-8 sm:pt-12">
      {/* ── Cover / lede — clean white editorial, orange used as a typographic
            accent in the kicker tab and the headline italic. ─────────── */}
      <section className="ink-in" aria-labelledby="cover-title">
        <div className="hero-rails">
          <span className="hero-tab">The Leader</span>
        </div>

        <div className="grid gap-10 pt-10 sm:grid-cols-[1.35fr_1fr] sm:gap-14 sm:pt-14">
          <div>
            <p className="kicker mb-4">Front page · Issue 01</p>
            <h1
              id="cover-title"
              className="display text-[clamp(2.6rem,7.5vw,5.5rem)] font-semibold text-[var(--ink)]"
            >
              Every post
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
                Compose a post →
              </Link>
              <Link to="/about" className="btn-ghost">
                Read the colophon
              </Link>
            </div>
          </div>

          <aside
            className="border-l-2 border-[var(--cf-orange)] pl-6 text-[15px] leading-relaxed text-[var(--ink-soft)] sm:pl-8"
            aria-label="From the editor"
          >
            <p className="kicker mb-3">From the editor</p>
            <p className="m-0">
              A small experiment. Each entry published here is stored in
              its own Cloudflare Artifacts repository — a real,
              cloneable Git remote. Edits become commits.{' '}
              <em>Forking</em> a post spins up a new repo that diverges
              on its own. Readers can <code>git clone</code> any page to
              their laptop. Plain text, kept honestly.
            </p>
            <p className="byline mt-4 text-sm">— The composition room</p>
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
            body: 'Every edit pushes a new commit to main. Nothing is lost; every past version renders on its own URL.',
          },
          {
            kicker: '§ II',
            title: 'Forks, not copies',
            body: 'A fork creates an entirely new Artifacts repo with independent history. Readers become authors.',
          },
          {
            kicker: '§ III',
            title: 'Plain-text, portable',
            body: 'The Worker mints you a short-lived read token and hands you a git clone command. The post is yours.',
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

      {/* ── Contents / post index ────────────────────────────────────── */}
      <section aria-labelledby="contents-heading" className="pb-8">
        <header className="mb-8 flex items-end justify-between gap-4 border-b border-[var(--rule)] pb-4">
          <div>
            <p className="kicker mb-1">The contents</p>
            <h2
              id="contents-heading"
              className="display text-3xl font-semibold sm:text-4xl"
            >
              <span className="text-[var(--ink)]">Latest </span>
              <em
                className="font-normal italic text-[var(--cf-orange)]"
                style={{
                  fontVariationSettings:
                    '"opsz" 144, "SOFT" 100, "WONK" 1',
                }}
              >
                entries
              </em>
            </h2>
          </div>
          <p className="folio">
            {posts.length === 0
              ? 'awaiting first entry'
              : `${posts.length} ${posts.length === 1 ? 'entry' : 'entries'}`}
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="border-y border-[var(--rule)] py-14 text-center">
            <p className="byline mb-5 text-lg">
              The press is warm, the paper is blank.
            </p>
            <Link to="/new" className="btn-primary">
              Compose the first entry →
            </Link>
          </div>
        ) : (
          <ol className="toc m-0 list-none p-0">
            {posts.map((post, idx) => (
              <li
                key={post.id}
                className="toc-entry rise border-b border-[var(--rule)] py-7 pl-16"
                style={{ animationDelay: `${idx * 60 + 80}ms` }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="folio m-0">{formatDate(post.created_at)}</p>
                  <span className="folio text-[var(--rule)]">·</span>
                  <p className="byline m-0 text-sm">by {post.author}</p>
                  {post.forked_from ? (
                    <span className="tag tag-moss">
                      fork of {post.forked_from}
                    </span>
                  ) : null}
                  <span className="ml-auto tag tag-accent">
                    @{post.current_sha.slice(0, 7)}
                  </span>
                </div>

                <h3 className="display mt-2 text-2xl font-semibold leading-tight text-[var(--ink)] sm:text-3xl">
                  <Link
                    to="/posts/$slug"
                    params={{ slug: post.slug }}
                    search={{ v: undefined }}
                    className="text-[var(--ink)] no-underline transition hover:text-[var(--cf-orange-deep,#e2570d)]"
                  >
                    {post.title}
                  </Link>
                </h3>

                {post.summary ? (
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
                    {post.summary}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <Link
                    to="/posts/$slug"
                    params={{ slug: post.slug }}
                    search={{ v: undefined }}
                    className="font-semibold uppercase tracking-wider text-[var(--cf-orange-deep,#e2570d)] no-underline"
                    style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.78rem', letterSpacing: '0.14em' }}
                  >
                    Read →
                  </Link>
                  <Link
                    to="/posts/$slug/history"
                    params={{ slug: post.slug }}
                    className="text-[var(--ink-soft)] no-underline hover:text-[var(--ink)]"
                    style={{ fontFamily: 'var(--font-grotesk)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}
                  >
                    History
                  </Link>
                  <Link
                    to="/posts/$slug/edit"
                    params={{ slug: post.slug }}
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
