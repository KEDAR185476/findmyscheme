
-- Add derived eligibility columns
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS income_range text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS residency text DEFAULT 'rural';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS occupation_type text;

-- Remove sensitive document columns (aadhaar, pan) — only derived attributes stored
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS aadhaar_number;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS pan_number;
