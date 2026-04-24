import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-10">
        <p className="island-kicker mb-2">How it works</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          A blog where every post is a Git repo.
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          Most blogs store posts as rows in a database. This one does too — but
          the row only holds metadata and a pointer. The actual content lives
          inside{' '}
          <a
            href="https://developers.cloudflare.com/artifacts/"
            target="_blank"
            rel="noreferrer"
          >
            Cloudflare Artifacts
          </a>
          , which gives each post its own versioned Git repository. Every edit
          is a commit. Forking a post creates a new, independent repo. You can
          even <code>git clone</code> any post to your laptop.
        </p>

        <hr className="my-8 border-[var(--line)]" />

        <h2 className="display-title mb-3 text-2xl font-bold text-[var(--sea-ink)]">
          The data model
        </h2>
        <pre className="island-shell overflow-x-auto rounded-xl p-4 text-xs leading-6 text-[var(--sea-ink)]">
          <code>{`D1 (metadata)                Artifacts (content)
┌──────────────────┐         ┌────────────────────────────┐
│ posts            │         │  post-<slug>-<nonce>.git   │
│  id              │   ───▶  │   main                     │
│  slug            │         │     post.md                │
│  title           │         │     meta.json              │
│  repo_name   ────┼────────▶│     README.md              │
│  remote          │         │   history: commits a→b→c   │
│  current_sha ────┼────────▶│                            │
│  forked_from     │         └────────────────────────────┘
└──────────────────┘`}</code>
        </pre>

        <h2 className="display-title mb-3 mt-10 text-2xl font-bold text-[var(--sea-ink)]">
          What that gets you
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[var(--sea-ink-soft)]">
          <li>
            <strong className="text-[var(--sea-ink)]">Time travel:</strong>{' '}
            every past version of a post is still renderable. See{' '}
            <code>/posts/&lt;slug&gt;/history</code>.
          </li>
          <li>
            <strong className="text-[var(--sea-ink)]">Forks:</strong> one click
            creates a new repo that diverges independently. Readers become
            authors.
          </li>
          <li>
            <strong className="text-[var(--sea-ink)]">git clone:</strong> every
            post page shows a <code>git clone</code> command with a short-lived
            read token, minted on demand by a Worker.
          </li>
          <li>
            <strong className="text-[var(--sea-ink)]">No file storage
              reinvention:</strong>{' '}
            Artifacts handles durability, replication, and the Git protocol —
            we just call the binding from a TanStack Start server function.
          </li>
        </ul>

        <h2 className="display-title mb-3 mt-10 text-2xl font-bold text-[var(--sea-ink)]">
          What's under the hood
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-[var(--sea-ink-soft)]">
          <li>
            <code>env.ARTIFACTS.create(name)</code> for a new post,{' '}
            <code>env.ARTIFACTS.get(name).fork(target)</code> for forks.
          </li>
          <li>
            <code>isomorphic-git</code> inside the Worker to clone, commit,
            push, and read files at a given SHA — backed by a tiny in-memory
            filesystem.
          </li>
          <li>
            D1 for the post index (list page, slug routing).
          </li>
          <li>
            TanStack Start server functions as the Worker entry point, with{' '}
            <code>import {'{ env }'} from "cloudflare:workers"</code>.
          </li>
        </ul>
      </section>
    </main>
  )
}
