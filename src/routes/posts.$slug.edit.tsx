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
      navigate({
        to: '/posts/$slug',
        params: { slug: res.slug },
        search: { v: undefined },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <main className="measure px-4 pb-16 pt-10 sm:pt-14">
      <div className="mb-6">
        <Link
          to="/posts/$slug"
          params={{ slug: view.post.slug }}
          search={{ v: undefined }}
          className="folio no-underline hover:text-[var(--ink)]"
        >
          ← Back to the entry
        </Link>
      </div>

      <header className="ink-in mb-10">
        <p className="folio mb-4">
          Revise · current SHA @{view.sha.slice(0, 7)}
        </p>
        <h1 className="display text-[clamp(2.25rem,5.5vw,3.5rem)] font-semibold text-[var(--ink)]">
          {view.post.title}
        </h1>
        <p className="byline mt-5 text-lg leading-relaxed text-[var(--ink-soft)]">
          Saving clones the repo, overwrites <code>post.md</code>, commits your
          changes, and pushes <code>main</code>. The previous SHA remains
          readable in the revisions.
        </p>
        <div className="mt-6 h-px bg-[var(--rule)]" />
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <label className="field">
          <span className="field-label">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="field">
          <span className="field-label">Summary · optional</span>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="field-input"
          />
        </label>

        <label className="field">
          <span className="field-label">Body · Markdown</span>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            className="field-textarea"
          />
        </label>

        <label className="field">
          <span className="field-label">Commit message · optional</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Edit: ${title}`}
            className="field-input"
          />
        </label>

        {error ? <p className="note-error">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-5 border-t border-[var(--rule)] pt-6">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Committing & pushing…' : 'Commit revision'}
          </button>
          <Link
            to="/posts/$slug"
            params={{ slug: view.post.slug }}
            search={{ v: undefined }}
            className="folio no-underline hover:text-[var(--ink)]"
          >
            Discard & return
          </Link>
        </div>
      </form>
    </main>
  )
}
