
CREATE TABLE public.identity_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  fingerprint_hash text NOT NULL,
  partial_name_hash text,
  partial_dob_hash text,
  partial_phone_hash text,
  duplicate_risk_level text NOT NULL DEFAULT 'none',
  fraud_risk_score integer NOT NULL DEFAULT 0,
  fraud_risk_reasons text[] DEFAULT '{}',
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fingerprints_hash ON public.identity_fingerprints (fingerprint_hash);
CREATE INDEX idx_fingerprints_phone ON public.identity_fingerprints (phone);
CREATE INDEX idx_fingerprints_partial_dob ON public.identity_fingerprints (partial_dob_hash);

ALTER TABLE public.identity_fingerprints ENABLE ROW LEVEL SECURITY;
