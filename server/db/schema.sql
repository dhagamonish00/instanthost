-- InstantHost Database Schema

-- Enable UUID extension (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Magic Links Table
CREATE TABLE IF NOT EXISTS magic_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table (Improvement 4)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Publishes Table
CREATE TABLE IF NOT EXISTS publishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  claim_token TEXT, -- random string for anonymous
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, deleted
  is_anonymous BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE, -- null for permanent
  current_version_id UUID, -- to be added after versions table
  pending_version_id UUID,
  viewer_title TEXT,
  viewer_description TEXT,
  viewer_og_image_path TEXT,
  ttl_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Publish Versions Table
CREATE TABLE IF NOT EXISTS publish_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publish_id UUID REFERENCES publishes(id) ON DELETE CASCADE,
  files JSONB NOT NULL, -- [{ path, size, contentType, storageKey }]
  upload_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add current_version_id FB
ALTER TABLE publishes ADD CONSTRAINT fk_current_version FOREIGN KEY (current_version_id) REFERENCES publish_versions(id) ON DELETE SET NULL;
ALTER TABLE publishes ADD CONSTRAINT fk_pending_version FOREIGN KEY (pending_version_id) REFERENCES publish_versions(id) ON DELETE SET NULL;

-- Site Views Table (Improvement 5)
CREATE TABLE IF NOT EXISTS site_views (
  site_id UUID PRIMARY KEY REFERENCES publishes(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks Table (Improvement 8)
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- KV Store (AgentDeploy Feature)
CREATE TABLE IF NOT EXISTS kv_store (
  site_id UUID PRIMARY KEY REFERENCES publishes(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
