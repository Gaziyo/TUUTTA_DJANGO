/*
  # Add Chat Message Persistence

  1. New Tables
    - `chat_messages_history`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `role` (text)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users to access their own messages
*/

-- Create chat messages history table
CREATE TABLE IF NOT EXISTS chat_messages_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE chat_messages_history ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages_history table
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
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages_history.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Add index for faster message retrieval
CREATE INDEX IF NOT EXISTS chat_messages_history_session_id_idx 
  ON chat_messages_history(session_id);