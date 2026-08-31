# Flag prototype — Cloudflare Pages + GitHub autodeploy

**Note:** Checked against Cloudflare docs on 31 August 2026. The live host is Cloudflare Pages (`*.pages.dev`). GitHub is the source. Do not enable GitHub Pages.

This guide shows how to host the Flag prototype on the existing free Cloudflare account, with GitHub connected so a push to main goes live automatically.

## Naming clarification

GitHub is the source of the code. The live host is Cloudflare Pages (`*.pages.dev`). Do not turn on GitHub Pages in the GitHub repo settings. When someone says "autodeploy to GitHub pages", the right setup is: connect GitHub so Cloudflare Pages auto-deploys from it. Two different products.

Solo vs Hunter and Hotseat are a static SPA, so Pages is enough for the feel-test. Remote 2-player needs a room server later (PartyKit / Durable Objects on the same Cloudflare account). Do the static deploy first. The remote add-on is at the end and is not needed for the first Pages setup.

Docs checked 31 Aug 2026. Dashboard is still labelled Workers & Pages (not a 2026 rename). Some of the Git-connect wording is "Connect to Git", some is "Import from an existing Git repository" — same flow.

## Checklist

### 1. Log in

Open https://dash.cloudflare.com and sign in with the free account already in use. Stay on that account. Do not create a second one.

### 2. Start a Pages project connected to GitHub (official GitHub App, not a PAT)

a. In the dashboard go to Workers & Pages.

b. Create application → Pages → Connect to Git (if you see "Import from an existing Git repository", that is the same step).

c. Choose GitHub. Cloudflare will install/authorise the GitHub App named "Cloudflare Workers and Pages".

d. Install it on the huntit organisation, not a whole personal GitHub.

e. When GitHub asks which repos: Only select repositories → huntit/flag-game (and any other Hunt IT repos that should be visible). Do not pick All repositories unless preferred.

f. Do not paste a GitHub personal access token into Cloudflare. The App is the official path.

If the App was already installed, pick the huntit account from the list. If huntit is missing, use + Add account, then Install & Authorize.

GitHub org owners (or GitHub Apps Manager) can install the App on huntit. After install it can be tightened at:
https://github.com/organizations/huntit/settings/installations
→ Cloudflare Workers and Pages → Only select repositories.

### 3. Select huntit/flag-game

Pick huntit/flag-game, then Install & Authorize / Begin setup.

If the repo is not in the list yet:
- Create an empty huntit/flag-game repo on GitHub, or wait until the first push exists, then come back to this screen.
- Cloudflare needs at least one branch pushed before the Production branch dropdown will populate. Push main first, then connect.

### 4. Build settings (Vite + React + TypeScript)

Project name: becomes yourname.pages.dev. Default is the Git repo name.

Production branch: main.

Framework preset: React (Vite) if listed, otherwise Vite.

Build command: `npm run build`

Build output directory: `dist`

Root directory: leave blank (repo root).

Node: current Pages v3 default is Node.js 22.16.0. Pin it so a default bump does not break a build:
- Environment variables → add NODE_VERSION = 22 (or 22.16.0), for both Production and Preview, or
- Add a `.nvmrc` / `.node-version` file in the repo root.

Wrangler is not needed for this first pass. Dashboard Git connect is enough. (If a wrangler.toml / wrangler.jsonc with pages_build_output_dir is added later, dashboard env vars can stop reaching the build — a known footgun. For the first setup, skip Wrangler.)

### 5. First deploy, then auto-deploy

Save and Deploy. Watch the build log. When it finishes, open Workers & Pages → this project → Deployments. Production URL is https://&lt;project&gt;.pages.dev.

After that:
- Every push to main rebuilds and updates production (and any custom domain added later).
- Every pull request from the same repo (not from a fork) gets its own preview URL, like https://&lt;hash&gt;.&lt;project&gt;.pages.dev, plus a branch alias such as https://feature-name.&lt;project&gt;.pages.dev. Production is not touched.
- GitHub will show a Cloudflare check on the commit / PR.
- To skip one deploy, prefix the commit message with [CI Skip] or [CF-Pages-Skip].
- To retry a failed or old build: open that deployment in Deployments and Retry if the button is there; otherwise push another commit to main.
- Preview URLs are public by default. They can be locked later under Settings → General → Enable access policy. That does not lock the production *.pages.dev URL.

### 6. SPA fallback (needed for iPhone Safari refresh / deep links)

Vite client routes are not real files. If someone refreshes /play or opens a deep link, Pages must still serve index.html.

Cloudflare's default: if there is no top-level 404.html, Pages already treats the site as an SPA. Still add an explicit rule so it stays true if a 404.html ever appears.

In the repo, create `public/_redirects` (no extension) with this single line:

```
/*    /index.html   200
```

Vite copies public/ into dist/. The file must land in the build output, not only in source. Do not add a 404.html if you want this fallback to keep working.

Later, if the project moves to Workers static assets / the Cloudflare Vite plugin, the wrangler.jsonc equivalent is:

```json
"assets": { "not_found_handling": "single-page-application" }
```

That is not needed for a normal Git-connected Pages project on day one.

### 7. Custom domain — skip unless one is ready

The *.pages.dev URL is enough for the prototype. Do not assume any Hunt IT domain is already on this Cloudflare account.

When wanted: project → Custom domains → Set up a domain. A subdomain needs a CNAME to &lt;project&gt;.pages.dev, and it must be added in the Pages UI (a CNAME only in DNS, without this step, 522s). An apex domain has to be a zone on this same Cloudflare account. Free plan allows 100 custom domains per Pages project. HTTPS is included.

### 8. What not to do

- Do not enable GitHub Pages on huntit/flag-game.
- Do not paste a GitHub PAT into Cloudflare.
- Do not put secrets in the frontend. Anything VITE_ is baked into the public JS bundle. Pages env vars are for the build (NODE_VERSION, public config), not for hiding API keys from the phone.
- Do not create a second Cloudflare account.
- Do not use Direct Upload for this project if Git auto-deploy is wanted. Once a project is Git-connected, Cloudflare will not let you switch that same project to Direct Upload later. Auto-deploys can still be paused and Wrangler used if needed.

### 9. Free-plan limits

Pages limits page, updated 16 Jul 2026; Functions pricing, 21 Apr 2026.

For this static SPA:
- 500 builds per month, 1 build at a time (per account), 20-minute build timeout.
- 20,000 files per deployment, 25 MiB max per file.
- 100 Pages projects per account; 100 custom domains per project.
- Unlimited preview deployments.
- Static asset requests and bandwidth: free and unmetered (a request is static when it does not run Pages Functions).
- _redirects: up to 2,000 static + 100 dynamic rules.

Builds are counted per build, not as "build minutes".

### 10. Later: Remote 2p on the same free account (not needed for solo / hotseat feel-test)

Skip for the first Pages setup. Solo vs Hunter and Hotseat have no room server.

Remote 2-player is not a pure static site. v0 assumed a PartyKit room (one Durable Object per game) on Cloudflare.

What current docs actually support on the same free account:

a. Keep the static SPA on Pages with Git auto-deploy (what this guide sets up).

b. Add a Worker (or later a Pages Function) on this same account that hosts the room. Cloudflare's current in-ecosystem library is PartyServer (npm package partyserver): a Durable Object per room, routePartykitRequest, wrangler.jsonc durable_objects binding, and a SQLite migration (new_sqlite_classes). Workers Free only allows SQLite-backed Durable Objects, not the old key-value DO backend.

c. The original PartyKit CLI still has "cloud-prem": npx partykit deploy to your own Cloudflare account, using an API token from dash.cloudflare.com/profile/api-tokens (Edit Cloudflare Workers template). PartyKit says the platform fee is free for cloud-prem; you use Cloudflare's usage. Their own docs still list "Run PartyKit inside a wrangler project" as future work, so do not plan on stuffing classic PartyKit inside this Pages project. PartyServer is the path that current Cloudflare/wrangler docs support.

d. Pages Functions, if added, share the Workers Free request quota. Static files still do not.

Free-tier figures from Durable Objects pricing (updated 25 Aug 2026) and Workers limits (28 Jul 2026). Daily caps reset at 00:00 UTC. If a free cap is hit, further operations of that type fail with an error; they do not silently start billing.

- Workers / Pages Functions: 100,000 requests/day shared; Workers Free CPU is 10 ms per request (waiting on network does not count). That 10 ms is why the room should live in a Durable Object, not in a thin Pages Function.
- Durable Objects Free: 100,000 requests/day (HTTP, RPC, WebSocket messages, alarms); 13,000 GB-s duration/day; SQLite 5 million row reads/day, 100,000 row writes/day, 5 GB storage total; max 100 DO classes per account.
- Incoming WebSocket billing uses a 20:1 message-to-request ratio in the paid examples; treat the exact free-tier WS accounting as "follow the dashboard metrics if we get close" rather than something certified from the tables alone.

## Useful later

Pause auto-deploys: project → Build → Branch control → turn off Enable automatic production branch deployments; set Preview branch to None.

Manage / disconnect Git: project → Settings → Builds → Manage under Git Repository, or the GitHub installations URL above. Uninstalling the App stops new builds for every Workers/Pages project using those repos; old deploys stay live.

Env vars after first deploy: Settings → Environment variables (Production vs Preview). Change then Redeploy — they are not live until the next build.

Delete the project: Settings → Delete project. Only if a custom domain was also added, remove the CNAME first.

If the GitHub App install asks which repos, pick huntit/flag-game (and any other Hunt IT repos wanted), not All repositories unless preferred.
