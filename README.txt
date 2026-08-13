Belt Roll Calculator 2.3 Beta · Cloud Edition
Build 2026.08.13.04.05

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


Build 04.05: deploy the included admin-user Edge Function once to enable administrator password resets. See EDGE_FUNCTION_SETUP.txt.
