-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Admin can view all wizard sessions" ON wizard_sessions;

-- Allow anyone to select wizard sessions (for session tracking)
CREATE POLICY "Anyone can view wizard sessions"
ON wizard_sessions
FOR SELECT
TO anon, authenticated
USING (true);

-- Keep admin-only access for the analytics admin function
-- The get_admin_orders and similar functions already check admin status