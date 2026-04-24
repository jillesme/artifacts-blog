import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="measure px-4 pb-16 pt-10 sm:pt-14">
      <header className="ink-in mb-10 border-b border-[var(--rule)] pb-6">
        <p className="folio mb-3">The colophon</p>
        <h1 className="display text-[clamp(2.5rem,7vw,5rem)] font-semibold text-[var(--ink)]">
          A blog where every post is a{' '}
          <em
            className="italic"
            style={{
              fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1',
            }}
          >
            git repo
          </em>
          .
        </h1>
        <p className="byline mt-5 text-xl leading-relaxed text-[var(--ink-soft)]">
          Most blogs keep their writing as rows in a database. This one does
          too — but the row only holds metadata and a pointer.
        </p>
      </header>

      <section className="editorial-body prose prose-lg max-w-none text-[var(--ink)]
        prose-headings:font-display prose-headings:text-[var(--ink)] prose-headings:tracking-tight
        prose-p:leading-[1.75] prose-strong:text-[var(--ink)] prose-em:text-[var(--ink)]
        prose-a:text-[var(--oxblood)] prose-a:decoration-1 prose-a:underline-offset-2
        prose-code:bg-[var(--parchment-deep)] prose-code:border prose-code:border-[var(--rule-soft)]
        prose-code:px-1.5 prose-code:py-[1px] prose-code:text-[0.9em] prose-code:rounded-none
        prose-code:before:content-none prose-code:after:content-none
        prose-li:text-[var(--ink)]">
        <p>
          The actual content lives inside{' '}
          <a
            href="https://developers.cloudflare.com/artifacts/"
            target="_blank"
            rel="noreferrer"
          >
            Cloudflare Artifacts
          </a>
          , which gives each entry its own versioned Git repository. Every edit
          is a commit. Forking a post creates a new, independent repo. You can
          even <code>git clone</code> any post to your laptop.
        </p>

        <hr />

        <h2>The data model</h2>
      </section>

      <pre className="mt-4 overflow-x-auto border border-[var(--rule)] bg-[var(--parchment-hi)] p-5 text-[13px] leading-[1.7] text-[var(--ink)]">
        <code className="border-0 bg-transparent p-0">{`D1  —  metadata                  Artifacts  —  content
┌───────────────────────┐        ┌────────────────────────────┐
│ posts                 │        │  post-<slug>-<nonce>.git   │
│   id                  │        │    main                    │
│   slug                │   ─▶   │      post.md               │
│   title               │        │      meta.json             │
│   repo_name      ─────┼────▶   │      README.md             │
│   remote              │        │    history: a → b → c      │
│   current_sha    ─────┼────▶   │                            │
│   forked_from         │        └────────────────────────────┘
└───────────────────────┘`}</code>
      </pre>

      <section className="editorial-body prose prose-lg mt-10 max-w-none text-[var(--ink)]
        prose-headings:font-display prose-headings:text-[var(--ink)] prose-headings:tracking-tight
        prose-p:leading-[1.75] prose-strong:text-[var(--ink)] prose-em:text-[var(--ink)]
        prose-a:text-[var(--oxblood)] prose-a:decoration-1 prose-a:underline-offset-2
        prose-code:bg-[var(--parchment-deep)] prose-code:border prose-code:border-[var(--rule-soft)]
        prose-code:px-1.5 prose-code:py-[1px] prose-code:text-[0.9em] prose-code:rounded-none
        prose-code:before:content-none prose-code:after:content-none
        prose-li:text-[var(--ink)]">
        <h2>What that gets you</h2>
        <ul>
          <li>
            <strong>Time travel.</strong> Every past version of a post is still
            renderable. See <code>/posts/&lt;slug&gt;/history</code>.
          </li>
          <li>
            <strong>Forks.</strong> One click creates a new repo that diverges
            independently. Readers become authors.
          </li>
          <li>
            <strong>git clone.</strong> Every post page shows a{' '}
            <code>git clone</code> command with a short-lived read token, minted
            on demand by a Worker.
          </li>
          <li>
            <strong>No file storage reinvention.</strong> Artifacts handles
            durability, replication, and the Git protocol — we just call the
            binding from a TanStack Start server function.
          </li>
        </ul>

        <h2>Under the hood</h2>
        <ul>
          <li>
            <code>env.ARTIFACTS.create(name)</code> for a new post;{' '}
            <code>env.ARTIFACTS.get(name).fork(target)</code> for forks.
          </li>
          <li>
            <code>isomorphic-git</code> inside the Worker to clone, commit,
            push, and read files at a given SHA — backed by the built-in{' '}
            <code>node:fs</code> virtual filesystem.
          </li>
          <li>D1 for the post index (list page, slug routing).</li>
          <li>
            TanStack Start server functions as the Worker entry point, with{' '}
            <code>import {'{ env }'} from "cloudflare:workers"</code>.
          </li>
        </ul>
      </section>
    </main>
  )
}
