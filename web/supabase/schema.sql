-- ==============================================================================
-- D&D Campaign Notes - PostgreSQL / Supabase Schema
-- ==============================================================================

-- 1. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    system TEXT DEFAULT 'D&D 5e',
    chapter TEXT,
    vault_prefix TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default campaign
INSERT INTO campaigns (id, name, tagline, system, chapter, vault_prefix)
VALUES (
    'starving-vilgeismar',
    'Starving Vilgeismar',
    'A gothic city under siege, hunger gnawing at the lower quarters while shadows stir in the canals.',
    'D&D 5e',
    'Chapter 1: The Withered Reach',
    'Starving Vilgeismar'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    vault_prefix = EXCLUDED.vault_prefix;

-- 2. Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    lead TEXT,
    summary TEXT,
    visibility TEXT DEFAULT 'party',
    character TEXT,
    tags TEXT[] DEFAULT '{}',
    aliases TEXT[] DEFAULT '{}',
    raw_content TEXT NOT NULL,
    body TEXT NOT NULL,
    frontmatter JSONB DEFAULT '{}'::jsonb,
    tasks JSONB DEFAULT '[]'::jsonb,
    links TEXT[] DEFAULT '{}',
    backlinks TEXT[] DEFAULT '{}',
    mtime BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_notes_campaign_path UNIQUE (campaign_id, path)
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_notes_campaign_category ON notes(campaign_id, category);
CREATE INDEX IF NOT EXISTS idx_notes_campaign_status ON notes(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(campaign_id, visibility, character);
CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(campaign_id, path);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN (tags);

-- Function & Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notes_updated_at ON notes;
CREATE TRIGGER set_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated or anon clients with API key to read/write for now
DROP POLICY IF EXISTS "Public access to campaigns" ON campaigns;
CREATE POLICY "Public access to campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to notes" ON notes;
CREATE POLICY "Public access to notes" ON notes FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for the notes table
-- (Supabase Realtime listens to replication on the publication)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notes;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore if supabase_realtime publication is managed by supabase dashboard
        NULL;
END $$;
