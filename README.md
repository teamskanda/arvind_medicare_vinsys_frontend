# SKANDA AI frontend

Next.js 15, React 19, TypeScript and Tailwind frontend for the SKANDA AI
chatbot builder. This repository contains the frontend only; run the FastAPI
backend separately with its PostgreSQL, scraping and inference configuration.

## Local setup

Use Node.js 22 or newer. Install dependencies with `npm ci`, then copy
`.env.example` to `.env.local` and set the backend addresses:

```env
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`API_BASE_URL` is used by the Next.js server for authentication and protected
API forwarding. `NEXT_PUBLIC_API_URL` is browser-visible and is also used by the
widget-loader rewrite. Never place database URLs, provider keys or signing
secrets in `NEXT_PUBLIC_*` variables or frontend code.

Start with `npm run dev` and open http://localhost:3000. Login and registration
use the configured backend; no identity-provider keys are required in the frontend.

## Checks

```sh
npm run typecheck
node scripts/check-origin.mjs
npm run build
```

The application includes the landing page, dashboard, website creation and
crawling interface, knowledge base, AI playground, customization studio,
publishing controls and public chatbot renderer. AI and scraping requests use
the backend rather than credentials embedded in the browser.

## Production

Set `NEXT_PUBLIC_API_URL` to the public HTTPS API origin **before building**.
Set the server-side `API_BASE_URL` at runtime. Configure the backend's frontend,
public widget and API origins to match your deployment, and terminate HTTPS at
an appropriate reverse proxy.

The included Dockerfile produces a standalone Next.js image:

```sh
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.your-domain.com -t skanda-frontend .
docker run --env API_BASE_URL=https://api.your-domain.com -p 3000:3000 skanda-frontend
```

Replace the example domain with your authorised backend domain. Keep `Host`
and forwarded protocol correct at the reverse proxy, and permit streaming chat
responses. Public `/embed/*` pages must remain frameable according to their
per-chatbot Content Security Policy.

For a standalone build without Docker, copy `.next/static` into
`.next/standalone/.next/static`, then run `node .next/standalone/server.js`.
Production session cookies require HTTPS for remote use.

The `.gitignore` excludes local environment files, installed dependencies,
generated builds, caches, test reports, logs, credentials and editor files.
The reproducible dependency lockfile and safe `.env.example` remain tracked.
