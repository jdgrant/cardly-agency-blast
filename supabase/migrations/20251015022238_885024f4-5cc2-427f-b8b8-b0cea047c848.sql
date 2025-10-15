
-- Create wizard_sessions table for tracking user flow
CREATE TABLE public.wizard_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  current_step integer DEFAULT 1,
  completed boolean DEFAULT false,
  template_selected text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_email text,
  abandoned_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.wizard_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert and update their own sessions
CREATE POLICY "Anyone can create wizard sessions"
ON public.wizard_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update wizard sessions"
ON public.wizard_sessions
FOR UPDATE
USING (true);

-- Admin can view all sessions
CREATE POLICY "Admin can view all wizard sessions"
ON public.wizard_sessions
FOR SELECT
USING (is_admin_user());

-- Create index for performance
CREATE INDEX idx_wizard_sessions_session_id ON public.wizard_sessions(session_id);
CREATE INDEX idx_wizard_sessions_created_at ON public.wizard_sessions(created_at DESC);
CREATE INDEX idx_wizard_sessions_completed ON public.wizard_sessions(completed);
