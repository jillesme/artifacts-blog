-- Posts metadata. The actual content lives in Cloudflare Artifacts (Git).
-- Each post == one Artifacts repo. `current_sha` is the commit currently
-- shown on the blog; older shas can still be rendered via /history.
CREATE TABLE IF NOT EXISTS posts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  author         TEXT NOT NULL DEFAULT 'anonymous',
  summary        TEXT,
  namespace      TEXT NOT NULL DEFAULT 'blog',
  repo_name      TEXT NOT NULL,
  remote         TEXT NOT NULL,
  current_sha    TEXT NOT NULL,
  forked_from    TEXT,                -- slug of the original post, if this is a fork
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_forked_from ON posts(forked_from);
