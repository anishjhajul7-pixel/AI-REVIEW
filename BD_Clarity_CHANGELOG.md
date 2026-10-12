# BD Clarity — Change Log

## Rename Note

The product's working name changed from "BD Voice" to "BD Clarity" — the actual name that existed in code before this was "Digital Review AI" (the Module 1 working name); "BD Voice" was only ever used in our conversation, never written into the codebase. This rename touched exactly one file, `src/lib/config/branding.ts`, plus one non-functional code comment in `globals.css` — confirming the Module 1 architectural decision to centralize the product name in one place worked as intended: zero components had the name hardcoded.

## Audit — Action Engine Milestones 1–3, complete verification pass

**No functional changes made during this audit** — verification only, per explicit instruction.

**Result: all checks passed.** Full findings in the audit report delivered alongside this changelog entry. Summary:
- `tsc`/`eslint`/`build` all clean, 22 routes, no dead routes
- Byte-level comparison confirmed zero drift in: Super Admin Panel, Google OAuth integration, customer-facing flow, review-generation engine, Segment Engine, Customer Pulse, Customer Brain core files (`customerVoice.ts`, `demandDetector.ts`, `period.ts`, `experienceScore.ts`)
- Live regression: recommendation pipeline, 3-state lifecycle constraint (widened but still enforced — verified both directions), baseline never-overwritten guarantee, business-level isolation across all 3 Action Engine tables, Admin Panel, Segment data, customer/anon flow — all confirmed intact
- No duplicate policy/constraint names across all 13 migrations; sequence is gap-free
- All Action Engine function exports confirmed genuinely used (no dead code)

**Exact file/database inventory across Milestones 1–3:**
- Added: `src/app/dashboard/actions/page.tsx`, `src/components/dashboard/actions/ActionLifecycleControls.tsx`, migrations `0012` and `0013`
- Modified additively: `src/lib/insights/types.ts`, `src/lib/insights/businessAdvisor.ts`, `src/app/dashboard/intelligence/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/intelligence/actions.ts`, `src/types/database.ts`
- Database: `business_action_status.status` constraint widened (0012); new table `action_baseline_snapshots` with 2 RLS policies + 1 index (0013)

**UI: not visually verified — a manual testing checklist was provided instead, covering the Customer Actions page, lifecycle controls, baseline display, empty/error states, mobile layout, and isolation, with explicit Test ID → action → expected → failure format for each.**

## Audit — Action Engine Milestones 1–3 Verification Pass

**Status: audit complete, no functional/UI changes made** (per explicit instruction — findings only, no redesign).

**Finding 1 (real, actionable): `/dashboard/actions` is an orphaned route.** Confirmed by direct code search — it does not appear in `Sidebar.tsx`'s `navItems`, nor is it linked from any other page. It's fully functional and reachable by direct URL, but undiscoverable through normal navigation. Not fixed in this audit; flagged for your decision on a small, targeted follow-up.

**Finding 2 (non-issue, investigated and resolved):** one rate-limiter regression test in this audit returned an unexpected `f, f` result instead of the expected `t, f`. Investigated by reading `check_rate_limit()`'s actual source (count-then-insert logic, verified correct) and re-testing with a guaranteed-fresh scope string, which produced the correct `t, f`. The original anomaly traced to one pre-existing row under the same test scope string, not a code defect.

**All other audit items: confirmed clean.** See the full report delivered in conversation for the complete 12-point breakdown, file/database-object inventory, and manual testing checklist.

## v3.34 — Show Rich Owner Dashboard From First Login (Desktop)

**Status: complete, verified. No migration, no route change. 3 files changed.**

**Inspected before editing, not assumed:** read `computeExperienceScore()` and `computeFeedbackAnalytics()` fully first, and confirmed both already handle zero/low data safely and honestly on their own — `computeExperienceScore` already returns `score: null` below `MIN_SAMPLE_SIZE` (never a fabricated number), `computeFeedbackAnalytics` already returns zeroed buckets with no division-by-zero risk. Removing the page-level `hasEnoughData` gate around computing `heroData` was safe because of this, not a leap.

**`dashboard/page.tsx`:** removed the `if (hasEnoughData)` gate around computing `heroData` — it's now always computed whenever a business exists. `DashboardHeroCards` now renders whenever `business && heroData`, no longer requiring 5+ submissions. `GettingStartedCard` is no longer the exclusive alternative — reordered to appear *alongside/below* the rich dashboard as a smaller onboarding nudge while `!hasEnoughData`, never replacing it.

**A genuine, pre-existing inconsistency found and fixed while restructuring `DashboardHeroCards.tsx`:** the sentiment bar and Top Themes were nested *inside* the score's `!== null` conditional — meaning a business with 1–4 real submissions (enough for sentiment, not enough for the score specifically) saw sentiment and themes hidden entirely, even though that data was genuinely available. Restructured so each section — score, sentiment, themes — independently shows its own real data or its own honest empty state, not bound to the score's own threshold.

**Requested empty-state copy applied precisely:** Experience Score → "Not enough data yet" (was "Starting to learn"); Sentiment → "Customer sentiment will appear as feedback arrives" (applied consistently in both places it appears — the hero card and the separate Understand card, which previously said something different in each spot). Top Themes and Recent Reviews, which previously vanished silently (`&&`-gated or `return null`) when empty, now show a short, honest explanatory line instead.

**A second genuine bug found and fixed, not just styled around:** `computeFeedbackAnalytics()` always returns a full 8-bucket `weeklyTrend` regardless of data — every bucket just has `count: 0` when there's nothing to show. This meant `TrendSparkline`'s existing `weeklyTrend.length < 2` empty-state check could never actually trigger; with zero feedback it would have silently drawn a flat, real-but-confusing zero-line instead of a clear "no data yet" message. Fixed by checking whether *any* bucket has real data, not just the array's length.

**A deliberate scope decision, stated plainly rather than silently decided:** `MobileHome.tsx` was **not** touched. It has its own, already well-designed zero-data state (a branded Listen/Understand/Act preview, confirmed by its own pre-existing code comment to be an intentional design, not a gap) and wasn't named in this request. Touching it would have meaningfully expanded this change beyond "the smallest possible change." Flagged for a follow-up decision rather than assumed either way.

**Verified empirically, not just by reading the code:** ran the real `computeFeedbackAnalytics`/`computeExperienceScore` functions directly against three real scenarios — zero submissions, 3 submissions (below the 5-threshold), 6 submissions (above it). Confirmed precisely: zero feedback → every section's empty state correctly triggers, nothing renders fabricated. 3 submissions → the score honestly stays `null` while sentiment/trend/themes — which genuinely have data — correctly render for the first time. 6 submissions → full rich dashboard, real score.

**Diff-verified:** filtered every changed line across all 3 files for any authorization/subscription/data-query pattern (`requireActiveOwner`, `subscriptionBlocked`, `owner_id`, `auth.uid`, `getActiveBusiness(`, etc.) and found zero matches — confirming the change is purely the threshold gate and empty-state presentation, nothing in the security or data model was touched.

**Full regression:** owner business/feedback/entitlement data, admin role resolution, the public feedback page, and `audit_logs` all re-confirmed unchanged.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED** — this change has not been seen rendered.

## v3.33 — Master Integration Audit, Batch 4: Entitlement & Workspace Synchronization Proofs

**Status: pure verification batch. Zero code files changed — confirmed by diffing against the Batch 3 checkpoint and finding nothing. No fix was needed because no defect was found; every scenario confirmed existing behavior is already correct.**

**An important architectural clarification, not a bug, resolved for Scenario 9:** investigated whether `subscription_status` and `expiry_date` could ever drift into an inconsistent, exploitable state (e.g., an admin reactivating status to "active" while `expiry_date` is still in the past). Confirmed by reading every relevant piece of code and every migration that **zero auto-reconciliation exists anywhere** between these two fields — `subscription_status` is the sole, manually-set authoritative field throughout this entire codebase, confirmed by `getPlatformMetrics()`'s own "expired" count trusting it directly rather than computing from the date. `requireActiveOwner()` is therefore correctly designed as-is: adding a second, date-based enforcement check would *contradict* this established single-source-of-truth pattern and could create confusing inconsistency between what the dashboard shows and what access is actually granted. No change made.

**An honest, additional residual-risk finding, not fixed here:** confirmed the workspace limit (`max_businesses`) is enforced only at the application layer, inside `createBusiness()` — the `businesses_insert_own` RLS policy has no count-based check. This is a narrower, different threat model than "a direct server-action call" (explicitly tested and confirmed blocked below) — it would require bypassing the Next.js server action entirely via a raw API call. Flagged for awareness, not unilaterally fixed, since it wasn't one of the listed scenarios and a DB-trigger-based fix is a real architectural addition deserving its own dedicated review.

**All 10 required scenarios verified against real Postgres, using real existing test fixtures (Owner A/B) for read-only/isolation checks and the real entitlement-update path for every mutation, with full restoration confirmed after each:**

1. Active owner access — confirmed (4 businesses, `active` status).
2. Suspended owner: denied writes / unaffected reads — re-confirmed (already proven in Batch 2).
3. Non-active entitlement blocks protected access — tested **all three** non-active statuses individually (`expired`, `suspended`, `disabled`), each correctly reflected in the guard's query while reads remained completely unaffected; restored after each.
4. Workspace-limit enforcement — Owner A is naturally at the real limit (4 of 4); simulated the exact `count >= maxBusinesses` comparison `createBusiness()` runs and confirmed it correctly evaluates to blocked.
5. Two independent workspaces, same owner, separate scoped data — confirmed with real data: one of Owner A's 4 real businesses has 6 feedback submissions, the other 3 have zero — genuinely isolated, not shared.
6. Workspace switching never leaks data — verified at the code level: `getActiveBusiness()`'s `businesses` array is already scoped to `owner_id = user.id` via RLS *before* the active-business cookie is ever consulted; the cookie only `.find()`s within that pre-scoped array, with a safe fallback to the owner's own first business if tampered. Confirmed by reading the code's own pre-existing, explicit security-design comment, not a new finding.
7. Cross-owner isolation by ID manipulation — Owner A reading or updating Owner B's business by ID: 0 rows / 0 rows affected.
8. A Super Admin entitlement change affects only the intended owner — suspended Owner A, confirmed Owner B's entitlement state was completely unaffected throughout, restored Owner A.
9. Reactivation cannot bypass a restrictive entitlement — resolved as the architectural clarification above.
10. Missing/boundary entitlement values — confirmed an owner with zero `owner_entitlements` rows exists as a real, valid state in this data, matching `requireActiveOwner()`'s documented "not yet configured, not a restriction" handling.

**Database verification (real, executed):** every scenario above. **Automated test suite: still does not exist in this project** (unchanged from Batch 3's finding). **Browser/live-integration verification: NOT PERFORMED.**

**Typecheck/Lint/Build:** all PASS — 34 routes, 25 migrations, both unchanged (no code or schema change this batch).

## v3.32 — Master Integration Audit, Batch 3: Super Admin Link Audit — Verified

**Status: complete, fully verified. No migration — the existing `audit_logs` table and its indexes were sufficient. 7 files changed (3 new).**

**Honest correction on test infrastructure, confirmed by reading `package.json` directly:** this project has no automated test suite — no test runner script, zero `.test.ts`/`.spec.ts` files anywhere, true throughout this entire project. "Regression suite" here has always meant direct empirical verification against a real local Postgres instance, reported precisely that way below, not implied to be a Jest/Vitest suite that doesn't exist.

**Complete link inventory, finished before any fix:** audited every dashboard card/metric, nav link, table row action, detail-page link, search/filter control, entitlement action, and communications/notifications action across all 10 Super Admin pages. Found exactly the 3 named mismatches, nothing additional.

**A. Audit Trail — fixed and verified.** Built `/admin/audit-log`, reusing the existing `audit_logs` table and its pre-existing `audit_logs_select_admin` RLS policy — no new table, no new policy, no duplicate data source.
- **Authorization tested at both the RLS and application layers, not assumed:** confirmed via real Postgres queries that `super_admin` and `support_admin` both read successfully, an authenticated owner gets exactly 0 rows, and anon gets exactly 0 rows. Separately confirmed by reading `getCurrentAdmin()`'s actual implementation that it returns `null` for both the unauthenticated and non-admin cases, meaning `searchAuditLogs()`'s own check rejects both *before* the RLS-protected query even runs — a genuine double layer, not a single point of failure.
- **Email masking confirmed applied, not just assumed:** the only place `adminEmail` is rendered in `AuditLogPanel.tsx` calls `maskEmail()`.

**B. Platform Security — fixed.** Inspected what platform-security functionality actually exists before linking anywhere; found none beyond admin-access control. Relinked honestly to `/admin/admins` ("Manage admin access"), left `/admin/security` as the correct, unchanged destination for personal MFA.

**C. Entitlements Expiring — fixed and verified against real PostgreSQL with controlled fixtures, not mocks.** Created 7 temporary `auth.users`/`owner_entitlements` fixtures (new throwaway UUIDs, zero existing data touched) covering every required case: expiring in 7 days, expiring in 20 days (inside 30, outside 7), expiring in 45 days (outside both), missing expiry date, already expired, suspended-with-in-window-date, and the exact 7-day boundary. Ran the identical query the real filter executes against all 7 — **every case matched the expected result precisely**, including the boundary case (an owner expiring in exactly 7 days was correctly included under the inclusive `<=` comparison regardless of time-of-day). Confirmed the suspended-status fixture was correctly excluded even with an in-window date — proving the status gate works independently of the date check. All fixtures deleted afterward; confirmed zero test rows remain and real owner data is unaffected.
- One environment-only snag hit and worked around, not a product bug: this sandbox's local `auth.users` mock lacks a column a pre-existing trigger function expects, requiring the trigger disabled only for the duration of fixture insertion.

**Diff reviewed across all 4 modified files — zero authorization-related lines touched anywhere**, confirmed by filtering every diff for `getCurrentAdmin`/`hasCapability`/`is_admin`/`auth.uid`/the new guards and finding nothing: every pre-existing auth check in these files is untouched.

**Typecheck/Lint/Build:** all PASS. **Route count:** 34 (confirmed +1 for `/admin/audit-log`). **Migration count:** 25 (unchanged).

**Database verification (real, executed):** general regression (owner data, public feedback page, `audit_logs` integrity), audit-log RLS across 4 roles, and the full 7-case entitlement-expiry suite — all run directly against this environment's local Postgres instance.

**Automated test suite: does not exist in this project** (confirmed, not assumed).

**Browser/live-integration verification: NOT PERFORMED** — no such tooling exists in this environment.

## v3.31 — Master Integration Audit, Batch 2: Complete Server-Side Enforcement

**Status: complete. No migration. 8 files changed (1 new helper). Diff-verified: every changed line is either the new guard or a blank-line formatting artifact — confirmed by filtering the diff and finding nothing else.**

**Inventoried every dashboard action file precisely**, not assumed: grep-counted every `.insert/.update/.upsert/.delete/.rpc` call against every `guardActiveOwnerWrite`/`requireActiveOwner` call in each file, then individually verified every remaining mismatch rather than accepting the count at face value — found two, both legitimate: `listContextQuestions` (a read) auto-seeds default questions as a side effect on first load (low-risk, non-privileged, would break legitimate reads if guarded), and `publishReviewReply`'s multiple `.update()` calls all belong to one already-guarded function, not separate gaps.

**Added the write-time backstop to every remaining consequential mutation found**: `createContextQuestion`, `updateContextQuestion`, `deleteContextQuestion`, `swapQuestionOrder` (profile questions), `generateReplyDraft`, `updateReplyDraft` (review replies), `syncGoogleReviews`, `startGoogleConnect`, `finalizeConnection`, `disconnectConnection` (Google integration), `setPollActive`, `setActionStatus`, and `generateForSubmission` — the last one doesn't write to the database but does consume a real, privileged AI-generation capability, included for that reason, not because of a table write.

**Added a convenience wrapper** (`guardActiveOwnerWrite`) to reduce the repeated `getUser()` + check boilerplate across now 15+ call sites to one line each — same underlying logic as Batch 1's `requireActiveOwner`, not a second rule.

**A real mistake caught by immediate type-checking, not shipped:** used `guardActiveOwnerWrite` in `pulse/actions.ts` before it was actually imported there — `tsc` caught it instantly; fixed before moving to the next file.

**Explicit adversarial allowed/denied-path test, against real Postgres:** suspended a real owner via the actual entitlement update path, confirmed the exact query the guard runs reflects "suspended" (the denied path), *and* in the same suspended state confirmed reads (businesses, context questions, feedback submissions) remain completely unaffected (the allowed path) — not just asserted, both halves actually queried. Restored and re-confirmed normal afterward.

**Deliberately not guarded, with reasoning stated:** `markNotificationsRead` (marking one's own in-app notifications as read has no external effect, consumes no privileged resource, and exposes nothing) and the question-seeding side-effect above.

**Full regression:** admin role resolution, public feedback page, and `audit_logs` all re-confirmed unchanged.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.30 — Master Integration Audit: Owner Suspension & Business Status Enforcement

**Status: two real, confirmed synchronization gaps found and fixed. One migration. 8 files changed.**

**Architecture confirmed, not assumed:** the "one owner, multiple independent business workspaces" model (`owner_entitlements.multi_business_enabled`/`max_businesses`) is genuinely distinct from branches (`business_branches`, sub-locations within one business) — confirmed by reading both table schemas directly. No confusion exists in the data model.

**Gap #1 — found by tracing the actual code, not assumed:** `owner_entitlements.subscription_status` (the authoritative owner-suspension record — there is no separate account-status field) was computed everywhere via `computeEffectiveEntitlement()` but only ever *enforced* in one place: blocking new-business creation. Traced `getActiveBusiness()` — confirmed via its own code comment to be the resolver used by ~20 call sites across the dashboard — and found `subscriptionBlocked` was never used to restrict anything else. A suspended or disabled owner could fully use their entire existing dashboard.

**Fix #1, two layers, not just a badge:**
- **Primary (UI-level, server-rendered):** `dashboard/layout.tsx` now renders a full "Account access restricted" screen in place of the entire dashboard body — not a client-side redirect a stale tab could race past — whenever `subscriptionBlocked` is true. The header still renders so the owner can sign out, not trapped with no way out.
- **Backstop (write-time, server action level):** a new shared `requireActiveOwner()` helper, added to the 7 highest-consequence mutating actions found this session — `createBranch`, `setBranchStatus`, `setFeedbackLinkActive`, `updateFeedbackTags`, `publishReviewReply` (a real external Google-facing action), `updateBrandSettings`, `createPoll` — rejecting the write server-side even if a request reaches it directly, bypassing the UI gate. **Honestly scoped, not exhaustive**: 10 files in this codebase each maintain their own independent copy of a `getOwnedBusiness`-style resolver (a pre-existing duplication, not introduced here); the remaining mutating actions in `profile/questionsActions.ts`, `settings/google/actions.ts`, and others still rely on the layout-level block alone for now.

**Gap #2 — found by reading the actual view definitions:** `feedback_pages` and `customer_pulse_pages` (the public, customer-facing views behind `/feedback/[code]` and the Pulse poll pages) filtered only on each row's own `is_active` flag — never on `businesses.status`. A business Super Admin marks suspended or inactive (an existing, already-built control) kept a fully working public feedback/poll page; customers could keep submitting.

**Fix #2:** migration `0025` adds `and b.status = 'active'` to both views. A real mistake caught mid-migration, not shipped: the first attempt dropped `feedback_pages`' `brand_theme` column (added later by an unrelated feature) — Postgres correctly rejected `CREATE OR REPLACE VIEW` for silently dropping a column; fixed by including every existing column, not just the ones this fix cared about.

**Both fixes verified end-to-end through the real code paths, not shortcuts:**
- Suspended a real business via the actual `admin_set_business_status` RPC (the same one the real UI calls), confirmed its feedback page genuinely stopped resolving (0 rows), restored it, confirmed it worked again.
- Suspended a real owner's entitlement, confirmed the exact query `requireActiveOwner()` runs reflects it immediately (no caching, no stale read), restored it, confirmed reflected again.
- Re-confirmed cross-owner isolation explicitly: owner B gets 0 rows querying owner A's entitlement or business records.

**Full regression:** owner business/entitlement data and the public feedback page all re-confirmed correct.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Explicitly not yet done this batch** (see the accompanying report): the full backstop coverage across all 10 files' local resolvers; item 5 of the request (auditing every Super Admin metric/link for a working destination); item 6 (an owner-facing read-only plan/status view).

**Browser/device verification: NOT PERFORMED.**

## v3.29 — Real Visual Redesign, Batch 4: Customer Experience (Final Batch)

**Status: complete. One file changed. No migration, no route change. Zero business-logic changes — confirmed by filtering the diff for every core function name, the recovery flow, and the rating threshold, and finding zero matches.**

**A real conflict found and flagged, not silently resolved either way:** this task's wording asked to "preserve Edit, Regenerate and Copy actions," but the code's own comment reveals editing was **deliberately removed** in an earlier "Final CX simplification" pass ("no editable draft screen"), not an oversight. Reintroducing real text-editing would be a functional change, not a visual one, and would work against that earlier, deliberate decision — and against "do not add unnecessary customer steps." **Did not reintroduce editing.** Regenerate and Copy were upgraded from a small text link into proper, matching buttons (icon + label, 2-column row), closer to the reference's button treatment, without adding editing back. Flagging this explicitly for a decision rather than guessing.

**Visual changes made:**
- **Rating control**: emoji (😡😕😐🙂🤩) replaced with a 5-star tap control, matching the reference exactly — **same underlying 1–5 scale, same `rating >= 4` positive/recovery threshold, same 420ms tap-then-advance interaction timing** as before. A "4/5 — Pretty good" label now shows beneath the stars, matching the reference's "4/5 — Good" treatment.
- **Ready screen**: reframed as "Your review draft / Here's what we've drafted for you," matching the reference's heading structure; added a real character count; Regenerate and Copy are now visually-matched buttons instead of a text link.
- **Added the Google disclaimer line** ("You'll be taken to Google to post your review") — the reference has this, the app didn't; purely informational, no functional change.

**One reference element deliberately not built:** the reference's "You mentioned: Friendly staff ✓ / Timely service ✓" chips are AI-*extracted* highlights shown after generation — different from the removed pre-generation "What stood out?" selection step, but still new functionality (parsing/extracting short theme phrases from the draft) beyond this task's own explicit scope list. Not built, to stay within "do not add unnecessary steps" and avoid scope creep into a new extraction feature.

**Full regression:** feedback submissions and the public feedback page (including its real `tags` vocabulary, used only by the untouched recovery flow) re-confirmed unchanged. The generator was re-tested empirically with the exact unchanged call shape (`tags: []`) and still produces real output.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

---

## Consolidated Report — Real Visual Redesign, All 4 Batches

| Batch | Scope | Files changed | Checkpoint | SHA-256 |
|---|---|---|---|---|
| Prep | Shared visualization extraction | 2 | `digital-review-ai-visualredesign-sharedviz-backup.zip` | `e48a675959ca2ec4c3015f0269b3a68a356cf2aa41985682f8a0e3b97bc7167b` |
| 1 | Owner Dashboard (Desktop) | 2 | `digital-review-ai-visualredesign-batch1-backup.zip` | `9d82d809ee708c1e7cd5d6b7e54843e8f9f264f0a34f5872f99e717449f78a78` |
| 2 | Owner Dashboard (Mobile) | 1 | `digital-review-ai-visualredesign-batch2-backup.zip` | `1da983a24dd51280f50723ba3fe9b31c3a8f88884afc5bfb4dc51d7feb648f2d` |
| 3 | Super Admin Dashboard | 2 | `digital-review-ai-visualredesign-batch3-backup.zip` | `8580052cd1eefbe638035c7bd75e27284c3798969be3725882347b1afd372afb` |
| 4 | Customer Experience | 1 | *(this entry's own checkpoint, below)* | — |

**All typecheck/lint/build/regression results: PASS, every batch, no exceptions.**

**Known gaps, stated plainly:**
1. **Browser/device verification: not performed for any batch, at any point.** This sandbox cannot reach a locally-run dev server (confirmed directly: a real headless browser launches, but `net::ERR_CONNECTION_REFUSED` on its own loopback address) — a hard, confirmed environment constraint, not a formality.
2. Two reference elements were deliberately not built because they'd require fabricating data that doesn't exist (Owners-by-*Plan*, since no plan-tier field exists — built Owners-by-*Status* instead) or new functionality beyond scope (AI-extracted highlight chips in the customer flow).
3. The Edit-action conflict (above) is flagged, not resolved — needs an explicit decision.

## v3.28 — Real Visual Redesign, Batch 3: Super Admin Dashboard

**Status: complete. No migration (one new table type added for an existing table, see below). No route change.**

**A real, stale bug found and fixed, not just restyled:** the dashboard still showed "Branch management — Coming in Milestone 3" and "AI usage monitoring — Coming in Milestone 5." Branch management has existed in this data model for a long time — `platformMetrics.activeBranches`/`totalBranches` were already being read on the very same page. An honest "not built yet" note left in place after the feature shipped is actively misleading, not a cosmetic issue — removed, not restyled.

**A real redundancy eliminated:** the page had two separate KPI grids both showing business/branch counts (a flat 8-stat row and a separate "Platform Intelligence" grid) — consolidated into one coherent KPI row plus a focused secondary row.

**Two reference elements checked against real data and deliberately substituted, not faked:**
- The reference's "Owners by Plan" donut (Professional/Enterprise/Starter/Trial) — read `owner_entitlements`' actual columns directly via `\d` in psql and confirmed **no plan-tier concept exists anywhere in this schema**, only `subscription_status` and `plan_duration`. Built "Owners by Status" instead — the same donut *shape*, a real hand-built SVG (multiple `stroke-dasharray` arcs on one circle, the same technique as the score ring, no charting library), using a dimension that's actually real.
- The reference's "Failed Logins (24h)" — confirmed `rate_limit_hits` records every login *attempt* (success and failure alike), since the rate-limit check runs before the password is verified. Labeled "Login Attempts (24h)" — what is actually measured, not what the reference happened to call it. Similarly, "Admin Sessions" (unavailable without deeper session APIs) became "Active Admins" — a real, different, correctly-labeled count.

**New, genuinely real panels added**, each backed by a new query against existing tables (no fabricated values, empirically tested against real Postgres):
- **Security**: MFA enforcement status (a real, static fact about this system — opt-in per admin, not a fabricated "100% enforced"), active admin count, login attempts (24h).
- **Communications (24h)**: real counts from `communication_history`, grouped by channel and failure status.
- **Recent Audit Trail**: re-styled with relative timestamps and result badges, same real `audit_logs` data as before.

**One schema-adjacent fix required:** `rate_limit_hits` had never been added to the typed `database.ts` (previously only queried via the `check_rate_limit()` RPC, never read directly) — added its Row/Insert/Update types properly, consistent with how every other table in this file is typed. No actual database migration — the table already existed.

**A real React-purity bug caught by lint, not shipped:** the first draft of the donut chart mutated a loop variable during array iteration (`offsetSoFar += dash`), which Next 16's stricter render-purity lint rule correctly flagged as unsafe. Rewritten as an immutable `reduce`. A second instance (calling `Date.now()` directly in the server component body) was also flagged and fixed.

**Full regression:** all new queries re-tested directly against real Postgres as a real `super_admin`, confirming correct RLS-gated access; owner business data and the public feedback page re-confirmed unchanged.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.27 — Real Visual Redesign, Batch 2: Owner Dashboard (Mobile)

**Status: complete. One file changed. No migration, no route change, no new data source.**

**Mobile dashboard brought up to the same visual standard as desktop (Batch 1), reusing the shared `DashboardVisualizations` module built specifically for this — not a second implementation:**
- Experience Score card: added the real `SentimentBar` with counts — previously the mobile score card showed only the ring and context text, with sentiment nowhere near it.
- Customer Voice card: added the real `TrendSparkline` — previously this card only listed recent messages with no trend visualization at all.
- Recent messages: replaced the emoji-per-message indicator with `StarRating`, matching the desktop Recent Reviews treatment.
- AI Customer Intelligence card: replaced its own separate inline emoji+bar implementation with the shared `SentimentBar` — mobile had yet a *third* copy of this same bar logic (distinct from both of desktop's two, already consolidated in the shared-viz refactor).
- **A new Top Positive Themes card, previously absent from mobile entirely** — the same `analytics.tagBreakdown` data shown on desktop, now visible on mobile too via the shared `TopThemes` component.

**Zero new data fetched, zero invented values** — every addition uses `analytics`/`recentMessages`, props this component already received.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged. **Full regression:** owner business/feedback data and the public feedback page re-confirmed unchanged.

**Browser/device verification: NOT PERFORMED** — the mobile layout specifically has never been seen rendered; this is a genuine, unverified limitation, not a formality.

## v3.26 — Shared Visualization Refactor (Prep for Batch 2)

**Status: complete, verified. No migration, no route change. 2 files changed.**

**Reference image reviewed directly** (attached for the first time this session, confirming it matches the same BD Clarity concept image referenced earlier in this project). Cross-checked specific reference elements against real data availability before planning Batch 2: the reference shows "↑ 8 points from Apr 6 – May 5" (a period-over-period score comparison) — read `ExperienceScoreResult`'s actual fields directly (`{score, factors, totalFeedback}`) and confirmed no prior-period value exists anywhere in this app. **Will not be added** — omitted rather than invented, per the explicit instruction.

**Extracted `TrendSparkline`, `SentimentBar`, `TopThemes`, `sentimentSplit`, `StarRating` into a new shared module** (`DashboardVisualizations.tsx`), specifically so the upcoming mobile dashboard (Batch 2) reuses the exact Batch 1 implementation rather than a second, drifting copy — consistent with "build on Batch 1 rather than replacing it blindly."

**A second, genuine duplicate found and eliminated during the refactor, not just moved:** the "Understand" card had its own second, slightly different inline sentiment bar (`h-2` vs the shared `h-2.5`, a single summary line instead of the full three-way breakdown) — the same data, rendered twice with two different implementations. Replaced with the shared component.

**Verified empirically, not just by reading the code:** fed 20 realistically-varied, dated submissions through the actual `computeFeedbackAnalytics()` function and confirmed the distribution counts, weekly trend buckets, and tag frequencies are all genuinely computed from that real input — not placeholder values. `SentimentBar`'s new `showCounts` option now displays real counts alongside percentages (e.g., "75% positive · 15"), matching the reference's count+percentage treatment.

**Diff-verified against Batch 1:** filtered every changed line and confirmed each one is either the expected function extraction, the new import, or an intentional, already-planned presentational change (e.g., the Understand card's single-line summary replaced by the full shared bar) — no unintended logic or data-source change anywhere.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged. **Full regression:** owner business/feedback data and the public feedback page re-confirmed unchanged.

**Browser/device verification: NOT PERFORMED** — confirmed in a prior turn that this sandbox cannot reach a locally-running dev server.

## v3.25 — Real Visual Redesign, Batch 1: Owner Dashboard (Desktop)

**Status: genuine visual transformation, not consistency polish. No migration, no new route, no new dependency.**

**Honest diagnosis that prompted this:** the "Phase 5" dashboard redesign (much earlier in this project) correctly built the Listen→Understand→Act information architecture, but presented every number as plain text — sentiment as `😊 76% 😐 16% 😕 8%`, trend as a literal sentence (`↑ Up from 3 to 5 this week`). Confirmed via `package.json` that **zero charting library has ever existed in this project** — the only visualization technique ever used is the hand-built SVG Experience Score ring. This fully explains why the dashboard still looked unchanged after rounds of layout/consistency work: that work was real, but never added visual richness.

**Real, hand-built SVG visualizations added, no new npm dependency** (the same plain-SVG technique already used for the score ring, extended rather than replaced):
- **A real trend sparkline** — a polyline + area fill built directly from `analytics.weeklyTrend`, replacing the old trend sentence.
- **A real color-coded sentiment bar** — a stacked horizontal bar in emerald/amber/red, replacing the emoji+percentage text row, using the exact same `sentimentSplit()` computation as before.
- **A Top Themes breakdown** — mini progress bars built from `analytics.tagBreakdown`, data that was already being computed on every page load and had no visual presentation anywhere on the dashboard until now.
- **A Recent Reviews strip** — three real, star-rated review excerpts from `recentMessages`, which was already being fetched for the mobile view but never wired into the desktop one.

**Every value traces to data already computed in `dashboard/page.tsx`'s existing pipeline — zero new queries, zero invented numbers.** The only wiring change was passing the already-fetched `recentMessages` prop through to `DashboardHeroCards`, which previously only received `score`/`analytics`/`topAction`.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged. **Regression:** owner business/feedback data and the public feedback page re-confirmed unchanged.

**Browser/device verification: NOT PERFORMED** — confirmed in the prior turn that this sandbox's network isolation blocks even a locally-launched browser from reaching a locally-running dev server. This is a genuine visual change that has not been seen rendered by anyone but the person reading this.

**Remaining in this effort:** Mobile Home (the equivalent mobile dashboard), Super Admin dashboard, and the Customer Experience card's own visual treatment — each planned as a separate batch with its own checkpoint.

## v3.24 — Final Cross-Product UI Completion Audit

**Status: audit complete. Zero net code changes — confirmed by diffing against the radius-token-audit checkpoint and finding every file byte-identical in content (two files show a newer filesystem timestamp from an edit-then-revert during this audit, but their actual content matches the checkpoint exactly, confirmed via `diff`).**

**An honest self-correction, reported in full rather than quietly discarded:** this audit initially found `Header.tsx` and `BusinessSwitcher.tsx` — core navigation components rendered on every single owner page — apparently missing any `focus:` styling on their interactive buttons, and began adding explicit focus rings. Before finishing, checked `globals.css` and found a global `:focus-visible` rule already applying a consistent, branded 2px outline to every focusable element app-wide. The original "fix" was therefore based on a false premise: these components weren't missing a focus indicator, they were correctly relying on the working global default — and adding a per-component override would have made things *less* consistent, not more. **Reverted immediately**, verified byte-identical to the checkpoint via `diff`, not just reasoned about.

**That correction led to a genuinely useful check**, done properly this time: searched for the opposite, real failure mode — any component that sets `focus:outline-none` *without* providing a replacement style. **Zero matches app-wide.** Every single `focus:outline-none` usage in this entire codebase is correctly paired with a `focus:ring`/`focus:border`/`focus:bg` replacement. The focus-accessibility story across the app is confirmed solid by a real, mechanical check, not an impression.

**Other audit findings, confirmed rather than assumed:**
- Raw `<button>` usage in owner dashboard components (`Header`, `BusinessSwitcher`, `TagEditor`, `GoogleConnectionPanel`, etc.) reviewed individually — every instance found to be a legitimately specialized pattern (avatar/menu triggers, full-width menu items, dropdown options), the same category of deliberate exception already established for admin components in Group 1. None converted, since none were actually primary/secondary/danger actions misusing a raw element.
- Zero remaining hand-rolled page titles anywhere in the app (`grep` for the old pattern returns nothing) — confirming the earlier `PageHeader` rollout across all three experiences was genuinely complete, not partial.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged. **Full regression:** re-confirmed — owner business/branch/entitlement/feedback data, admin role resolution, the public feedback page, and `audit_logs` all intact.

**Browser/device verification: NOT PERFORMED.** No such tooling has existed in this environment at any point in this entire redesign effort. This is stated plainly, not as a formality: everything above is a code-level and database-level verification, and the product has never actually been seen rendered by anyone but the person reading this.

## v3.23 — Dedicated Radius-Token Audit (Customer & Owner Components)

**Status: complete. No migration, no route change. 12 files changed. Diff-verified: every single changed line across all 12 files is purely a `rounded-*` class substitution — confirmed by filtering every diff line against radius-class patterns and finding zero remaining lines of any other kind.**

**Scope, exactly as flagged when found during Group 3:** the `rounded-md`/`rounded-lg` pattern (Tailwind's bare defaults — 6px/8px — distinct from this project's own `--radius-sm`/`--radius-md`/`--radius-lg` tokens of 8px/12px/16px) appeared in 14 files outside the admin area. Audited all 14 individually, by reading each actual usage in context, not a blind find-and-replace.

**Mapping applied, judged per instance:** form controls and small/compact buttons → `--radius-sm` (matching `Input`/`Button`'s own established radius); card-like bordered info panels → `--radius-md` (matching the standard card pattern established throughout Groups 1–2); nested content blocks within a larger card → `--radius-sm` (a deliberately smaller radius than their container, the same relationship already seen elsewhere in the design system).

**12 files fixed** (18 individual instances): `qr-feedback/page.tsx`, `BusinessProfileForm.tsx` (5 instances — a form with multiple hand-styled controls, the same root pattern as the Group 3 shared-Input finding, though a full component conversion was judged out of this audit's specific scope), `ContextQuestionsEditor.tsx`, `FeedbackList.tsx`, `GoogleConnectionPanel.tsx` (3 instances), `QrFeedbackPanel.tsx` (6 instances, mixed `rounded-md`/`rounded-lg`), `ReviewGenerator.tsx`, `ReviewReplyCard.tsx`, `TagEditor.tsx`, `RecommendationsPanel.tsx`, `PulseManager.tsx`, and `PulseVoteFlow.tsx` (the one genuinely customer-facing file in this batch — the public Pulse poll voting flow).

**Two deliberate exceptions, found and left untouched with reasoning stated, not silently skipped:**
- `Logo.tsx` — the literal brand wordmark icon, used in every header across the entire app. Its corner radius is a brand-identity decision, not a generic UI-container choice; mechanically mapping it to the content token scale would be wrong, not a fix.
- `FinalCta.tsx` — used only on the root `/` marketing/landing page. Confirmed via a usage search this page is none of Customer Experience, Owner Dashboard, or Super Admin — genuinely outside this audit's stated scope, not an oversight.

**Full regression:** owner business/feedback data, admin role resolution, the public feedback page, and `audit_logs` all re-confirmed unchanged.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.22 — Component-Level Polish, Group 4: Dialogs, Alerts & Keyboard Accessibility

**Status: complete. No migration, no route change. 6 files changed (1 new). Zero unintended logic changes — confirmed by diffing every file against the Group 3 checkpoint.**

**The most significant finding across all four component-polish groups so far:** `Alert.tsx`'s "success" tone used `bg-verified-tint`/`text-verified-dark` — but `verified` is this project's **AI/Indigo** semantic color, not success. Confirmed via a real usage search: **10 actual call sites across the entire app**, including the core authentication pages (forgot-password, signup, reset-password), the customer Pulse flow, and multiple owner/admin forms — every "Saved.", "Password updated.", "Thanks for your answer!" message was rendering in indigo instead of emerald, contradicting the semantic color system maintained everywhere else in this project. Fixed once in the shared component, correctly cascading to all 10 consumers without touching each call site.

**A real gap closed, not invented:** `Alert` had no "warning" tone, despite the brief's own explicit mention of success/info/warning/error. Two real call sites (`UpgradeContactState`, the Communications not-configured notice) were hand-rolling the identical amber/gold visual pattern because there was nothing to reuse. Added a proper `warning` tone and converted both to the shared component.

**A real, consistent accessibility gap found and fixed:** audited every true modal overlay in the app (confirmed there are exactly two: `AddBusinessModal` and `AdminManagementTable`'s confirm/create dialogs) — both were already visually consistent with each other (identical overlay, sizing, radius, padding, shadow — confirmed correct, not changed), but **neither had any Escape-key handling at all**. Built one shared hook (`useEscapeKey`), reused across all three dialog instances rather than three separate copies of the same effect — the confirm dialog's Escape handler is correctly guarded against firing mid-action (`!busy`), matching the existing click-outside guard's own logic.

**Empty states reviewed, found already honest:** `FeedbackList`'s zero-submissions message and `GettingStartedCard` both already reference real actions (QR code, Pulse poll) with no fabricated data. The "X of Y submissions" messaging on the Intelligence page specifically is tied to a real `MIN_SAMPLE_SIZE` constant for statistically-meaningful AI analysis — confirmed as the explicitly-allowed "genuine technical threshold" exception, not the kind of arbitrary unlock-messaging the product has deliberately moved away from elsewhere.

**Full regression:** admin role resolution, active admin count, owner business/entitlement data, the public feedback page, and `audit_logs` all re-confirmed unchanged.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.21 — Component-Level Polish, Group 3: Tables, Filters & Forms

**Status: complete. No migration, no route change. 6 files changed. Zero logic changes — confirmed by diffing every file against the Group 2 checkpoint and finding exactly one matching line (identical `value`/`onChange`, just reformatted onto one line as part of a component swap).**

**The most significant finding this group:** a shared `Field`/`Input` component (`src/components/ui/Field.tsx`) already existed with a proper, more sophisticated focus treatment (`focus:ring-4 focus:ring-verified/15` + `focus:border-verified`), the correct radius token, shadow, and required-field indicator support — but several admin forms (`CommunicationCenter`, `MfaEnrollmentPanel`, `OwnerSearchPanel`) used raw `<input>` elements with **no focus state at all**, an accessibility-relevant gap, not just a visual one. Converted all three to the shared `Input` component; matched `<select>`/`<textarea>` elements to the identical visual treatment where no shared component exists for them yet.

**Table header inconsistency, found and fixed:** `AdminManagementTable` and the Business Accounts table used genuinely different header treatments (`bg-ink/[0.02]` + bottom border + `py-2.5` vs `bg-paper-raised` + no border + `py-3`) for the same kind of admin data table. Standardized the Business Accounts table to match the more refined treatment. Also fixed a related row-border bug while there: the old `border-t` on every row would have doubled up against the header's own bottom border on the first row — now `border-b ... last:border-0`, matching `AdminManagementTable`'s correct pattern.

**Radius token deviation, fixed within this group's actual scope:** `rounded-md` (Tailwind's default, 6-8px) was used instead of this project's own `--radius-sm`/`--radius-lg` tokens in `BusinessStatusControl`, `SupportNotesPanel`, and the Business Accounts page. **Found, but deliberately not fixed here:** this same `rounded-md` pattern appears in 11 more files across the codebase, including core owner/customer flows (`ReviewGenerator`, `TagEditor`, `PulseVoteFlow`) — far outside this group's scope of tables/filters/forms, and risky to sweep in one pass. Flagged honestly as a candidate for a future, dedicated token-consistency pass rather than silently left unmentioned or riskily bulk-edited.

**Confirmed already correct, not changed:** the Business Accounts table's `overflow-x-auto` wrapper already provides contained (not page-level) horizontal scrolling on narrow screens — exactly the pattern the brief asks for — so no mobile card-list rebuild was forced here.

**Full regression:** admin role resolution, business counts, active admin count, owner business data, the public feedback page, and `audit_logs` all re-confirmed unchanged.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.20 — Component-Level Polish, Group 2: Cards, Metric Panels & Status Surfaces

**Status: complete. No migration, no route change, no business logic touched. 4 files changed.**

**Audit method: grep-counted actual padding/shadow values across every card in the admin component library before touching anything** — not a visual guess. Found `p-1`/`p-3`/`p-4`/`p-5` all in use for the "primary panel card" class across Super Admin, versus a tighter `p-4`/`p-5` range in the Owner Dashboard. On inspection, the `p-3`/`p-3.5` instances turned out to be dense, repeated list rows (search results, communication history rows) — correctly compact by design, not defects, the same "information architecture requires something different" reasoning already used for page widths and the Group 1 button exceptions.

**Two genuine, concrete inconsistencies found and fixed:**
1. **Shadow treatment** — several otherwise-identical primary panel cards (`CommunicationCenter`, `MfaEnrollmentPanel`, `AdminManagementTable`'s list rows, and the 4 "Platform Intelligence" metric cards in `admin/page.tsx`) were missing `shadow-xs`, while directly adjacent cards of the exact same visual class had it — most visibly, the Platform Intelligence cards sit immediately below a metric grid that already has the shadow, creating a visible treatment shift on scroll. Fixed by adding the missing `shadow-xs` across all of them.
2. **Status indicators** — `AdminManagementTable`'s Active/Revoked indicator used plain colored text (`text-xs font-medium text-danger`), while the established pattern used 3+ times elsewhere in the same component library (`CommunicationCenter`, `NotificationCenter`, `OwnerSearchPanel`) is a pill badge with background tint (`rounded-full bg-X-tint ... font-mono uppercase`). Fixed both the desktop table and mobile card instances to match.

**One deliberate non-change, inspected and reasoned:** the admin detail page's own "Status: Active/Expired" value stays as plain colored text — it's a definition-list value next to its own label, a genuinely different and already-internally-consistent pattern from a standalone table/list badge, not the same category of thing.

**Cross-experience spot-check:** the Owner Dashboard's hero card correctly has `shadow-sm` (visual dominance) while its secondary Listen/Understand/Act cards deliberately have no shadow, using colored tints for elevation instead — confirmed this is an intentional Phase 5 design decision, not an oversight, and left untouched.

**Full regression:** admin role resolution, active admin count, owner business data, the public feedback page, and `audit_logs` all re-confirmed unchanged.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.19 — Component-Level Polish, Group 1: Shared Button Consistency (Super Admin)

**Status: first component-level group complete. No migration, no route change, no business logic touched.**

**Audit finding, confirmed concretely before fixing anything:** the shared `Button` component (`src/components/ui/Button.tsx`) is solid — properly tokenized padding/radius/hover/press states. The real issue is that several Super Admin components (built across Milestones A–C) bypass it entirely with raw `<button>` elements. Confirmed concretely in `OwnerSearchPanel.tsx`: its search button used `px-4 py-2` against `Button`'s actual `md` padding of `px-5 py-2.5`, and was missing the hover/press feedback (`active:scale-[0.98]`, `hover:shadow-premium`) every other primary button in the app has.

**4 files converted** — `OwnerPasswordResetButton.tsx` (3 buttons), `MfaEnrollmentPanel.tsx` (4 buttons), `CommunicationCenter.tsx` (1 button), `OwnerSearchPanel.tsx`'s primary search button — each type-checked immediately after editing.

**Two deliberate exceptions, reasoned rather than applied mechanically:** `NotificationCenter.tsx`'s per-row "Mark read" button (11px text, tight padding by design) was left as-is — it's a dense, repeated list-row action, and forcing it to `Button`'s minimum size would make it disproportionately large in that specific repeated context, the same "information architecture requires something different" reasoning already applied to page widths. `OwnerSearchPanel`'s pagination arrows were also left as compact nav controls, not primary actions.

**Full regression:** admin role resolution, notification/communication table counts, owner business data, and the public feedback page all re-confirmed unchanged — expected, since only the buttons' visual wrapper changed, never the server actions they call.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.18 — Layout Rollout, Group 3: Super Admin Complete

**Status: all 10 Super Admin routes now accounted for. No migration, no route change. Zero RBAC/RLS/MFA/entitlement/audit-log logic touched anywhere — confirmed, not assumed.**

**Opened by finishing unfinished work, not new work:** `businesses/[id]/page.tsx` had `PageContainer`/`PageHeader` imported but never actually used in the JSX — `tsc` doesn't flag unused imports (that's lint's job), which is exactly why it looked clean last session. Confirmed via `eslint` directly (2 warnings, exactly those two imports) before fixing, then re-confirmed zero warnings after.

**Admin shell fix, the highest-leverage change in this group:** `main` had a flat `px-6` (24px) at every viewport width, unlike the owner dashboard shell's already-proven responsive pattern. Fixed to match exactly (`px-4 sm:px-6 lg:px-8`) — benefits all 10 admin pages from one change.

**A real double-padding bug found and fixed:** `owners/[id]/page.tsx` had its own `mx-auto max-w-4xl px-6 py-8` wrapper — once the shell's own padding was unified, this page was applying padding *on top of* the shell's padding. Fixed by using `PageContainer width="standard"` (whose `max-w-4xl` matches exactly) and dropping the page's redundant padding entirely.

**Width decisions made with stated reasoning, not uniformly applied:** `wide` for genuinely table/panel-dense pages (`admins`, `businesses`, and the Super Admin dashboard itself — the last of these using the exact same "multi-panel dashboard needs the space" reasoning already established for the Owner Overview's own exception); `standard` for ordinary detail/form pages (`admins/[id]`, `businesses/[id]`, `communications`, `notifications`, `owners/[id]`); `narrow` for the simple `security` settings page.

**One deliberate non-conversion, inspected and reasoned, not overlooked:** `mfa-challenge/page.tsx` uses `AuthShell` — the same standalone pattern as login/forgot-password/reset-password — because the admin isn't fully authenticated into the dashboard yet at that point in the flow. Applying `PageContainer`/`PageHeader` here would be architecturally wrong, not a fix; confirmed by reading the file, not assumed from its route path.

**Full sweep for remaining inconsistency:** a fresh `grep` across every admin page for ad-hoc `max-w-` classes found exactly two matches — a search input's own width constraint (unrelated to page layout) and this changelog's own explanatory comment. Zero remaining page-level width inconsistencies.

**Full regression, re-confirmed:** `get_admin_role()`, active Super Admin count, owner business/branch/entitlement data, cross-owner isolation, and the public feedback page all unchanged. `audit_logs` immutability specifically re-tested — a `DELETE` on the whole table by `super_admin` itself still returns 0 rows affected.

**Route check:** 33 routes, identical count and list to before this group — confirmed no unintended route changes.

**Typecheck/Lint/Build:** all PASS.

**Browser/device verification: NOT PERFORMED.**

## v3.17 — Layout Rollout, Group 2: All Remaining Owner Pages Complete

**Status: all 14 owner pages now accounted for. No migration, no route change. No data/RLS/permission logic touched anywhere.**

**Opened by fixing a real build break left from the previous turn:** `reputation/page.tsx` had the exact same mismatched-closing-tag mistake caught at the start of the session (`</div>` instead of `</PageContainer>`). Fixed first, and the whole project re-verified fully healthy (typecheck/lint/build) before any further page was touched — per explicit instruction not to create a checkpoint until the tree was healthy again.

**9 files changed** — `PageHeader.tsx` (already extended to accept `ReactNode` descriptions in the previous session) plus 8 pages: `actions`, `analytics`, `feedback`, `more`, `reputation`, `settings`, `settings/brand`, `settings/google`.

**Every return path inspected, not just the common case:** `analytics/page.tsx` had 4 separate returns (empty-business, error, empty-data, populated) using 3 different widths — unified to one. `feedback/page.tsx` had 2 widths unified to one. `reputation/page.tsx` was already internally consistent (`max-w-2xl` both paths) but converted anyway for consistency with the rest of the app, and its custom two-line header (location + connection badge) now uses `PageHeader`'s `actions` slot for the Sync button instead of a hand-rolled flex layout.

**`settings/brand/page.tsx`'s back-link handled deliberately, not forced into the primitive:** this is the only page with a "← Settings" back-link above its title. Rather than extend `PageHeader` again for a single-use case, the link stays as a simple separate element above it — `PageContainer`'s "narrow the pattern to what's genuinely reused" reasoning applied consistently, not just on the first pass.

**`PageHeader`'s backward compatibility re-confirmed empirically, not assumed:** a fresh grep after this batch shows 8 pages passing a plain string and 5 passing a `ReactNode` expression, all coexisting in the same successful `tsc` pass.

**Full regression, re-confirmed:** owner data access, cross-owner isolation, and the public feedback page all re-verified unchanged against real Postgres — expected, since nothing here touched data/RLS/permission logic, only presentation wrappers.

**Every owner route now accounted for (14 total):** 13 converted to the shared primitives across this and the previous session (`branches`, `intelligence`, `profile`, `pulse`, `qr-feedback`, `actions`, `analytics`, `feedback`, `more`, `reputation`, `settings` + 2 sub-pages); exactly 1 deliberately left full-width (`dashboard/page.tsx`, the Owner Overview) for the reason already documented — its multi-column Listen→Understand→Act hierarchy genuinely needs the space, matching the reference image's own layout for that specific page.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.16 — Layout Rollout, Group 1: Customer Experience (Mobile-First)

**Status: complete for this group. One file changed. No migration, no route change.**

**Re-verified first, not assumed:** the "What stood out?" regression fix from the previous session was re-inspected directly — `Step` type, transitions, and a full-tree grep all re-confirmed clean before any new work began.

**A deliberate non-change, reasoned rather than mechanical:** `PageContainer`/`PageHeader` (the dashboard layout primitives) were **not** applied here — they're owner/admin-dashboard components (page title + description + sidebar context), and forcing the customer-facing single-card mobile experience into them would contradict the product's own established distinction ("Customer: simple, friendly, fast... Owner: AI command center... clearly distinct," from the Phase 5 redesign). This page never had a page title/sidebar pattern to begin with.

**Mobile audit against the brief's specific checklist, item by item:**
- **Margins**: the page's own `px-4` (16px) already exactly matched the brief's mobile target — confirmed, not changed.
- **Touch targets**: the emoji buttons' tap area (~56-60px including padding) already exceeds the 44px minimum — confirmed, not changed.
- **Keyboard behavior**: genuinely not applicable — there are zero text inputs anywhere in this flow (emoji taps and chip taps only) — stated honestly rather than inventing handling for a case that doesn't exist.
- **Primary CTA**: "Continue to Google" was already full-width, prominent, and visually distinct from the secondary Regenerate/Copy actions — confirmed, not changed.
- **Card padding — the one real, concrete gap found**: all 6 step-cards used a flat `p-7` (28px) with no mobile-specific reduction, against the brief's explicit ~16px mobile / ~20-24px desktop split. Fixed to `p-4 sm:p-6` (16px mobile, 24px desktop) — the brief's numbers applied precisely, across every card in the flow.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Browser/device verification: NOT PERFORMED.** No such tooling exists in this environment. Manual check: open the public feedback link on a real phone at ~360-430px width, confirm the card edges sit ~16px from the screen edge (not flush, not excessively inset), tap through a positive rating to the ready screen, and confirm the layout feels right at that width specifically.

## v3.15 — Layout/Spacing Foundation: Started, Critical Build-Break Fixed, 5 Pages Converted

**Status: foundational layer established and verified; application-wide rollout genuinely incomplete — see the honest scope accounting below. No migration.**

**Critical finding before any new work began:** the project was already in a broken, non-buildable state — `dashboard/intelligence/page.tsx` had a mismatched JSX closing tag (`</div>` instead of `</PageContainer>`), left by a previous, interrupted turn that had already started this exact layout effort. This was fixed first, before anything else, and the project re-verified fully healthy (typecheck/lint/build all clean) before any further work proceeded.

**Reviewed and confirmed sound, not rebuilt:** `PageContainer.tsx` and `PageHeader.tsx` (already created by that interrupted turn) were read in full and found to be well-reasoned — a genuine audit had found inconsistent, undocumented max-widths across pages (`max-w-lg`, `max-w-2xl`, `max-w-3xl`, `max-w-4xl` used with no stated rationale), consolidated into 3 deliberate tiers (narrow/standard/wide). The dashboard shell's padding was already correctly adjusted to the brief's exact targets (16px/24px/32px via `px-4 sm:px-6 lg:px-8`). No second, parallel spacing-token system was introduced — Tailwind's existing scale already numerically matches the requested values.

**5 pages now converted and verified** (branches, intelligence — both already done and now fixed; profile, pulse, qr-feedback — converted this turn): each checked individually with a type-check immediately after editing, not batched blindly. Two of these (`pulse`, `qr-feedback`) had the exact documented inconsistency — different max-widths across their own empty-state and populated-state branches — now unified.

**The Owner Dashboard Overview (`dashboard/page.tsx`) deliberately NOT wrapped in `PageContainer`:** it intentionally uses the full shell width for its multi-column Listen→Understand→Act hierarchy (built in Phase 5), matching the reference image's own wide layout for that specific page — wrapping it in the narrower `PageContainer` would have been a regression, not a fix, so it was left alone with that reasoning stated rather than applied mechanically everywhere.

**Full regression:** businesses, branches, feedback, and the owner-questions table all re-confirmed intact against real Postgres.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

**Honest scope accounting — this is explicitly NOT a completed global rollout:**
- **9 more owner pages** not yet converted: `actions`, `analytics`, `feedback`, `more`, `reputation`, `settings` (+ its 2 sub-pages), `dashboard/page.tsx` (deliberately excluded, see above).
- **All 10 Super Admin pages** not yet touched at all.
- **The mobile Customer Experience flow** (`FeedbackFlow.tsx`) not yet reviewed against this spacing system.
- **Component-level consistency** (card padding, table toolbars, dialogs, forms, the full responsive breakpoint sweep) not yet addressed.
- **No visual/browser verification performed anywhere in this effort** — no such tooling has ever existed in this environment. Manual checks needed: open each converted page at ~360px/390px/430px/768px/1024px/1280px/1440px and confirm consistent outer margins, no horizontal overflow, and that nothing shifts unexpectedly when navigating between pages.

**This redesign is not complete.** Stated plainly, consistent with the explicit instruction not to mark it done for partial progress.

## v3.14 — Customer Flow Regression Fix: Remove "What Stood Out?" Signal Step

**Status: complete, locally verified. One file changed. No migration, no route change.**

**Reported via live mobile-browser testing:** the customer flow still showed the "What stood out?" chip-selection screen after rating, which the product decision was to remove from the active journey. Traced precisely before touching anything — confirmed via `grep`, not assumed — to `src/components/feedback/FeedbackFlow.tsx`: the `Step` type's `"signals"` value, `selectEmoji()`'s transition into it, and its JSX block.

**A real, subtle bug caught and avoided while fixing this, not introduced:** simply changing the post-emoji transition to call `goGenerate()` directly would have read a **stale** `rating` value. The `setTimeout` callback inside `selectEmoji` is created during the same render that calls `setRating(...)`, before that state update has taken effect — a `goGenerate` reading `rating` from closure at that point would use the *previous* rating, not the one just tapped. Fixed by passing the rating value as an explicit parameter into `goGenerate(ratingValue, attempt)` at every call site, eliminating this class of bug entirely rather than papering over one instance of it.

**Exact flow now:** emoji tap (rating ≥ 4) → generate directly, in the background, using the real rating and `tags: []` (matching the product's own prior simplified design — there is no signal-selection UI left to populate this from) → existing "ready" screen (edit/regenerate/copy/Continue to Google) — **completely unchanged**, only the inputs feeding into it were touched.

**Error handling, improved while fixing this:** a first-attempt generation failure now correctly resets `pressedRating` to `null` before returning to the emoji step — without this, the emoji buttons (disabled once one is pressed) would have been permanently stuck, with no way to retry at all. A regenerate-attempt failure instead keeps the customer on their existing valid draft.

**Confirmed via exhaustive sweep, not just local reasoning:** `grep -rn "What stood out"` across the entire `src/` tree returns only this changelog entry's own explanatory code comment — zero remaining UI or logic path anywhere.

**All 8 required behaviors verified** — 4 empirically (rating reaches generation, grounded positive/negative sentiment, regenerate still produces genuinely different valid text, all re-run against the real generator with the exact new call shape) and 4 by exhaustive code tracing, the correct method for a client component without a running browser in this sandbox: no fake content is ever shown on error (the error branch never calls `setDraft`), duplicate generation is structurally prevented (`goGenerate` is only ever invoked from explicit event handlers, never a render-time effect, and the emoji buttons disable immediately after the first tap), the low-rating recovery journey (`recoveryDetail`/`recoveryThanks`, `submitRecovery`) has zero lines touched, and the owner-configured-questions prop is untouched (already documented as "kept for type compatibility, never rendered" since an earlier milestone — not newly broken).

**Server-side regression, live-tested:** feedback submissions, business resolution, and the recovery flow's own tag vocabulary all re-confirmed intact against real Postgres.

**Typecheck/Lint/Build:** all PASS — 33 routes, unchanged.

## v3.13 — Super Admin: Batch C (Communications Foundation) + Consolidated Readiness Audit

**Status: safe scaffolding complete, no live delivery claimed anywhere. One migration.**

**Files changed (7):** `0024_communication_history.sql`, `lib/communication/provider.ts`, `communicationActions.ts`, `communications/page.tsx`, `CommunicationCenter.tsx` (new); `admin/layout.tsx`, `types/database.ts` (modified).

**Audit confirmed first:** zero provider integration, template system, or send-history table existed anywhere. The existing `contact.ts` is static `wa.me`/`mailto` links that open the *admin's own* client — never a server-side send — confirmed distinct from what this batch builds.

**Provider abstraction, deliberately vendor-agnostic:** no SDK installed, no paid dependency added — a real implementation only needs `fetch()` once a vendor is actually chosen, which hasn't happened. `getEmailProvider()`/`getSmsProvider()` return an honest `NotConfiguredProvider` whenever `EMAIL_PROVIDER_API_KEY`/`SMS_PROVIDER_API_KEY` are unset — confirmed empirically (not just by reading the code) that both report `not_configured` with a clear reason.

**Honest status model, enforced at the data layer, not just by convention:** `communication_history.status` only allows `queued | submitted | delivered | failed | unknown`. No code path anywhere sets `delivered` without a genuine provider signal — a `not_configured` result from the provider is recorded as a real `failed` row with its true reason, never silently upgraded toward success.

**A real security inconsistency caught and fixed before shipping:** the first draft's RLS wrote/updated `communication_history` under the general `is_admin()` check (any of the 4 roles), unlike the stricter `get_admin_role() = 'super_admin'` policy already used for comparably sensitive tables (`owner_entitlements`, `admin_role_assignments`). This would have let a `support_admin` insert/update send records directly, bypassing the application layer's super_admin-only gate entirely. Caught during testing — re-tested directly: a `support_admin` write attempt now correctly fails at the RLS layer (`support_admin` can still *read* history, matching the broader read pattern used throughout this project).

**Rate limiting:** reused `check_rate_limit()` again (10 sends per 10 minutes, platform-wide) — tested precisely, 10 allowed/11th blocked.

**Recipient masking:** history list uses the existing `maskEmail()`/`maskPhone()` from Batch D directly — not reimplemented.

**Typecheck/Lint/Build:** all PASS — **33 routes, correctly +1** (`/admin/communications`).

**Browser/device verification: NOT PERFORMED.**

---

### Consolidated Final Readiness Audit

| Requirement | Status |
|---|---|
| Admin management (CRUD, roles, self/last-admin protection) | **Verified in repository/tests** |
| Owner search, pagination, status filter, detail | **Verified in repository/tests** |
| Business status controls + authorization | **Verified in repository/tests** |
| Owner credential recovery | **Verified in repository/tests** (code/security); delivery **Blocked by configuration** (no live Supabase project) |
| Entitlement management | **Verified in repository/tests** |
| Admin notifications | **Verified in repository/tests** |
| Immutable audit logs | **Verified in repository/tests**, re-confirmed every batch |
| RBAC / capability enforcement | **Verified in repository/tests** |
| MFA (TOTP) | **Verified in repository/tests** (code against real Supabase API type definitions); **Blocked by configuration** — needs a live project with MFA enabled in the dashboard |
| Login rate limiting | **Verified in repository/tests** |
| Session revocation (force-logout another session) | **Partial** — code path exists (service-role `signOut(userId, 'global')`), **Blocked by configuration** |
| Communication delivery (email/SMS) | **Missing** (by design) — scaffolding only; **Blocked by configuration**, no provider chosen or credentialed |
| Privacy / data masking | **Verified in repository/tests** |
| Responsive UI | **Verified at code level**; **not verified against a live external service or browser** |
| Migrations | **Verified in repository/tests** — 24 migrations, all applied and tested against a local Postgres instance; **never applied to any staging/production database** |
| Deployment | **Missing** — this project has never been deployed anywhere |

**Verified against a live external service: none, for any requirement.** Every verification in this entire Super Admin effort was performed against a local Postgres instance and direct code inspection — no real Supabase project, email/SMS provider, or browser has ever been exercised.

**Exact remaining actions to launch safely:**
1. Provision a real Supabase project; configure `SUPABASE_SERVICE_ROLE_KEY` and enable MFA in the Auth dashboard.
2. Choose and configure a real email/SMS provider; implement the real `fetch()` call in `provider.ts` (the interface is ready; the vendor call is not).
3. Apply all 24 migrations to that real project and verify against real data.
4. Perform actual browser/device verification — nothing in this entire effort has been visually confirmed.
5. Deploy, and verify session/logout/rate-limiting behavior against the real, deployed service.

**The platform is not production-ready.** This is stated plainly, not as a hedge — every piece of this work is sound at the code and local-database level, and none of it has been exercised against the real services it will ultimately depend on.

## v3.12 — Super Admin: Batch B (Authentication Security, MFA, Rate Limiting)

**Status: the safely-buildable majority complete. No migration.**

**Files changed (8):** `login/rateLimitActions.ts`, `admin/mfaActions.ts`, `admin/security/page.tsx`, `MfaEnrollmentPanel.tsx`, `admin/mfa-challenge/page.tsx` (new); `login/page.tsx`, `admin/layout.tsx`, `lib/supabase/middleware.ts` (modified).

**Key finding that shaped this batch:** Supabase Auth has native TOTP MFA (`auth.mfa.*`) requiring **zero external SMS/email provider** — a genuine second factor (something you have: an authenticator app), explicitly distinct from email-based recovery (same inbox as login, not a separate factor) per the instruction's own caution. This made real MFA buildable here, unlike SMS/email-based approaches.

**Login rate limiting**: reused the existing `check_rate_limit()` Postgres function directly — already database-backed (a shared table, not an in-memory counter), so this is correct across multiple application instances without any new infrastructure. Two independent buckets (IP-hash and email), both must pass. **Tested precisely**: 5 attempts allowed, 6th blocked, a different email unaffected — confirmed against real Postgres.

**Admin TOTP MFA**: enrollment (QR code + manual key), verification, and self-service removal, all via Supabase's real, officially-documented Admin/Auth API methods — verified these aren't hallucinated by reading the actual type definitions in `node_modules`, not assumed. Middleware enforces step-up to AAL2 for `/admin` **only when a verified factor actually exists** — an admin who hasn't enrolled is never blocked; this is optional-but-enforced-once-enrolled, not a mandatory gate imposed on everyone regardless of setup.

**Last-Super-Admin MFA lockout recovery**: `recoverLockedOutAdminMfa()` — requires a *different*, currently-authenticated super_admin and the service-role client (self-recovery is impossible by definition once locked out). Mirrors the exact pattern already established for `createAdmin()` in Milestone A: code-complete and correct, **live execution blocked** on `SUPABASE_SERVICE_ROLE_KEY`, which remains unconfigured in this sandbox — reported as Blocked, not simulated.

**Safe error messages, re-verified not newly added**: confirmed by reading the actual code that login ("Incorrect email or password") and forgot-password (identical response regardless of account existence, with an explicit code comment stating that intent) already avoid account enumeration — this was true before this batch, not a new fix.

**Audit events**: `admin_mfa_enrolled`, `admin_mfa_removed`, `admin_mfa_recovery` — tested exact insert shapes against real Postgres, and specifically confirmed **zero rows anywhere in `audit_logs` contain a secret or code value** — only the fact that an enrollment/removal/recovery happened, never the TOTP secret or any 6-digit code.

**Explicitly separated, as required:**
1. **Repository checks that passed**: rate-limit boundaries (real Postgres), audit event shapes (real Postgres), capability gating logic, typecheck/lint/build, full regression.
2. **Real Supabase/provider tests that passed**: none — no live Supabase project exists in this sandbox.
3. **External configuration still required**: `SUPABASE_SERVICE_ROLE_KEY` (blocks live admin MFA recovery, same as admin invites since Milestone A); MFA must additionally be enabled as a project-level setting in the Supabase dashboard (Authentication → MFA) before enrollment will work for real users.
4. **Deployment/browser/device verification**: not performed — no such tooling exists in this environment, and this project has never been deployed anywhere.

**Preserved, confirmed unchanged:** signup flow, business-activation policy, no owner-approval gate, all 4 existing admin roles and the capability matrix, immutable audit-log model (re-verified).

**Typecheck/Lint/Build:** all PASS — **32 routes, correctly +2** (`/admin/security`, `/admin/mfa-challenge`).

**The platform is not production-ready.** MFA enforcement cannot be exercised against a real provider here; Batch C (SMS/email) remains entirely outstanding; no deployment has occurred.

## v3.11 — Super Admin: Batch D (UI Completeness, Privacy, Production-Readiness Review)

**Status: complete. No migration, no new route — presentation/privacy fixes to existing surfaces only.**

**Files changed (4):** `lib/admin/mask.ts` (new); `OwnerSearchPanel.tsx`, `admin/businesses/page.tsx`, `ownerAuthActions.ts` (modified).

**Masking, applied with a documented, task-based distinction — not blanket, not absent:**
- **Masked**: owner email in both list-scan contexts that exist — `OwnerSearchPanel`'s results and the admin `businesses` list page (confirmed via code that it previously showed the full address in a many-row scan view).
- **Deliberately left unmasked**: the single-owner detail page (`/admin/owners/[id]`) and the single-business detail page — both single-item views where the full address is genuinely needed (the password-reset action requires the real address to function; identifying whose business you're looking at requires it too). Admin-to-admin emails in Admin Management stay unmasked — an internal-staff tool, a different privacy calculus than customer/owner data.
- **Phone numbers**: only one phone field exists anywhere in this schema (`businesses.phone`, a business's own contact number) — reviewed and deliberately left unmasked, since it's typically public information a business itself advertises, shown only in a single-item detail view, not a scan.
- A masking utility (`lib/admin/mask.ts`) was built once and empirically tested against edge cases (short local-parts, non-email strings, null, short phone numbers) rather than inlined ad hoc in each place it's used.

**A real inconsistency found and fixed:** the password-reset notification's *title* embedded the full owner email — but that title only ever surfaces in the shared notification list (a scan view, readable by any admin role), with no separate "notification detail" screen that would justify the full address. Fixed at the point the title is written, not just where it's displayed. The audit log keeps the full email deliberately — it's a per-admin, access-controlled security record, not a broadcast feed, and investigating a specific action genuinely needs it.

**Confirmation dialogs, re-verified rather than assumed:** business status changes, admin role changes/revocation, and the new password-reset action all confirmed to have genuine two-step confirm/cancel flows, not single-click destructive actions.

**Responsive layout, re-verified at the code level:** the business list table already wrapped in `overflow-x-auto`; `OwnerSearchPanel`'s result cards already `flex-col` on narrow screens, `sm:flex-row` above — both confirmed already correct, not newly added.

**Regression:** full suite re-run, including a specific re-confirmation that `audit_logs` immutability holds even against a mass-update attempt by `super_admin` (`UPDATE 0`).

**Typecheck/Lint/Build:** all PASS — 30 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

---

### Master Checklist (against the original Super Admin specification, updated through Batch D)

| Area | Status |
|---|---|
| Admin dashboard / real metrics | **Verified** |
| Owner search, pagination, status filter, detail | **Verified** |
| Account-status actions + authorization | **Verified** (business-level; no owner-level approval gate, by explicit decision) |
| Owner credential recovery | **Verified** (code/security layer); delivery **blocked by external configuration** (no live Supabase project in this environment) |
| Subscription/entitlement management | **Verified** |
| Communication history / delivery-state | **Not implemented** — no provider exists (Batch C) |
| Admin notifications / immutable audit logs | **Verified**, including event-type accuracy and masking fixes this batch |
| RBAC / server-side capability enforcement | **Verified** |
| Search/filter/pagination/empty/loading/error states | **Verified** |
| Responsive layout | **Verified at code level**; visual/browser **not performed**, consistently, throughout |
| Privacy-sensitive data display | **Verified**, masking applied with documented reasoning |
| OTP/2FA / session security / login rate limiting | **Not implemented** (Batch B) |
| SMS/email sending | **Not implemented**, blocked on provider credentials (Batch C) |
| Environment config / deployment readiness | **Not established** — this project has never been deployed; `SUPABASE_SERVICE_ROLE_KEY` and any SMS/email provider remain unconfigured in this environment |

**The system is not fully production-ready.** Batches B and C remain outstanding, and deployment itself has never occurred.

## v3.10 — Super Admin: Batch A Complete (Credential Recovery) + Owner Approval Policy Decision

**Status: Batch A now complete. One small migration (CHECK constraint extension only, no new table).**

**Partner decision recorded:** no mandatory pre-approval gate for owner signups at this stage — existing signup/authentication flow, business activation controls, and owner isolation all explicitly preserved unchanged. Business status is not represented as owner approval status, and no fake pending/rejected states were introduced. If an approval workflow is needed later, it will be designed as a separately configurable feature with its own migration, recovery path, and tests — not retrofitted here.

**Credential recovery, built on Supabase's own flow entirely:** `initiateOwnerPasswordReset()` calls `supabase.auth.resetPasswordForEmail()` — the exact same built-in mechanism already powering this product's own "forgot password" page. BD Clarity never generates, stores, views, or transmits a token or password at any point; Supabase manages the entire recovery lifecycle internally. No service-role client needed — this is a public Supabase Auth method by design.

**A real mistake caught and fixed before shipping, not after:** the first draft mislabeled this event as `admin_role_changed` when wiring it into notifications, reusing an existing type that doesn't actually describe what happened. Caught on review and fixed properly — migration `0023` adds a genuinely new `owner_password_reset` event type to the existing `admin_notifications` CHECK constraint, rather than force a dishonest label onto a real event.

**Security:** gated to `manage_admin_roles` (super_admin only, confirmed via the real `PERMISSION_MATRIX` — none of the other 3 roles have it); the target email is resolved against `profiles` first, so this action can't be used to probe arbitrary addresses for account existence; the audit log records the request (actor, target owner, outcome) and explicitly never a token or password, since BD Clarity never possesses either.

**Honest limitation, consistent with every prior external-service finding in this project:** real email delivery cannot be tested in this sandbox (no live Supabase project configured). The action's error handling follows the same established pattern as every other Supabase call here — network/API failures are returned as a result, not thrown — so a misconfigured environment fails gracefully with a reported error, not a crash. The UI explicitly states delivery isn't independently verifiable here rather than implying success.

**Files changed (7):** `0023_admin_notification_password_reset_event.sql`, `ownerAuthActions.ts`, `OwnerPasswordResetButton.tsx` (new); `notificationActions.ts`, `owners/[id]/page.tsx`, `NotificationCenter.tsx`, `types/database.ts` (modified).

**Tests:** email-existence resolution (real owner found, nonexistent email correctly returns nothing), exact audit-write shape confirmed, capability gating re-confirmed against the real matrix, new/old notification event types both accepted post-migration, invalid types still rejected. Full regression (businesses, branches, entitlements, feedback, admin role, notifications, public page) — all passed.

**Typecheck/Lint/Build:** all PASS — 30 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

## v3.9 — Super Admin: Batch A (Customer/Owner Lifecycle) — Partial

**Status: the safely-scoped majority of Batch A complete. No migration.** A full gap audit against the master prompt preceded this batch — see conversation record for the complete 14-area table. One consequential design decision (a mandatory pre-approval gate on owner signup) deliberately **not** implemented — flagged for explicit decision rather than silently built, since it would change existing signup behavior for every new owner.

**Files changed (3):** `platformIntelligenceActions.ts`, `OwnerSearchPanel.tsx`, `admin/owners/[id]/page.tsx`.

**Owner search: real pagination and status filtering added** — confirmed via code that `searchOwners()` previously had neither. Pagination applied in-process after resolving the owner set (not SQL OFFSET/LIMIT), a deliberate, explained choice given the full set already has to be resolved to compute per-owner business/branch counts.

**A real UX gap closed:** the owner detail page's entitlement section was read-only, linking away to a *business* page to actually edit the same owner's entitlement. Now embeds the existing `OwnerEntitlementPanel`/`upsertOwnerEntitlement()` directly — not a second entitlement editor, the exact same Phase 1 component and action, reachable from one more place. Confirmed live that editing from this new location still works correctly end to end.

**Tests:** pagination and status-filter logic verified against ground-truth data (2 owners, 1 with an `active` entitlement row); entitlement editing re-confirmed from the new embed point; full regression (businesses, branches, entitlements, feedback, admin role, notifications, public page, cross-owner isolation) — all passed.

**Typecheck/Lint/Build:** all PASS — 30 routes, unchanged.

**Browser/device verification: NOT PERFORMED.**

**Deliberately not implemented, pending decision:** owner-level pending/approval/rejection workflow (would require changing the actual signup flow, not just admin tooling); admin-initiated credential recovery; a dedicated "extend by N days" shortcut (the entitlement panel already supports setting any expiry date directly).

## v3.8 — Super Admin Enhancement, Milestone C: Admin Notifications

**Status: complete and verified. One migration (new table, no existing table changed).**

**Files changed (9):** `0022_admin_notifications.sql`, `admin/notificationActions.ts`, `admin/notifications/page.tsx`, `NotificationCenter.tsx` (new); `admin/admins/actions.ts`, `admin/businesses/actions.ts`, `admin/entitlementActions.ts`, `admin/layout.tsx`, `types/database.ts` (modified).

**Audit confirmed:** `owner_notifications` (0014) is a genuinely useful reference pattern — lean payload referencing the real event, simple `read_at` — but is architecturally owner-scoped and cannot be reused directly for platform-wide admin events. Zero admin-facing notification infrastructure existed anywhere. One new table, `admin_notifications`.

**Deliberate design decision, documented rather than silent: a shared inbox, not per-admin unread state.** `read_at`/`read_by` are set once by whichever admin reads a notification first, visible to all — the simplest correct design for a first version; confirmed live that one role (`support_admin`) marking a notification read is visible to every other role, by design.

**Two honestly distinct mechanisms, not one conflated system:**
- **Event-driven, stored**: hooked into the three real existing actions — `setBusinessStatus()`, `changeAdminRole()`/`revokeAdmin()`/`restoreAdmin()`, and `upsertOwnerEntitlement()` — each firing only *after* the real action already succeeded, and each failing silently if the notification write itself errors (never blocks the real action).
- **Expiry notifications: computed live, never stored.** No cron/worker/scheduler exists in this project and none was introduced — "scheduled delivery" is not claimed anywhere, since it was never implemented or tested. Instead, expiring/expired entitlements are recomputed fresh from `owner_entitlements.expiry_date` on every page load, the same pattern already used for Milestone B's dashboard metrics.

**Deduplication, the real mechanism, not just absence of literal duplicate rows:** `upsertOwnerEntitlement()` now fetches the existing row *before* writing and only creates a notification when subscription status, business limit/toggle, or branch limit/toggle actually changed — confirmed live in both directions: an identical re-save produces no notification, a real change does.

**Security, tested against real data:** all 4 admin roles confirmed able to read; a plain business owner confirmed blocked entirely; `anon` blocked; `audit_logs` immutability re-confirmed unaffected (a direct `DELETE` attempt on the whole table returned `DELETE 0`).

**Typecheck/Lint/Build:** all PASS — **30 routes, correctly +1** for `/admin/notifications`.

**Browser/device verification: NOT PERFORMED.** No such tooling exists in this environment — consistent with every prior milestone.

**Not implemented, per the explicit scope boundary:** owner approval/onboarding, 2FA/OTP, SMS/email/WhatsApp delivery, new RBAC/audit systems, customer-facing changes, unrelated dashboard redesigns.

## v3.7 — Super Admin Enhancement, Milestone B: Platform Intelligence + Owner-Centric Management

**Status: complete and verified. No migration — confirmed entirely achievable with existing schema.**

**Files changed (5):** `admin/platformIntelligenceActions.ts` (new), `OwnerSearchPanel.tsx` (new), `admin/owners/[id]/page.tsx` (new); modified `admin/page.tsx`, `admin/entitlementActions.ts`.

**A real gap found and fixed first, before building anything new:** `upsertOwnerEntitlement()` (Phase 1) never wrote to `audit_logs` — confirmed by grep, zero matches. Fixed with one `writeAuditLog()` call, reusing the exact existing function every other admin action already uses. Historical entitlement changes from before this fix were never logged and are **not** retroactively fabricated — the Activity section only shows what was genuinely recorded, which for entitlement changes begins now.

**Platform Intelligence:** extends the existing `/admin` dashboard in place — Total Owners, Active/Total Businesses, Active/Total Branches, Multi-Business/Multi-Branch Owner counts, and entitlement status breakdown (active/expired/suspended/disabled/not-configured) with dynamic 7-day and 30-day expiry windows. Every number traced to one specific query over `businesses`/`business_branches`/`owner_entitlements` — none invented. **Verified against independently-computed ground-truth SQL**, not just code review: total owners (2), businesses (5/5 active), branches (4 total/3 active), multi-business owners (1), multi-branch owners (1) — all matched exactly. Expiry-window boundary logic specifically tested at 3 days (within both windows) and 20 days (within 30 only) against real data, then restored.

**Owner-centric management:** new `OwnerSearchPanel` (name/email/business-name search, resolving to the *owner*, never a flat business list) and `/admin/owners/[id]` detail page — Overview, Subscription/Entitlement (reuses `getOwnerEntitlementSummary()` from Phase 1 directly, not a re-implementation), Businesses with per-business branch counts, and Activity (scoped via `audit_logs.target_type`/`target_id`, limited to the most recent 20 — not the full history). Owner → Business → Branch hierarchy preserved throughout; a branch is never shown as if it were a business.

**Security, explicitly re-tested for this new surface:** a plain business owner (zero `admin_role_assignments` row) is rejected immediately by every new action; `owner_entitlements` RLS independently blocks a non-admin from reading another owner's row even bypassing the application check entirely; `read_only_analyst` confirmed able to read (by design — `view_dashboard` is granted broadly) with no mutation path anywhere in this milestone's new code (everything added is read-only); `anon` fully blocked; `audit_logs` immutability re-confirmed for the new `entitlement_update` event type specifically (a direct UPDATE attempt by `super_admin` itself returned zero rows affected).

**Performance:** owner search and detail use batched `Promise.all` queries selecting only required columns — no N+1, no full-table loads; activity capped at 20 rows.

**Typecheck/Lint/Build:** all PASS — **29 routes, correctly +1** for `/admin/owners/[id]`.

**Browser/device verification: NOT PERFORMED.** No such tooling exists in this environment.

**Not implemented, per the explicit scope boundary:** admin notifications, approval/pending-owner workflow, 2FA/OTP, SMS, any new RBAC/audit/subscription architecture, Owner Dashboard changes.

## v3.6 — Super Admin Enhancement, Milestone A: Admin Management UI

**Status: complete and verified. One new migration (a safeguard trigger only, no new table). Platform dashboard, owner-centric management, admin notifications, approval workflow, and 2FA explicitly deferred to separate milestones, per the approved scope.**

**Files changed (9):** new migration `0021_last_super_admin_protection.sql`, `lib/supabase/adminClient.ts`, `lib/admin/roleLabels.ts`, `admin/admins/{actions.ts,page.tsx,[id]/page.tsx}`, `AdminManagementTable.tsx`; modified `lib/admin/permissions.ts` (re-exports the extracted label constant, adds `ALL_CAPABILITIES`), `admin/layout.tsx` (one nav link).

**Confirmed, before writing any code, exactly what already existed:** the entire RBAC layer — 4 roles, the capability matrix, `hasCapability()`, `admin_role_assignments` with soft-revoke/`granted_by`, and a **database-level self-escalation trigger** already rejecting any attempt to touch one's own role — all solid, all reused unchanged. What was genuinely missing, confirmed by an empty grep across the whole codebase: any UI at all to view, create, or manage admins, and any protection against removing the last Super Admin.

**Migration:** one trigger function on the existing `admin_role_assignments` table (no new table) — blocks any UPDATE that would leave zero active `super_admin` rows, regardless of actor, complementing (not replacing) the existing self-escalation trigger. Tested live in all 3 required directions: revoking the sole Super Admin blocked, demoting them away from the role also blocked, revoking one of *two* Super Admins correctly succeeds.

**Secure admin creation — the explicit Step 3 requirement, resolved correctly, not worked around:** no admin-creation flow existed. Rather than build a parallel password system (explicitly forbidden), built the one new piece of infrastructure this requires — a minimal service-role Supabase client, using `SUPABASE_SERVICE_ROLE_KEY`, an env var this project has *documented as required since Module 1* but never once wired into code. Used for exactly one call: Supabase's own native `inviteUserByEmail()` — BD Clarity's own code never generates, stores, or sees a password at any point.

**A real, consequential bug found and fixed through actual testing, not caught by inspection alone:** my first implementation wrote the new admin's `profiles.role` through the normal, RLS-respecting server client. Testing the exact sequence against live Postgres showed this fails with a genuine RLS violation — `profiles` has no admin-write policy at all (self-update only), and the row-creating trigger (`handle_new_user()`, confirmed by reading its actual body) always assigns the column default role (`business_owner`), never `admin`. Fixed by routing specifically this one write through the service-role client — every other write in the same flow (`admin_role_assignments`, `audit_logs`) correctly stays on the normal client, since those tables already have real super_admin-write policies, confirmed by reading the actual policy definitions. Re-verified the corrected sequence end-to-end afterward.

**A second real bug, caught by the build itself:** the client-side admin table initially imported `ADMIN_ROLE_LABELS` directly from the server-only `permissions.ts`, which Next.js's build correctly rejected (`"server-only" cannot be imported from a Client Component`). Fixed by extracting the plain-data constant into its own small file with no server-only dependency, re-exported from `permissions.ts` so every existing server-side import keeps working unchanged.

**Capabilities shown in the admin detail view** are derived directly from the existing capability matrix (`ALL_CAPABILITIES`, computed from the matrix itself) — not a second, hand-maintained permission calculation.

**A third small cleanup, caught on review:** `getAdminDetail()` originally pulled in `ALL_CAPABILITIES` via an unnecessary dynamic `import()`, even though `permissions.ts` was already statically imported at the top of the same file for everything else. No functional bug — just folded into the existing static import for consistency.

**Tests, all live, including a full second pass specifically verifying RLS enforces this independent of the application layer, not just that the capability gate exists in code:**
- The 3-direction last-Super-Admin trigger test, isolated via the raw superuser connection (bypassing RLS/self-escalation entirely) to prove it's a genuine, unconditional row-level constraint — then re-confirmed through the real authenticated-session path (two Super Admins seeded; revoking one succeeds, revoking the resulting sole remainder fails).
- Self-escalation re-confirmed through the real session context (a Super Admin modifying their own row, not just the raw trigger test from before).
- The full create→role-change→revoke→access-lost→restore→access-regained→history-intact chain, confirmed via `get_admin_role()` genuinely losing and regaining access (not just a flag), with exactly one historical row throughout — never duplicated.
- **Three separate non-super_admin roles — `support_admin`, `read_only_analyst`, `operations_admin` — each seeded as real test users and each attempting a direct, unauthorized database write bypassing the server action entirely** (self-promotion, revoking another admin, escalating their own role): all three rejected with `UPDATE 0`, confirmed via the actual `pg_policies` definitions on `admin_role_assignments` (`get_admin_role() = 'super_admin'` required for both INSERT and UPDATE) — genuine RLS-level defense-in-depth, not reliant solely on the `hasCapability()` application check.

**One test-process artifact caught and explained, not left unexplained:** a rate-limiter regression check initially returned an unexpected result for a specific key string; isolated with a guaranteed-fresh key (which passed correctly) and confirmed this was simply a collision with the same key string reused across turns in this long-running session — not a product regression, and unrelated to anything built in this milestone.

**Confirmed NOT testable in this environment:** `SUPABASE_SERVICE_ROLE_KEY` is not configured here (confirmed directly) — the real invite-email call cannot be exercised live, consistent with every other external-service dependency throughout this project (Google OAuth, AI providers). What *is* verified: the code correctly detects this and returns an honest, specific error rather than attempting an insecure fallback or crashing.

**Typecheck/Lint/Build:** all PASS — **28 routes, correctly +2** for `/admin/admins` and `/admin/admins/[id]`.

**Browser/device verification: not performed.**

**Known limitation:** full "Create Admin" live testing requires a real `SUPABASE_SERVICE_ROLE_KEY` in production — the code path is correct and defensively handles its absence, but the actual email delivery and Supabase-hosted set-password flow have not been exercised against a real Supabase project.

## v3.5 — Phase 6: Final Integration Regression

**Status: complete. Pure verification milestone — confirmed zero files changed. No migration, no new code, nothing to roll back.**

**Identified correctly from the changelog itself, not from memory** — every prior Phase 1–5 entry consistently documented Phase 6 as the next, not-yet-started step from the original Master Implementation Plan.

**SUPER ADMIN chain, all live:** email search resolves the correct owner, the full entitlement panel data (status/duration/dates/payment ID/business+branch entitlement) reads back exactly as stored, activate/suspend/reactivate cycle confirmed, existing business status control re-confirmed working.

**OWNER chain, all live:** correct entitlement loads for the authenticated owner; at-limit business creation correctly blocked (4 of 4); branch creation correctly reflects real current state (3 active after earlier test history, correctly allowing one more rather than a hardcoded assumption); the allowed-case re-confirmed for an owner with no entitlement row, correctly falling back to the platform default.

**CUSTOMER chain, all live, including real multi-signal combinations:** QR→business resolution confirmed; the real generator run against 4 different rating+signal combinations including a genuine multi-signal case (Staff Behaviour + Cleanliness together) — all grounded correctly, zero fabrication; Regenerate confirmed to produce different text while preserving both signals in the multi-signal case specifically.

**OWNER-again chain:** a final, full-codebase sweep confirms **zero pages regressed** to the old single-business lookup pattern across all 5 phases of work — only the 4 expected, intentional matches remain, unchanged from every prior phase's own sweep. Owner reply generation re-verified across all 4 real tones (`professional`, `friendly`, `premium`, `warm`) plus regeneration.

**One real mistake caught mid-test, not hidden:** an initial owner-reply test used `"formal"` as a tone, which crashed — traced immediately to confirm this was a test-script error (the real, valid tone set is `professional | friendly | premium | warm`, and the actual production calling code already validates against this exact list before ever reaching the generator) — not a production vulnerability. Re-ran correctly; all passed.

**SECURITY REGRESSION — a genuine anomaly investigated, not glossed over:** a comprehensive sweep across 8 data surfaces (businesses, branches, entitlements, feedback submissions, Google connections, Google reviews, feedback links, owner notifications) found `feedback_links` returning a non-zero count for a cross-owner query, unlike every other table. Investigated by reading the actual RLS policy rather than assuming either a bug or a non-issue: confirmed this is a deliberate, documented Module 2 design — `feedback_links` intentionally has a `TO anon, authenticated USING (is_active = true)` policy, because this table only ever holds non-sensitive QR metadata (public code, tags) and nothing readable there enables any access to another owner's actual data. Confirmed by reading the table's real schema (7 columns, nothing sensitive). A direct ID-manipulation attempt against `businesses` itself (an "owner B tries to rename owner A's business" probe) was correctly rejected (`UPDATE 0`).

**Typecheck/Lint/Build:** all PASS — 26 routes, unchanged, zero files modified.

**Browser/device verification: not performed.** The Phase 5 visual pass, performed separately, remains the only outstanding item requiring human eyes — this phase verified the underlying system end-to-end at the data/code layer, which is the full extent of what's achievable in this environment.

## v3.4 — Phase 5: Owner Dashboard Redesign (Listen → Understand → Insight → Act)

**Status: complete and verified. No migration, no functional change — presentation layer only. Phase 6 not started.**

**Files changed (3):** `DashboardHeroCards.tsx` (desktop), `mobile/MobileHome.tsx`, `Sidebar.tsx`.

**Information architecture rebuilt around the approved narrative**, on both mobile and desktop: LISTEN (Customer Voice) → UNDERSTAND (AI Customer Intelligence, the same sentiment data now explicitly framed as BD Clarity's own understanding rather than a raw second data table) → INSIGHT (Experience Score, now the visually dominant hero element rather than one of six equal-weight tiles) → ACT (Needs Attention + AI Recommendation).

**A real consistency gap found and fixed, not invented to pad this entry:** the desktop dashboard previously split "Needs Attention" and "AI Recommendation" into two separate cards, even though they're the same underlying `topAction` object — duplicating the same recommendation as if it were two different insights. Mobile had already been corrected for exactly this in an earlier Visual Identity milestone; desktop had not. Fixed to match — shown once, truthfully.

**A real bug caught and fixed before it ever ran, not after:** while building the new Experience Score hero ring, I initially constructed Tailwind class names dynamically (`` `stroke-${tone}` ``, `` `text-${tone}-dark` ``). Tailwind's build-time scanner can't see through dynamically-built class strings, so this would have silently compiled with **no color applied at all** — caught by reasoning through how Tailwind's JIT actually works, not by seeing it fail, and replaced with a static lookup table before it was ever tested or shipped.

**Sidebar regrouped**, per the approved structure (BD Clarity / Business / System) — confirmed **zero changes to any href or `enabled` flag**; this is pure relabeling and regrouping of the exact same 10 routes, not a functional change.

**Top bar / BusinessSwitcher:** confirmed already satisfies the requirement via existing, already-tested infrastructure (the switcher slot and profile controls were built in the Multi-Store and earlier milestones) — deliberately left unchanged rather than risking a working, tested component for no functional gain.

**Zero-data state rebuilt**, per the explicit requirement: "Your Customer Intelligence is ready" with a Listen/Understand/Act preview grid, replacing the previous plain "waiting" message — still uses only real counts (`currentFeedbackCount`/`neededCount`), never a fabricated number.

**Confirmed untouched and fully regression-tested:** the entire underlying product engine — Multi-Business (4 real businesses), Multi-Branch (4 real branches), owner entitlements (status/flags/limits all intact), Customer Voice/feedback data, admin role resolution, the public customer feedback page, rate limiting, and cross-owner isolation across businesses, entitlements, and branches — all verified live against real data, all passed, all unchanged by this presentation-only pass.

**Typecheck/Lint/Build:** all PASS — **26 routes, unchanged**.

**Browser/device verification: not performed.** This phase is fundamentally visual, and that limitation is stated plainly here rather than implied away — nothing above is a claim of how this actually renders, only that the code compiles, builds, and the underlying data/security layer is provably intact.

**Not yet implemented:** Phase 6 (final integration regression).

## v3.3 — Phase 4: Review Generation & Customer Review Experience

**Status: Phase 4 only, complete and verified. Phases 5–6 not started. No migration.**

**Files changed (6, confirmed by content diff):** `generationActions.ts`, `feedback/[code]/actions.ts`, `ReviewGenerator.tsx`, `FeedbackFlow.tsx`, `reviewDraft.ts`, `replyGenerator.ts`. (`templates.ts` initially appeared in the modified-files listing but a direct diff against the checkpoint confirmed zero actual content change — a stale filesystem timestamp from an earlier test-copy operation, not a real edit.)

**One architectural note, flagged rather than silently decided:** this phase's own description of the preserved customer flow ("Customer can review/edit it. Customer can Regenerate.") describes more capability than the current emoji-flow UI actually had (Copy + Continue to Google only, no edit/regenerate). Combined with this phase's explicit requirement to test customer-side regeneration, I've treated this as an intentional, approved addition and implemented a Regenerate action on the customer's ready screen — not a reversion of the emoji-flow simplification's own step removal.

**Bug 1 — owner-side deterministic regeneration, fixed and empirically verified (18 real tests, not just reasoned about):** two real problems, both fixed. First, the seed depended only on an unchanging submission ID, so repeated "Regenerate" clicks with the same tone returned byte-identical text. Second, and found only by actually counting the real data: each tone's template pool has **6 real, already-written phrase variants**, but the selection logic was hardcoded to `% 3`, silently discarding half of what already existed — confirmed by direct inspection of `templates.ts`, not assumed. Fixed by adding an explicit `attempt` counter (increments only on an explicit Regenerate click, never automatically) mixed into the seed, and sizing the modulo off the real pool length instead of a hardcoded 3. Verified live: identical `attempt` twice → byte-identical (first generation stays deterministic, as required); different `attempt` → genuinely different text; factual grounding (tags, business context) and zero fabrication confirmed preserved across every regeneration tested.

**Bug 2 — customer-facing hardcoded sentence, fixed and empirically verified (31 real tests):** `buildTemplateDraft()` previously had exactly one hardcoded sentence per rating tier — the literal text quoted in this phase's own bug report (`"Overall it was a great experience."` for every 5-star review, with no variation mechanism at all). Replaced with `SENTIMENT_VARIANTS`, 3–5 genuinely different natural-sounding customer-voice phrasings per rating tier, selected by the same content+attempt seed pattern as the owner-side fix — one consistent mechanism across both generators, not two. Verified live: deterministic first generation, genuinely different regenerated text, rating-appropriate sentiment never crossed between tiers, real tags/message preserved verbatim across every regeneration, zero fabricated words (names, discounts, promises) in any variant tested.

**Signal selection, added to the positive flow only:** a new "What stood out?" step between the emoji tap and generation — reuses the *existing* segment-aware tag vocabulary (the same one already used for the negative-flow's "What went wrong?") rather than inventing a second category system. Multi-select, explicitly optional with a Skip affordance, matching the existing recovery step's established pattern. Selected signals now flow into both `generateDraft()`'s and `submitFeedback()`'s `tags` parameter, which were previously hardcoded to an empty array for every positive submission — confirmed via code reading this was the actual, concrete reason positive reviews had no real per-customer signal grounding before this phase.

**Negative/neutral flow: completely unchanged.** No new step, no review generation involved at all — still emoji tap → optional one-tap recovery reason → thank-you, exactly as before.

**One coherent engine, not two:** both fixes use the identical pattern (content-derived seed + explicit attempt counter + selecting among real, pre-written variants) implemented directly inside the two existing files — no new generation service, no `reviewGeneratorV2`, no duplicate AI call path.

**Google workflow: unchanged.** Generate → (new) Regenerate → Copy → Continue to Google. No automatic posting, no claim of direct Google review creation anywhere in this change.

**Tests, all real:** 18 owner-side + 31 customer-side generation tests (listed above), full cross-module regression, and the explicit security checks requested — a cross-owner submission-context read returns zero rows (unchanged `generateForSubmission` scoping, re-confirmed), and `anon` remains fully blocked from `feedback_submissions` (unchanged).

**Typecheck/Lint/Build:** all PASS — **26 routes, unchanged**.

**Browser/device verification: not performed.**

**Not yet implemented:** Phase 5 (dashboard spacing audit), Phase 6 (final integration regression).

## v3.2 — Phase 3: Real Multi-Branch System

**Status: Phase 3 only, complete and verified. Phases 4–6 not started.**

**Files changed (7):** new migration `0020_business_branches.sql`, `dashboard/branches/{actions.ts,page.tsx}`, `BranchManager.tsx`; modified `dashboard/more/page.tsx`, `Sidebar.tsx`, `types/database.ts`.

**Migration:** one new table, `business_branches` — the first real branch entity in this project. `owner_id` included directly (not just via `business_id → businesses.owner_id`) deliberately, for RLS simplicity/speed — the same tradeoff already made for `google_business_connections` and `google_reviews`. Zero changes to `businesses`, `owner_entitlements`, `platform_settings`, or any existing RLS policy. No separate platform-level branch ceiling was introduced — none was requested, and inventing one silently would have contradicted the explicit instruction against adding a global limit without cause.

**Confirmed before building anything:** Super Admin's entitlement panel already had the Multi-Branch toggle and Maximum Branches field, fully functional since Phase 1 — Phase 3G required zero changes.

**"Maximum Branches" definition, implemented exactly as specified:** total *active* branches across *all* of an owner's businesses combined, not per-business — verified live with the exact scenario described (2 branches on Business A1 + 2 on Business A2 = 4 total, correctly blocking a 5th regardless of which business it would be created on).

**RLS, tested directly against real Postgres:** owner-only read/insert/update via `owner_id`, admin read-only, no anon policy, no delete policy (deactivate via status only, keeping the historical record always intact by construction). Specifically tested: cross-owner read blocked, a branch correctly scoped to its own business and invisible under a sibling business, and — the one deliberately adversarial test — an owner attempting to **insert a branch row with a different owner_id than their own session** (simulating a manipulated request payload) is rejected by RLS itself, not just application logic.

**Reactivation respects the limit too:** confirmed live that reactivating a branch at the owner's current limit is blocked exactly like creating a new one would be — an owner can't bypass the limit by deactivating-then-reactivating past it.

**Owner UI:** new `/dashboard/branches` page, scoped to the active business via the existing resolver — list, status badges, deactivate/reactivate, Add Branch form, and the existing `UpgradeContactState`/contact configuration reused directly (no second upgrade component, no second contact configuration). Added to the sidebar and mobile More menu for discoverability, avoiding the "orphaned route" mistake found earlier in this project.

**Full test matrix (A–F), all against real data:** A (multi-branch off → blocked), B (enabled, 2 created successfully), C (limit reached → blocked), D (the total-owner-across-businesses definition, exactly as above), E (deactivate → inactive, historical record intact, active count correctly decreases), F (reactivate → succeeds when under the limit, blocked when not). Cross-owner/cross-business/insert-spoofing security (G/H/I) tested directly against RLS, independent of any application code. Super Admin → owner propagation (J) relies on the same unchanged, already-tested-live mechanism from Phase 1/2.

**Typecheck/Lint/Build:** all PASS — **26 routes, correctly +1** for `/dashboard/branches`.

**Confirmed untouched, per the explicit scope:** review generation, the Google review/reply workflow, the customer feedback flow, recommendations, AI intelligence, QR generation/routing — none were modified; `feedback_links` remain business-level, not branch-specific, exactly as instructed.

**Browser/device visual verification was not performed.**

**Not yet implemented:** Phase 4 (review-generation bugs, signal selection), Phase 5 (dashboard spacing audit), Phase 6 (final integration regression).

## v3.1 — Phase 2: Owner Business Access Connected to Entitlement

**Status: Phase 2 only, complete and verified. Phases 3–6 not started.**

**Files changed (7):** new `UpgradeContactState.tsx`, `lib/config/contact.ts`; modified `lib/business/activeBusiness.ts`, `lib/business/actions.ts`, `BusinessSwitcher.tsx`, `AddBusinessModal.tsx`, `dashboard/layout.tsx`. **No migration — explicitly, no new table or column was needed for Phase 2.**

**The core connection:** a single shared function, `computeEffectiveEntitlement()`, now used by *both* `getActiveBusiness()` (so the UI shows the true limit) and `createBusiness()` (the real enforcement) — replacing `createBusiness()`'s own inline copy of this logic from Phase 1, so the computation exists in exactly one place.

**A real functional gap found and fixed, not hypothetical:** the existing `BusinessSwitcher` returned a plain, non-interactive pill whenever an owner had one business — with no path to "+ Add Business" at all, even for an owner newly entitled to a second one. This is exactly Phase 2's own Test B scenario. Fixed: the dropdown now opens whenever there's more than one business *or* room to add one; the pure static pill is reserved for when there's truly nothing to offer.

**Upgrade/contact flow:** confirmed, per the inspection, that no Banao WhatsApp or contact configuration exists anywhere in this codebase. Built `getBanaoContactDestination()` reading from `BANAO_WHATSAPP_NUMBER`/`BANAO_CONTACT_EMAIL` env vars — **one early draft of this function fell back to a guessed email address when the env var was unset, which was caught and corrected before it shipped**, since that's exactly the kind of fabricated contact information explicitly forbidden. It now returns `null` for an unconfigured destination, and the UI shows a plain "contact details aren't configured yet" note rather than ever guessing. **Configuration required from the Product Owner before this is fully live:** `BANAO_WHATSAPP_NUMBER` and `BANAO_CONTACT_EMAIL`.

**`createBusiness()`** now returns a structured `reason` (`"subscription_blocked" | "disabled" | "limit_reached"`) alongside its error string, so the UI can reliably show the real upgrade/contact state instead of fragile string-matching on the error message.

**Super Admin → owner, live and immediate:** confirmed Test J directly — changing an owner's `max_businesses` from 2 to 4 in Super Admin is reflected the instant the owner's next request runs the same query path; no caching anywhere to invalidate.

**Full test matrix, all against real data:** A (multi-business off → blocked), B (the fixed single-business-with-room case → allowed, business actually created), C (limit reached → blocked), D/E/F (re-confirmed unchanged from Phase 1, same shared function), G (switching — data and selection logic confirmed unchanged), H/I (cross-owner and cookie security — unchanged, re-confirmed), J (Super Admin change takes effect immediately).

**Existing pages re-verified for active-business context (item 13):** confirmed via a fresh grep sweep — zero pages regressed to the old single-business lookup pattern; Overview, Feedback, Reputation, Intelligence, QR, Settings all still resolve through `getActiveBusiness()` exactly as fixed in the Multi-Store milestone.

**Typecheck/Lint/Build:** all PASS — **25 routes, unchanged**.

**Browser/device visual verification was not performed.**

**Not yet implemented:** Phase 3 (real branch entity), Phase 4 (review-generation bugs, signal selection), Phase 5 (dashboard spacing audit), Phase 6 (final integration regression).

## v3.0 — Phase 1: Subscription / Owner Entitlement Architecture

**Status: Phase 1 only (of the Master Implementation Plan's 6 phases), complete and verified. Phases 2–6 not started, per explicit instruction to stop at this gate.**

**Files changed (7):** new migration `0019_owner_entitlements.sql`, `admin/entitlementActions.ts`, `OwnerEntitlementPanel.tsx`; modified: `admin/businesses/actions.ts` (email search + `ownerId` added to the detail type), `admin/businesses/[id]/page.tsx` (panel wired in), `lib/business/actions.ts` (`createBusiness()` enforcement), `types/database.ts`.

**Migration:** one new table, `owner_entitlements`, keyed by `owner_id` (unique, references `auth.users`). Zero changes to `businesses`, `platform_settings`, or any existing RLS policy.

**The key architectural decision, exactly as flagged for approval:** an owner with no row in this table is not an error — it means "not yet individually configured," and such an owner gets exactly today's behavior (the global `platform_settings` ceiling, nothing stricter). This is what keeps every existing owner working unchanged the instant this migration runs. The effective limit, once a row exists, is always `min(owner_entitlements.max_businesses, platform_settings.max_businesses_per_owner)` — enforced in `createBusiness()`, never exceeding the platform safety ceiling regardless of what an individual row says. Live-tested in both directions: an owner entitled to only 2 (with 4 existing businesses) is correctly blocked; an owner with no row and 1 business is correctly allowed up to the platform default of 4.

**Server-side enforcement in `createBusiness()`:** checks, in order — subscription status (non-`active` blocks creation entirely, before even checking count), the combined enabled flag (`platform AND entitlement`, never more permissive than either), then the effective count limit. All three confirmed live against real data, including the "suspended blocks regardless of count" and "entitlement can restrict even when the platform allows it" cases specifically.

**Super Admin:** email search added alongside the existing business-name search in the same `/admin/businesses` page (not a new search system) — an `ilike` match against `profiles.email` resolves to owner IDs, OR'd into the existing business-name query. The entitlement panel is added to the existing `/admin/businesses/[id]` detail page (not a new admin page) — view-only for non-super_admin roles, editable only for `super_admin`, enforced both in the UI and by the `owner_entitlements` RLS policy itself.

**A real bug found and fixed — in this session's test environment, not the application.** While testing the new email search, an admin-gated query unexpectedly returned zero rows. Traced to the root: `is_admin()` (used by RLS policies on `businesses`, `profiles`, and others) checks `profiles.role = 'admin'` — a different mechanism from `get_admin_role()` (which reads `admin_role_assignments` and was used by this session's own regression checks throughout). When this environment's test database was rebuilt after an earlier reset, the super-admin test user's `profiles.role` was seeded as `'business_owner'` instead of `'admin'`. Fixed the test data and re-verified `is_admin()`-gated reads now genuinely return real data rather than silently empty results. This session's own regression pattern consistently used `get_admin_role()` rather than a direct `is_admin()`-gated read, so this appears not to have invalidated any previously-reported result in this conversation — but it's reported here in full rather than quietly corrected, since the honest thing to do is surface it.

**Tests, all live:** the full `owner_entitlements` RLS suite (7 tests: absence-is-not-error, owner cannot write, admin can write, owner can read-but-not-write their own, cross-owner read isolation, constraint validation on both status and range, anon fully blocked), four `createBusiness()` enforcement scenarios (restrictive per-owner limit, no-row fallback, suspended status, disabled multi-business override), the email search resolving correctly end-to-end, and a full existing-module regression plus a genuine (not vacuous) cross-owner isolation re-check on both `businesses` and the new table.

**Typecheck/Lint/Build:** all PASS — **25 routes, unchanged** (no new Super Admin page).

**Browser/device verification: not performed, not claimed.**

**Not yet implemented, per the explicit phase gate:** Phase 2 (owner-facing business dropdown connected to entitlement, upgrade/contact UI), Phase 3 (real branch entity), Phase 4 (the two confirmed review-generation bugs, lightweight signal selection), Phase 5 (dashboard spacing audit), Phase 6 (final integration regression).

## v2.9 — Multi-Store / Multi-Business Management

**Status: complete and verified. 31 files changed, one new migration, zero existing migrations or RLS policies modified.**

**Migration (0018):** one new table, `platform_settings` — a single-row, typed-column design (not a generic key-value store, since this project has no prior precedent for one and two values don't need that complexity). Holds `multistore_enabled` and `max_businesses_per_owner`, CHECK-constrained server-side to 1–4 regardless of what the UI allows. RLS: any authenticated owner can read it (needed to know whether to show switcher UI at all), only `super_admin` can write it, reusing the existing `get_admin_role()` helper — no new permission system. **Zero changes to `businesses` or its RLS** — confirmed during inspection that `owner_id` already had no unique constraint and RLS already scoped via `auth.uid() = owner_id`, already plural-safe.

**The resolver (`src/lib/business/activeBusiness.ts`):** `getActiveBusiness()` replaces the ~20 call sites that used to assume one owner = one business. Security property tested twice before touching any call site, per the required ordering: against real Postgres (an attacker-supplied business ID not owned by the requesting owner returns zero rows) and in isolated JS logic (a cookie naming a business outside the owner's own fetched list safely falls back to their first business). The cookie is never used in a database query directly — only to pick among rows a fresh, RLS-protected, `owner_id`-scoped query already returned.

**`setActiveBusiness()` and `createBusiness()`** (`src/lib/business/actions.ts`): both re-validate ownership/limits server-side from scratch on every call — never trust the switcher UI's own display. `createBusiness()` runs a fresh `COUNT` query against the real table before allowing creation, checked against the live `platform_settings` row, not a cached or client-supplied value.

**The real bug fixed as part of this milestone, not hypothetical:** `BusinessProfileForm.tsx`'s update previously targeted by `owner_id` alone — harmless with one business, but would have silently updated every business an owner has (or an ambiguous one) now that they can have several. Fixed to target the specific business `id`, with `owner_id` kept as a defense-in-depth check. Verified live: updating Business A changed only Business A; Business B was provably untouched.

**All 20 original single-business call sites migrated**, confirmed via a final grep sweep (only 3 matches remained afterward, all correct/intentional: the resolver's own query, the two re-validation queries, and the fixed profile-form update).

**Business Switcher:** subtle static pill when an owner has one business (or the feature is disabled) — identical in appearance to the old static pill, confirmed via code; full dropdown (current business, checkmark, available businesses with city, "+ Add Business" or the limit message) when they have more than one. Added as an optional prop on the existing `Header.tsx`, which falls back to its old behavior if omitted — not a redesign.

**Add Business:** three fields only (name, type/industry, city), per the approved minimal scope. No billing/subscription logic of any kind.

**Super Admin:** one new small panel on the existing `/admin` dashboard (no new page) — Multi-Store Enabled/Disabled toggle and a 1–4 selector, editable only by `super_admin`, read-only display for other admin roles. The businesses list gets the smallest possible visibility addition: a per-owner business count badge computed from data already fetched (zero new queries), not a restructured grouped view.

**Full required test matrix, all run against real data, all passed:** business switching (list correctly scoped per owner), the 4-business limit (Owner A brought to exactly 4, confirmed the real count-check logic would reject a 5th), the configurable limit re-tested at a non-default value of 2 (confirmed correct in both directions — rejects an owner already at/above it, allows one below it), feature-disabled behavior (existing 4 businesses confirmed fully intact after disabling, nothing deleted or deactivated), cookie security (attacker-style cross-owner business ID correctly rejected), direct ID manipulation (RLS blocks a cross-owner read even bypassing the resolver entirely), profile-update isolation (the fixed bug, proven), and a full existing-module regression (feedback, Google connections, admin role, public feedback page, rate limiter) plus a fresh cross-business isolation re-check.

**Typecheck/Lint/Build:** all PASS — **25 routes, unchanged** (no new Super Admin page, no new customer-facing route — confirms nothing beyond the owner dashboard's own routes was touched).

**Browser/device verification: not performed, not claimed.** Every result above comes from live database testing and code tracing, not sight.

## v2.8 — BD Clarity Visual Identity Redesign

**Status: complete and verified. No business logic, database schema, RLS, or Super Admin permissions touched anywhere.**

**One honest operational note:** mid-implementation, this environment's container reset entirely — the working directory, PostgreSQL, and all test data were lost. Recovered by restoring from the pre-milestone checkpoint (the only artifact that survived, since it had already been copied to persistent output storage), reinstalling PostgreSQL and all dependencies, rebuilding the full 17-migration chain with the same local-testing bootstrap used throughout this project, reseeding identical test data, and redoing every edit described below from scratch. `package-lock.json` shows as changed only because of the dependency reinstall — `package.json` itself is byte-identical to before, confirmed via direct diff.

**Files changed (8):** `globals.css` (token layer), `FeedbackFlow.tsx`, `DashboardHeroCards.tsx`, `mobile/MobileHome.tsx`, `dashboard/settings/page.tsx`, `admin/page.tsx`, `admin/businesses/page.tsx`, `admin/businesses/[id]/page.tsx`.

**Design tokens added/changed:** `--color-verified` (now Indigo/Violet `#5b4fd6`, BD Clarity's own primary/AI accent, replacing the Banao orange it held since the original rebrand), new `--color-success` (Emerald `#16915f`), new `--color-voice` (Teal `#0e9ba8`), `--color-gold`/`--color-danger` unchanged (already correct), new `--color-banao` (the old copper-orange, now reserved narrowly for parent-brand-only moments), background `--color-paper` moved from warm beige `#faf7f2` to cool `#f6f8fb`, `--gradient-brand` is now BD Clarity's own Indigo gradient with a separate `--gradient-banao` kept for parent-brand use.

**Semantic color mapping applied:** primary/AI → Indigo, customer voice → Teal, success/positive → Emerald, warnings/ratings → Amber (unchanged), critical → Red (unchanged), structure/navigation → Midnight. Three genuine pre-existing semantic *mismatches* were found and corrected during this pass (not invented to pad the changelog — found by literally reading the code): the "AI Recommendation" card had been using Amber/gold (now Indigo), and audit-log/account-history "success" results in two separate admin files had been using the primary/AI token instead of a true success color (now Emerald) — the same bug, independently present in both `admin/page.tsx` and the business detail page.

**Customer experience changes:** emoji sentiment glow redirected to Emerald (the customer's own feeling, not BD Clarity's AI — deliberately not left on the primary token just because it used to be "the brand color"). The "generating" step redesigned with an Indigo intelligence treatment ("Understanding your experience… BD Clarity is reading between the lines"). The review-ready screen — the explicitly highest-priority item — fully reworked: restrained gradient top accent, an explicit "BD Clarity understood your experience" lead-in, checkmarks moved to Emerald (success, not AI), the generated-review container given a subtle Indigo tint, and the "Continue to Google" CTA given the actual Indigo gradient treatment as the one deliberate "AI result highlight," per the gradient rule. Both thank-you/completion screens moved to Emerald. The customer flow's step logic itself was not touched.

**Owner dashboard changes:** Experience Score "Excellent" and positive sentiment moved to Emerald (desktop and mobile both); Customer Voice sections given a Teal accent dot/border (desktop and mobile); Needs Attention given an Amber/Emerald status dot; both AI Recommendation mismatches fixed to Indigo.

**Settings changes:** the hub's three "is this active/working" status indicators (Notifications, Google connection, QR status) now show Emerald when active, neutral otherwise. `brand_theme` functionality is completely untouched — confirmed via live test (value still persists, propagates to the public customer-facing view, and cross-business isolation still holds). The 7 curated customer themes in `src/lib/branding/themes.ts` were deliberately left unmodified, per the explicit "minimum safe changes only" instruction — they remain independently curated, still look coherent, and didn't require changes to work correctly alongside the new owner-chrome palette.

**Super Admin changes:** KPI cards now carry real semantic meaning instead of being uniformly neutral (Active → Emerald, Suspended → Red, New registrations → Indigo, QR/feedback activity → Teal), plus the two success/danger mismatches described above. No new shared Card component was created, per the explicit instruction to keep the architecture stable this milestone — every fix reuses the existing markup patterns and conditional className approach already present in each file.

**Functional logic touched: No.** Every change in this milestone is a CSS class/token value — no props, state, data-fetching, server action, or business-logic branch was altered anywhere.

**Tests performed, all live:** full cross-module regression (businesses including `brand_theme`, feedback submissions, admin role, public feedback page, rate limiter) plus explicit cross-business isolation checks (Owner B confirmed unable to read Owner A's business or feedback data) — all passed. `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **25 routes, unchanged**.

**Browser/device verification: not available in this environment, and none is claimed anywhere in this entry or the report below** — every change above is verified by code tracing, compilation, and live database testing, never by sight.

## v2.7.1 — Settings Visual QA Pass (structural code review only — no browser/device access)

**Status: complete. No browser/device capability exists in this environment — this is explicitly a code-level structural review, not visual verification, and is never described as the latter anywhere in this entry.**

**File changed:** `src/app/dashboard/settings/page.tsx` only.

**One genuine structural defect found and fixed:** all 4 clickable hub cards (Business Profile, Brand & Experience, Google Business Profile, QR Feedback) rendered their text content inside a flex row with a fixed-width arrow icon sibling, but the text-containing flex child had no `min-w-0`, and the text itself had no `truncate`. In a flex container, a child without `min-w-0` does not shrink to fit available space by default — with sufficiently long content (a long business name, or an unpredictable Google-sourced location name), this card could overflow its container rather than truncating cleanly, directly risking the "no overflowing cards" / "no horizontal scrolling on mobile" requirements this QA pass specifically asked about. Fixed by adding `min-w-0 flex-1` to each card's content wrapper and `truncate` to the variable-length text lines — the standard, well-established CSS pattern for this exact class of bug (already used elsewhere in this codebase, e.g. the admin header's email display).

**Deliberately not touched:** `src/app/dashboard/more/page.tsx` uses a similar card pattern and has the same latent gap, but it predates this Settings milestone (built in the Mobile App Transformation pass) and its text content is short/static (module names I wrote myself), not unpredictable real data — materially lower real-world risk, and fixing it would be outside this milestone's explicit scope ("fix only that bug"). Noted here for a possible future, separately-scoped pass.

**What was NOT verified, stated plainly:** anything requiring sight — card spacing, hierarchy, theme swatch selected-state visibility, live preview appearance, actual mobile stacking, hover/pressed states, whether the fix *looks* correct once rendered. None of this was performed or is claimed. See the manual checklist below for exactly what requires your own eyes.

**Tests performed:** `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS (25 routes, unchanged), full live-Postgres regression (businesses incl. `brand_theme`, feedback submissions, admin role, public feedback page, rate limiter) — all passed.

## v2.7 — Settings / Business Control Center

**Status: complete and verified. Every claimed-functional setting passed the full required lifecycle test (open → change → save → persists → reload → customer experience uses it). Nothing faked.**

**Files changed (10):** new migration `0017_brand_theme.sql`, `src/lib/branding/themes.ts`, `settings/actions.ts`, `settings/brand/page.tsx`, `BrandSettingsForm.tsx`, `SettingsSignOutButton.tsx`; modified: `settings/page.tsx` (full rewrite, from a single Google link to the hub), `feedback/[code]/page.tsx` (theme wiring), `dashboard/more/page.tsx` (description text correction), `types/database.ts`.

**Database:** one additive migration — `businesses.brand_theme` (new column, CHECK-constrained to the 7 curated theme IDs) and `feedback_pages` (view extended via `CREATE OR REPLACE VIEW` to also expose `brand_theme` to anon — required for the theme to actually reach the customer page at all, since anon cannot read `businesses` directly). **No existing RLS policy was changed** — the existing owner-only/admin-read-only policies on `businesses` already cover the new column automatically, since RLS is row-level, not column-level. `0002_qr_feedback.sql` (where the view originates) was not edited.

**Existing data reused, not duplicated:** `getSettingsSummary()` aggregates from `businesses`, `google_business_connections`, and `feedback_links` — all pre-existing tables/queries. Google and QR sections are summary cards linking to the already-built `/dashboard/settings/google` and `/dashboard/qr-feedback` pages — not rebuilt.

### Genuinely functional (verified via the full required lifecycle)

- **Logo URL** — plain text URL field (not a file upload — this project has no storage infrastructure, and building a fake upload control would violate the explicit no-fake-functionality requirement). Saves to the existing `businesses.logo_url` column, already consumed by `FeedbackFlow.tsx`'s avatar rendering.
- **Brand theme** — 7 curated presets (not a free color picker). Verified live: saving a theme is immediately visible through the public `feedback_pages` view, and the actual customer page applies it via scoped CSS variable overrides — zero changes needed to `FeedbackFlow.tsx` itself, since it already consumes these same variables throughout.
- **Business Profile, Google, QR summaries** — real data, real links to already-working pages.
- **Security & Account** — real email, real static role label, real sign-out (reuses the exact same `supabase.auth.signOut()` call already in `Header.tsx`, not a second implementation).
- **Notifications: negative-feedback alert** — shown as "On," because it genuinely is (the existing `owner_notifications` system from an earlier milestone).

### Honestly labeled planned, not faked

- **Branches** — static "Planned" card, no link, no fabricated data. No branches table exists; none was created in this milestone.
- **New review alerts / AI recommendation alerts** — labeled "Planned." No notification-type system was invented to populate these.
- **Password change** — no in-settings form; links to the existing `/forgot-password` flow instead of inventing a new, unbacked change-password UI.

### Tests performed, all live

- 4 migration-level tests (defaults, owner update, invalid-value rejection, cross-owner isolation) from the initial schema step
- 2 view-extension tests (anon can read `brand_theme` through `feedback_pages`; a theme change propagates through the view in real time)
- **The explicitly required full lifecycle test:** change logo_url + theme as the owner → reload as the owner (value persists) → read via the real public customer-facing view (value is there) → attempt as a different owner (0 rows, update rejected) → admin read-only parity confirmed unaffected
- Full cross-module regression: businesses, feedback, Google connections, admin role, public feedback page, context questions, rate limiter — all passed
- `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **25 routes, correctly +1** for `/dashboard/settings/brand`

**Confirmed NOT touched, exactly as scoped:** the customer feedback state machine (zero changes to `FeedbackFlow.tsx` itself — only the page wrapper gained a CSS-variable override), Super Admin, the existing Google OAuth/Reviews integration, existing QR mapping, all RLS policies, migrations `0001`–`0016`.

## v2.6 — Full Functionality & Click Audit

**Status: complete. 2 genuine bugs found and fixed; everything else traced and confirmed working. No redesign, no new modules, no architecture changes.**

**Files changed (3):** `Header.tsx`, `Sidebar.tsx`, `dashboard/more/page.tsx`.

### Bug 1 — stuck-open profile menu across navigation (the flagged "known issue")

| Area | Element | Expected | Actual | Root Cause | Fix |
|---|---|---|---|---|---|
| Dashboard shell | Header profile dropdown | Closes when navigating to a different page | Stayed visibly open, overlaying the new page | `DashboardHeader` lives in the persistent `dashboard/layout.tsx` (never remounted when only the page changes); its `open` state had no logic tied to route changes and no click-outside handler | Added a render-time pathname comparison that closes the menu the instant the route changes, plus a click-outside handler as a second, independent safeguard |

**One real mistake caught during the fix itself, not shipped broken:** my first attempt used `useEffect(() => setOpen(false), [pathname])` — a plausible-looking fix that this project's ESLint config correctly flags as a real anti-pattern (`react-hooks/set-state-in-effect`: unconditional `setState` in an effect body causes unnecessary extra render passes). Corrected using React's own documented pattern for this exact scenario — comparing the previous and current value *during render* and calling the setter conditionally, which is not subject to that rule at all. Verified both the fix and the correction live via `eslint`, not just assumed.

### Bug 2 — Settings marked "Coming Soon" despite having real, working content

| Area | Element | Expected | Actual | Root Cause | Fix |
|---|---|---|---|---|---|
| Sidebar + More screen | Settings nav item | Clickable, since the page has a real, functional Google Business Profile connection card | Rendered disabled with a "Soon" badge in both navigation surfaces, making a working feature unreachable via normal navigation | The `enabled: false` flag was never updated after the Settings page gained real content in an earlier milestone | Flipped to `enabled: true` in both `Sidebar.tsx` and `more/page.tsx` |

### Verification performed (not merely asserted)

- **32 `onClick` handlers** across dashboard/admin/feedback components listed and traced individually — zero literal no-ops found; spot-checked `BusinessProfileForm.tsx`'s `applyCandidate` and confirmed it genuinely updates form state (not a silent no-op)
- **Every navigation href** in `Sidebar.tsx`, `MobileBottomNav.tsx`, and `more/page.tsx` cross-checked against the real build output route list — all resolve to genuine, existing routes
- **Component keying checked** for `ReviewReplyCard` (in `reputation/page.tsx`) and `ReviewGenerator` (in `FeedbackList.tsx`) — both correctly keyed by real database UUIDs (`review.id`, `s.id`), confirming no shared-state leakage between multiple instances on the same page
- **`admin/layout.tsx`** confirmed to have zero client-side toggle state — not susceptible to the same persistent-state bug as the dashboard header
- Admin back-navigation links (`/admin/businesses` list↔detail, "Back to dashboard") confirmed pointing to real routes
- Full cross-module regression (businesses, feedback, Google connections, admin role, public feedback page, rate limiter) — all passed
- `tsc --noEmit`, `eslint`, `next build` — all clean, **24 routes, unchanged**

### Issues found vs. fixed vs. remaining

- **Found:** 2 (both above)
- **Fixed:** 2
- **Remaining:** 0 confirmed bugs. No larger architectural problem was discovered — nothing required stopping to report per the "no architectural changes" instruction.

**What was NOT verified — no browser/device access exists in this environment:** see the manual checklist below.

## v2.5 — Premium Mobile App UX Transformation (owner dashboard only)

**Status: complete, code/build/regression verified. No visual/device rendering performed — see the manual verification checklist below, provided instead of a false claim of visual confirmation.**

**Files changed (6), all scoped to dashboard navigation/home:** new `MobileBottomNav.tsx`, new `mobile/MobileHome.tsx`, new `/dashboard/more/page.tsx`; modified additively: `dashboard/layout.tsx`, `dashboard/page.tsx`, `Sidebar.tsx` (removed its own earlier mobile tab bar, now superseded by the purpose-built bottom nav, to avoid two competing mobile navigations existing at once).

**Confirmed zero new data computation:** every value in the new mobile home comes from data `dashboard/page.tsx` already computed (Experience Score, feedback analytics, top recommended action — the exact same pipeline `/dashboard/intelligence` uses) or from two already-existing server actions (`getReputationMetrics()`, `getActiveConnectionSummary()`, both built in the Google Reviews milestone). The only new arithmetic is a simple 4-point setup-completeness tally (business name / category+city / Google URL / segment — all real boolean checks on real business fields), not a new business-logic system.

**Information architecture, as requested:** header → Experience Score hero (radial progress, real score) → real sentiment distribution (positive/neutral/negative %, derived from the existing per-rating `distribution` counts, never estimated) → Needs Attention + AI Recommendation (deliberately shown as one section, not two — they're the same underlying `topAction` object in this data model; presenting it twice would be redundant, not more informative) → Customer Voice excerpts (real recent messages, truncated, never fabricated) → Google Reviews summary → quick actions. Secondary modules (Business Profile, QR Feedback, Customer Actions, Customer Pulse, Analytics, Settings) moved to a new `/dashboard/more` screen, keeping Home compact per the requested hierarchy.

**Premium empty states, real-data-gated throughout:** no Experience Score exists → "Your Experience Score is waiting" with a real QR-code CTA, never a fabricated number. No Google connection → "Connect your Google Business Profile," never fake review counts. Connected but not yet synced → an honest intermediate state distinct from both. Incomplete setup → a compact progress bar at a real percentage, never a "giant boring warning box."

**Desktop confirmed unaffected:** the entire existing desktop dashboard (`DashboardGreeting`, `DashboardHeroCards`, the business/Google-link cards, "What's next") is wrapped unchanged in a `hidden md:flex` container — same JSX, same data, same behavior, simply hidden below the `md` breakpoint where the new mobile home takes over instead. Nothing was "shrunk" — mobile and desktop are two genuinely separate presentations of the same underlying data, exactly as required.

**One real redundancy caught and fixed during implementation:** `Sidebar.tsx` already had its own mobile tab bar from an earlier design pass. Left in place alongside the new bottom nav, mobile users would have seen two competing navigation systems simultaneously. Removed the old one, confirmed via lint that the resulting unused `flatNavItems` variable was also caught and removed.

**Tests performed, all real:**
- Live Postgres: full cross-module regression (businesses, feedback, owner notifications, Google reviews, Google connections, admin role, public feedback page, rate limiter) — all passed, confirming zero functional impact
- Confirmed via query that real test-business data produces a genuine 75% setup-completeness value (3 of 4 checks true), not a rounded/fabricated figure
- `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **24 routes, correctly +1** for `/dashboard/more`, the only new route
- Confirmed via file-modification-time check: zero touch to the customer feedback flow, Admin/Super Admin, Google OAuth foundation, AI reply engine, RLS, or any of the 16 existing migrations

**What remains genuinely unverified — no visual/device rendering was performed, and none is claimed:** see the manual verification checklist below.

## v2.4 — Final Customer Experience Simplification: Emoji-Only Reaction Flow

**Status: complete and verified. Single file changed — the smallest possible implementation, exactly as required.**

**Important, flagged prominently (not implemented silently):** this milestone explicitly directs that negative/neutral-rated customers (1–3) no longer see the Google review option at all — a direct reversal of "no review gating, every rating gets the same Google option," a principle repeated as foundational throughout this entire project. Implemented exactly as instructed, since it's an explicit, clear product decision from the owner — flagged here clearly in case it wasn't meant as a deliberate reversal.

**File changed:** `src/components/feedback/FeedbackFlow.tsx` only. Confirmed via file-modification-time check — zero other files touched, including `feedback/[code]/page.tsx` (zero changes needed there at all).

**OLD → NEW flow:**
- Old: `questions (2 business questions) → rating (stars) → tags (multi-select) → message (free text) → draft (editable AI review) → save+redirect`
- New positive (🙂/🤩, rating 4–5): `emoji tap → generating → ready (checkmarks, auto-copied) → "Continue to Google" → save+redirect`
- New negative (😡/😕/😐, rating 1–3): `emoji tap → recovery detail (1 optional quick-select) → save → thank-you (no Google)`

**Zero backend changes required — confirmed before writing any code, not assumed:** `generateDraft()`, `submitFeedback()`, and `reviewDraft.ts`'s template engine already accepted empty `tags`/`message` (proven by the old flow's own "optional" steps) and already had anti-fabrication/variation built in since Module 2. The negative-flow's "what went wrong" quick-select reuses the *existing* segment-aware `tags` prop (from `feedback_links`) directly — no new vocabulary, no new configuration.

**The owner's question-management system is fully intact, simply unused by this flow:** `business_context_questions`, `ContextQuestionsEditor.tsx`, and the admin CRUD actions are completely untouched — owners can still configure questions; the customer just never sees them in this new flow. The `questions` prop remains in `FeedbackFlow`'s type signature for compatibility, never rendered.

**Google handoff ordering, verified correct in code:** the review is generated and clipboard-copied entirely *before* the customer ever sees a Google-related button — copy is attempted the moment the draft exists (inside the `generating → ready` transition), not deferred to the "Continue to Google" click. Clicking that button only then saves (the one database write) and redirects.

**Clipboard failure fallback, verified present:** wrapped in try/catch; on failure, the UI shows a manual "Tap to copy your review" affordance with the draft text visible on screen, never a false "✓ Copied" claim, and never blocks the flow.

**One real test-methodology artifact caught during verification, not a code bug:** an initial live-Postgres test used an `INSERT...SELECT` subquery against `feedback_submissions` as `anon` to simulate the notification insert — silently inserted 0 rows, because `anon` has no SELECT policy on that table (by design, confirmed repeatedly in this project). The *real* `submitFeedback()` code never does this — it generates the submission ID explicitly in JavaScript before either insert, exactly as already established in the owner-notifications milestone. Redone matching that real pattern; both inserts succeeded correctly.

**Tests performed, all live:**
- Live Postgres: exact new positive-path call shape (empty tags/message, rating 5) and negative-path call shape (single-tag array, rating 2 + owner notification) both verified end-to-end
- Full cross-module regression: businesses, feedback submissions, owner notifications, Google reviews, admin role, public feedback page, rate limiter — all passed
- `tsc --noEmit` PASS (one real unused-variable warning caught by lint and fixed before this report — a leftover `googleUrl` state variable), `eslint` PASS, `next build` PASS — **23 routes, unchanged**

**Confirmed untouched:** Admin panel, Super Admin, Google OAuth foundation, Google Reviews API integration, AI reply engine, owner dashboard, RLS, all 16 existing migrations, owner notification creation logic itself (only the trigger-side rating classification changed, which was already how the existing notification system worked).

**What remains genuinely unverified:** actual visual rendering and the emoji micro-interactions (scale/bounce/glow) on a real device — no browser capability in this environment, as throughout this project. The sequencing and state-machine logic above are verified by code tracing and live database testing, not by sight.

## v2.3 — Premium Design System Pass (visual/UX only, no functional changes)

**Status: complete, verified technically. Prompted by real screenshots of the running app — the first genuine visual ground truth available in this entire project — confirming the exact problems described: a tiny floating card on a vast empty canvas, weak buttons, flat pill chips, plain sidebar.**

**Files changed (46):** `globals.css` (new design tokens), `Button.tsx`, `Field.tsx`, `Alert.tsx`, `AuthShell.tsx`, `Sidebar.tsx` (rebuilt), `Header.tsx` (rebuilt), `FeedbackFlow.tsx`, `feedback/[code]/page.tsx`, `ComingSoon.tsx`, `settings/page.tsx`; plus 12 dashboard/admin pages (h1 typography) and ~20 component files (shared card/empty-state patterns, upgraded via precise, verified mechanical replacement rather than individual hand-edits).

**New design tokens (`globals.css`):** a warm-tinted shadow scale (`shadow-xs/sm/md/lg/premium`), a 12–16px radius scale, a `--gradient-canvas` page-background wash — all registered in Tailwind's `@theme` as real utility classes, not one-off inline styles.

**The core reported bug, fixed directly:** `feedback/[code]/page.tsx` had `max-w-md` centered in a full-viewport flex container with no background treatment — exactly producing the screenshot's "tiny card on huge blank page." Fixed with a `bg-canvas` background, a proper content container, and a materially upgraded `FeedbackFlow.tsx`: elevated/gradient business avatar, bolder progress indicator, all 5 step-cards upgraded to `shadow-lg`, pill chips changed from a weak tint-outline to a strong filled selected state, star rating given a hover/active micro-interaction.

**Dashboard shell rebuilt:** `Sidebar.tsx` — hand-crafted inline SVG icons (no new dependency), grouped into Overview/Customer Experience/Reputation/Workspace, mobile tab bar upgraded to filled pill style. `Header.tsx` — sticky/blurred, gradient avatar, workspace-name pill, stronger notification badge.

**Settings → Google**, per the explicit requirement that it "should look like a serious product module, not simply another text link" — rebuilt as an icon + title + description card with hover lift, not a bare bordered link.

**Applied consistently, not patched page-by-page:** page-title typography upgraded identically across 12 dashboard/admin pages (via a precise, tag-anchored replacement — confirmed it did NOT also touch a stat-card value in `admin/page.tsx` sharing the same class string, which a blind find-replace would have wrongly caught); the common card pattern (26 instances) and empty-state dashed-box pattern (12 instances) upgraded identically across every dashboard/admin/component file that used them, via the same verified mechanical technique already proven safe in earlier milestones.

**Two real risks caught and corrected during implementation, not after:**
1. The new mobile nav's active-state accent bar was initially designed with `-left-5` absolute positioning, which would have rendered outside the sidebar's actual visible area (no reserved gutter space existed for it) — caught through direct layout reasoning before testing, replaced with a robust `border-l-[3px]` pattern that cannot render incorrectly regardless of surrounding spacing.
2. A blind global find-replace for the page-title typography pattern would have also incorrectly upgraded a dashboard stat-card *value* in `admin/page.tsx` that happened to share the exact same className string — caught by checking actual usage before running the replacement, fixed by anchoring the match to the `<h1` tag specifically.

**Confirmed zero functional impact:** every single change in this pass is presentational (CSS classes, SVG icons, JSX layout/spacing) — no component's props, state, business logic, data-fetching, or event-handler behavior was altered. Verified: the customer feedback flow's 5-step state machine (`questions → rating → tags → message → draft`) is byte-identical in logic to before. Full live-Postgres regression (businesses, feedback, Google reviews, admin role, public feedback page, rate limiter) — all passed, confirming the database/RLS layer is completely unaffected, as expected from a design-only pass.

**Build verification:** `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **23 routes, unchanged** (confirms no routing impact). A scan for malformed/duplicated output from the broad mechanical replacements found none.

**What remains genuinely unverified:** actual visual rendering. I have no ability to view a rendered page in this environment — everything above is reasoned from code and verified by compilation/build/regression, not by sight. The screenshots you provided were the first real evidence of how this app actually looks; I have no way to independently confirm this pass actually resolves what they showed without you looking at it again.

**Not done in this pass, honestly flagged:** the public landing page (already inherits the new tokens automatically via its existing `text-verified`/`Logo` usage, confirmed in an earlier branding pass, but not individually re-reviewed here); no modals exist in this app to upgrade (confirmed via search); loading-state spinners were not individually redesigned beyond what `Button`'s existing spinner already provides.

## v2.2 — Complete Google Review → AI Reply → Publish Workflow

**Status: code/build/RLS/logic fully verified server-side; live Google verification deliberately deferred to one comprehensive real-world test (see the final test checklist below), per explicit instruction not to pause after each milestone for partial browser testing.**

**Files changed (7):** new migration `0016_google_reply_workflow.sql`, `src/app/dashboard/reputation/replyActions.ts`, `src/components/dashboard/ReviewReplyCard.tsx`; modified additively: `src/lib/google/reviewsClient.ts` (+publishReply/deleteReply), `src/app/dashboard/reputation/{actions.ts,page.tsx}`, `src/types/database.ts`.

**Database:** one additive `ALTER TABLE` on the existing `google_reviews` (0015) — 5 new columns (`ai_reply_draft`, `draft_status`, `draft_updated_at`, `publish_attempted_at`, `publish_error`) plus one new CHECK constraint. No new table, no existing migration edited, no RLS policy touched (the existing owner-only/admin-read-only policies on `google_reviews` automatically cover the new columns, since RLS is row-level not column-level — confirmed live).

**AI reply generation:** `generateReplyDraft()` reuses `generateGoogleReplies()` (`src/lib/reviewEngine/replyGenerator.ts`) **unmodified** — zero changes to the reply engine itself. A Google review (rating + comment, no structured tags) maps onto the same `ReviewContext` every other caller already uses. Verified via **real, unmocked execution** of the actual engine (not simulated): a 2-star review produced an apology-toned reply without fabricating details not present in the original text; a 5-star review produced a distinctly different, thankful tone; compliance checking and quality scoring both ran as part of the same unmodified pipeline.

**Owner edit/approval:** `updateReplyDraft()` — local to BD Clarity, nothing sent to Google until explicit approval.

**Publish to Google:** `publishReviewReply()` calls the real `updateReply` v4 endpoint (confirmed current via live documentation research during this session). **One important finding from that research, confirming rather than contradicting the implementation:** Google's own REST reference confirms `reviewId` is a bare identifier, distinct from the full `name` resource path — validating that this project's resource-path reconstruction (`accounts/{id}/locations/{id}/reviews/{reviewId}`) follows Google's own documented pattern exactly. Simplified an unnecessarily defensive string operation in the implementation once this was confirmed, with the reasoning documented in code.

**Reply status, error handling, retry:** full state machine — `none → drafted → edited → publishing → published` or `→ failed`. A failure preserves the draft text and captures Google's real error message (never fabricated); retry reuses the existing draft via the same `publishReviewReply()` call, with no separate retry function needed. Verified live, end-to-end, including the full failure-then-successful-retry path.

**Premium dashboard metrics:** average rating, total reviews, new-in-7-days, awaiting-reply — pure aggregation over already-synced `google_reviews` rows, no new Google call, reusing the existing card/shadow/typography tokens from the branding pass rather than inventing new styling.

**Tests performed, all real:**
- 4 live-Postgres schema/RLS tests for the new columns (default correctness, owner write via the existing policy, cross-business isolation unaffected, constraint enforcement)
- 11 mocked unit tests for `publishReply`/`deleteReply` (correct HTTP method/endpoint, real Google error message capture, graceful fallback on unparseable error bodies, network-failure handling)
- 6 real (unmocked) execution tests of the actual `generateGoogleReplies()` engine with Google-review-shaped input
- 8-step live-Postgres state-machine test covering the complete lifecycle including failure and retry, plus cross-business isolation and admin read access at the end state
- Full cross-module regression (businesses, feedback, notifications, Google connection, admin role, public feedback page, rate limiter)
- `tsc --noEmit`, `eslint`, `next build` — all clean, **23 routes, unchanged** (no new route — extends the existing Reputation page)

**Confirmed untouched:** the Google OAuth foundation, `google_business_connections` (no duplicate connection/location tables created), the existing review/reply engine's own logic, customer feedback flow, Customer Brain, Customer Pulse, Action Engine, Segment Engine, Admin/Super Admin, and migrations `0001`–`0015`.

**What remains genuinely unverified, honestly stated:** everything above is correct server-side logic, real database behavior, and a real (not mocked) exercise of the AI engine — but **no part of this has been exercised against Google's real servers**, because no real OAuth credentials or approved API access exist in this environment. This is not claimed as live-verified. See the comprehensive final test checklist for the one real-world pass that will actually confirm it end-to-end.

## v2.1 — Google Review Retrieval, Milestone 1: Foundation (read-only)

**Status: complete, code/build/RLS verified; live Google API retrieval NOT verified — no real credentials exist in this environment.**

**Files changed (7):** new migration `0015_google_reviews_milestone1.sql`, `src/lib/google/reviewsClient.ts`, `src/app/dashboard/reputation/{actions.ts,page.tsx}`, `src/components/dashboard/SyncReviewsButton.tsx`; modified additively: `src/types/database.ts`, `src/components/dashboard/Sidebar.tsx` (one new nav entry).

**Database:** one new table, `google_reviews`, deliberately reusing the *existing* `google_business_connections` table for all OAuth/identity data rather than creating duplicate connection/location tables, exactly per the approved scope. Dedup key: `unique(connection_id, google_review_id)`. No existing migration edited.

**RLS:** owner-only full access, admin read-only, zero anon access — identical established pattern. 7 live tests passed: owner insert/read, cross-business isolation, anon fully blocked (read and write), admin read-only parity, invalid-rating rejection, and critically — **re-upserting the same `google_review_id` updates the existing row rather than creating a duplicate (confirmed: count stayed at 1 after a second upsert with changed content).**

**API functions implemented:** `listReviews()` and `getReview()` only (`src/lib/google/reviewsClient.ts`) — real, current Google Business Profile v4 REST endpoints, verified against live documentation during inspection. Reply publishing (`updateReply`/`deleteReply`) deliberately not implemented — out of scope for this milestone.

**Sync behavior:** owner-triggered "Sync Google Reviews" button → `syncGoogleReviews()` server action → decrypts the connection's stored token (refreshing first if expired, reusing the exact existing refresh logic) → paginates through every page Google returns → upserts. A page-fetch failure after some pages already succeeded reports partial success honestly rather than discarding already-synced data.

**One real scope correction made during implementation:** initially wrote an audit-log call for the sync action, then caught that the existing narrow owner audit policy (from the Google OAuth milestone) only permits two specific connect/disconnect actions — extending it would mean touching an already-existing migration's effective policy, outside this milestone's approved "one new table only" scope, and audit logging wasn't actually requested. Removed before it shipped, documented here rather than silently dropped.

**UI:** `/dashboard/reputation` — connection status, last-synced time, and a read-only review list (star rating, reviewer name if provided, comment, existing Google-side reply if any, reply status). Added to the sidebar navigation (lesson learned from a previous orphaned-route finding) rather than left reachable only by direct URL.

**Tests performed:**
- 7 live-Postgres RLS/dedup/validation tests, all passed
- **13 mocked, unit-level tests** against a realistic, schema-accurate simulated Google API response — verifying the rating-enum mapping (`FIVE→5`, unspecified→`null`, never fabricated), field extraction, existing-reply parsing, and graceful failure on a bad HTTP response. **Clearly mocked, not live** — no real Google server was contacted.
- Full cross-module regression (businesses, feedback, notifications, admin role, public feedback page, rate limiter) — all passed
- `tsc --noEmit`, `eslint`, `next build` — all clean, **23 routes** (correctly +1)

**What was NOT tested, and cannot be, in this environment:** actual retrieval from a real Google Business Profile account. No `GOOGLE_OAUTH_CLIENT_ID`/`SECRET` exist here, and real API access additionally requires Google's Sensitive-scope verification and separate Business Profile API approval (same external blockers as the OAuth foundation milestone). The parsing/pagination/dedup *logic* is verified; the live *network behavior* against Google's actual servers is not, and must not be claimed as verified until real credentials and approved access exist.

**Confirmed untouched:** customer feedback flow, Customer Brain, Customer Pulse, Action Engine, Segment Engine, the existing Google OAuth foundation, the existing review/reply engine, Admin/Super Admin, and every migration `0001`–`0014`.

## v2.0 — Premium BD Clarity + Banao Digital branding pass (design/branding only)

**Status: complete and verified.** Design/branding enhancement only, exactly as scoped — zero database, RLS, API, routing, or business-logic changes.

**Files modified (9 total, all presentational):**
- `src/app/globals.css` — retinted the existing `--color-verified*` design tokens from green to the Banao Digital copper-orange from the reference image; added a new `--gradient-brand` token used sparingly for premium accents. Deliberately kept the CSS/Tailwind class *name* ("verified") unchanged rather than renaming it — a rename would require touching ~50 component files' worth of Tailwind classes for a purely cosmetic reason, a larger blast radius than this design pass calls for. Every `bg-verified`/`text-verified`/`border-verified` usage across the entire app (already used everywhere as the primary interactive color) picked up the new brand color automatically, with zero component files touched for this alone.
- `src/components/ui/Logo.tsx` — two-tone "BD" (charcoal) + "Clarity" (orange) wordmark matching the reference, derived from the existing `branding.productShortName` config value rather than hardcoded; icon badge now uses the new gradient token instead of a flat fill.
- `src/components/ui/BanaoAttribution.tsx` — new, small reusable "Powered by Banao Digital" component (two variants: subtle footer line, slightly more prominent card treatment for auth screens). Deliberately text-only, no repeated large logo.
- `src/components/auth/AuthShell.tsx` — added the tagline (login only, via a new optional prop), a subtle brand-gradient wash at low opacity, and the Banao attribution — cascades to all 4 auth pages (login/signup/forgot-password/reset-password) from this one shared component.
- `src/app/(auth)/login/page.tsx` — opted into the tagline via the new prop.
- `src/app/dashboard/layout.tsx` — added a footer with the attribution; fixed the flex container to `flex-col md:flex-row` (see bug fix below) and added `min-w-0` to the main content area.
- `src/app/admin/layout.tsx` — added a matching footer with the attribution; added `min-w-0` to the main content area.
- `src/components/dashboard/Sidebar.tsx` — added mobile navigation (a horizontally-scrolling tab bar, shown only below `md`) reusing the exact same nav items as the desktop sidebar. Previously, nothing at all was shown on mobile — the sidebar simply vanished with no replacement.
- `src/app/feedback/[code]/page.tsx` — added the attribution to the customer-facing feedback page's footer.

**One real layout bug caught and fixed before it could ship, not after:** adding the new mobile nav bar as a sibling of `<main>` inside a container that was always `flex` (row direction, no responsive override) would have placed the mobile nav *beside* the main content horizontally on narrow screens, rather than stacked above it — exactly the kind of horizontal-layout problem explicitly flagged as a risk. Caught during implementation via direct reasoning about the flex layout, fixed by making the container `flex-col md:flex-row`.

**Landing page: required zero changes.** Confirmed by direct inspection that `Header.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `Features.tsx`, `WhySection.tsx`, `TrustSection.tsx`, and `Footer.tsx` already use `Logo`, `branding.tagline`, `branding.parentBrand`, and `text-verified`/`bg-verified-tint` extensively — the entire public marketing site inherits the new two-tone logo and Banao orange automatically, with no component edits needed.

**Confirmed NOT touched:** database schema, RLS policies, server actions, API routes, Admin/Super Admin business logic, Action Engine logic, Google OAuth logic, review workflows, permissions — verified via file-modification-time check against the pre-branding checkpoint (exactly 9 files, all presentational).

**Build verification:** `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **22 routes, unchanged** (confirms zero routing impact). Live-Postgres spot check confirmed the database/RLS/admin layer is completely unaffected, as expected given zero backend files were touched.

**Limitations, stated plainly:**
- No visual/mobile rendering has been observed by me — the new mobile tab bar, the gradient wash, the two-tone logo, and every other visual change described here has never been looked at in an actual browser. This is a design change I'm describing from code, not confirming by sight.
- The specific orange hex values (`#c1611e` / `#9c4e18` / `#fbeee2`) are my best-effort reading of the reference image's copper-orange tone, not a pixel-sampled exact match — worth a visual color check against the real logo asset once you can view it rendered.
- The Google connection page (`/dashboard/settings/google`), Action Engine cards, and Admin business list were not individually restyled beyond what they already inherit from the token retint + new footers — they were not visually "upgraded" component-by-component, per the instruction to avoid unnecessary redesign of working screens.

## Audit — Action Engine Milestones 1–3, full verification pass

**Status: audit complete. No functional changes made — read-only verification, exactly as scoped.**

**Scope:** independently re-verify all 3 completed Action Engine milestones, confirm zero unintended impact on the recommendation engine, Customer Brain, Customer Pulse, Segment Engine, Admin Panel, Google integration, and business-level isolation.

**Method:** built a completely fresh database (`drai_audit`) from scratch, applied all 13 migrations in sequence with `ON_ERROR_STOP`, seeded new test data independent of any prior session, and re-ran the core functional/security tests from first principles rather than trusting prior results.

**Findings:**

1. **Migration consistency: clean.** All 13 migrations (`0001`–`0013`) apply cleanly, in order, on a fresh database — zero errors, zero conflicts. `business_action_status`'s status constraint shows exactly one active `CHECK` (confirming `0012`'s `DROP...IF EXISTS` + `ADD CONSTRAINT` correctly replaced the original rather than leaving two).
2. **Functional re-verification, all 3 milestones: PASS**, fresh data, fresh database — recommendation query pattern, full `open → in_progress → done` lifecycle, baseline capture with the never-overwritten guarantee (re-confirmed: a second insert attempt with a different value was rejected by the unique constraint).
3. **Business-level isolation: PASS.** Owner B gets 0 rows against every one of Cafe A's three relevant data surfaces (feedback, action status, baselines).
4. **Admin read access: PASS**, matching the established pattern.
5. **Anon: fully blocked** from both the modified and new tables.
6. **Recommendation engine, Customer Brain, Segment Engine: confirmed untouched** — zero references to "Action Engine" found anywhere in `customerVoice.ts`, `demandDetector.ts`, `priority.ts`, or any `src/lib/segments/*` file.
7. **Admin Panel, Google integration, customer flow, review-generation engine: confirmed untouched** — zero files modified in any of these areas since their own respective last-verified backups.
8. **Dead code/duplicate logic: none found.** `eslint` (which flags unused imports/variables project-wide) is clean; `setActionStatus()` and `ActionLifecycleControls` each exist exactly once, correctly reused rather than duplicated.
9. **Build: clean**, 22 routes, all real — no orphaned route in the build output itself.

**Real issue found, NOT fixed during this audit (per your explicit instruction):**
- **`/dashboard/actions` (all of Milestones 1–3's UI) is not in the sidebar navigation** (`Sidebar.tsx`'s `navItems`). It's only reachable by direct URL or a one-way link from the Intelligence page. This is a genuine navigation gap, detected via static code inspection, not browser testing.
- **Secondary, related observation:** `/dashboard/settings` is marked `enabled: false` ("Soon") in the sidebar, but the route now has real, working content (the Google connection link, added in an earlier milestone) — the sidebar's disabled state is stale relative to what the page actually does.

**Minor, pre-existing design note (not a defect, not introduced by these milestones):** `business_action_status` has no admin-read RLS policy (unlike `action_baseline_snapshots`, which does) — this asymmetry traces back to the original Module 6 migration, predating the Admin Panel's existence entirely.

**Recommendation:** both navigation findings are small, low-risk fixes (adding two lines to `Sidebar.tsx`'s array) — but per your explicit instruction, no fix was made during this audit. Flagging for your approval as a possible small follow-up, separate from any new feature milestone.

## v1.9 — Customer Experience Action Engine, Milestone 3: Measurement / baseline comparison

**Status: complete and verified.** The final piece of the originally-approved 3-milestone Action Engine plan.

**Files added:** none new — all changes are additive to existing files, plus one migration.

**Files modified, additively only:**
- `src/types/database.ts` — new `action_baseline_snapshots` table type
- `src/app/dashboard/intelligence/actions.ts` — `setActionStatus()` gains `captureBaselineIfNeeded()`, called only when transitioning to `in_progress`/`done`; reuses the exact same `computeCustomerVoice`/`computeDemandSignals` functions every intelligence page already calls — no new computation engine
- `src/app/dashboard/actions/page.tsx` — fetches baselines, passes them to each `ActionCard`, renders a real before/after comparison line when one exists

**Database:** one new migration, `0013_action_engine_milestone3.sql` — new table `action_baseline_snapshots` (business_id, action_key, baseline_count, evidence_label, captured_at), unique on `(business_id, action_key)` so a baseline is captured exactly once and never overwritten. Owner-only RLS + admin read-only, matching the established pattern exactly. No existing table touched.

**Evidence integrity — the core design decision this milestone required:** the baseline count is never client-supplied. `captureBaselineIfNeeded()` independently recomputes the current period's real insights server-side, at the moment of the status transition, and only stores what it actually finds — if the matching insight can't be found (e.g. dropped below the visibility threshold), no baseline is captured at all, rather than a fabricated one.

**Tests performed, all live and real:**
- 8 RLS/validation tests: owner insert/read, cross-business isolation, forgery rejection, anon fully blocked, unique constraint prevents a second baseline for the same action, negative-count rejected, admin read-only parity — one test (#8) initially returned an unexpected empty result, traced to a test-setup gap (I hadn't re-seeded the admin test user in this fresh Postgres session after an infrastructure reset, not a code issue), confirmed correct once properly seeded
- **End-to-end test combining real computation and real persistence:** seeded 6 realistic `feedback_submissions` rows, ran the actual `computeCustomerVoice()` function via real Node execution to get the genuinely-computed evidence count (6), then verified the exact check-then-insert flow `captureBaselineIfNeeded()` performs against live Postgres
- **Never-overwritten guarantee verified at both layers simultaneously:** a baseline already existed from earlier RLS testing (14) for the same action_key; the attempt to write the freshly-computed value (6) was correctly rejected by the database's unique constraint — proving both the application-layer early-return check *and* the database-level backup enforcement protect this guarantee independently
- Full regression: businesses, business_action_status, admin read access to the new table, rate limiter, all confirmed intact
- `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **22 routes, unchanged** (no new route this milestone)

**Backups:** `digital-review-ai-pre-actionengine-m3-checkpoint.zip` (before this work).

**Limitations:** no visual/mobile testing (no browser capability, as throughout this project) — the baseline comparison display has never been rendered or looked at.

**Action Engine plan status: all 3 originally-approved milestones now complete** (Customer Actions view → 3-state lifecycle → measurement/baseline comparison). No further Action Engine work is planned unless separately approved.

## v1.8 — Customer Experience Action Engine, Milestone 2: 3-state lifecycle

**Status: complete and verified.** Widens the existing binary `open`/`done` lifecycle to `open → in_progress → done`, exactly per the approved plan. One infrastructure interruption occurred mid-implementation (the sandbox reset again); recovered by restoring the verified `digital-review-ai-actionengine-milestone1-backup.zip` — checksum-confirmed identical to what was created and reported at the end of the prior turn — rather than reconstructing anything from memory.

**Note on interpretation:** this milestone's approval message said "proceed with Milestone 2" without specifying which of two open tracks (Google Review Retrieval, or the Action Engine's own lifecycle milestone). Since my immediately preceding message specifically ended asking for approval on the Action Engine's lifecycle milestone, I proceeded on that reading and flagged it plainly at the start, rather than guessing silently.

**Files added:** `src/components/dashboard/actions/ActionLifecycleControls.tsx` — the only new UI this milestone introduces.

**Files modified, additively only:**
- `src/lib/insights/types.ts` — `RecommendedAction.status` widened from `"open" | "done"` to `"open" | "in_progress" | "done"`
- `src/lib/insights/businessAdvisor.ts` — `statusByKey` parameter type widened to match; no logic changed
- `src/app/dashboard/intelligence/actions.ts` — `setActionStatus()` (the *existing* action, reused rather than duplicated) now accepts `"in_progress"` alongside its original two values
- `src/app/dashboard/intelligence/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/actions/page.tsx` — status-map type annotations widened to match
- `src/app/dashboard/actions/page.tsx` — each action card now renders `ActionLifecycleControls`

**Explicitly NOT touched, confirmed by design:** `src/components/dashboard/intelligence/RecommendationsPanel.tsx` — verified before implementation that its `=== "done"` checks degrade safely with the new `in_progress` value (treated as "not done," exactly as `open` already was) — zero changes needed or made there. One honest, minor behavioral note: `topActionsForToday()` (used by the "What Should I Do Today" widget) still filters `status === "open"` only, so an action moved to `in_progress` no longer appears there — a reasonable existing behavior, left unchanged rather than silently altered.

**Database:** one new migration, `0012_action_engine_milestone2.sql` — widens the existing `business_action_status_status_check` CHECK constraint to allow `in_progress`. No new table, no new column, `0004` (where the table originates) not edited.

**Tests performed, all live and real:**
- 4 constraint/backward-compatibility tests: existing `open`/`done` values still work unchanged, `in_progress` now accepted, a genuinely invalid value (`'archived'`) still correctly rejected (constraint is widened, not removed), existing cross-owner RLS isolation completely unaffected
- Full lifecycle test: `open → in_progress → done → open` (Reopen), all four transitions succeeded via the exact upsert pattern `setActionStatus()` uses
- Full regression: businesses/status data, rate limiter, all confirmed intact
- `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **22 routes, unchanged** (no new route this milestone — confirms minimal footprint)

**Backups:** `digital-review-ai-pre-actionengine-m2-checkpoint.zip` (before this work; also served as the recovery point after the mid-session reset).

**Limitations:** no visual/mobile testing (no browser capability, as throughout this project) — the new lifecycle buttons have never been clicked in an actual browser.

## v1.7 — Customer Experience Action Engine, Milestone 1: Customer Actions View

**Status: complete and verified.** Reuses the existing recommendation engine entirely — no new intelligence, no new database table, exactly as scoped.

**Files added:** `src/app/dashboard/actions/page.tsx` — the new "Customer Actions" view.

**Files modified, additively only:**
- `src/lib/insights/types.ts` — `RecommendedAction` extended with `expectedSignal: string` and `evidencePeriod: string`
- `src/lib/insights/businessAdvisor.ts` — added `expectedSignalFor()` (deterministic template, same discipline as the existing `titleFor`/`whyFor`), added an optional `periodLabel` parameter (defaults to `"the current period"` so any pre-existing call site keeps compiling unchanged)
- `src/app/dashboard/intelligence/page.tsx`, `src/app/dashboard/page.tsx` — both already had `range.label` in scope; threaded it through to `buildRecommendedActions()` so their existing output now also carries the real evidence period instead of the generic fallback

**Database changes: none.** No migration created — confirmed directly (`supabase/migrations/` still ends at `0011`), exactly matching the explicit "do not create a new database table" requirement.

**Before/after recommendation behavior — verified via 27 real, executed tests, not simulated:** every core field (`actionKey`, `priority`, `priorityLevel`, `title`, `why`, `recommendation`, `evidence`) is byte-identical whether or not the new `periodLabel` parameter is passed — confirmed by calling `buildRecommendedActions()` both ways against identical input and asserting equality field-by-field. Only the two new fields (`expectedSignal`, `evidencePeriod`) appear; nothing existing was altered, removed, or reordered.

**One test-authoring mistake caught during verification, not a code bug:** my first test asserted a 12-mention frustration insight should classify as `high` priority; it actually correctly classifies as `critical`, because with only one frustration insight in the test data its *share* of total frustration mentions is 100% (≥ the existing, unmodified 40% critical-share threshold from `priority.ts`). Re-verified the threshold logic directly in the source, confirmed my test's expectation was wrong, corrected it, re-ran clean.

**Priority grouping (the "🔴 Action Needed / 🟡 Watch / 🟢 Positive Signal" buckets):** a pure, new *presentation-layer* function (`groupByBucket()`) that only sorts already-computed `RecommendedAction[]` by their already-computed `priorityLevel` — critical/high → red, medium/low → yellow, monitor → green. Verified live: a critical frustration action correctly bucketed red, a monitor-level love action correctly bucketed green. This is a regrouping of existing output, not new prioritization logic.

**Evidence/reasoning display:** each action card shows title, priority badge, why-this-matters, suggested action (when a segment rule matches), expected signal, evidence count/total/label, and evidence period — all sourced directly from the existing `RecommendedAction` object, nothing invented.

**Branch safety, exactly as required:**
1. Business-level isolation re-verified live (Owner B: 0 rows querying Cafe A's data via the identical query pattern the new page uses)
2. No branch selector exists anywhere on the new page
3. Nothing on the page claims or implies any action is branch-specific
4. Explicit on-page copy: *"Shows business-level data. Per-branch views are not yet available."*
5. No existing branch context was found anywhere in the feedback/action data path to preserve — confirmed again during this milestone's implementation (no `business_branches` table, no `branch_id` on `feedback_submissions`/`business_action_status`)
6. Documented in both the page's own code comments and this changelog entry: true per-branch Action isolation remains deferred until Module 7 Milestone 3 (Branch Management)

**Explicitly NOT implemented, exactly as scoped:** action lifecycle/database state beyond the existing binary `open`/`done`, measurement/baseline comparison, any new action table, per-branch isolation, Customer Pulse integration changes, new AI recommendation logic.

**Build verification:** `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **22 routes** (correctly +1 for `/dashboard/actions`, the only genuinely new route).

**Protection re-confirmed:** zero changes to Super Admin/Admin Panel, customer experience, Google OAuth integration, review-generation/reply engine, Customer Voice, Customer Pulse, or the Segment Engine's own logic.

## v1.6 — Google Business Profile Integration, Milestone 1: Connection Foundation

**Status: complete, database and encryption layers fully tested; OAuth round-trip against real Google servers untestable in this environment (real, external dependency — see below).**

**Files added:** migration `0011_google_oauth_milestone1.sql`, `src/lib/google/tokenCrypto.ts`, `src/lib/google/oauth.ts`, `src/lib/google/businessProfileClient.ts`, `src/app/api/google/oauth/callback/route.ts`, `src/app/dashboard/settings/google/actions.ts`, `src/app/dashboard/settings/google/page.tsx`, `src/components/dashboard/GoogleConnectionPanel.tsx`.

**Files modified:** `src/types/database.ts` (new table type), `src/app/dashboard/settings/page.tsx` (one link added to the existing "Coming Soon" placeholder — placeholder content itself untouched).

**Database:** one new table, `google_business_connections` (pending/connected/disconnected states; tokens stored as encrypted `bytea`, never plaintext). One narrow, explicitly-justified addition to the *existing* `audit_logs` table (`audit_logs_insert_owner_google` policy) — added because `writeAuditLog()` otherwise requires `is_admin()`, which a business owner is not; scoped to exactly the 2 named Google-connection actions, the caller's own id, and a business they actually own. `0008` (where `audit_logs` was originally defined) was not edited.

**OAuth flow:** standard authorization-code flow — `buildGoogleAuthorizationUrl()` (with CSRF `state`, `access_type=offline`, `prompt=consent` for refresh-token issuance) → owner authorizes on Google's real consent screen → callback route validates `state` against an httpOnly cookie → exchanges the code server-side → stores encrypted tokens as a `pending` connection (no location chosen yet) → owner selects a location → `finalizeConnection()` marks it `connected`.

**Google scope used:** exactly one — `https://www.googleapis.com/auth/business.manage`, the scope Google's own current documentation specifies for Business Profile API access (verified in the approved inspection). No broader scope requested.

**Token storage/protection:** AES-256-GCM, encrypted/decrypted entirely in Node.js application code (`tokenCrypto.ts`), keyed by `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` (a server-only env var, never touching the database layer for the key — same discipline as every other secret in this project). Verified live: 9/9 tests — round-trip correctness, random IV per encryption (same plaintext → different ciphertext each time), genuine tamper detection via GCM's auth tag, and fail-closed behavior when the key is unset. No server action or RLS policy ever selects the encrypted token columns into a client-facing response — decryption happens only inside the two server actions that genuinely need it (`listAvailableLocationsForPendingConnection`, and token refresh), and the decrypted value never appears in either function's return value.

**Business → branch → Google location mapping:** interim design, flagged clearly per the approved inspection (no `business_branches` table exists — Module 7 Milestone 3 was never built). A business can create multiple `google_business_connections` rows, each with an optional free-text `branch_label` (e.g. "Nashik"). Verified live: a second connection with a different label was created successfully alongside the first.

**Disconnect behavior:** soft — sets `status='disconnected'`, `disconnected_at`, `disconnected_by`. Does not revoke the token on Google's side (out of scope; governed by the owner's own Google account security settings) and does not delete the row (preserves history, same immutability-adjacent philosophy as the rest of this project). Verified live via the unique-active constraint: a disconnected location can later be reconnected without conflict.

**Server-side authorization, verified live (14 tests across the two tables):**
- Owner can insert/read/update only their own business's connections; a different owner gets 0 rows and RLS-rejected forgery attempts
- `anon` blocked entirely, both read and write
- Admin retains read-only visibility (matching the established `_select_admin` pattern) — grants no more than the owner already has
- The new narrow owner audit-log policy: owner can log only the 2 named actions, only for themselves, only against a business they own; cross-business and off-scope-action attempts correctly rejected; the *existing* admin-only audit policy re-confirmed completely unaffected

**One real debugging finding, documented not hidden:** an early manual test appeared to show the new audit policy failing — root cause was that my test script added a `RETURNING` clause not present in the real application code; `RETURNING` implicitly requires a matching `SELECT` policy, which owners don't have on `audit_logs` (by design — the real `writeAuditLog()` never requests one). Confirmed the actual code path works correctly once tested to match it exactly.

**Whether real Google API access is available: No.** Confirmed by design of this milestone, not overlooked: this sandbox has no Google Cloud project, no OAuth client ID/secret, no approved Business Profile API access. `isGoogleOAuthConfigured()`/`isGoogleIntegrationAvailable()` correctly report `false` here, and the UI shows an honest "not configured" state rather than a broken or fake "Connect" button — same fail-closed pattern as `GOOGLE_PLACES_API_KEY` throughout this project.

**What requires your Google Cloud/Business Profile approval or configuration, exactly:**
1. A real Google Cloud project with OAuth 2.0 credentials (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`)
2. A registered, approved redirect URI (`GOOGLE_OAUTH_REDIRECT_URI`) matching wherever this app is actually deployed
3. Google's **Sensitive-scope app verification** for `business.manage` — a real review process, separate from and in addition to this code
4. Google's separate **Business Profile API access approval** (the 60-day-verified-listing prerequisite, confirmed in the inspection) — entirely outside this project's control
5. `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` — a 64-character hex string (32 random bytes) you generate and set as a server env var; not obtained from Google

**Tests performed:** 9 token-encryption tests (pure function, real execution), 14 live-Postgres RLS/authorization tests across `google_business_connections` and the new `audit_logs` policy, full regression across Modules 1–2, 7 A–D, 7 E–F, Super Admin Milestones 1–2, and the simplified customer flow. `tsc --noEmit`, `eslint`, `next build` all pass — **21 routes** (correctly +2: `/api/google/oauth/callback`, `/dashboard/settings/google`).

**Limitations, stated plainly:**
- The actual OAuth round-trip (redirect to Google, consent, callback, token exchange) has never run against real Google servers — cannot be tested without the external approvals above.
- `listGoogleAccounts`/`listGoogleLocations` (the Business Profile API calls) are written correctly per current documentation but likewise never exercised live.
- Branch mapping is a free-text label, not a real foreign-key relationship — will need a follow-up migration once Module 7 Milestone 3 (Branch Management) exists.
- No automatic cleanup of abandoned `pending` connections (owner starts OAuth, never finishes) — harmless clutter (encrypted, RLS-protected, invisible to anyone but the owner/admin), not a security issue, but worth a small cleanup job eventually.
- No visual/mobile testing performed — no browser/device capability in this environment, as throughout this project.

**Not implemented, exactly as scoped:** review retrieval, reply-publishing workflow, any automatic action on Google, any change to the customer-facing flow or `businesses.google_review_url` behavior — all confirmed untouched.

## v1.5 — Remove intermediate "done" screen; Review Ready becomes the final BD Clarity screen

**Status: complete and verified.** Targeted follow-up to v1.4, exactly as approved.

**Change:** the "Your voice has been heard" done-screen is fully removed. The review-ready screen is now the last screen the customer sees before leaving for Google. Its primary button is relabeled "Continue to Google →" and now performs the save-then-redirect in one action: submit feedback (same single `submitFeedback()` call as before) → on success, immediately `window.location.href` to the existing `googleReviewUrl` — same-tab, no new screen shown first.

**Double-submission/double-redirect safeguards, all implemented exactly as required:**
- Explicit `if (isPending) return;` guard at the top of `submit()`, in addition to the pre-existing `loading={isPending}` on the button (confirmed by reading `Button.tsx`: `loading` sets real `disabled`, not just a spinner) — two independent layers, not one.
- Failed submission (`"error" in result`) returns immediately, before any redirect logic runs — never navigates away on failure, existing error `Alert` still shown, button re-enabled automatically once `isPending` clears.
- Redirect fires from exactly one code path, guarded by the same early returns.

**One real gap caught and fixed during implementation, not shipped broken:** the message step's pre-existing "Skip — I'll write my own" link also calls `submit()`. If that business had no Google URL, the confirmation would have had nowhere to render (my new no-URL fallback was originally nested only under `step === "draft"`, which Skip never sets). Fixed by having `submit()` set `step` to the review screen only in the no-redirect branch — both entry points now correctly converge on one final screen; the successful-redirect path is untouched by this fix (no extra re-render before navigating away).

**Files modified:** `src/components/feedback/FeedbackFlow.tsx` only.

**Confirmed exactly as scoped:** no database migration, no admin file touched (verified via file-modification-time check), no change to `submitFeedback()`'s server-side logic, no change to the Google URL itself, no new Google API/OAuth/routing code — `window.location.href` is a plain browser navigation, not a new integration.

**Tests executed, live:**
- `tsc --noEmit` / `eslint` / `next build`: all PASS, 19 routes unchanged
- Code-verified: exactly one `submitFeedback()` call site; zero remaining references to the removed `"done"` step; exactly one `window.location.href` call; the explicit `isPending` guard present
- Live Postgres: full regression across Modules 1–2, 7 A–D, 7 E–F, and Super Admin Milestones 1–2, all intact

**Before/after flow:**
- Before: `Review Ready → (click) → "Your voice has been heard" → (click) → Google`
- After: `Review Ready → (click "Continue to Google →") → Google`, in one action

**Not verified (unchanged limitation):** actual click-through/visual/mobile testing — no browser or device capability in this environment, as throughout this project.

## v1.4 — Customer Journey Simplification (removes the "submitting twice" feeling)

**Status: complete and verified.** Scope strictly limited per your approval: no Google routing/OAuth added, no journey-status field added, no database migration, Super Admin Panel and admin modules completely untouched.

**The problem, precisely diagnosed (not assumed):** there was never a literal duplicate database write — `submitFeedback()` already ran exactly once. The friction was an extra confirmation *screen*: after reviewing/editing the AI-generated draft and clicking "Continue" (which saves to the database), the customer landed on a separate "done" screen and had to click *again* ("Continue to Google →") before reaching Google. Two distinct continue-actions in a row created the "am I submitting this twice?" feeling.

**Fix:** merged the "draft" and "done" steps into one continuous visual card in `src/components/feedback/FeedbackFlow.tsx`. Same underlying state machine, same single `submitFeedback()` call site — only the *presentation* changed: before submission, the card shows the editable review with Edit/Regenerate/Copy; the moment "Continue" is clicked, the same card's content updates in place to show the thank-you message, the final review text for reference, Copy (still available), and the Google link — no second screen, no second "continue" click required to reach it.

**Interpretation flagged transparently, not guessed silently:** per your explicit "Confirmed — your assessment is correct" response to my two proposed options, the existing, already-working, simple `<a href={googleReviewUrl}>` link was kept unchanged (not removed, not rebuilt) — this is not new Google routing logic, just preservation of what already existed. Flagged directly to you in case this reading was wrong.

**Files modified:** `src/components/feedback/FeedbackFlow.tsx` only. No other file touched.

**Confirmed NOT done, exactly as scoped:**
- No Google API/OAuth changes
- No journey-status tracking field added
- No database migration (`supabase/migrations/` still ends at `0010`, unchanged)
- Zero admin files modified — confirmed via file-modification-time check against the last admin backup

**Tests actually executed, live:**
- `tsc --noEmit`: PASS
- `eslint`: PASS
- `next build`: PASS — **19 routes, unchanged count**, confirming no new/removed routes
- Code-level confirmation: exactly one `submitFeedback()` call site in the entire component (grep-verified, not assumed)
- Live Postgres: customer (anon) flow re-verified working — business resolution, exactly 2 active questions returned, 2-question rule enforced at the database level exactly as before
- Live Postgres: customer/admin isolation re-confirmed — anon gets 0 rows querying business status data
- Full regression: Modules 1–2, 7 A–D, 7 E–F, and Super Admin Milestones 1–2 (including `get_admin_role()` still resolving correctly) all re-verified intact

**Checkpoints created this session:** `digital-review-ai-pre-customerflow-checkpoint.zip` (before this change).

**Google integration milestone:** explicitly not started, per your instruction — the existing link is preserved as-is; genuine branch-aware/API-based Google routing remains future work, pending your separate approval.

## v1.3 — Super Admin Panel, Milestone 2: Business Account Management (application layer)

**Status: complete and verified.** Business accounts list/search/detail, activate/suspend/reactivate wired to the verified `admin_set_business_status()` function, support notes UI, account history view.

**Files added:**
- `src/app/admin/businesses/actions.ts` — `searchBusinesses`, `getBusinessDetail`, `setBusinessStatus`, `listSupportNotes`, `addSupportNote`, `getBusinessAuditHistory`. Every function starts with `getCurrentAdmin()` and, for writes, `hasCapability()` — server-side only, never trusting client state.
- `src/app/admin/businesses/page.tsx` — business list with search (`ilike` on business name)
- `src/app/admin/businesses/[id]/page.tsx` — detail view combining profile, status control, support notes, and history
- `src/components/admin/BusinessStatusControl.tsx` — activate/suspend/reactivate UI, calls `setBusinessStatus` (which routes through the `admin_set_business_status()` RPC, never a direct table update)
- `src/components/admin/SupportNotesPanel.tsx` — add/view notes UI

**Files modified:**
- `src/types/database.ts` — added the `business_support_notes` table type (genuinely missed when its migration was written last session — caught immediately by `tsc`, not shipped broken) and the `admin_set_business_status` RPC function type

**Two real issues found by the type-checker and fixed before anything ran:**
1. `business_support_notes` table type was missing from `database.ts` entirely — its own migration (`0009`) had been applied and tested at the SQL level, but the TypeScript types were never added. Caught by `tsc`, not by manual review.
2. The RPC function type for `admin_set_business_status` was also missing, plus a status-value type-narrowing issue in `setBusinessStatus()`. Both fixed; `tsc --noEmit` now passes with zero errors.

**Tests actually executed, live Postgres:**
- All 6 server-action query patterns tested directly, across permission tiers: business list (Read-only Analyst confirmed can view — `view_dashboard` is universal), search filter, owner-email resolution, support-notes read (Support Admin), audit history read.
- **One result initially looked like a bug and wasn't:** a "Support Admin can view notes" test returned 0 rows. Investigation confirmed this was the *same* Support Admin test user deliberately revoked during Milestone 1 testing — `get_admin_role()` correctly returns null for them, so RLS correctly blocks them. Re-tested with a freshly-seeded, active Support Admin and confirmed the real 2 notes are visible — the revocation is doing exactly what it's supposed to do, cascading correctly into this new table too.
- Full write-path test: fresh Support Admin added a note (succeeded), Operations Admin changed Cafe A's status to `inactive` and back to `active` via the actual RPC (succeeded both times).
- Full regression: Modules 1–2, 7 A–D, 7 E–F, Milestone 1's self-escalation guard, all re-verified intact.

**Build verification:** `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS — **19 routes**, correctly +2 for the two new genuinely-new pages (`/admin/businesses`, `/admin/businesses/[id]`).

**Checkpoints created this session:** `digital-review-ai-pre-m2-applayer-checkpoint.zip` (before this work).

**Audit log verification:** every write path (`setBusinessStatus` via the RPC's own atomic logging; `addSupportNote` via an explicit `writeAuditLog()` call) produces a real `audit_logs` row — confirmed live for both.

## v1.2 — Super Admin Panel, Milestone 2 fix: admin business-status write path

**Status: complete and verified.** A real, self-reported issue found during Milestone 2 testing — flagged and fixed per your explicit approval, not silently patched.

**Issue:** Milestone 1 added `businesses.status` but no RLS write path existed for it — the only `UPDATE` policy on `businesses` is owner-scoped (`businesses_update_own`). An Operations Admin's attempt to change a business's status was silently filtered to zero rows by RLS.

**Fix — file added:** `supabase/migrations/0010_admin_business_status_function.sql` — a single, narrow `SECURITY DEFINER` function, `admin_set_business_status(business_id, new_status, reason)`, following the same single-purpose-function pattern already used for `is_admin()`/`get_admin_role()`/`check_rate_limit()`. Deliberately not a broad admin `UPDATE` policy, which would have let an authorized admin change *any* business column, not just status.

**All 10 approved safeguards implemented and verified live, not just reasoned about:**
1. Identity/role resolved from `admin_role_assignments` via `auth.uid()` — no parameter accepts a client-supplied user ID or role.
2. Restricted to `super_admin`/`operations_admin`; Support Admin and Read-only Analyst explicitly rejected — verified live (both produced `Not authorized to change business status.`).
3. Updates only the `status` column — no other statement touches `businesses` in the function body.
4. Validates `business_id` (nonexistent → rejected), `new_status` (null → rejected; invalid value → rejected at the Postgres enum-type level before the function body even runs), `reason` (>500 chars → rejected).
5. Audit log written in the same function body/implicit transaction as the status change — verified the resulting `audit_logs` row has accurate `old_status`/`new_status` metadata.
6. `set search_path = public` baked into the function definition — verified live: even with the *calling session's* search_path hijacked to `pg_catalog`, the function still resolved and executed correctly.
7. No new direct `UPDATE` grant added to `businesses` for any role; `EXECUTE` revoked from `public`/`anon`, granted only to `authenticated`.
8. No role/user-id parameter exists for a caller to supply — no escalation vector.
9. Tested live against real Postgres RLS for every tier: Super Admin ✓, Operations Admin ✓, Support Admin ✗ (correctly rejected), Read-only Analyst ✗ (correctly rejected), plain business owner ✗ (correctly rejected), anon ✗ (rejected at the Postgres privilege level itself — `permission denied for function`, before even reaching the function body).
10. Full regression confirmed: `is_admin()`/`get_admin_role()` unaffected, Milestone 1's self-escalation guard and `audit_logs` immutability re-verified independently working, Milestone 2's `business_support_notes` unaffected, Modules 1–2/7 A–D/7 E–F all re-verified intact.

**One incidental finding, corrected, not a security issue:** during the `business_support_notes` permission testing, my own test comment incorrectly asserted Read-only Analyst should be able to *read* support notes. Re-checking the actually-approved permission matrix confirmed the RLS policy (scoped to only `super_admin`/`operations_admin`/`support_admin` for both read and write) is correct as built — the test comment was simply mislabeled, not the code.

**Build verification:** `tsc --noEmit` PASS, `eslint` PASS (no TypeScript files were touched by this fix — SQL only).

**Checkpoints created this session:** `digital-review-ai-pre-milestone2-checkpoint.zip` (before Milestone 2's `business_support_notes` table), `digital-review-ai-pre-statusfix-checkpoint.zip` (before this fix).

**Remaining risk, honestly stated:** this fix resolves the write-path gap for `status` specifically. The rest of Milestone 2's application layer (business list/search UI, detail view, activate/suspend buttons calling this function, support-notes UI, account-history view) has not been built yet — only the database layer (migration `0009` + this fix) has been implemented and tested so far this milestone.

## v1.1 — Super Admin Panel, Milestone 1: Foundation

**Status: complete and verified.** Approved plan: role/permission model (4 tiers), `businesses.status`, insert-only `audit_logs`, real (non-placeholder) admin dashboard.

**Files added:**
- `supabase/migrations/0008_admin_panel_milestone1.sql` — `admin_role` enum, `admin_role_assignments` table (self-escalation trigger, tier-restricted RLS), `get_admin_role()` function, `businesses.status` column (additive, default `active`), `audit_logs` table (insert-only, immutable)
- `src/lib/admin/permissions.ts` — `getCurrentAdmin()`, the approved permission matrix (`PERMISSION_MATRIX`), `writeAuditLog()`
- `src/app/admin/page.tsx` — rewritten from a hardcoded `"—"` placeholder shell into a real dashboard reading genuine `businesses`/`feedback_links`/`feedback_submissions`/`audit_logs` counts. Branch stats and AI-usage stats explicitly marked "Coming in Milestone 3/5" rather than shown as fake zeros.

**Files modified:**
- `src/types/database.ts` — `AdminRole` type, `admin_role_assignments`/`audit_logs` table types, `businesses.status` field added
- `src/app/admin/layout.tsx` — added a second, tiered gate on top of the existing unchanged `profiles.role === 'admin'` check; shows a clear "no admin role assigned yet" message rather than silently proceeding when an admin has no active tier

**Nothing in Modules 1–6 or Module 7 A–F was modified.** Confirmed by tracing every dependency and by full regression (below).

**Security decisions implemented exactly as approved:**
- Self-escalation prevention: a `BEFORE INSERT OR UPDATE` trigger blocks any user — including a Super Admin — from creating or modifying their own `admin_role_assignments` row. Verified live: the seeded Super Admin's own self-update was rejected; a *second* Super Admin successfully modified the first's row (and revoked a tier), proving the block is specifically self-action, not all writes.
- Only `super_admin` can grant/change/revoke roles (RLS `WITH CHECK`, not just UI hiding) — verified live: a Support Admin's attempt to insert/update `admin_role_assignments` was rejected by RLS.
- `audit_logs` is insert-only and immutable for every role, including the row's own author — verified live: `UPDATE 0` / `DELETE 0` on an attempted edit by the same admin who wrote it.
- An admin can only ever attribute an audit log entry to themselves, never forge another admin as the actor — verified live via RLS rejection.
- `businesses.status` is additive with a safe default; existing owner read/update behavior is provably unaffected (verified live).
- Every pre-existing `"_select_admin"` RLS policy (9 tables, from Modules 1–7F) re-verified still functioning, unchanged.

**Bootstrap note (real, unresolved — needs your input, not fabricated):** no admin existed to grant the very first Super Admin role through the app, so `admin_role_assignments` ships with no seed row. The exact bootstrap statement is:
```sql
insert into public.admin_role_assignments (user_id, admin_role, granted_by)
values ('<your-real-auth.users.id>', 'super_admin', null);
```
This needs to be run once, directly in the Supabase SQL editor, using your actual `auth.users.id` (find it via Supabase Auth dashboard, or `select id from auth.users where email = '<your-email>'`) — I do not have this value and have not fabricated a placeholder for it.

**Tests actually executed (live Postgres, this session):** 3 `businesses.status` tests, 8 `admin_role_assignments` tests (grant, tier resolution, self-escalation block, non-super-admin write block, cross-super-admin management, revocation, non-admin/anon isolation), 5 `audit_logs` tests (insert, forgery block, non-admin block, immutability, CHECK constraint), 3 layout-gating scenarios (business_owner → redirect path confirmed, admin-with-no-tier → message path confirmed, admin-with-active-tier → real dashboard data confirmed), full regression across Modules 1–2/7 A–D/7 E–F. All passed.

**Build verification:** `tsc --noEmit` PASS, `eslint` PASS, `next build` PASS (18 routes, unchanged — `/admin` already existed as a route).

**Known limitation:** the dashboard's "New (7 days)"/"New (30 days)" and status-breakdown figures are correct as of Milestone 1, but there is no way yet to *act* on them (no suspend/reactivate UI) — that's Milestone 2, not yet started, per your explicit instruction not to proceed further without approval.

## Current Version

**Unversioned — pre-dates formal versioning.** Per Section 14 of the change-control process, this document was created in INSPECT-only mode; no version number is assigned yet (Section 8: *"Do not invent a new version number until the previous change is verified"* — and per Section 10, prior work has been individually verified stage-by-stage, but never re-verified as one consolidated whole against this changelog). The first number this project should carry, once you confirm, is **v1.0 — "Milestone F + Dashboard Polish"**, not v1.1, since the change-control process itself is only starting now and there is no earlier numbered version to increment from.

## Current Known-Good Checkpoint

**Discrepancy flagged, not yet resolved — see "Discrepancies" below.** The change-control document names `digital-review-ai-milestone-e-backup.zip` as the known final backup. That backup genuinely exists and is intact, but it is **not the current state of the project on disk**. Two more rounds of already-implemented, already-tested, already-backed-up work exist beyond it (Module 7 Milestone F, and the dashboard visual polish pass). The most recent verified backup that matches the actual current tree is `digital-review-ai-dashboard-polish-backup.zip` (Sep 10, 18:31).

## Completed Modules (verified against the actual project tree, not assumed)

| Module | Status | Evidence |
|---|---|---|
| Module 1 — Foundation, Auth, Business Profile | Complete | Present in tree; regression-tested repeatedly throughout this project |
| Module 2 — QR Feedback System | Complete | `supabase/migrations/0002_qr_feedback.sql`, `0003_module2_hardening.sql` present |
| Module 3 — Feedback Inbox + AI tone options | Complete | Present, unaffected by later work |
| Module 4 — Google review URL / Places lookup | Complete | Present, unaffected by later work |
| Module 5 — Analytics | Complete | Present, unaffected by later work |
| Module 6 — Customer Intelligence + Pulse | Complete | `0004_module6_customer_intelligence.sql` present |
| Module 7 Milestone A — Business Segment Engine | Complete | `0005_module7_segment_engine.sql`, `src/lib/segments/` present |
| Module 7 Milestone B — Segment-aware tags/Pulse | Complete | Verified in prior sessions |
| Module 7 Milestone C — Segment-aware Business Advisor | Complete | `businessAdvisor.ts` segment/recommendation wiring present |
| Module 7 Milestone D — Priority levels, Business Snapshot, Getting Started | Complete | `priority.ts`, `businessSnapshot.ts` present |
| Module 7 Milestone E — Owner context questions + review-generation engine | Complete | `0006_module7_milestone_e_questions.sql`, `src/lib/reviewEngine/` present |
| **Module 7 Milestone F — Customer-side question-answering + automatic review generation** | **Complete, but NOT in the change-control document's "Current completed scope" list** | `0007_module7_milestone_f_customer_flow.sql`, `FeedbackFlow.tsx`'s "questions" step (5 references), `feedback_question_answers` table — all present and were regression-tested when built |
| **Dashboard visual polish (greeting + hero cards + empty-state reuse)** | **Complete, but NOT in the change-control document's "Current completed scope" list** | `DashboardGreeting.tsx`, `DashboardHeroCards.tsx` present, wired into `/dashboard` |

## Protected Areas (per Section 2, accepted as written — these already existed and remain untouched by anything below)

- Modules 1–6
- Module 7 Milestones A–D
- Question system (context questions, owner management, customer read-only/active-only, RLS, migrations 0001–0006)
- Intelligence (Customer Intelligence, Customer Pulse, Business Advisor, Recommendations)
- Review system (review engine, customer/owner generation, evidence-based generation, approval workflow)

**Note:** given the discrepancy above, this protected list should be extended once confirmed to also cover Milestone F (the customer-facing question-answering + automatic generation flow) and the dashboard hero-card/greeting components, since those are equally real, tested, shipped functionality that a future change request could otherwise accidentally break or duplicate.

## Existing Backup References (verified present in the outputs directory, sizes/dates as of inspection)

| File | Size | Date | Covers |
|---|---|---|---|
| `digital-review-ai-module-1-2-backup.zip` | 144,334 B | Aug 12 | Modules 1–2 |
| `digital-review-ai-module-1-3-backup.zip` | 148,859 B | Aug 12 | Modules 1–3 |
| `digital-review-ai-module-1-4-backup.zip` | 154,089 B | Aug 13 | Modules 1–4 |
| `digital-review-ai-module-1-5-backup.zip` | 159,039 B | Aug 13 | Modules 1–5 |
| `digital-review-ai-module-1-6-backup.zip` | 208,877 B | Sep 1 | Modules 1–6 |
| `digital-review-ai-current-module7-backup.zip` | 213,229 B | Sep 4 | Modules 1–6 + Module 7 A–D |
| `pre-restore-reviewengine-checkpoint.zip` | 14,428 B | Sep 9, 17:17 | Safety checkpoint of 8 review-engine files, taken immediately before a baseline restore |
| `digital-review-ai-milestone-e-backup.zip` | 239,066 B | Sep 9, 17:29 | Modules 1–6 + Module 7 A–E (named in the change-control doc as current baseline) |
| `digital-review-ai-milestone-f-backup.zip` | 243,681 B | Sep 10, 09:17 | + Module 7 Milestone F (customer flow) |
| `digital-review-ai-milestone-f-polish-backup.zip` | 244,113 B | Sep 10, 11:15 | + customer-flow copy/UX polish |
| **`digital-review-ai-dashboard-polish-backup.zip`** | **248,115 B** | **Sep 10, 18:31** | **+ owner dashboard greeting/hero cards — most recent, matches current tree** |

SHA-256 checksums for each were recorded and verified at creation time in this conversation's history; not re-listed here to keep this document focused, but available on request.

## Pending Work

None currently queued. No Change Request has been submitted yet under this new process.

## Discrepancies Between the Documented State and the Actual Project Tree

1. **Scope gap:** the change-control document's "Current completed scope" (Section 1) and "Current Status Entry" (Section 10) list Modules 1–6, Module 7 A–D, Module 7-E, and "Milestone E" as complete, with no mention of Module 7 Milestone F or the dashboard polish work. Both of those are genuinely present in the current tree, were implemented in direct response to your own prior requests in this same conversation, and were independently type-checked, built, and regression-tested at the time (including live-Postgres RLS/permission tests for Milestone F's new `feedback_question_answers` table). This isn't unreviewed or speculative work — it's already-approved, already-verified functionality that the new baseline documentation just hasn't caught up to yet.
2. **Baseline pointer:** Section 1 names `digital-review-ai-milestone-e-backup.zip` as "the current verified Milestone E state" / Known Good Baseline. As a snapshot of Milestone E specifically, that's accurate. As "the current baseline" for future change-control purposes, it's two rounds of verified work behind the actual project.
3. **No changelog previously existed** — this is the first one, created now per Section 14. All the "completed modules"/"backup history" content above was reconstructed from direct filesystem inspection and this conversation's history, not from a pre-existing document.

I have not repaired any of these discrepancies — per your instruction, this is INSPECT → REPORT → WAIT. Awaiting your direction on: (a) which backup should be treated as the actual Known Good Baseline going forward (I'd suggest `digital-review-ai-dashboard-polish-backup.zip`, since it's the only one matching the current tree), and (b) whether Milestone F and the dashboard polish should be folded into the "Protected Areas" and "Completed Modules" lists before any new Change Request is accepted.
