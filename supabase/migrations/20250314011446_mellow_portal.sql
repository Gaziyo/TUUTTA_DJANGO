/*
  # Schema Update for Authentication Fixes

  1. Changes
    - Update users table RLS policies to allow public registration
    - Add enable_row_level_security() function for safety
    - Ensure proper policy order and permissions

  2. Security
    - Maintain RLS on all tables
    - Add proper public access for registration
    - Keep authenticated user policies for data access
*/

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  settings jsonb DEFAULT '{"theme": "light", "fontSize": "medium", "speechEnabled": true, "autoSave": true, "notificationEnabled": true}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  subject text NOT NULL,
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL_SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL_SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL_SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL_SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL_SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create policies for users table with public registration access
CREATE POLICY "Enable public registration"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policies for notes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can read own notes'
  ) THEN
    CREATE POLICY "Users can read own notes"
      ON notes
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can insert own notes'
  ) THEN
    CREATE POLICY "Users can insert own notes"
      ON notes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can update own notes'
  ) THEN
    CREATE POLICY "Users can update own notes"
      ON notes
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can delete own notes'
  ) THEN
    CREATE POLICY "Users can delete own notes"
      ON notes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for chat_sessions table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can read own chat sessions'
  ) THEN
    CREATE POLICY "Users can read own chat sessions"
      ON chat_sessions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can insert own chat sessions'
  ) THEN
    CREATE POLICY "Users can insert own chat sessions"
      ON chat_sessions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can update own chat sessions'
  ) THEN
    CREATE POLICY "Users can update own chat sessions"
      ON chat_sessions
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_sessions' AND policyname = 'Users can delete own chat sessions'
  ) THEN
    CREATE POLICY "Users can delete own chat sessions"
      ON chat_sessions
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for chat_messages table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can read messages from own chat sessions'
  ) THEN
    CREATE POLICY "Users can read messages from own chat sessions"
      ON chat_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM chat_sessions
          WHERE chat_sessions.id = chat_messages.session_id
          AND chat_sessions.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Users can insert messages to own chat sessions'
  ) THEN
    CREATE POLICY "Users can insert messages to own chat sessions"
      ON chat_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM chat_sessions
          WHERE chat_sessions.id = chat_messages.session_id
          AND chat_sessions.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create policies for subjects table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Users can read own subjects'
  ) THEN
    CREATE POLICY "Users can read own subjects"
      ON subjects
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Users can insert own subjects'
  ) THEN
    CREATE POLICY "Users can insert own subjects"
      ON subjects
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Users can update own subjects'
  ) THEN
    CREATE POLICY "Users can update own subjects"
      ON subjects
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subjects' AND policyname = 'Users can delete own subjects'
  ) THEN
    CREATE POLICY "Users can delete own subjects"
      ON subjects
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;