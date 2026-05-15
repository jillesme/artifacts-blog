/**
 * Server functions: the bridge between the React UI and Cloudflare.
 *
 * Data split:
 *   - D1 (`posts` table) holds post metadata + a pointer (repo_name, current_sha)
 *   - Artifacts holds the actual content as a real Git repo per post
 *
 * Every mutation pushes a commit to Artifacts, then updates `current_sha` in D1.
 */

import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { marked } from 'marked'

import {
  createPostRepo,
  forkPostRepo,
  readHistory,
  readPost,
  updatePost,
  type CommitEntry,
  type PostMeta,
} from './artifactsGit'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PostRow {
  id: number
  slug: string
  title: string
  author: string
  summary: string | null
  namespace: string
  repo_name: string
  remote: string
  current_sha: string
  forked_from: string | null
  created_at: number
  updated_at: number
}

export interface PostView {
  post: PostRow
  html: string
  markdown: string
  sha: string
  isHistorical: boolean
}

export interface AdminPostRow extends PostRow {
  fork_count: number
}

export interface AdminRepoRow {
  id: string
  name: string
  description: string | null
  defaultBranch: string
  createdAt: string
  updatedAt: string
  lastPushAt: string | null
  source: string | null
  readOnly: boolean
  indexedSlug: string | null
}

export interface AdminState {
  posts: AdminPostRow[]
  repos: AdminRepoRow[]
  adminKeyConfigured: boolean
}

export interface DeleteFamilyResult {
  rootSlug: string
  deletedPosts: PostRow[]
  deletedRepos: { name: string; deleted: boolean }[]
}

export interface DeleteRepoResult {
  repoName: string
  deleted: boolean
}

export interface DeleteOrphansResult {
  deletedRepos: { name: string; deleted: boolean }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'post'
  let attempt = 0
  // Try `slug`, `slug-2`, `slug-3`, … until unused.
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`
    const row = await env.DB.prepare('SELECT id FROM posts WHERE slug = ?')
      .bind(candidate)
      .first()
    if (!row) return candidate
    attempt++
    if (attempt > 50) return `${slug}-${crypto.randomUUID().slice(0, 6)}`
  }
}

function repoNameFor(slug: string): string {
  // Artifacts repo names are scoped per-namespace; keep them tight and stable.
  return `post-${slug}-${crypto.randomUUID().slice(0, 6)}`
}

function renderMarkdown(md: string): string {
  // marked in sync mode is safe for trusted-ish content (our own DB).
  return marked.parse(md, { async: false }) as string
}

async function getPostBySlug(slug: string): Promise<PostRow | null> {
  const row = await env.DB.prepare('SELECT * FROM posts WHERE slug = ?')
    .bind(slug)
    .first<PostRow>()
  return row ?? null
}

function configuredAdminKey(): string | null {
  const configured = (env as typeof env & { ADMIN_DELETE_KEY?: string })
    .ADMIN_DELETE_KEY
  const trimmed = configured?.trim()
  return trimmed ? trimmed : null
}

function assertAdmin(inputKey?: string): void {
  const configured = configuredAdminKey()
  if (!configured) return
  if (inputKey !== configured) {
    throw new Error('Admin key required')
  }
}

async function getPostFamily(rootSlug: string): Promise<PostRow[]> {
  const result = await env.DB.prepare(
    `WITH RECURSIVE family AS (
       SELECT * FROM posts WHERE slug = ?
       UNION
       SELECT p.* FROM posts p
       JOIN family f ON p.forked_from = f.slug
     )
     SELECT * FROM family ORDER BY created_at ASC`,
  )
    .bind(rootSlug)
    .all<PostRow>()

  return (result.results ?? []) as PostRow[]
}

async function deletePostFamilyRows(rootSlug: string): Promise<number> {
  const result = await env.DB.prepare(
    `WITH RECURSIVE family(slug) AS (
       SELECT slug FROM posts WHERE slug = ?
       UNION
       SELECT p.slug FROM posts p
       JOIN family f ON p.forked_from = f.slug
     )
     DELETE FROM posts WHERE slug IN (SELECT slug FROM family)`,
  )
    .bind(rootSlug)
    .run()

  return result.meta.changes ?? 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Server functions
// ─────────────────────────────────────────────────────────────────────────────

export const listPosts = createServerFn({ method: 'GET' }).handler(async () => {
  const result = await env.DB.prepare(
    'SELECT * FROM posts ORDER BY created_at DESC LIMIT 100',
  ).all<PostRow>()
  return (result.results ?? []) as PostRow[]
})

export const getPost = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string; sha?: string }) => data)
  .handler(async ({ data }): Promise<PostView | null> => {
    const post = await getPostBySlug(data.slug)
    if (!post) return null

    const rendered = await readPost(
      env,
      post.repo_name,
      post.remote,
      data.sha,
    )
    return {
      post,
      markdown: rendered.markdown,
      html: renderMarkdown(rendered.markdown),
      sha: rendered.sha,
      isHistorical: Boolean(data.sha) && data.sha !== post.current_sha,
    }
  })

export const createPost = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      title: string
      author?: string
      summary?: string
      body: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const title = data.title.trim()
    if (!title) throw new Error('Title is required')
    const body = data.body.trim()
    if (!body) throw new Error('Body is required')

    const author = (data.author?.trim() || 'anonymous').slice(0, 60)
    const summary = data.summary?.trim() || null
    const slug = await uniqueSlug(slugify(title))
    const repoName = repoNameFor(slug)
    const now = Date.now()

    const meta: PostMeta = {
      title,
      author,
      summary: summary ?? undefined,
      createdAt: new Date(now).toISOString(),
    }

    const { remote, sha } = await createPostRepo(env, repoName, body, meta)

    await env.DB.prepare(
      `INSERT INTO posts (slug, title, author, summary, namespace, repo_name, remote, current_sha, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(slug, title, author, summary, 'blog', repoName, remote, sha, now, now)
      .run()

    return { slug }
  })

export const editPost = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { slug: string; title: string; summary?: string; body: string; message?: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const post = await getPostBySlug(data.slug)
    if (!post) throw new Error(`Post not found: ${data.slug}`)
    const title = data.title.trim() || post.title
    const summary = data.summary?.trim() || post.summary || undefined
    const body = data.body.trim()
    if (!body) throw new Error('Body is required')

    const meta: PostMeta = {
      title,
      author: post.author,
      summary,
      createdAt: new Date(post.created_at).toISOString(),
      forkedFrom: post.forked_from ?? undefined,
    }

    const message = (data.message?.trim() || `Edit: ${title}`).slice(0, 140)
    const sha = await updatePost(env, post.repo_name, post.remote, body, meta, message)

    await env.DB.prepare(
      `UPDATE posts SET title = ?, summary = ?, current_sha = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(title, summary ?? null, sha, Date.now(), post.id)
      .run()

    return { slug: post.slug, sha }
  })

export const getHistory = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<{ post: PostRow; commits: CommitEntry[] } | null> => {
    const post = await getPostBySlug(data.slug)
    if (!post) return null
    const commits = await readHistory(env, post.repo_name, post.remote)
    return { post, commits }
  })

export const forkPost = createServerFn({ method: 'POST' })
  .inputValidator((data: { slug: string; author?: string }) => data)
  .handler(async ({ data }) => {
    const source = await getPostBySlug(data.slug)
    if (!source) throw new Error(`Post not found: ${data.slug}`)

    const forkSlugBase = `${source.slug}-fork`
    const slug = await uniqueSlug(forkSlugBase)
    const repoName = repoNameFor(slug)
    const author = (data.author?.trim() || 'anonymous').slice(0, 60)

    const { remote, sha } = await forkPostRepo(
      env,
      source.repo_name,
      repoName,
      `Fork of ${source.title}`,
    )

    const now = Date.now()
    await env.DB.prepare(
      `INSERT INTO posts (slug, title, author, summary, namespace, repo_name, remote, current_sha, forked_from, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        slug,
        `Fork: ${source.title}`,
        author,
        source.summary,
        'blog',
        repoName,
        remote,
        sha,
        source.slug,
        now,
        now,
      )
      .run()

    return { slug }
  })

/**
 * Mint a short-lived read/write token so a visitor can both `git clone` and
 * `git push` to the post's repo.
 *
 * NOTE: this is a public, unauthenticated demo — anyone loading the post page
 * can request a token and push commits directly to `main`. Don't reuse this
 * pattern verbatim for anything with real editorial authority.
 */
export const mintCloneToken = createServerFn({ method: 'POST' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const post = await getPostBySlug(data.slug)
    if (!post) throw new Error(`Post not found: ${data.slug}`)
    const repo = await env.ARTIFACTS.get(post.repo_name)
    const token = await repo.createToken('write', 900)
    return {
      remote: post.remote,
      token: token.plaintext,
      expiresAt: token.expiresAt,
    }
  })

export const listAdminState = createServerFn({ method: 'GET' })
  .inputValidator((data?: { adminKey?: string }) => data ?? {})
  .handler(async ({ data }): Promise<AdminState> => {
    assertAdmin(data.adminKey)

    const postResult = await env.DB.prepare(
      `SELECT p.*,
              (SELECT COUNT(*) FROM posts child WHERE child.forked_from = p.slug) AS fork_count
       FROM posts p
       ORDER BY p.created_at DESC
       LIMIT 500`,
    ).all<AdminPostRow>()
    const posts = (postResult.results ?? []) as AdminPostRow[]

    const slugByRepo = new Map(posts.map((post) => [post.repo_name, post.slug]))
    const repos: AdminRepoRow[] = []
    let cursor: string | undefined
    do {
      const page = await env.ARTIFACTS.list({ limit: 200, cursor })
      repos.push(
        ...page.repos.map((repo) => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          defaultBranch: repo.defaultBranch,
          createdAt: repo.createdAt,
          updatedAt: repo.updatedAt,
          lastPushAt: repo.lastPushAt,
          source: repo.source,
          readOnly: repo.readOnly,
          indexedSlug: slugByRepo.get(repo.name) ?? null,
        })),
      )
      cursor = page.cursor
    } while (cursor)

    return {
      posts,
      repos,
      adminKeyConfigured: Boolean(configuredAdminKey()),
    }
  })

export const previewDeleteFamily = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string; adminKey?: string }) => data)
  .handler(async ({ data }): Promise<PostRow[]> => {
    assertAdmin(data.adminKey)
    const family = await getPostFamily(data.slug)
    if (family.length === 0) throw new Error(`Post not found: ${data.slug}`)
    return family
  })

export const deletePostFamily = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { slug: string; confirm: string; adminKey?: string }) => data,
  )
  .handler(async ({ data }): Promise<DeleteFamilyResult> => {
    assertAdmin(data.adminKey)

    const slug = data.slug.trim()
    if (!slug) throw new Error('Slug is required')
    if (data.confirm !== `DELETE ${slug}`) {
      throw new Error(`Type DELETE ${slug} to confirm`)
    }

    const family = await getPostFamily(slug)
    if (family.length === 0) throw new Error(`Post not found: ${slug}`)

    const deletedRepos: DeleteFamilyResult['deletedRepos'] = []
    for (const post of family) {
      try {
        const deleted = await env.ARTIFACTS.delete(post.repo_name)
        deletedRepos.push({ name: post.repo_name, deleted })
      } catch (err) {
        throw new Error(
          `Stopped before deleting D1 rows: failed to delete ${post.repo_name}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    const deletedRows = await deletePostFamilyRows(slug)
    if (deletedRows !== family.length) {
      throw new Error(
        `Deleted ${deletedRepos.length} Artifacts repos, but D1 removed ${deletedRows}/${family.length} rows. Refresh before retrying.`,
      )
    }

    return { rootSlug: slug, deletedPosts: family, deletedRepos }
  })

export const deleteOrphanArtifactRepo = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { repoName: string; confirm: string; adminKey?: string }) => data,
  )
  .handler(async ({ data }): Promise<DeleteRepoResult> => {
    assertAdmin(data.adminKey)

    const repoName = data.repoName.trim()
    if (!repoName) throw new Error('Repo name is required')
    if (data.confirm !== `DELETE ${repoName}`) {
      throw new Error(`Type DELETE ${repoName} to confirm`)
    }

    const linked = await env.DB.prepare('SELECT slug FROM posts WHERE repo_name = ?')
      .bind(repoName)
      .first<{ slug: string }>()
    if (linked) {
      throw new Error(
        `Repo ${repoName} is indexed as /posts/${linked.slug}; delete the post lineage instead so D1 stays consistent.`,
      )
    }

    const deleted = await env.ARTIFACTS.delete(repoName)
    return { repoName, deleted }
  })

export const deleteOrphanArtifactRepos = createServerFn({ method: 'POST' })
  .inputValidator((data: { confirm: string; adminKey?: string }) => data)
  .handler(async ({ data }): Promise<DeleteOrphansResult> => {
    assertAdmin(data.adminKey)
    if (data.confirm !== 'DELETE ORPHANS') {
      throw new Error('Type DELETE ORPHANS to confirm')
    }

    const indexedResult = await env.DB.prepare(
      'SELECT repo_name FROM posts LIMIT 10000',
    ).all<{ repo_name: string }>()
    const indexed = new Set(
      ((indexedResult.results ?? []) as { repo_name: string }[]).map(
        (row) => row.repo_name,
      ),
    )

    const orphanNames: string[] = []
    let cursor: string | undefined
    do {
      const page = await env.ARTIFACTS.list({ limit: 200, cursor })
      orphanNames.push(
        ...page.repos
          .map((repo) => repo.name)
          .filter((name) => !indexed.has(name)),
      )
      cursor = page.cursor
    } while (cursor)

    const deletedRepos: DeleteOrphansResult['deletedRepos'] = []
    for (const name of orphanNames) {
      const deleted = await env.ARTIFACTS.delete(name)
      deletedRepos.push({ name, deleted })
    }

    return { deletedRepos }
  })
