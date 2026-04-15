# ReactDiagonal — Deployment Guide

## Architecture

```
Coda Table ← Coda API ← Cloudflare Worker (holds token) ← React App (GitHub Pages)
```

Your API token never leaves the Cloudflare Worker. The React app only talks to the Worker.

---

## Step 1: Deploy the Cloudflare Worker

1. Open a terminal and navigate to the `worker/` folder
2. Install Wrangler if you haven't: `npm install -g wrangler`
3. Login: `npx wrangler login`
4. Set your Coda API token as a secret:
   ```
   npx wrangler secret put CODA_API_TOKEN
   ```
   Paste your token when prompted.
5. Deploy:
   ```
   npx wrangler deploy
   ```
6. Note the Worker URL (e.g., `https://iux-dependency-proxy.your-subdomain.workers.dev`)

---

## Step 2: Configure the React App

1. Open `app/index.html`
2. Find this line near the top of the script:
   ```
   const WORKER_URL = "https://iux-dependency-proxy.YOUR_SUBDOMAIN.workers.dev";
   ```
3. Replace it with your actual Worker URL from Step 1

---

## Step 3: Deploy to GitHub Pages

1. Create a new GitHub repo (e.g., `iux-dependency-map`)
2. Push the contents of `app/` to the repo
3. Go to Settings → Pages → Source: Deploy from branch → `main` / `root`
4. Your app will be live at `https://YOUR_USERNAME.github.io/iux-dependency-map/`

---

## Step 4: Update Worker CORS (optional)

Open `worker/worker.js` and add your GitHub Pages URL to the `ALLOWED_ORIGINS` array:
```js
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://YOUR_USERNAME.github.io",
];
```
Then redeploy: `npx wrangler deploy`

---

## Step 5: Embed in Coda

In your Coda doc, type `/embed` and paste your GitHub Pages URL. The diagram will render inline and auto-refresh every 30 seconds with live data from your table.

---

## How it works

- The React app fetches `/rows` from the Cloudflare Worker every 30 seconds
- The Worker adds your Coda API token and proxies the request to the Coda API
- The app parses the table data and renders an interactive SVG dependency flowchart
- Nodes are color-coded by status, with hover tooltips showing full details
- The layout engine auto-arranges projects into tiers based on dependency relationships
