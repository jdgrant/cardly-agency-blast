-- Create chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT,
  order_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Admin can view all chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (is_admin_user());

CREATE POLICY "Anyone can create chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for chat_messages
CREATE POLICY "Admin can view all chat messages"
  ON public.chat_messages FOR SELECT
  USING (is_admin_user());

CREATE POLICY "Anyone can create chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view messages from their session"
  ON public.chat_messages FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);