import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'
import CloneSnippet from '../components/CloneSnippet'
import { forkPost, getPost } from '../server/posts'

export const Route = createFileRoute('/posts/$slug/')({
  component: PostView,
  validateSearch: (search: Record<string, unknown>) => ({
    v: typeof search.v === 'string' ? (search.v as string) : undefined,
  }),
  loaderDeps: ({ search }) => ({ v: search.v }),
  loader: async ({ params, deps }) => {
    const view = await getPost({ data: { slug: params.slug, sha: deps.v } })
    if (!view) throw notFound()
    return view
  },
})

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function PostView() {
  const view = Route.useLoaderData()
  const navigate = useNavigate()
  const [forking, setForking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFork() {
    setForking(true)
    setError(null)
    try {
      const res = await forkPost({ data: { slug: view.post.slug } })
      navigate({ to: '/posts/$slug', params: { slug: res.slug }, search: { v: undefined } })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setForking(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mb-4">
        <Link
          to="/"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]"
        >
          ← All posts
        </Link>
      </div>

      {view.isHistorical ? (
        <div className="island-shell mb-6 rounded-2xl border-l-4 border-l-[var(--lagoon-deep)] p-4 text-sm">
          <p className="m-0 text-[var(--sea-ink)]">
            <strong>Viewing a past version</strong> of this post at commit{' '}
            <code>{view.sha.slice(0, 7)}</code>.{' '}
            <Link
              to="/posts/$slug"
              params={{ slug: view.post.slug }}
              search={{ v: undefined }}
              className="font-semibold"
            >
              Return to the latest version →
            </Link>
          </p>
        </div>
      ) : null}

      <article className="island-shell rounded-2xl p-6 sm:p-10">
        <div className="mb-6 flex flex-wrap items-baseline gap-3 text-xs text-[var(--sea-ink-soft)]">
          <span className="island-kicker m-0">
            {formatDate(view.post.created_at)}
          </span>
          <span>by {view.post.author}</span>
          {view.post.forked_from ? (
            <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 font-semibold text-[var(--palm)]">
              forked from{' '}
              <Link
                to="/posts/$slug"
                params={{ slug: view.post.forked_from }}
                search={{ v: undefined }}
                className="underline"
              >
                {view.post.forked_from}
              </Link>
            </span>
          ) : null}
          <span className="ml-auto rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--sea-ink-soft)]">
            {view.sha.slice(0, 7)}
          </span>
        </div>

        <h1 className="display-title mb-4 text-4xl font-bold leading-tight text-[var(--sea-ink)] sm:text-5xl">
          {view.post.title}
        </h1>

        {view.post.summary ? (
          <p className="mb-6 text-lg text-[var(--sea-ink-soft)]">
            {view.post.summary}
          </p>
        ) : null}

        <div
          className="prose prose-sm sm:prose-base max-w-none text-[var(--sea-ink)] prose-headings:font-bold prose-headings:text-[var(--sea-ink)] prose-strong:text-[var(--sea-ink)] prose-a:text-[var(--lagoon-deep)] prose-code:rounded-md prose-code:border prose-code:border-[var(--line)] prose-code:bg-[var(--surface-strong)] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none"
          dangerouslySetInnerHTML={{ __html: view.html }}
        />

        <hr className="my-8 border-[var(--line)]" />

        <div className="flex flex-wrap gap-2">
          <Link
            to="/posts/$slug/edit"
            params={{ slug: view.post.slug }}
            className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--sea-ink)] no-underline"
          >
            Edit (new commit)
          </Link>
          <Link
            to="/posts/$slug/history"
            params={{ slug: view.post.slug }}
            className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--sea-ink)] no-underline"
          >
            History
          </Link>
          <button
            onClick={onFork}
            disabled={forking}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-1.5 text-xs font-semibold text-[var(--lagoon-deep)] disabled:opacity-60"
          >
            {forking ? 'Forking repo…' : 'Fork this post'}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}
      </article>

      <div className="mt-6">
        <CloneSnippet slug={view.post.slug} />
      </div>
    </main>
  )
}
