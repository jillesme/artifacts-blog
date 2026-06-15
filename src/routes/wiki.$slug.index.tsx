import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'
import CloneSnippet from '../components/CloneSnippet'
import { forkPage, getPage } from '../server/pages'

export const Route = createFileRoute('/wiki/$slug/')({
  component: PageView,
  validateSearch: (search: Record<string, unknown>) => ({
    v: typeof search.v === 'string' ? (search.v as string) : undefined,
  }),
  loaderDeps: ({ search }) => ({ v: search.v }),
  loader: async ({ params, deps }) => {
    const view = await getPage({ data: { slug: params.slug, sha: deps.v } })
    if (!view) throw notFound()
    return view
  },
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

function PageView() {
  const view = Route.useLoaderData()
  const navigate = useNavigate()
  const [forking, setForking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFork() {
    setForking(true)
    setError(null)
    try {
      const res = await forkPage({ data: { slug: view.page.slug } })
      navigate({
        to: '/wiki/$slug',
        params: { slug: res.slug },
        search: { v: undefined },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setForking(false)
    }
  }

  return (
    <main className="measure px-4 pb-16 pt-10 sm:pt-14">
      <div className="mb-8">
        <Link to="/" className="folio no-underline hover:text-[var(--ink)]">
          ← Return to the wiki index
        </Link>
      </div>

      {view.isHistorical ? (
        <aside
          className="mb-10 border-y border-[var(--rule)] py-4 text-sm leading-relaxed"
          role="note"
        >
          <p className="smallcaps mb-1">An earlier draft</p>
          <p className="m-0 text-[var(--ink-soft)]">
            You are reading this page at commit{' '}
            <code>{view.sha.slice(0, 7)}</code>.{' '}
            <Link
              to="/wiki/$slug"
              params={{ slug: view.page.slug }}
              search={{ v: undefined }}
              className="font-medium"
            >
              Return to the latest revision →
            </Link>
          </p>
        </aside>
      ) : null}

      {/* ── Article head ──────────────────────────────────────────── */}
      <header className="ink-in mb-10">
        <p className="folio mb-4">
          {formatDate(view.page.created_at)} · created by{' '}
          <span className="text-[var(--ink-soft)]">{view.page.author}</span>
          {view.page.forked_from ? (
            <>
              {' · '}
              <span className="normal-case tracking-normal">
                forked from{' '}
                <Link
                  to="/wiki/$slug"
                  params={{ slug: view.page.forked_from }}
                  search={{ v: undefined }}
                >
                  {view.page.forked_from}
                </Link>
              </span>
            </>
          ) : null}
        </p>

        <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold text-[var(--ink)]">
          {view.page.title}
        </h1>

        {view.page.summary ? (
          <p className="byline mt-5 text-xl leading-relaxed text-[var(--ink-soft)] sm:text-2xl">
            {view.page.summary}
          </p>
        ) : null}

        <div className="mt-6 flex items-center gap-3">
          <span className="tag tag-accent">@{view.sha.slice(0, 7)}</span>
          <div className="h-px flex-1 bg-[var(--rule)]" />
        </div>
      </header>

      {/* ── Article body ──────────────────────────────────────────── */}
      <article
        className="editorial-body prose prose-lg max-w-none text-[var(--ink)]
          prose-headings:font-display prose-headings:text-[var(--ink)]
          prose-headings:tracking-tight
          prose-p:leading-[1.75]
          prose-p:text-[var(--ink)]
          prose-strong:text-[var(--ink)] prose-strong:font-semibold
          prose-em:text-[var(--ink)]
          prose-a:text-[var(--oxblood)] prose-a:underline prose-a:decoration-1 prose-a:underline-offset-2
          prose-blockquote:border-l-2 prose-blockquote:border-[var(--oxblood)]
          prose-blockquote:text-[var(--ink-soft)] prose-blockquote:font-normal prose-blockquote:not-italic
          prose-code:bg-[var(--parchment-deep)] prose-code:border prose-code:border-[var(--rule-soft)]
          prose-code:px-1.5 prose-code:py-[1px] prose-code:text-[0.9em] prose-code:rounded-none
          prose-code:text-[var(--ink)] prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-[var(--umber)] prose-pre:text-[var(--parchment-hi)] prose-pre:rounded-none
          prose-hr:border-[var(--rule)]
          prose-li:text-[var(--ink)]"
        dangerouslySetInnerHTML={{ __html: view.html }}
      />

      <div className="dinkus" aria-hidden>
        ❦
      </div>

      {/* ── Article footer: actions ──────────────────────────────── */}
      <section
          aria-label="Page actions"
        className="border-y border-[var(--rule)] py-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/wiki/$slug/edit"
            params={{ slug: view.page.slug }}
            className="btn-ghost"
          >
            Edit page
          </Link>
          <Link
            to="/wiki/$slug/history"
            params={{ slug: view.page.slug }}
            className="btn-ghost"
          >
            Revision history
          </Link>
          <button onClick={onFork} disabled={forking} className="btn-primary">
            {forking ? 'Forking the repo…' : 'Fork this page'}
          </button>
        </div>
        {error ? <p className="note-error mt-4">{error}</p> : null}
      </section>

      <div className="mt-8">
        <CloneSnippet slug={view.page.slug} />
      </div>
    </main>
  )
}
