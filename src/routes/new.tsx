import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createPost } from '../server/posts'

export const Route = createFileRoute('/new')({
  component: NewPost,
})

const STARTER_BODY = `# Hello, Artifacts

This post is a Git repository. Every edit is a commit.

Try:

1. Edit this file and hit **Save** — you'll see a new SHA.
2. Open **History** to view past versions.
3. Hit **Fork** to spin up an independent copy.
`

function NewPost() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState(STARTER_BODY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await createPost({
        data: {
          title,
          author: author || undefined,
          summary: summary || undefined,
          body,
        },
      })
      navigate({ to: '/posts/$slug', params: { slug: result.slug }, search: { v: undefined } })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-10">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">New post</p>
        <h1 className="display-title mb-2 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Create a post
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          Submitting this form creates a brand-new Artifacts repo, writes{' '}
          <code>post.md</code> + <code>meta.json</code>, and pushes{' '}
          <code>main</code>. The returned commit SHA is stored in D1.
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
              placeholder="On forking a blog post"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
                Author
              </span>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
                placeholder="anonymous"
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
                placeholder="One sentence pitch"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
              Body (Markdown)
            </span>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="min-h-[320px] rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 font-mono text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon-deep)]"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.2)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Creating repo + pushing commit…' : 'Create post'}
            </button>
            <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
              We'll spin up a new repo named{' '}
              <code>post-&lt;slug&gt;-&lt;nonce&gt;</code>.
            </p>
          </div>
        </form>
      </section>
    </main>
  )
}
