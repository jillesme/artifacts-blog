export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 border-t border-[var(--rule)] px-4 pb-16 pt-10 text-[var(--ink-soft)]">
      <div className="measure-wide flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md">
          <p className="smallcaps mb-2">Colophon</p>
          <p className="m-0 text-[15px] leading-relaxed">
            Set in <em>Fraunces</em> & <em>Newsreader</em>. Composed on
            Cloudflare Workers. Each post is a real Git repository —
            commit, fork, clone. Paper is optional.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="folio m-0">MMXXVI · № {year}</p>
          <p className="byline mt-1 text-sm">
            Artifacts · D1 · TanStack Start
          </p>
        </div>
      </div>
    </footer>
  )
}
