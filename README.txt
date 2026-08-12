Belt Roll Calculator - Web Edition 2.3 Beta Cloud
Build 2026.07.30.04.01

Cloud setup:
1. Deploy this folder to GitHub Pages.
2. Open Settings > Cloud Sync.
3. Enter the Supabase Project URL and Publishable Key.
4. Sign in with a Supabase Authentication email/password account.
5. The account profile must be active and have the required inventory permissions.

Security:
- Never place the Supabase Secret Key or database password in this app.
- Only the Publishable Key is accepted.
- RLS remains the database security boundary.

Behavior:
- Inventory and transaction history load from Supabase after cloud sign-in.
- Inventory changes are synchronized through the adjust_inventory RPC.
- Realtime changes refresh other signed-in devices.
- Calculator history, language, UI settings and local backups remain local.
