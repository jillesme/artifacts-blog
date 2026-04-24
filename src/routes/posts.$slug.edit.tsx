import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'
import { editPost, getPost } from '../server/posts'

export const Route = createFileRoute('/posts/$slug/edit')({
  component: EditPost,
  loader: async ({ params }) => {
    const view = await getPost({ data: { slug: params.slug } })
    if (!view) throw notFound()
    return view
  },
})

function EditPost() {
  const view = Route.useLoaderData()
  const navigate = useNavigate()
  const [title, setTitle] = useState(view.post.title)
  const [summary, setSummary] = useState(view.post.summary ?? '')
  const [body, setBody] = useState(view.markdown)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await editPost({
        data: {
          slug: view.post.slug,
          title,
          summary: summary || undefined,
          body,
          message: message || undefined,
        },
      })
      navigate({ to: '/posts/$slug', params: { slug: res.slug }, search: { v: undefined } })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-10">
      <div className="mb-4">
        <Link
          to="/posts/$slug"
          params={{ slug: view.post.slug }}
          search={{ v: undefined }}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]"
        >
          ← Back to post
        </Link>
      </div>

      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Edit post · creates a new commit</p>
        <h1 className="display-title mb-2 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          {view.post.title}
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          Current SHA: <code>{view.sha.slice(0, 7)}</code>. Saving clones the
          repo, overwrites <code>post.md</code>, commits, and pushes{' '}
          <code>main</code>.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Title
            </span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Summary (optional)
            </span>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Body (Markdown)
            </span>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              className="min-h-[360px] rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 font-mono text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Commit message (optional)
            </span>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Edit: ${title}`}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.2)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Committing + pushing…' : 'Save (commit)'}
            </button>
            <Link
              to="/posts/$slug"
              params={{ slug: view.post.slug }}
              search={{ v: undefined }}
              className="text-xs font-semibold text-[var(--sea-ink-soft)] no-underline"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}
