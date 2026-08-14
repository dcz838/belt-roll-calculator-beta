Belt Roll Calculator 2.3 Beta · Cloud Edition
Build 2026.08.14.04.14

DEPLOY
Upload the contents of this folder to the GitHub Pages site.

CLOUD
The Supabase Project URL and Publishable Key are built into this Beta build. Users do not configure them.
Open Login or Settings > Cloud Sync and sign in with a Supabase Authentication email/password account.

PASSWORD RECOVERY
Supabase Authentication > URL Configuration must use:
Site URL: https://dcz838.github.io/belt-roll-calculator-beta/
Redirect URL: https://dcz838.github.io/belt-roll-calculator-beta/**
Use Forgot Password in BRC (or Send password recovery in Supabase). The recovery link returns to BRC and opens the New Password dialog.

SECURITY
This build contains only the public Supabase Project URL and Publishable Key. It does NOT contain the Secret Key, service_role key, or database password. RLS and authenticated profiles enforce data permissions.


Build 2026.08.14.04.14 is a reliability-hardened continuation of the validated 04.09 cloud build.


Build 2026.08.14.04.14 notes:
- Product Edit dialog uses a sticky title/action bar; Cancel and Save remain visible while scrolling and have a touch-friendly gap.
- Inventory Verification uses Confirm instead of Login.
- Existing Stock is visible but locked by default; Unlock requires the independent inventory password and Set Balance permission.
- Direct Stock edits use the atomic adjust_inventory RPC and create an inventory transaction.
- Location edits use the new move_inventory_location RPC instead of direct inventory_balances updates.
- Cloud Location is selected from active locations loaded from Supabase.
- Run supabase/migrations/20260814_0414_inventory_location_move.sql once before testing Location edits.
