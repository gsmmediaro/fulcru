# Deploy Fulcra to Railway

## Prerequisites

- Railway CLI installed (`npm i -g @railway/cli`) or use the Railway web UI
- A Neon Postgres project (we already have one: `fulcra` / `plain-unit-05218772`)
- Google OAuth credentials (already in `.env.local` for dev)

## One-time setup

1. **Sign in to Railway**
   ```sh
   railway login
   ```

2. **Init the project from this repo**
   ```sh
   railway init
   ```
   Choose **Empty Project**. Name it `fulcra`.

3. **Link the working directory**
   ```sh
   railway link
   ```

4. **Set environment variables** - copy these from your `.env.local`, but set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the Railway public URL once it's assigned (see step 6).

   ```sh
   railway variables \
     --set "DATABASE_URL=postgresql://neondb_owner:…@ep-still-resonance-ajbq4sts-pooler.c-3.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require" \
     --set "BETTER_AUTH_SECRET=$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" \
     --set "GOOGLE_CLIENT_ID=…" \
     --set "GOOGLE_CLIENT_SECRET=…" \
     --set "NODE_ENV=production"
   ```

   Tip: regenerate `BETTER_AUTH_SECRET` for prod - don't reuse the dev one.

5. **First deploy**
   ```sh
   railway up
   ```
   Railway builds via Nixpacks (auto-detects Next.js). Wait for the first build (~3–5 min).

6. **Get the public domain**
   ```sh
   railway domain
   ```
   Copy the assigned domain (e.g. `fulcra-production.up.railway.app`).

7. **Update env vars with the prod URL**
   ```sh
   railway variables \
     --set "BETTER_AUTH_URL=https://<your-domain>" \
     --set "NEXT_PUBLIC_APP_URL=https://<your-domain>"
   ```
   Then redeploy:
   ```sh
   railway up
   ```

8. **Add the prod redirect URI to Google OAuth**
   - Go to https://console.cloud.google.com/apis/credentials
   - Edit your OAuth 2.0 Client
   - Add to **Authorized redirect URIs**: `https://<your-domain>/api/auth/callback/google`
   - Save

## Required env vars

| Variable               | Purpose                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`         | Neon Postgres pooled connection string (with `?sslmode=require`)           |
| `BETTER_AUTH_SECRET`   | 32-byte hex string used to sign session tokens - **regenerate for prod**   |
| `BETTER_AUTH_URL`      | The public app URL (Better Auth uses this for OAuth callbacks)             |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                                     |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                                 |
| `NEXT_PUBLIC_APP_URL`  | Public app URL - exposed to the client SDK                                 |
| `NODE_ENV`             | `production`                                                               |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for receipt file uploads (provision from vercel.com/storage/blob). Without it, expense creation still works but receipt upload returns a 503 error shown inline to the user. |

## Subsequent deploys

```sh
git push       # push to your repo
railway up     # or hook a GitHub auto-deploy from the Railway dashboard
```

## Health check

The Railway healthcheck hits `/api/auth/get-session` - returns `null` (HTTP 200) when no session, which confirms Better Auth + DB are wired up.
