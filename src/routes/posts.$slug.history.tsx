import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getHistory } from '../server/posts'

export const Route = createFileRoute('/posts/$slug/history')({
  component: History,
  loader: async ({ params }) => {
    const data = await getHistory({ data: { slug: params.slug } })
    if (!data) throw notFound()
    return data
  },
})

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function History() {
  const { post, commits } = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mb-4">
        <Link
          to="/posts/$slug"
          params={{ slug: post.slug }}
          search={{ v: undefined }}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]"
        >
          ← Back to post
        </Link>
      </div>

      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">History</p>
        <h1 className="display-title mb-2 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          {post.title}
        </h1>
        <p className="mb-8 text-sm text-[var(--sea-ink-soft)]">
          Every commit to <code>{post.repo_name}</code> on <code>main</code>.
          Click any SHA to render that exact version.
        </p>

        <ol className="m-0 list-none space-y-3 p-0">
          {commits.map((c, idx) => {
            const isCurrent = c.sha === post.current_sha
            return (
              <li
                key={c.sha}
                className={`rounded-xl border p-4 ${
                  isCurrent
                    ? 'border-[var(--lagoon-deep)] bg-[rgba(79,184,178,0.08)]'
                    : 'border-[var(--line)] bg-[var(--surface)]'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 font-mono text-[11px] uppercase text-[var(--sea-ink)]">
                    {c.sha.slice(0, 7)}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full border border-[var(--lagoon-deep)] bg-[rgba(79,184,178,0.2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--lagoon-deep)]">
                      current
                    </span>
                  ) : null}
                  <span className="text-[11px] text-[var(--sea-ink-soft)]">
                    {formatTimestamp(c.timestamp)} · {c.author}
                  </span>
                  <Link
                    to="/posts/$slug"
                    params={{ slug: post.slug }}
                    search={{ v: c.sha }}
                    className="ml-auto rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--sea-ink)] no-underline"
                  >
                    View at this SHA →
                  </Link>
                </div>
                <p className="mb-0 mt-2 text-sm text-[var(--sea-ink)]">
                  {idx === commits.length - 1 && !c.message
                    ? 'Initial commit'
                    : c.message}
                </p>
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}
