/*
  # Fix Chat Messages History Table and Policies

  1. Changes
    - Drop and recreate chat_messages_history table with proper structure
    - Add proper RLS policies with simpler conditions
    - Add indexes for performance
    - Ensure proper cascade behavior

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Maintain data isolation between users
*/

-- Drop existing table and recreate with proper structure
DROP TABLE IF EXISTS chat_messages_history CASCADE;

CREATE TABLE chat_messages_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chat_messages_history_session_id_fkey 
    FOREIGN KEY (session_id) 
    REFERENCES chat_sessions(id) 
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE chat_messages_history ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX chat_messages_history_session_id_idx ON chat_messages_history(session_id);

-- Create RLS policies
CREATE POLICY "Users can read messages from own chat sessions"
  ON chat_messages_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages_history.session_id
      AND cs.user_id = auth.uid()
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