# Whispr account deletion site

This Vercel subproject serves `/delete-account` and provides immediate account deletion after the user signs in again.

## Request flow

1. The user enters their account email and password. Supabase Auth signs them in directly from the browser; the password is not sent to the deletion API.
2. Google-only users or users without a password can choose the email sign-in link option, type `DELETE`, and follow the link.
3. After signing in, the user types `DELETE` and confirms again.
4. The server verifies the Supabase session, removes the app's core profile/content rows, and deletes the Auth user. No service-role key is sent to the browser.

## Vercel setup

Create a Vercel project from this repository and set its **Root Directory** to `account-deletion-site`. No custom build command is needed. Set these server environment variables in Vercel:

- `SUPABASE_URL` — `https://axkktejoldizpveydidx.supabase.co`
- `SUPABASE_ANON_KEY` — the project's public anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — the project service-role secret (server-only; never place in the page or commit it)

Add `https://gowhispr.online/delete-account` to Supabase Auth's allowed redirect URLs. Configure the Auth email template so its confirmation link preserves the requested redirect URL.

In Vercel, add `gowhispr.online` to the project and apply the DNS records Vercel provides in Namecheap. The domain currently uses registrar parking DNS, so it must be pointed to the Vercel project before this page is live.

## Before launch

The web source was added alongside the mobile project, but the root domain still needs Vercel/DNS setup. Confirm the current production database schema includes the core tables used by the deletion endpoint (`buddy_messages`, `buddies`, `blocked_users`, `whispr_notes`, and `user_profiles`) and check any additional user-owned tables before publishing. Add the production domain to Supabase Auth redirect configuration and test deletion with a disposable account.
