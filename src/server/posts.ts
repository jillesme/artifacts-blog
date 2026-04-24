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
 * Mint a short-lived read token so a visitor can `git clone` the post.
 * This is the "git clone your blog post" demo.
 */
export const mintCloneToken = createServerFn({ method: 'POST' })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const post = await getPostBySlug(data.slug)
    if (!post) throw new Error(`Post not found: ${data.slug}`)
    const repo = await env.ARTIFACTS.get(post.repo_name)
    const token = await repo.createToken('read', 900)
    return {
      remote: post.remote,
      token: token.plaintext,
      expiresAt: token.expiresAt,
    }
  })
