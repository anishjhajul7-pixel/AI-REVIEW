-- ============================================================================
-- BD Clarity (by Banao Digital) — Master Integration Audit
-- Fix: feedback_pages never enforced the business's own status
-- ============================================================================
-- Found during a direct audit of this view's definition (0002_qr_feedback.sql):
-- it filtered only on the feedback LINK's own is_active flag, never on
-- businesses.status. This meant Super Admin suspending or deactivating a
-- business (an existing, already-built control) had no effect on that
-- business's real, live, customer-facing feedback page — customers could
-- keep scanning the QR code and submitting feedback/reviews to a business
-- Super Admin had explicitly suspended.
--
-- Both 'inactive' and 'suspended' are explicit, admin-set non-active states
-- (the same admin-only BusinessStatusControl offers both) — either means
-- "this business should not be operating publicly," matching the same
-- `!== 'active'` rule already used for owner_entitlements.subscription_status.
-- ============================================================================

-- IMPORTANT: this view also carries b.brand_theme (added later by the
-- Brand & Experience feature) — CREATE OR REPLACE VIEW cannot drop a
-- column, so every existing column must be preserved exactly, in the
-- same order, with only the WHERE clause changing.
create or replace view public.feedback_pages as
select
  fl.public_code,
  fl.tags,
  fl.is_active,
  b.business_name,
  b.category,
  b.city,
  b.logo_url,
  b.google_review_url,
  b.brand_theme
from public.feedback_links fl
join public.businesses b on b.id = fl.business_id
where fl.is_active = true
  and b.status = 'active';

comment on view public.feedback_pages is
  'Public-safe read model for /feedback/[code]. Deliberately excludes business_id, owner_id, phone, email, address, and website. Also requires the business itself to be active — a suspended or inactive business (an explicit Super Admin action) now correctly stops resolving here, not just in the admin UI.';

-- The identical bug, confirmed present in customer_pulse_pages too
-- (0004_module6_customer_intelligence.sql) — same join, same missing
-- status check, same fix.
create or replace view public.customer_pulse_pages as
select
  p.public_code,
  p.question,
  p.options,
  p.is_active,
  p.starts_at,
  p.ends_at,
  b.business_name,
  b.logo_url
from public.customer_pulse_polls p
join public.businesses b on b.id = p.business_id
where p.is_active = true
  and (p.starts_at is null or p.starts_at <= now())
  and (p.ends_at is null or p.ends_at >= now())
  and b.status = 'active';
