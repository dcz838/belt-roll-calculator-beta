Belt Roll Calculator 2.3 Beta · Cloud Edition
Build 2026.08.12.04.03

DEPLOY
Upload the contents of this folder to the GitHub Pages site.

FIRST CLOUD SETUP
1. Open Settings > Cloud Sync (or click the Cloud status button).
2. Project URL is prefilled for the current BRC Supabase project.
3. Paste the Supabase Publishable Key (sb_publishable_...). Never use the Secret Key.
4. Save Cloud Settings; the app reloads.
5. Click Login and sign in with a Supabase Authentication email/password account.
6. If cloud inventory is empty and local inventory exists, use Upload Local Inventory once.
7. Confirm belt_catalog, inventory_balances, and inventory_transactions in Supabase.
8. Sign in from iPad/another device to verify Realtime synchronization.

DATA MODEL
Cloud primary: belt_catalog, inventory_balances, inventory_transactions, locations, profiles.
Local cache: BRC app data for display/recovery plus calculator/converter history and UI preferences.

SECURITY
The browser uses only the Publishable Key. RLS and the authenticated Supabase user profile enforce permissions. Secret/service-role keys must never be placed in this build or GitHub.
