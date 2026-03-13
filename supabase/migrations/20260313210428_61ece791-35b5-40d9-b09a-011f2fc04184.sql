
-- No client access: only edge functions with service role can read/write
-- This effectively blocks all anon/authenticated direct access
CREATE POLICY "No direct client access" ON public.identity_fingerprints
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
