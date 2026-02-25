/*
  # Fix Chat Messages RLS Policies

  1. Changes
    - Drop and recreate RLS policies for chat_messages_history table
    - Add more permissive policy for message insertion
    - Ensure proper user access control

  2. Security
    - Maintain RLS enabled
    - Allow users to insert messages to their own chat sessions
    - Keep read access restricted to own messages
*/

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can read messages from own chat sessions" ON chat_messages_history;
DROP POLICY IF EXISTS "Users can insert messages to own chat sessions" ON chat_messages_history;

-- Recreate policies with proper conditions
CREATE POLICY "Users can read messages from own chat sessions"
  ON chat_messages_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages_history.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own chat sessions"
  ON chat_messages_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = session_id
      AND cs.user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE chat_messages_history ENABLE ROW LEVEL SECURITY;