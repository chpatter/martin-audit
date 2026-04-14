# 🐉 Martin Audit System

**CloudSuite Distribution Audit Log Viewer** — A replacement for Agile Dragon's Dragon Pack Audit, built for Martin Supply.

Tracks field-level changes across 10 modules in Infor CloudSuite SXe by querying the Compass Data Lake's `allvariations()` function, which returns every historical version of a record. The app compares consecutive versions to detect what changed, when, and by whom.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  React Frontend     │────▶│  Node.js Backend     │────▶│  Infor CloudSuite    │
│  (port 3000)        │     │  (port 3001)         │     │                      │
│                     │     │                      │     │  • mingle-sso        │
│  • Dashboard        │     │  • OAuth2 auth       │     │    (authentication)  │
│  • 10 Audit Modules │     │  • Token management  │     │  • mingle-ionapi     │
│  • Filter & Search  │     │  • Compass queries   │     │    (Compass / SXe)   │
│  • CSV Export       │     │  • Input sanitization│     │  • Data Lake         │
│  • Dark/Light Mode  │     │  • Rate limiting     │     │    (allvariations)   │
│  • Column Filters   │     │  • Name enrichment   │     │                      │
└─────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

### How It Works

1. **Backend authenticates** to Infor via OAuth2 service account (same grant_type=password flow as Power Automate)
2. **Queries Compass Data Lake** using `infor.allvariations('tablename')` — this returns every historical version of every record in that table, each with a `VariationId` timestamp
3. **Compares consecutive versions** — for each tracked field, if the value differs between version N and version N+1, that's a change
4. **Enriches results** — looks up vendor names, customer names, and operator names from cached arsc/apsv/sasoo data so you see "GRAINGER (308337)" instead of just "308337"
5. **Frontend displays** changes in a sortable, filterable table with CSV export

### Why a Backend Proxy?

- **Security** — OAuth2 `client_secret` and service account password never touch the browser
- **CORS** — Infor APIs don't allow direct browser calls; the backend proxies everything
- **Token management** — automatically refreshes expired tokens
- **Single config** — all Infor credentials live in one `server/.env` file

## Modules

The app tracks changes across 10 audit modules. Each module queries one or more Compass Data Lake tables and compares tracked fields between record versions.

| Module | Tables | Tracked Fields | Description |
|--------|--------|---------------|-------------|
| **Catalog** | ICSC | 48 | Product catalog — pricing, descriptions, vendor info, UOM |
| **Customers** | ARSC, ARSS | 45 + 45 | Customer master and ship-to records — address, terms, reps, credit |
| **Orders** | OEEH, OEEL | 65 + 55 | Sales order headers and lines — stage, pricing, quantities, ship-to |
| **Pricing-Customer** | PDSC | 77 | Customer price/discount records — multipliers, qty breaks, contracts |
| **Pricing-Vendor** | PDSV | 44 | Vendor cost agreements and pricing |
| **Prod/Whse** | ICSP, ICSW | 12 + 20 | Product master and warehouse-level settings |
| **Purchases** | POEH, POEL | 33 + 20 | Purchase order headers and lines — stage, dates, costs, quantities |
| **Security** | SASOO, PV_USER, PV_SECURE, AUTHSECURE | 90 + 46 + 3 + 10 | Operator permissions, function security, auth settings |
| **Transfers** | WTEH, WTEL | 9 + 11 | Warehouse transfer headers and lines |
| **Vendors** | APSV, APSS | 63 + 47 | Vendor master and ship-from records — banking, 1099, freight, terms |

### Tracked Fields

Each table has a curated list of fields that the app monitors for changes. These are defined in `server/tracked-fields.js`. Fields were selected by comparing against Agile Dragon's output plus additional fields we identified as valuable from the raw Compass data.

Every tracked field includes:
- **label** — human-readable column name (e.g., "Stage Code")
- **desc** — tooltip description explaining what the field means (e.g., "0 = Quoted, 1 = Ordered, 2 = Picked...")

To add a new tracked field, just add it to the appropriate table's object in `server/tracked-fields.js`. No other code changes needed — the comparison engine picks it up automatically.

## Quick Start

### Prerequisites

- **Node.js 18+** installed
- **Infor CloudSuite OAuth2 credentials** — service account with Compass Data Lake access
- **Network access** to `mingle-sso.inforcloudsuite.com` and `mingle-ionapi.inforcloudsuite.com`

### 1. Clone & Install

```bash
git clone https://github.com/MartinSupply/martin-audit.git
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
```

Edit `server/.env` with your Infor credentials. See the Environment Variables section below for details on each field.

**Frontend** (non-secret config):
```bash
cp .env.example .env.local
```

Edit `.env.local` — typically you only need to change `REACT_APP_API_BASE` if the backend isn't running on `localhost:3001`.

### 3. Run

**Development** (two terminals):
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend (from project root)
npm start
```

The frontend runs on `http://localhost:3000`. The backend runs on `http://localhost:3001`. On startup, the backend will:
1. Validate your `.env` credentials
2. Authenticate to Infor CloudSuite
3. Preload vendor, customer, and operator name caches from the Data Lake
4. Print a status summary to the console

The frontend's login page auto-detects the backend connection and proceeds automatically once authenticated.

## Environment Variables

### Backend (`server/.env`)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Backend port (default: 3001) | `3001` |
| `INFOR_TENANT_ID` | Yes | Your Infor CloudSuite tenant identifier | `MYTENANT_PRD` |
| `INFOR_SSO_BASE` | Yes | Infor SSO authentication URL | `https://mingle-sso.inforcloudsuite.com` |
| `INFOR_ION_BASE` | Yes | Infor ION API base URL | `https://mingle-ionapi.inforcloudsuite.com` |
| `INFOR_CLIENT_ID` | Yes | OAuth2 client ID from your Infor API credentials | `TENANTKEY~xxxxxxx` |
| `INFOR_CLIENT_SECRET` | Yes | OAuth2 client secret — keep this safe | `xxxxxxxxxxxxxxxx` |
| `INFOR_USERNAME` | Yes | Service account username (the long string from your Power Automate grant_type=password flow) | `"your_service_account_id"` |
| `INFOR_PASSWORD` | Yes | Service account password (from the same flow — may contain special characters, wrap in double quotes) | `"your_password"` |
| `INFOR_CONO` | No | Company number (default: 1) | `1` |
| `INFOR_OPER` | No | Default operator ID for SXe API login | `CP01` |
| `ALLOWED_ORIGINS` | No | CORS allowed origins, comma-separated (default: `http://localhost:3000`) | `http://localhost:3000,https://audit.internal.com` |

### Frontend (`.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_BASE` | Backend API URL | `http://localhost:3001/api` |

## Security

The following security measures are in place:

- **Helmet** — sets HTTP security headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.)
- **Rate limiting** — 100 requests per minute per IP address via `express-rate-limit`
- **Input sanitization** — all user inputs are sanitized before being interpolated into Compass SQL queries to prevent injection attacks
- **Error message sanitization** — internal error details are logged server-side but never sent to the client
- **CORS restriction** — only origins listed in `ALLOWED_ORIGINS` can call the backend
- **SXe proxy whitelisting** — the `/api/sxe/*` proxy only forwards requests to pre-approved SXe endpoint paths
- **Credential isolation** — all secrets live in `server/.env` which is gitignored; the frontend has zero access to credentials
- **No browser storage of secrets** — OAuth tokens are managed entirely server-side

### Important: HTTPS in Production

When deploying beyond localhost, **always** run behind a reverse proxy (nginx, Caddy, IIS ARR) with TLS/HTTPS. The backend itself serves HTTP — the reverse proxy handles encryption. See the Production Deployment section below.

### Credential Rotation

If you ever suspect credentials have been exposed:
1. Regenerate your OAuth2 client credentials in the Infor ION API portal
2. Update `server/.env` with the new values
3. Restart the backend

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Server status check — returns uptime and auth state |
| `GET` | `/api/auth/status` | Check Infor connection — returns operator, cono, authenticated flag |
| `POST` | `/api/auth/reconnect` | Force re-authentication to Infor |
| `GET` | `/api/changes/po/:pono` | All POEH + POEL changes for a specific PO number |
| `GET` | `/api/changes/recent` | Recent changes (default: last 7 days). Query params: `days`, `whse`, `limit` |
| `POST` | `/api/changes/search` | Full filter search across any module. Body accepts: `pono`, `posuf`, `ponos`, `fromDate`, `toDate`, `whse`, `whses`, `vendno`, `custno`, `prod`, `limit`, `source`, `tables`, `includeNew` |
| `POST` | `/api/changes/cancel` | Cancel an in-progress Compass query |
| `POST` | `/api/sxe/*` | Proxy to SXe REST APIs (whitelisted paths only) |

### Search Body Parameters

The `/api/changes/search` endpoint is the primary query method used by all modules:

| Parameter | Type | Description |
|-----------|------|-------------|
| `pono` | string | Single record number (e.g., "10289159") |
| `posuf` | string | Record suffix (e.g., "0") |
| `ponos` | array | Multiple records: `[{ pono: "123" }, { pono: "456", posuf: "2" }]` |
| `fromDate` | string | Start date filter (YYYY-MM-DD) |
| `toDate` | string | End date filter (YYYY-MM-DD) |
| `whse` | string | Single warehouse filter |
| `whses` | array | Multiple warehouses: `["1000", "3300"]` |
| `vendno` | string | Vendor number filter (applies to tables with vendno column) |
| `custno` | string | Customer number filter (applies to tables with custno column) |
| `prod` | string | Product number filter (applies to tables with prod column) |
| `limit` | number | Max number of change records to return |
| `source` | string | Single table to query (e.g., "oeeh") |
| `tables` | array | Multiple tables to query (e.g., `["oeeh", "oeel"]`) |
| `includeNew` | boolean | Whether to include initial record creation entries (default: true) |

## Production Deployment

### Option A: PM2 + nginx (Linux) — Recommended

```bash
# Build the frontend into static files
npm run build

# Install PM2 globally for process management
npm install -g pm2

# Start the backend with PM2 (auto-restart on crash)
cd server
pm2 start index.js --name martin-audit-api
pm2 save      # save process list so it survives reboot
pm2 startup   # generate startup script for your OS
```

**nginx config** (`/etc/nginx/sites-available/martin-audit`):
```nginx
server {
    listen 443 ssl;
    server_name audit.martinsupply.local;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # Serve React frontend (static build files)
    root /path/to/martin-audit/build;
    index index.html;

    # Frontend routes — React Router handles client-side routing,
    # so all non-file requests need to fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;  # Compass queries can be slow
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name audit.martinsupply.local;
    return 301 https://$host$request_uri;
}
```

Enable and restart nginx:
```bash
sudo ln -s /etc/nginx/sites-available/martin-audit /etc/nginx/sites-enabled/
sudo nginx -t       # test config
sudo systemctl reload nginx
```

Update `server/.env`:
```
ALLOWED_ORIGINS=https://audit.martinsupply.local
```

Update `.env.local` before building:
```
REACT_APP_API_BASE=https://audit.martinsupply.local/api
```

### Option B: IIS (Windows)

1. Build frontend: `npm run build`
2. Create an IIS site pointing to the `build/` folder
3. Add a `web.config` URL Rewrite rule for SPA fallback (routes all non-file requests to `index.html`)
4. Run the backend as a Windows Service using `node-windows` or `pm2-windows-service`
5. Configure IIS Application Request Routing (ARR) to reverse proxy `/api/*` → `http://localhost:3001`
6. Add an SSL binding to the IIS site

## Project Structure

```
martin-audit/
├── public/
│   ├── index.html              # HTML shell
│   └── triangle.svg            # Martin logo
├── src/
│   ├── components/
│   │   ├── ChangesTable.js     # Main data table — sortable columns, expandable rows
│   │   ├── ExpandedRow.js      # Expanded row detail view (all fields for a change)
│   │   ├── FilterBar.js        # Search bar — record #, source, warehouse, dates, etc.
│   │   ├── MultiSelect.js      # Multi-select dropdown used by column filters
│   │   ├── PODetail.js         # PO detail drawer with timeline and costing tabs
│   │   ├── ResultFilters.js    # Column filter dropdowns (post-search, client-side)
│   │   ├── Sidebar.js          # Navigation sidebar with module list
│   │   ├── StatsBar.js         # Summary bar showing change counts by source table
│   │   └── UI.js               # Shared primitives (Badge, GlowDot, StageBadge, etc.)
│   ├── config/
│   │   ├── ThemeContext.js     # React context for dark/light theme with localStorage
│   │   ├── modules.js          # Module definitions (id, label, icon, tables, badge)
│   │   └── theme.js            # Design tokens — colors, fonts, radii, shadows
│   ├── hooks/
│   │   └── useChangeSearch.js  # Shared hook — search, filter, sort, CSV export logic
│   ├── pages/
│   │   ├── CatalogPage.js      # ICSC catalog changes
│   │   ├── CustomersPage.js    # ARSC + ARSS customer changes
│   │   ├── LoginPage.js        # Auto-connect login screen
│   │   ├── OrdersPage.js       # OEEH + OEEL order changes
│   │   ├── PricingCustPage.js  # PDSC customer pricing changes
│   │   ├── PricingVendPage.js  # PDSV vendor pricing changes
│   │   ├── ProdWhsePage.js     # ICSP + ICSW product/warehouse changes
│   │   ├── PurchasesPage.js    # POEH + POEL purchase order changes
│   │   ├── SecurityPage.js     # SASOO + PV_USER + PV_SECURE + AUTHSECURE
│   │   ├── TransfersPage.js    # WTEH + WTEL warehouse transfer changes
│   │   └── VendorsPage.js      # APSV + APSS vendor changes
│   ├── services/
│   │   └── api.js              # API client — all backend HTTP calls
│   ├── utils/
│   │   └── format.js           # Date/time formatting helpers
│   ├── App.js                  # Main app — dashboard, routing, header
│   └── index.js                # React entry point, ThemeProvider wrapper
├── server/
│   ├── index.js                # Express backend — auth, Compass queries, API proxy
│   ├── changes.js              # Change detection engine — compares record versions
│   ├── compass.js              # Compass Data Lake client — submit, poll, fetch pattern
│   ├── lookups.js              # Name enrichment — caches vendor/customer/operator names
│   ├── tracked-fields.js       # Field registry — which fields to track per table
│   ├── package.json            # Backend dependencies
│   └── .env.example            # Backend environment template
├── .env.example                # Frontend environment template
├── .gitignore                  # Ignores .env, node_modules, build output
├── package.json                # Frontend dependencies and scripts
└── README.md
```

## How to Add a New Module

1. **Add table config** in `server/tracked-fields.js` — define the table's primary key mapping:
   ```js
   tablename: { recordKey: 'keyfield', suffixKey: null, lineKey: null, recordKeyType: 'number' }
   ```

2. **Add tracked fields** in `server/tracked-fields.js` — list the fields you want to monitor:
   ```js
   tablename: {
     fieldname: { label: 'Human Label', desc: 'What this field means' },
   }
   ```

3. **Create a page** in `src/pages/NewModulePage.js` — follow any existing page as a template. Each page defines: `SOURCE_TABLES`, `SOURCE_OPTIONS`, `FILTER_KEYS`, `FILTER_LABELS`, `COLUMNS`, `CSV_HEADERS`, `csvRowMapper`.

4. **Register the module** in `src/config/modules.js`:
   ```js
   { id: 'newmodule', label: 'New Module', icon: '📌', active: true, badge: 'NEW MODULE CHANGES', description: 'Description here' }
   ```

5. **Add the page import and route** in `src/App.js` — add it to the imports and the `PAGE_MAP` object.

That's it. The shared `useChangeSearch` hook, `FilterBar`, `ChangesTable`, `ResultFilters`, and `StatsBar` components handle everything else automatically.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 | UI framework |
| Styling | Inline styles + theme tokens | Dark/light mode, no CSS build step |
| State | React hooks (useState, useContext, useMemo) | Component state and theming |
| Backend | Express.js | API server and proxy |
| Security | helmet, express-rate-limit | HTTP headers, rate limiting |
| Auth | OAuth2 (grant_type=password) | Infor CloudSuite service account |
| Data | Compass Data Lake (allvariations) | Historical record versions |
| Enrichment | Cached ARSC, APSV, SASOO lookups | Vendor/customer/operator display names |

## Roadmap

- [x] Purchases module (POEH + POEL)
- [x] Orders module (OEEH + OEEL)
- [x] Customers module (ARSC + ARSS)
- [x] Catalog module (ICSC)
- [x] Vendors module (APSV + APSS)
- [x] Customer Pricing module (PDSC)
- [x] Vendor Pricing module (PDSV)
- [x] Product/Warehouse module (ICSP + ICSW)
- [x] Security module (SASOO + PV_USER + PV_SECURE + AUTHSECURE)
- [x] Transfers module (WTEH + WTEL)
- [x] CSV export on all modules
- [x] Column filters on all modules (auto-hide single-value)
- [x] Dark/light mode
- [x] Dashboard landing page
- [x] Input sanitization and security hardening
- [ ] HTTPS production deployment
- [ ] Role-based access / multi-user support
- [ ] Scheduled reports / email alerts
- [ ] Serial number tracking module

---

*Built to replace Dragon Pack Audit — because you shouldn't have to pay twice for features you already had.*
