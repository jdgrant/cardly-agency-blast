-- Fix security vulnerability: Remove public access to orders table
-- First create admin_sessions table and related infrastructure

-- Create admin_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  session_id text PRIMARY KEY,
  value boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin_sessions
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_sessions (only allow reading, no public writes)
CREATE POLICY "Allow reading admin sessions" ON public.admin_sessions FOR SELECT USING (true);

-- Create function to set admin session
CREATE OR REPLACE FUNCTION public.set_admin_session(session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.admin_sessions (session_id, value) 
  VALUES (session_id, true)
  ON CONFLICT (session_id) 
  DO UPDATE SET value = true, created_at = now();
$$;

-- Create admin check function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT value::boolean FROM public.admin_sessions WHERE session_id = current_setting('app.admin_session_id', true)),
    false
  );
$$;

-- Drop existing permissive policies that allow public access to orders
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;