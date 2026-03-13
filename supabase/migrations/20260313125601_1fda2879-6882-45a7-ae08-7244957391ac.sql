
-- Create user_profiles table for storing derived attributes (NOT raw documents)
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  dob DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  state TEXT,
  district TEXT,
  income INTEGER,
  category TEXT CHECK (category IN ('APL', 'BPL', 'AAY')),
  caste_category TEXT CHECK (caste_category IN ('General', 'OBC', 'SC', 'ST')),
  pan_number TEXT,
  aadhaar_number TEXT,
  employment_status TEXT,
  education_level TEXT,
  marital_status TEXT,
  has_disability BOOLEAN DEFAULT false,
  land_ownership TEXT,
  has_bank_account BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- OTP verification table
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved schemes table
CREATE TABLE public.saved_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  scheme_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone, scheme_id)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_schemes ENABLE ROW LEVEL SECURITY;

-- OTP codes: allow edge functions to manage (no direct client access)
-- Using service_role in edge functions, so no public policies needed for otp_codes

-- user_profiles: users can read/update only their own profile (matched by phone from JWT)
-- For now, allow edge function access via service_role. Public policies will be added with auth.

-- saved_schemes: similarly managed via edge functions

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for OTP lookup
CREATE INDEX idx_otp_phone_code ON public.otp_codes (phone, code, expires_at);
CREATE INDEX idx_saved_schemes_phone ON public.saved_schemes (phone);
