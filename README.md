# 🐉 Martin Audit System

**CloudSuite Distribution Audit Log Viewer** — A replacement for Dragon Pack Audit, built for Martin Supply.

Connects to Infor CloudSuite SXe APIs to query and review audit logs across purchasing, orders, customers, and more.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  React Frontend     │────▶│  Node.js Backend     │────▶│  Infor CloudSuite   │
│  (port 3000)        │     │  (port 3001)         │     │  SXe APIs            │
│                     │     │                      │     │                      │
│  • Login UI         │     │  • OAuth2 exchange   │     │  • mingle-sso        │
│  • PO Inquiry       │     │  • API token mgmt    │     │  • mingle-ionapi     │
│  • Audit Timeline   │     │  • API proxy         │     │  • sxeapi endpoints  │
│  • Filters/Search   │     │  • Secret storage    │     │                      │
└─────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

**Why a backend proxy?**
- Keeps `client_secret` safe (never exposed to browser)
- Handles CORS (Infor APIs don't allow browser-direct calls)
- Manages token refresh automatically
- Single place to configure Infor credentials

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Your Infor CloudSuite OAuth2 credentials (client_id, client_secret)
- Network access to `mingle-sso.inforcloudsuite.com` and `mingle-ionapi.inforcloudsuite.com`

### 1. Clone & Install

```bash
git clone <your-repo-url> martin-audit
cd martin-audit

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Environment

**Backend** (secrets go here — never committed to git):
```bash
cp server/.env.example server/.env
# Edit server/.env with your Infor credentials
```

**Frontend** (non-secret config):
```bash
cp .env.example .env.local
# Edit .env.local with your tenant ID and client ID
```

### 3. Run

**Development** (two terminals):
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd ..   # back to root
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies API calls to the backend on port 3001.

**Demo Mode:** If the backend isn't running, click "Launch Demo Mode" on the login screen to explore the interface with sample data.

## Environment Variables

### Backend (`server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend port | `3001` |
| `INFOR_TENANT_ID` | Your Infor tenant ID | `your_tenant_id_here` |
| `INFOR_SSO_BASE` | Infor SSO URL | `https://mingle-sso.inforcloudsuite.com` |
| `INFOR_ION_BASE` | Infor ION API URL | `https://mingle-ionapi.inforcloudsuite.com` |
| `INFOR_CLIENT_ID` | OAuth2 client ID | `KEY` |
| `INFOR_CLIENT_SECRET` | OAuth2 client secret | `KEY` |
| `INFOR_CONO` | Company number | `1` |
| `INFOR_OPER` | Default operator ID | `XX01` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

### Frontend (`.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_INFOR_TENANT_ID` | Tenant ID (for SSO redirect) | `your_tenant_id_here` |
| `REACT_APP_INFOR_SSO_BASE` | SSO base URL | `https://mingle-sso.inforcloudsuite.com` |
| `REACT_APP_INFOR_CLIENT_ID` | OAuth2 client ID (public) | `KEY` |
| `REACT_APP_INFOR_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/auth/callback` |
| `REACT_APP_API_BASE` | Backend API URL | `http://localhost:3001/api` |

## Production Deployment (VM)

Recommended setup on a Windows or Linux VM:

### Option A: PM2 + nginx (Linux VM) — Recommended

```bash
# Install PM2 globally
npm install -g pm2

# Build the frontend
npm run build

# Start the backend with PM2
cd server
pm2 start index.js --name martin-audit-api
pm2 save
pm2 startup

# Configure nginx to serve frontend + proxy backend
```

**nginx config** (`/etc/nginx/sites-available/martin-audit`):
```nginx
server {
    listen 80;
    server_name audit.martinsupply.local;  # or your VM hostname

    # Serve React frontend
    root /path/to/martin-audit/build;
    index index.html;

    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option B: IIS (Windows VM)

1. Build frontend: `npm run build`
2. Host `build/` folder in IIS as a site
3. Add URL Rewrite rule for React Router (SPA fallback)
4. Run backend as a Windows Service using `node-windows` or `pm2-windows-service`
5. Configure IIS reverse proxy (ARR) for `/api/` → `http://localhost:3001`

## Project Structure

```
martin-audit/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── UI.js              # Shared components (Badge, Input, etc.)
│   │   ├── Sidebar.js         # Navigation sidebar
│   │   └── PODetail.js        # PO detail drawer with timeline
│   ├── config/
│   │   ├── theme.js           # Design tokens
│   │   └── modules.js         # Audit module definitions
│   ├── pages/
│   │   ├── LoginPage.js       # Infor SSO login
│   │   ├── AuthCallbackPage.js # OAuth callback handler
│   │   └── PurchasesPage.js   # PO inquiry + filters + table
│   ├── services/
│   │   ├── auth.js            # Auth service (OAuth2 flow)
│   │   ├── api.js             # SXe API calls
│   │   └── mockData.js        # Demo mode data
│   ├── App.js                 # Main app with routing
│   └── index.js               # Entry point
├── server/
│   ├── index.js               # Express backend proxy
│   ├── package.json
│   └── .env.example           # Backend env template
├── .env.example                # Frontend env template
├── .gitignore
├── package.json
└── README.md
```

## SXe API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST api/login/login` | Get SXe API token |
| `POST api/po/aspoinquiry/poipbuildpolist` | PO list inquiry |
| `POST api/po/aspoinquiry/loadpolinehistory` | PO line audit history |
| `POST api/po/aspoinquiry/loadpocostact` | PO costing activity |
| `POST api/po/aspoinquiry/loadpoheader` | PO header details |
| `POST api/po/aspoline/loadpolinelist` | PO line items |

## Roadmap

- [x] Phase 1: Purchases module (PO inquiry + line history + cost activity)
- [ ] Phase 2: Orders module (order changes, OEEL data)
- [ ] Phase 3: Customer, Vendor, Catalog modules
- [ ] Phase 4: Security audit, Transfers, Serial Numbers
- [ ] Phase 5: Export to CSV/Excel, scheduled reports
- [ ] Phase 6: Role-based access, multi-user support

---

*Built to replace Dragon Pack Audit — because you shouldn't have to pay twice for features you already had.*
