-- InstantHost Database Schema (SQLite Version)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Magic Links Table
CREATE TABLE IF NOT EXISTS magic_links (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Publishes Table
CREATE TABLE IF NOT EXISTS publishes (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  claim_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_anonymous BOOLEAN DEFAULT 1,
  expires_at DATETIME,
  current_version_id TEXT,
  pending_version_id TEXT,
  viewer_title TEXT,
  viewer_description TEXT,
  viewer_og_image_path TEXT,
  ttl_seconds INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Publish Versions Table
CREATE TABLE IF NOT EXISTS publish_versions (
  id TEXT PRIMARY KEY,
  publish_id TEXT REFERENCES publishes(id) ON DELETE CASCADE,
  files TEXT NOT NULL, -- JSON string
  upload_expires_at DATETIME NOT NULL,
  finalized_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Site Views Table
CREATE TABLE IF NOT EXISTS site_views (
  site_id TEXT PRIMARY KEY REFERENCES publishes(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  event_type TEXT DEFAULT 'publish.finalized',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
