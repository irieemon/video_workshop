-- Migration: Add terms acceptance tracking to profiles
-- Purpose: GDPR/CCPA compliance - track user consent for Terms of Service and Privacy Policy

-- Add terms acceptance columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS privacy_version VARCHAR(20) DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS consent_method VARCHAR(50) DEFAULT 'signup_form';

-- Create index for compliance queries (find users who accepted specific versions)
CREATE INDEX IF NOT EXISTS idx_profiles_terms_version ON profiles(terms_version);
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_version ON profiles(privacy_version);

-- Create consent audit log table for GDPR compliance
CREATE TABLE IF NOT EXISTS consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- 'terms', 'privacy', 'marketing', etc.
  consent_version VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'accepted', 'withdrawn'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on consent_audit_log
ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own consent records
CREATE POLICY "Users can view own consent audit log"
  ON consent_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can insert their own consent records
CREATE POLICY "Users can insert own consent records"
  ON consent_audit_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_consent_audit_user_id ON consent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_type ON consent_audit_log(consent_type);

-- Function to log consent changes (can be called from application)
CREATE OR REPLACE FUNCTION log_consent(
  p_user_id UUID,
  p_consent_type VARCHAR(50),
  p_consent_version VARCHAR(20),
  p_action VARCHAR(20),
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO consent_audit_log (user_id, consent_type, consent_version, action, ip_address, user_agent)
  VALUES (p_user_id, p_consent_type, p_consent_version, p_action, p_ip_address, p_user_agent)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_consent TO authenticated;

COMMENT ON TABLE consent_audit_log IS 'GDPR-compliant audit trail for user consent actions';
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Timestamp when user accepted Terms of Service';
COMMENT ON COLUMN profiles.terms_version IS 'Version of Terms of Service that was accepted';
COMMENT ON COLUMN profiles.privacy_accepted_at IS 'Timestamp when user accepted Privacy Policy';
COMMENT ON COLUMN profiles.privacy_version IS 'Version of Privacy Policy that was accepted';
COMMENT ON COLUMN profiles.consent_method IS 'How consent was obtained: signup_form, oauth, etc.';
