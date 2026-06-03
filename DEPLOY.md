# Deployment Guide

RYSE Dashboard supports multiple deployment strategies depending on your infrastructure needs.

---

## 1. Single Container (Docker)

The simplest approach: the Docker container builds the frontend and serves both the API and static files from a single process.

**Good for:** Railway, Render, Fly.io, any Docker-based hosting.

```bash
# Build the image
docker build -t ryse-dashboard .

# Run the container
docker run -d \
  -p 3001:3001 \
  -e JWT_SECRET=your-secret-here \
  -e ENCRYPTION_KEY=your-encryption-key \
  -e NODE_ENV=production \
  -v ryse-data:/app/data \
  ryse-dashboard
```

**Important:** SQLite requires a persistent filesystem. Mount a volume at `/app/data` to persist the database across container restarts and deployments.

**Health check:** `GET /api/health` returns `{ "status": "ok" }`.

---

## 2. Split Deployment (Recommended for Scale)

Deploy the frontend and backend separately. The frontend is a static site, and the backend is a Node.js server.

**Frontend:** Vercel, Netlify, Cloudflare Pages, or any static hosting.
**Backend:** Railway, Render, Fly.io, or any Node.js hosting.

### Frontend Deployment

1. Set the `VITE_API_URL` environment variable to your backend URL (e.g., `https://api.yourdomain.com`).
2. Set `VITE_WS_URL` to your WebSocket URL (e.g., `wss://api.yourdomain.com`).
3. Build: `npm run build`
4. Deploy the `dist/client/` directory.

For **Netlify**, the included `netlify.toml` handles build config and SPA routing. Update the API redirect URL.

For **Vercel**, the included `vercel.json` handles rewrites. Update the API destination URL.

### Backend Deployment

1. Set environment variables (see reference below).
2. Set `CORS_ORIGIN` to your frontend domain (e.g., `https://yourdomain.com`).
3. Ensure a persistent volume is mounted for SQLite at the `DATABASE_URL` path.
4. Start command: `node server/index.js`

---

## 3. Cloudflare Pages + Workers

**Note:** `better-sqlite3` is a native Node.js module and cannot run on Cloudflare Workers.

**Options:**
- Deploy frontend to Cloudflare Pages and backend elsewhere (Railway, Render, Fly.io).
- Rewrite the database layer to use Cloudflare D1 (SQLite-compatible, requires code changes in `server/db/index.js`).

For frontend-only on Cloudflare Pages:
- Build command: `npm run build`
- Output directory: `dist/client`
- Set `VITE_API_URL` to your external backend URL.

---

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `JWT_SECRET` | Yes | - | Secret for signing JWT tokens. Use a strong random value. |
| `ENCRYPTION_KEY` | Yes | - | Key for encrypting sensitive state data. |
| `DATABASE_URL` | No | `./data/ryse.db` | Path to SQLite database file |
| `CORS_ORIGIN` | No | `*` | Allowed origin for CORS. Set to frontend URL in split deployment. |
| `NODE_ENV` | No | `development` | Set to `production` for production deployments. |
| `VITE_API_URL` | No | (empty) | Backend API URL for frontend. Empty means same-origin. |
| `VITE_WS_URL` | No | (empty) | WebSocket URL for frontend. Empty means same-origin auto-detect. |

---

## Build Commands

```bash
# Install dependencies
npm ci

# Build frontend
npm run build

# Run tests
npm test

# Start production server
NODE_ENV=production node server/index.js
```

---

## Database Notes

- SQLite stores data in a single file (default: `./data/ryse.db`).
- In Docker, mount a volume at `/app/data` for persistence.
- On platforms like Railway or Render, use a persistent disk/volume.
- SQLite works well for single-server deployments. For multi-instance scaling, consider migrating to PostgreSQL.
