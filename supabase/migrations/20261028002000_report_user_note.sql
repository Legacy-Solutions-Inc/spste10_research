-- Migration: Keep the reporter's own details separate from the AI description
--
-- reports.description holds the AI-generated text exactly as produced, so it can be
-- evaluated on its own. The reporter's quick-detail chips ("Unconscious", "Fire", ...)
-- and free-text note go in user_note instead of being edited into the AI text.
-- Existing insert/update policies already cover the new column.

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS user_note TEXT;
