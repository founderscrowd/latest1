CREATE TABLE IF NOT EXISTS ai_support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_support_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_support_messages_conversation_id
  ON ai_support_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_support_conversations_session_id
  ON ai_support_conversations(session_id);

ALTER TABLE ai_support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ai_conversations" ON ai_support_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_ai_conversations" ON ai_support_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_ai_conversations" ON ai_support_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_ai_conversations" ON ai_support_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_ai_messages" ON ai_support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ai_support_conversations c
      WHERE c.id = ai_support_messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "insert_own_ai_messages" ON ai_support_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_support_conversations c
      WHERE c.id = ai_support_messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "delete_own_ai_messages" ON ai_support_messages
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ai_support_conversations c
      WHERE c.id = ai_support_messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );