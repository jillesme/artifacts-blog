/**
 * Git operations against Cloudflare Artifacts repos, from a Worker.
 *
 * Artifacts exposes each repo as a standard Git HTTPS remote. We use
 * isomorphic-git to clone, read, edit, commit and push — entirely from
 * the Worker request handler.
 *
 * Filesystem: we use Workers' built-in `node:fs` virtual filesystem.
 *   - Enabled automatically with `nodejs_compat` + compatibility_date ≥ 2025-09-01
 *   - Per-request in-memory `/tmp` that counts toward the Worker memory budget
 *   - Zero extra dependencies — no hand-rolled MemoryFS needed
 *   Docs: https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/
 *
 * Why not store content in KV or R2?
 *   Because then "history", "diff", "fork", and "git clone from your wiki"
 *   all become features we have to reinvent. Artifacts + Git gives them to
 *   us for free.
 */

import fs from 'node:fs'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'

export const AUTHOR = {
  name: 'Artifacts Wiki',
  email: 'wiki@artifacts.example',
}

export const PAGE_FILE = 'page.md'
export const META_FILE = 'meta.json'

/**
 * Each git operation gets its own fresh workdir under /tmp. The Workers VFS
 * is per-request, but using unique subdirs also guards against reentrancy
 * (e.g. a server function doing two reads in parallel).
 */
function newWorkdir(): string {
  return `/tmp/artifacts-${crypto.randomUUID()}`
}

/** Strip the `?expires=<unix>` suffix that Artifacts tokens carry. */
export function cleanToken(token: string): string {
  return token.split('?expires=')[0]
}

function authFor(token: string) {
  const secret = cleanToken(token)
  return () => ({ username: 'x', password: secret })
}

/** Metadata we store in `meta.json` alongside the markdown body. */
export interface PageMeta {
  title: string
  author: string
  summary?: string
  createdAt: string
  forkedFrom?: string
}

export interface CreatePageResult {
  repoName: string
  remote: string
  sha: string
}

export interface RenderedPage {
  markdown: string
  meta: PageMeta
  sha: string
  ref: string | null
}

export interface CommitEntry {
  sha: string
  message: string
  author: string
  timestamp: number
}

async function mintReadToken(env: Env, repoName: string): Promise<string> {
  const repo = await env.ARTIFACTS.get(repoName)
  const token = await repo.createToken('read', 900)
  return token.plaintext
}

async function mintWriteToken(env: Env, repoName: string): Promise<string> {
  const repo = await env.ARTIFACTS.get(repoName)
  const token = await repo.createToken('write', 900)
  return token.plaintext
}

function authorFor(name?: string) {
  const trimmed = name?.trim()
  return trimmed
    ? { name: trimmed.slice(0, 80), email: `${slugEmail(trimmed)}@artifacts.example` }
    : AUTHOR
}

function slugEmail(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'contributor'
  )
}

/**
 * Create a new Artifacts repo, commit `page.md` + `meta.json`, and push `main`.
 * Returns the repo name, remote URL, and the first commit's SHA.
 */
export async function createPageRepo(
  env: Env,
  repoName: string,
  body: string,
  meta: PageMeta,
): Promise<CreatePageResult> {
  const created = await env.ARTIFACTS.create(repoName, {
    description: meta.title,
  })
  const token = created.token

  const dir = newWorkdir()
  await fs.promises.mkdir(dir, { recursive: true })
  await git.init({ fs, dir, defaultBranch: 'main' })

  await fs.promises.writeFile(`${dir}/${PAGE_FILE}`, body)
  await fs.promises.writeFile(
    `${dir}/${META_FILE}`,
    JSON.stringify(meta, null, 2) + '\n',
  )
  await fs.promises.writeFile(
    `${dir}/README.md`,
    `# ${meta.title}\n\nThis wiki page lives in a Cloudflare Artifacts repo.\n\nClone it, edit \`page.md\`, and push to suggest changes.\n`,
  )

  await git.add({ fs, dir, filepath: PAGE_FILE })
  await git.add({ fs, dir, filepath: META_FILE })
  await git.add({ fs, dir, filepath: 'README.md' })

  const sha = await git.commit({
    fs,
    dir,
    message: `Create page: ${meta.title}`,
    author: authorFor(meta.author),
  })

  await git.push({
    fs,
    http,
    dir,
    url: created.remote,
    ref: 'main',
    onAuth: authFor(token),
  })

  return { repoName: created.name, remote: created.remote, sha }
}

/**
 * Read `page.md` + `meta.json` from the repo at a given commit (or tip of main).
 * We do a shallow clone, which is fast enough for wiki-sized repos.
 */
export async function readPage(
  env: Env,
  repoName: string,
  remote: string,
  atSha?: string,
): Promise<RenderedPage> {
  const token = await mintReadToken(env, repoName)
  const dir = newWorkdir()
  await fs.promises.mkdir(dir, { recursive: true })
  await git.clone({
    fs,
    http,
    dir,
    url: remote,
    ref: 'main',
    singleBranch: true,
    depth: atSha ? 100 : 1,
    onAuth: authFor(token),
  })

  let oid = atSha
  if (!oid) {
    oid = await git.resolveRef({ fs, dir, ref: 'main' })
  }

  const pageBytes = await git.readBlob({
    fs,
    dir,
    oid,
    filepath: PAGE_FILE,
  })
  let metaText = '{}'
  try {
    const metaBytes = await git.readBlob({
      fs,
      dir,
      oid,
      filepath: META_FILE,
    })
    metaText = new TextDecoder().decode(metaBytes.blob)
  } catch {
    // meta.json may not exist on older commits — fall back silently.
  }

  const meta = JSON.parse(metaText) as PageMeta
  return {
    markdown: new TextDecoder().decode(pageBytes.blob),
    meta,
    sha: oid,
    ref: atSha ? null : 'main',
  }
}

/**
 * Commit a new version of `page.md`, push, and return the new HEAD SHA.
 */
export async function updatePage(
  env: Env,
  repoName: string,
  remote: string,
  body: string,
  meta: PageMeta,
  message: string,
  editor?: string,
): Promise<string> {
  const token = await mintWriteToken(env, repoName)
  const dir = newWorkdir()
  await fs.promises.mkdir(dir, { recursive: true })
  await git.clone({
    fs,
    http,
    dir,
    url: remote,
    ref: 'main',
    singleBranch: true,
    depth: 1,
    onAuth: authFor(token),
  })

  await fs.promises.writeFile(`${dir}/${PAGE_FILE}`, body)
  await fs.promises.writeFile(
    `${dir}/${META_FILE}`,
    JSON.stringify(meta, null, 2) + '\n',
  )

  await git.add({ fs, dir, filepath: PAGE_FILE })
  await git.add({ fs, dir, filepath: META_FILE })

  const sha = await git.commit({
    fs,
    dir,
    message,
    author: authorFor(editor),
  })

  await git.push({
    fs,
    http,
    dir,
    url: remote,
    ref: 'main',
    onAuth: authFor(token),
  })

  return sha
}

/**
 * Read the last N commits (OID + message + author + timestamp).
 */
export async function readHistory(
  env: Env,
  repoName: string,
  remote: string,
  depth = 50,
): Promise<CommitEntry[]> {
  const token = await mintReadToken(env, repoName)
  const dir = newWorkdir()
  await fs.promises.mkdir(dir, { recursive: true })
  await git.clone({
    fs,
    http,
    dir,
    url: remote,
    ref: 'main',
    singleBranch: true,
    depth,
    onAuth: authFor(token),
  })
  const log = await git.log({ fs, dir, depth })
  return log.map((c) => ({
    sha: c.oid,
    message: c.commit.message.trim(),
    author: c.commit.author.name,
    timestamp: c.commit.author.timestamp * 1000,
  }))
}

/**
 * Fork an existing Artifacts repo into a new one. The new repo has its own
 * remote, its own tokens, and diverges independently.
 */
export async function forkPageRepo(
  env: Env,
  sourceRepoName: string,
  targetRepoName: string,
  description?: string,
): Promise<{ repoName: string; remote: string; sha: string }> {
  const source = await env.ARTIFACTS.get(sourceRepoName)
  const forked = await source.fork(targetRepoName, {
    description,
    defaultBranchOnly: true,
  })

  // The fork starts at the same SHA as the source's default branch.
  // Resolve it by doing a minimal shallow clone.
  const token = forked.token
  const dir = newWorkdir()
  await fs.promises.mkdir(dir, { recursive: true })
  await git.clone({
    fs,
    http,
    dir,
    url: forked.remote,
    ref: 'main',
    singleBranch: true,
    depth: 1,
    onAuth: authFor(token),
  })
  const sha = await git.resolveRef({ fs, dir, ref: 'main' })
  return { repoName: forked.name, remote: forked.remote, sha }
}
