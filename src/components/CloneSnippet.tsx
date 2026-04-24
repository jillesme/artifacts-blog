import { useState } from 'react'
import { mintCloneToken } from '../server/posts'
import { Copy, Check, Terminal } from 'lucide-react'

interface Props {
  slug: string
}

/**
 * The "git clone your post" button. On click we ask the Worker to mint a
 * short-lived read-scoped Artifacts token for this repo, then show the
 * ready-to-paste command.
 */
export default function CloneSnippet({ slug }: Props) {
  const [info, setInfo] = useState<{
    remote: string
    token: string
    expiresAt: string
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function mint() {
    setBusy(true)
    setError(null)
    try {
      const res = await mintCloneToken({ data: { slug } })
      setInfo(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const secret = info ? info.token.split('?expires=')[0] : ''
  const command = info
    ? `git -c http.extraHeader="Authorization: Bearer ${secret}" clone ${info.remote}`
    : ''

  async function copy() {
    if (!command) return
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  if (!info) {
    return (
      <div className="island-shell flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-[var(--lagoon-deep)]" />
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
              git clone this post
            </p>
            <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
              Mint a 15-minute read token, get a ready-to-paste command.
            </p>
          </div>
        </div>
        <button
          onClick={mint}
          disabled={busy}
          className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-1.5 text-xs font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.24)] disabled:opacity-60"
        >
          {busy ? 'Minting…' : 'Generate command'}
        </button>
        {error ? (
          <p className="m-0 w-full text-xs text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  const expiresIn = Math.max(
    0,
    Math.round((new Date(info.expiresAt).getTime() - Date.now()) / 1000 / 60),
  )

  return (
    <div className="island-shell rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
          git clone this post
        </p>
        <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--palm)]">
          token expires in ~{expiresIn} min
        </span>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-6 text-[var(--sea-ink)]">
        <code className="border-0 bg-transparent p-0">{command}</code>
      </pre>
      <div className="mt-2 flex items-center justify-between">
        <p className="m-0 text-[11px] text-[var(--sea-ink-soft)]">
          Token is read-only and scoped to this repo. After it expires, mint
          another one.
        </p>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--sea-ink)]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
