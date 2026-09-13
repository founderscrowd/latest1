-- Request log table for AI support: tracks every request for monitoring and rate limiting
CREATE TABLE IF NOT EXISTS ai_support_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_hash TEXT,
  message_length INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  response_time_ms INTEGER,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_support_logs_user_id
  ON ai_support_request_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_support_logs_session_id
  ON ai_support_request_logs(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_support_logs_ip_hash
  ON ai_support_request_logs(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_support_logs_created_at
  ON ai_support_request_logs(created_at);

ALTER TABLE ai_support_request_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write logs (not exposed to client)
CREATE POLICY "no_access_ai_support_logs_select" ON ai_support_request_logs
  FOR SELECT TO authenticated USING (false);
CREATE POLICY "no_access_ai_support_logs_insert" ON ai_support_request_logs
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "no_access_ai_support_logs_update" ON ai_support_request_logs
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "no_access_ai_support_logs_delete" ON ai_support_request_logs
  FOR DELETE TO authenticated USING (false);

-- Insert default site setting for AI support kill switch (enabled by default)
INSERT INTO site_settings (key, value, description)
VALUES ('ai_support_enabled', 'true', 'Enable or disable the AI support chatbot globally')
ON CONFLICT (key) DO NOTHING;

-- SECURITY DEFINER function for admin to toggle AI support
-- Only site admins can call this
CREATE OR REPLACE FUNCTION toggle_ai_support(enabled BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  caller_is_admin BOOLEAN;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT is_site_admin INTO caller_is_admin FROM profiles WHERE id = caller_id;

  IF caller_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: only site administrators can toggle AI support';
  END IF;

  INSERT INTO site_settings (key, value, description)
  VALUES ('ai_support_enabled', enabled::text, 'Enable or disable the AI support chatbot globally')
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();

  RETURN enabled;
END;
$$;

-- SECURITY DEFINER function to check if AI support is enabled (callable by any role)
CREATE OR REPLACE FUNCTION is_ai_support_enabled()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_value TEXT;
BEGIN
  SELECT value INTO setting_value FROM site_settings WHERE key = 'ai_support_enabled';
  RETURN COALESCE(setting_value, 'true') = 'true';
END;
$$;
