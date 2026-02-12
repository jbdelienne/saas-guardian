-- Add DELETE policy for checks table
CREATE POLICY "Users can delete own checks"
  ON public.checks
  FOR DELETE
  USING (auth.uid() = user_id);