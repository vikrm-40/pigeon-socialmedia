-- Remove poll-related columns from posts table
ALTER TABLE public.posts 
DROP COLUMN IF EXISTS poll_question,
DROP COLUMN IF EXISTS poll_options,
DROP COLUMN IF EXISTS poll_votes;