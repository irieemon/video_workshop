-- Add Stripe billing fields to profiles table
-- Migration: 20250103_stripe_billing.sql

-- Add Stripe customer ID
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add Stripe subscription ID
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

-- Add subscription status
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'
CHECK (subscription_status IN ('none', 'active', 'past_due', 'cancelled', 'trialing', 'incomplete'));

-- Create index for faster lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON public.profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Add payment_history table for audit trail
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  description TEXT,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment history
CREATE POLICY "Users can view own payment history"
  ON public.payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for payment history lookups
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id
ON public.payment_history(user_id);

-- Add function to reset monthly usage (called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET usage_current = jsonb_set(
    jsonb_set(
      usage_current,
      '{videos_this_month}',
      '0'::jsonb
    ),
    '{consultations_this_month}',
    '0'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check quota before operation
CREATE OR REPLACE FUNCTION check_usage_quota(
  p_user_id UUID,
  p_resource TEXT -- 'videos', 'projects', or 'consultations'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current INTEGER;
  v_quota INTEGER;
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE p_resource
    WHEN 'videos' THEN
      v_current := (v_profile.usage_current->>'videos_this_month')::INTEGER;
      v_quota := (v_profile.usage_quota->>'videos_per_month')::INTEGER;
    WHEN 'projects' THEN
      v_current := (v_profile.usage_current->>'projects')::INTEGER;
      v_quota := (v_profile.usage_quota->>'projects')::INTEGER;
    WHEN 'consultations' THEN
      v_current := (v_profile.usage_current->>'consultations_this_month')::INTEGER;
      v_quota := (v_profile.usage_quota->>'consultations_per_month')::INTEGER;
    ELSE
      RETURN FALSE;
  END CASE;

  RETURN v_current < v_quota;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add increment functions for each resource type
CREATE OR REPLACE FUNCTION increment_video_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET usage_current = jsonb_set(
    usage_current,
    '{videos_this_month}',
    to_jsonb((usage_current->>'videos_this_month')::int + 1)
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_project_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET usage_current = jsonb_set(
    usage_current,
    '{projects}',
    to_jsonb((usage_current->>'projects')::int + 1)
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Current subscription status from Stripe';
COMMENT ON TABLE public.payment_history IS 'Audit trail of all payments processed through Stripe';
