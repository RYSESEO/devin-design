# RYSE Command Center

Real-time analytics dashboard for Shopify, GitHub, and marketing automation. Built with vanilla JS, Chart.js, and an Express/SQLite backend. Deployed on Railway.

**Live:** [devin-design-production.up.railway.app](https://devin-design-production.up.railway.app)

## Features

- **KPI Dashboard** - Revenue, agent sessions, leads, and content views with animated counters and sparklines
- **Shopify Integration** - Orders, revenue, and top products via Admin API or OAuth
- **GitHub Integration** - Activity feed, commit heatmap, CI/CD status via OAuth or personal token
- **Google Integration** - GA4 traffic and Search Console queries via Google OAuth
- **4 Theme Modes** - Default dark, Liquid Glass, Brutalist, Cyberpunk
- **Real-time Updates** - WebSocket-powered live data streaming with reconnection
- **Dashboard Tabs** - All Metrics, Marketing, Engineering, Executive filtered views
- **Drag-and-Drop Layout** - Customizable widget positioning with persistence
- **Command Palette** - Ctrl+K searchable command interface
- **Focus Mode** - Expand any widget to full screen
- **AI Chat Assistant** - Built-in conversational interface
- **Voice Control** - Voice-activated commands
- **Multi-Store Management** - Aggregate metrics across Shopify stores
- **Workspaces** - Team collaboration with shared dashboards
- **Reports** - Generate and export analytics reports
- **Forecasting** - Demand prediction with trend analysis
- **SEO Radar** - Keyword opportunity tracking
- **Competitive Intelligence** - Competitor monitoring and alerts
- **Widget Builder** - No-code custom widget creation
- **Embedded Analytics** - Configurable iframe/script embeds
- **PWA Support** - Installable with offline capability

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS, Chart.js, CSS custom properties |
| Backend | Node.js, Express, better-sqlite3 |
| Auth | JWT with refresh tokens, bcrypt |
| Real-time | WebSocket (ws) with SSE fallback |
| Build | Vite |
| Tests | Vitest |
| Deploy | Docker, Railway |

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
git clone https://github.com/RYSESEO/devin-design.git
cd devin-design
npm install
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for signing auth tokens |
| `ENCRYPTION_KEY` | Key for encrypting stored credentials |
| `PORT` | Server port (default: 3001) |
| `SHOPIFY_CLIENT_ID` | Shopify app client ID (for OAuth) |
| `SHOPIFY_CLIENT_SECRET` | Shopify app client secret (for OAuth) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (GA4 + Search Console) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `APP_URL` | Base URL for OAuth redirects (auto-detected if not set) |

### Development

```bash
npm run dev
```

Starts both the Vite dev server (frontend) and nodemon (backend) concurrently.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

Serves the built frontend and API from a single Express server.

### Tests

```bash
npm test
```

## Connecting Shopify

### Option 1: Admin API Token (recommended for single store)

1. In Shopify admin, go to **Settings > Apps and sales channels > Develop apps**
2. Create or open your custom app
3. Under **API credentials**, get your Admin API access token (`shpat_...`)
4. In the RYSE dashboard, open **Settings** (gear icon) and enter:
   - **Store URL**: Your myshopify subdomain (e.g., `my-store` if your admin URL is `admin.shopify.com/store/my-store`)
   - **Admin API Token**: Your `shpat_xxxxx` token

### Option 2: OAuth (for multi-store apps)

Set `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` in your environment. The redirect URI is auto-detected from the deployment URL.

## Deployment

### Railway

The project includes a `Dockerfile` for containerized deployment. Set environment variables in the Railway dashboard.

### Docker

```bash
docker build -t ryse-dashboard .
docker run -p 3001:3001 --env-file .env ryse-dashboard
```

## Project Structure

```
dashboard/           Frontend (vanilla JS, CSS, HTML)
  lib/               Modules (auth, realtime, layout, state-sync)
  sw.js              Service worker (network-first caching)
server/              Express backend
  routes/            API endpoints
  middleware/        Auth, encryption
  db/                SQLite schema and migrations
  ws/                WebSocket server and data streams
```

## API

All API routes are under `/api/`. Authentication via `Authorization: Bearer <token>` header.

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Sign in |
| `POST /api/auth/refresh` | Refresh JWT |
| `GET /api/oauth/shopify/install` | Initiate Shopify OAuth |
| `GET /api/oauth/github/authorize` | Initiate GitHub OAuth |
| `GET /api/oauth/google/authorize` | Initiate Google OAuth (GA4 + Search Console) |
| `POST /api/proxy/shopify` | Forward requests to Shopify Admin API |
| `POST /api/proxy/github` | Forward requests to GitHub API |
| `GET /api/state` | Load saved dashboard state |
| `PUT /api/state/layout` | Save layout configuration |
| `PUT /api/state/connectors` | Save connector credentials |
| `GET /api/health` | Health check |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+K` | Command palette |
| `T` | Cycle themes |
| `F` | Focus hovered widget |
| `N` | Toggle notifications |
| `L` | Customize layout |
| `S` | Data connections |
| `?` | Show all shortcuts |

## License

[MIT](LICENSE)
