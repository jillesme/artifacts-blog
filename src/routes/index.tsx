import { createFileRoute, Link } from '@tanstack/react-router'
import { listPosts } from '../server/posts'

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => listPosts(),
})

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Home() {
  const posts = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">
          Powered by Cloudflare Artifacts + D1
        </p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Every post is a real Git repo.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          This blog stores each post as its own Cloudflare Artifacts
          repository. Editing makes a commit. <strong>Forking</strong> spins up
          a brand-new repo. And yes — you can{' '}
          <code>git clone</code> any post to your laptop.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/new"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            Write a post
          </Link>
          <Link
            to="/about"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
          >
            How it works
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ['Commits = edits', 'Edit a post → new commit pushed to Artifacts.'],
          ['Forks = new repos', 'One click spawns a brand-new, independent repo.'],
          ['git clone your post', 'We mint you a short-lived read token on demand.'],
        ].map(([title, desc], index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="display-title m-0 text-2xl font-bold text-[var(--sea-ink)]">
            Latest posts
          </h2>
          <p className="island-kicker m-0">
            {posts.length === 0 ? 'empty — be the first' : `${posts.length} post${posts.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="island-shell rounded-2xl p-8 text-center">
            <p className="mb-4 text-[var(--sea-ink-soft)]">
              No posts yet. Behind each post is a freshly-minted Artifacts repo.
            </p>
            <Link
              to="/new"
              className="inline-block rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5"
            >
              Write the first post →
            </Link>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0">
            {posts.map((post) => (
              <li
                key={post.id}
                className="island-shell feature-card rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
                  <span className="island-kicker m-0">
                    {formatDate(post.created_at)}
                  </span>
                  <span>by {post.author}</span>
                  {post.forked_from ? (
                    <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--palm)]">
                      fork of {post.forked_from}
                    </span>
                  ) : null}
                  <span className="ml-auto font-mono text-[10px] uppercase text-[var(--sea-ink-soft)]">
                    {post.current_sha.slice(0, 7)}
                  </span>
                </div>
                <h3 className="mb-1 mt-2 text-lg font-semibold text-[var(--sea-ink)]">
                  <Link
                    to="/posts/$slug"
                    params={{ slug: post.slug }}
                    search={{ v: undefined }}
                    className="no-underline hover:underline"
                  >
                    {post.title}
                  </Link>
                </h3>
                {post.summary ? (
                  <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
                    {post.summary}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    to="/posts/$slug"
                    params={{ slug: post.slug }}
                    search={{ v: undefined }}
                    className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 font-semibold text-[var(--sea-ink)] no-underline"
                  >
                    Read
                  </Link>
                  <Link
                    to="/posts/$slug/history"
                    params={{ slug: post.slug }}
                    className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 font-semibold text-[var(--sea-ink)] no-underline"
                  >
                    History
                  </Link>
                  <Link
                    to="/posts/$slug/edit"
                    params={{ slug: post.slug }}
                    className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 font-semibold text-[var(--sea-ink)] no-underline"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
