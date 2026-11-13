# Athlys Browser Workspace

Athlys can be served as a static browser application. It uses the same Supabase project, authentication, roles, and RLS-protected data as the Android app.

## Cloudflare Pages deployment

The repository is private; Cloudflare Pages supports GitHub private repositories through its Git integration.

1. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**.
2. Authorize Cloudflare Pages for the GitHub account and select `lilianadc936/Athlys2`.
3. Set the production branch to `main`.
4. Configure:
   - **Framework preset:** None
   - **Build command:** `npm install --no-audit --no-fund && npm run build:web`
   - **Build output directory:** `web`
   - **Root directory:** `/`
   - **Environment variable:** `NODE_VERSION=22`
5. Deploy. Cloudflare provides a `.pages.dev` address; a custom domain can be connected later.

Every push to `main` can then publish an updated browser version automatically.

## Supabase Auth URL configuration

After the production URL exists, open Supabase **Authentication → URL Configuration**:

- Set **Site URL** to the exact production Pages URL.
- Add the production URL to **Redirect URLs**.
- Add the local development URL if using one (for example `http://localhost:8080/**`).
- Keep the existing Android deep-link redirect `com.athlys.app://auth/callback` if Android password recovery is still used.

The browser password-reset flow redirects back to the current browser origin. Supabase only accepts redirects that are present in the allow-list.

## Security

- The frontend uses only the Supabase publishable key. Never place a `service_role` or secret API key in `web/app-config.js`.
- Website access is still protected by Athlys account authentication and the Supabase row-level security policies. Hosting the static HTML does not make users' records public.
- Use HTTPS in production. Do not share the Pages build artifact as a substitute for configuring the production Site URL.
