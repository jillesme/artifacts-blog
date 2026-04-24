/**
 * Git operations against Cloudflare Artifacts repos, from a Worker.
 *
 * Artifacts exposes each repo as a standard Git HTTPS remote. We use
 * isomorphic-git + an in-memory filesystem to clone, read, edit, commit
 * and push — entirely from the Worker request handler.
 *
 * Why not store content in KV or R2?
 *   Because then "history", "diff", "fork", and "git clone from your blog"
 *   all become features we have to reinvent. Artifacts + Git gives them to
 *   us for free.
 */

import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import { MemoryFS } from './memoryFS'

export const AUTHOR = {
  name: 'Artifacts Blog',
  email: 'blog@artifacts.example',
}

export const WORKDIR = '/repo'
export const POST_FILE = 'post.md'
export const META_FILE = 'meta.json'

/** Strip the `?expires=<unix>` suffix that Artifacts tokens sometimes carry. */
export function cleanToken(token: string): string {
  return token.split('?expires=')[0]
}

function authFor(token: string) {
  const secret = cleanToken(token)
  return () => ({ username: 'x', password: secret })
}

/** Metadata we store in `meta.json` alongside the markdown body. */
export interface PostMeta {
  title: string
  author: string
  summary?: string
  createdAt: string
  forkedFrom?: string
}

export interface CreatePostResult {
  repoName: string
  remote: string
  sha: string
}

export interface RenderedPost {
  markdown: string
  meta: PostMeta
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

/**
 * Create a new Artifacts repo, commit `post.md` + `meta.json`, and push `main`.
 * Returns the repo name, remote URL, and the first commit's SHA.
 */
export async function createPostRepo(
  env: Env,
  repoName: string,
  body: string,
  meta: PostMeta,
): Promise<CreatePostResult> {
  const created = await env.ARTIFACTS.create(repoName, {
    description: meta.title,
  })
  const token = created.token

  const fs = new MemoryFS()
  await git.init({ fs, dir: WORKDIR, defaultBranch: 'main' })

  await fs.promises.writeFile(`${WORKDIR}/${POST_FILE}`, body)
  await fs.promises.writeFile(
    `${WORKDIR}/${META_FILE}`,
    JSON.stringify(meta, null, 2) + '\n',
  )
  await fs.promises.writeFile(
    `${WORKDIR}/README.md`,
    `# ${meta.title}\n\nThis post lives in a Cloudflare Artifacts repo.\n\nClone it, edit \`post.md\`, and push to suggest changes.\n`,
  )

  await git.add({ fs, dir: WORKDIR, filepath: POST_FILE })
  await git.add({ fs, dir: WORKDIR, filepath: META_FILE })
  await git.add({ fs, dir: WORKDIR, filepath: 'README.md' })

  const sha = await git.commit({
    fs,
    dir: WORKDIR,
    message: `Publish: ${meta.title}`,
    author: AUTHOR,
  })

  await git.push({
    fs,
    http,
    dir: WORKDIR,
    url: created.remote,
    ref: 'main',
    onAuth: authFor(token),
  })

  return { repoName: created.name, remote: created.remote, sha }
}

/**
 * Read `post.md` + `meta.json` from the repo at a given commit (or tip of main).
 * We do a shallow fetch, which is fast enough for blog-sized repos.
 */
export async function readPost(
  env: Env,
  repoName: string,
  remote: string,
  atSha?: string,
): Promise<RenderedPost> {
  const token = await mintReadToken(env, repoName)
  const fs = new MemoryFS()
  await git.clone({
    fs,
    http,
    dir: WORKDIR,
    url: remote,
    ref: 'main',
    singleBranch: true,
    depth: atSha ? 100 : 1,
    onAuth: authFor(token),
  })

  let oid = atSha
  if (!oid) {
    oid = await git.resolveRef({ fs, dir: WORKDIR, ref: 'main' })
  }

  const postBytes = await git.readBlob({
    fs,
    dir: WORKDIR,
    oid,
    filepath: POST_FILE,
  })
  let metaText = '{}'
  try {
    const metaBytes = await git.readBlob({
      fs,
      dir: WORKDIR,
      oid,
      filepath: META_FILE,
    })
    metaText = new TextDecoder().decode(metaBytes.blob)
  } catch {
    // meta.json may not exist on older commits — fall back silently.
  }

  const meta = JSON.parse(metaText) as PostMeta
  return {
    markdown: new TextDecoder().decode(postBytes.blob),
    meta,
    sha: oid,
    ref: atSha ? null : 'main',
  }
}

/**
 * Commit a new version of `post.md`, push, and return the new HEAD SHA.
 */
export async function updatePost(
  env: Env,
  repoName: string,
  remote: string,
  body: string,
  meta: PostMeta,
  message: string,
): Promise<string> {
  const token = await mintWriteToken(env, repoName)
  const fs = new MemoryFS()
  await git.clone({
    fs,
    http,
    dir: WORKDIR,
    url: remote,
    ref: 'main',
    singleBranch: true,
    depth: 1,
    onAuth: authFor(token),
  })

  await fs.promises.writeFile(`${WORKDIR}/${POST_FILE}`, body)
  await fs.promises.writeFile(
    `${WORKDIR}/${META_FILE}`,
    JSON.stringify(meta, null, 2) + '\n',
  )

  await git.add({ fs, dir: WORKDIR, filepath: POST_FILE })
  await git.add({ fs, dir: WORKDIR, filepath: META_FILE })

  const sha = await git.commit({
    fs,
    dir: WORKDIR,
    message,
    author: AUTHOR,
  })

  await git.push({
    fs,
    http,
    dir: WORKDIR,
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
  const fs = new MemoryFS()
  await git.clone({
    fs,
    http,
    dir: WORKDIR,
    url: remote,
    ref: 'main',
    singleBranch: true,
    depth,
    onAuth: authFor(token),
  })
  const log = await git.log({ fs, dir: WORKDIR, depth })
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
export async function forkPostRepo(
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
  // Resolve it by doing a minimal ls-remote-ish clone of just refs.
  const token = forked.token
  const fs = new MemoryFS()
  await git.clone({
    fs,
    http,
    dir: WORKDIR,
    url: forked.remote,
    ref: 'main',
    singleBranch: true,
    depth: 1,
    onAuth: authFor(token),
  })
  const sha = await git.resolveRef({ fs, dir: WORKDIR, ref: 'main' })
  return { repoName: forked.name, remote: forked.remote, sha }
}
