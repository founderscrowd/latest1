/*
# Create AI Knowledge Base tables

## Purpose
Adds an editable knowledge base that admins can manage through the admin dashboard.
The AI support edge function retrieves relevant entries and includes them as
additional context when answering user questions, without replacing the existing
system prompt.

## New Tables

### 1. ai_knowledge
Stores admin-managed knowledge entries for the AI support assistant.
- id (uuid, primary key)
- title (text, not null) — short descriptive title
- question (text, not null) — the question this entry answers
- answer (text, not null) — the answer to provide
- category (text, not null) — grouping label for filtering
- keywords (text) — comma-separated keywords for search matching
- is_active (boolean, default true) — admin can deactivate entries
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

### 2. ai_knowledge_gaps
Records user questions where no useful knowledge entry was found, so admins
can identify missing information and create new entries.
- id (uuid, primary key)
- user_question (text, not null) — the question the assistant could not match
- knowledge_found (boolean, default false) — whether any entry was retrieved
- created_at (timestamptz, default now())

## Modified Tables

### ai_support_request_logs
- Added column knowledge_entry_ids (text) — comma-separated UUIDs of entries used
- Added column knowledge_found (boolean, default false) — whether any entry matched

## Security (RLS)

### ai_knowledge
- SELECT: authenticated users can read active entries (the edge function uses
  the service role key which bypasses RLS, so this policy covers any future
  direct client reads; anon is not granted access).
- INSERT/UPDATE/DELETE: only authenticated users whose profile has
  is_site_admin = true.

### ai_knowledge_gaps
- All CRUD restricted to authenticated site admins only.
- The edge function inserts gap records using the service role key (bypasses RLS).

## Important Notes
1. The edge function uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely,
   so the knowledge retrieval and gap logging work regardless of these policies.
2. Normal (non-admin) users cannot create, edit, or delete knowledge entries.
3. The existing ai_support_* tables and their policies are not modified.
4. All new tables use UUID primary keys consistent with the existing schema.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_knowledge table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  keywords TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_active
  ON ai_knowledge(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_category
  ON ai_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_search
  ON ai_knowledge USING gin(to_tsvector('english', title || ' ' || question || ' ' || answer || ' ' || COALESCE(keywords, '')));

ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;

-- Admin-only write policies (non-admins cannot create/edit/delete)
DROP POLICY IF EXISTS "admin_insert_ai_knowledge" ON ai_knowledge;
CREATE POLICY "admin_insert_ai_knowledge" ON ai_knowledge
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_site_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_ai_knowledge" ON ai_knowledge;
CREATE POLICY "admin_update_ai_knowledge" ON ai_knowledge
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_site_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_site_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_ai_knowledge" ON ai_knowledge;
CREATE POLICY "admin_delete_ai_knowledge" ON ai_knowledge
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_site_admin = true)
  );

-- Admin can read all entries (including inactive); non-admin authenticated
-- users can read active entries only (for potential future client-side use)
DROP POLICY IF EXISTS "select_ai_knowledge" ON ai_knowledge;
CREATE POLICY "select_ai_knowledge" ON ai_knowledge
  FOR SELECT TO authenticated
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_site_admin = true)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_knowledge_gaps table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_question TEXT NOT NULL,
  knowledge_found BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_created_at
  ON ai_knowledge_gaps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_found
  ON ai_knowledge_gaps(knowledge_found);

ALTER TABLE ai_knowledge_gaps ENABLE ROW LEVEL SECURITY;

-- Admin-only access to gap records
DROP POLICY IF EXISTS "admin_select_ai_knowledge_gaps" ON ai_knowledge_gaps;
CREATE POLICY "admin_select_ai_knowledge_gaps" ON ai_knowledge_gaps
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_site_admin = true)
  );

DROP POLICY IF EXISTS "admin_delete_ai_knowledge_gaps" ON ai_knowledge_gaps;
CREATE POLICY "admin_delete_ai_knowledge_gaps" ON ai_knowledge_gaps
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_site_admin = true)
  );

-- No INSERT/UPDATE policies for client roles — only the service role
-- (edge function) inserts gap records, which bypasses RLS.

-- ─────────────────────────────────────────────────────────────────────────────
-- Add knowledge tracking columns to ai_support_request_logs
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_support_request_logs' AND column_name = 'knowledge_entry_ids') THEN
    ALTER TABLE ai_support_request_logs ADD COLUMN knowledge_entry_ids TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_support_request_logs' AND column_name = 'knowledge_found') THEN
    ALTER TABLE ai_support_request_logs ADD COLUMN knowledge_found BOOLEAN DEFAULT false;
  END IF;
END $$;
