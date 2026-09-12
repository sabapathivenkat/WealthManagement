# Deploying this app online

This app has two halves that need to be deployed **separately**:

1. **Frontend** (`frontend/`) — a static site. Vercel is great for this.
2. **Backend** (`backend/`) — a Java server that needs to keep running and talk to a
   database. **Vercel cannot host this** — it only runs short-lived functions, not a
   persistent Spring Boot process. You need a second host for it.

If you've only deployed the frontend to Vercel so far, that's exactly why signup/login
fails with a generic error and no useful detail: the frontend has nowhere to send its
`/api/...` requests, because there is no backend behind that Vercel URL at all.

This guide deploys the backend to **Render** (render.com), which has a free tier that
works well for this app (a small Spring Boot service + a small Postgres database). Railway
or Fly.io work similarly if you'd rather use one of those instead — the concepts below
(environment variables, CORS, a public database) are the same everywhere.

---

## Step 1 — Create a database

You need a PostgreSQL database that's reachable from the internet (your current local
Postgres on your own PC is not — nothing outside your machine can reach it).

1. On [render.com](https://render.com), sign up / log in (you can use your GitHub account).
2. **New → PostgreSQL**. Give it a name (e.g. `wealth-db`), pick the free plan, create it.
3. Once it's ready, open it and copy the **Internal Database URL** (you'll paste this into
   the backend service in Step 2) — it looks like:
   `postgresql://user:password@host/dbname`

## Step 2 — Deploy the backend

1. On Render: **New → Web Service** → connect your GitHub repo (`WealthManagement`).
2. Set:
   - **Root Directory:** `backend`
   - **Runtime:** Docker (Render will detect the `backend/Dockerfile` automatically)
   - **Instance type:** Free
3. Add these **Environment Variables** on the service (Render's dashboard → Environment):

   | Key | Value |
   |---|---|
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<host-from-step-1>/<dbname>?currentSchema=wealth` — take the host/dbname from the Internal Database URL you copied, just add `jdbc:` in front and `?currentSchema=wealth` at the end |
   | `SPRING_DATASOURCE_USERNAME` | the username from that same database URL |
   | `SPRING_DATASOURCE_PASSWORD` | the password from that same database URL |
   | `JWT_SECRET` | any long random string (32+ characters) — this signs login tokens, keep it secret |
   | `CORS_ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://wealth-management-liart.vercel.app` (no trailing slash) |

4. Deploy. Once it's live, Render gives you a URL like
   `https://wealth-management-xxxx.onrender.com` — **note this down**, you need it next.
5. Confirm it's actually up by opening `https://<that-url>/actuator/health` in a browser —
   it should show `{"status":"UP"}`.

> **Free-tier note:** Render's free web services "spin down" after 15 minutes of no
> traffic and take ~30-60 seconds to wake back up on the next request. That's normal —
> if the site feels stuck loading the first time after a while, wait a minute and retry.

## Step 3 — Point the frontend at the backend

1. On [vercel.com](https://vercel.com), open your project's **Settings → Environment
   Variables**.
2. Add:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-render-url>/api` (the URL from Step 2, with `/api` on the end) |

3. **Redeploy** the frontend (Vercel → Deployments → ⋯ → Redeploy) — environment variable
   changes only take effect on the *next* deploy, not automatically.

## Step 4 — Test it

1. Open your Vercel URL, go to Sign up, create an account.
2. If it still fails, open the browser's DevTools (F12) → **Network** tab, try signing up
   again, and click the failed request (it'll be red). The most common causes, in order:
   - **CORS error in the Console tab** ("blocked by CORS policy") → `CORS_ALLOWED_ORIGINS`
     on the backend doesn't exactly match your Vercel URL (must match exactly, including
     `https://` and no trailing slash) — fix it and the backend will pick it up next time
     it restarts (Render restarts automatically when you change an env var).
   - **Request never completes / times out** → the backend might just be waking up from
     being asleep (see the free-tier note above) — wait a minute and try again.
   - **404 on the request** → `VITE_API_BASE_URL` is missing the `/api` suffix, or the
     frontend wasn't redeployed after you added the variable.

---

## Summary of what changed in the code to make this possible

- `frontend/src/api/client.ts` now reads `VITE_API_BASE_URL` from the environment instead
  of always using the relative `/api` path — locally this variable is unset, so it falls
  back to `/api` exactly as before (Vite's dev proxy still handles that), and nothing
  about local development changes.
- `backend/src/main/resources/application.yml` now reads the database connection and
  allowed CORS origins from environment variables (`SPRING_DATASOURCE_URL`,
  `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `CORS_ALLOWED_ORIGINS`,
  `PORT`), each with the same defaults as before so local development is unaffected if you
  don't set them.
- `backend/Dockerfile` is new — it's what lets Render (or Railway/Fly/any Docker host)
  build and run the backend without any other configuration.
