/**
 * Martin Audit System — Backend v2.0
 *
 * Change tracking via Infor Data Lake allvariations() queries through Compass API.
 * Auth: Service account OAuth2 (grant_type=password, same as Power Automate).
 *
 * Endpoints:
 *   GET  /api/health               — Server status
 *   GET  /api/auth/status           — Check Infor connection
 *   POST /api/auth/reconnect        — Re-authenticate
 *   GET  /api/changes/po/:pono      — All changes for a specific PO
 *   GET  /api/changes/recent        — Recent changes across all POs
 *   POST /api/changes/search        — Full filter search
 *   POST /api/sxe/*                 — Proxy to SXe REST APIs (whitelisted)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const CompassClient = require('./compass');
const { processVariations } = require('./changes');
const { getTableConfig } = require('./tracked-fields');
const { loadVendors, loadCustomers, loadOperators, enrichChanges, preloadCaches } = require('./lookups');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Configuration ───
const config = {
  tenantId: process.env.INFOR_TENANT_ID,
  ssoBase: process.env.INFOR_SSO_BASE,
  ionBase: process.env.INFOR_ION_BASE,
  clientId: process.env.INFOR_CLIENT_ID,
  clientSecret: process.env.INFOR_CLIENT_SECRET,
  username: process.env.INFOR_USERNAME,
  password: process.env.INFOR_PASSWORD,
  cono: parseInt(process.env.INFOR_CONO || '1', 10),
  oper: process.env.INFOR_OPER || 'CP01',
};

// ─── Token Cache ───
let tokenCache = { accessToken: null, refreshToken: null, apiToken: null, expiresAt: 0 };
let tokenRefreshTimer = null;

// ─── Compass Client ───
let compass;

// ─── Input Sanitization ───
// Prevent SQL injection in Compass queries — strip anything that isn't alphanumeric, dash, dot, underscore, space, or slash
function sanitize(val) {
  if (val === undefined || val === null) return '';
  return String(val).replace(/[^a-zA-Z0-9\-_.\/ ]/g, '').substring(0, 200);
}
function sanitizeNum(val) {
  const n = Number(val);
  return isNaN(n) ? null : n;
}
function sanitizeDate(val) {
  if (!val) return null;
  // Accept only YYYY-MM-DD format
  const match = String(val).match(/^(\d{4}-\d{2}-\d{2})$/);
  return match ? match[1] : null;
}

// ─── Middleware ───
app.use(helmet({ contentSecurityPolicy: false })); // CSP off for SPA proxy setups
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()),
  credentials: true,
}));

// Rate limiting — 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ─── Auth ───

async function getOAuthToken() {
  const tokenUrl = `${config.ssoBase}/${config.tenantId}/as/token.oauth2`;
  const body = new URLSearchParams({
    grant_type: 'password', username: config.username, password: config.password,
    client_id: config.clientId, client_secret: config.clientSecret,
  });

  console.log('[AUTH] Requesting OAuth2 token...');
  const res = await fetch(tokenUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) { const t = await res.text(); throw new Error(`OAuth2 failed (${res.status}): ${t.substring(0, 200)}`); }
  const data = await res.json();
  console.log(`[AUTH] OAuth2 token acquired (expires in ${data.expires_in}s)`);
  return data;
}

async function getApiToken(accessToken) {
  const loginUrl = `${config.ionBase}/${config.tenantId}/SX/webuiserviceinterface/sxeapi/api/login/login`;
  console.log(`[AUTH] Requesting SXe API token for ${config.oper}...`);
  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ Cono: config.cono, Oper: config.oper }),
  });

  if (!res.ok) { const t = await res.text(); throw new Error(`SXe login failed (${res.status}): ${t.substring(0, 200)}`); }
  const data = await res.json();
  if (data.Success === false) throw new Error('SXe login returned Success: false');
  console.log('[AUTH] SXe API token acquired');
  return data;
}

async function authenticate() {
  try {
    const oauthData = await getOAuthToken();
    tokenCache.accessToken = oauthData.access_token;
    tokenCache.refreshToken = oauthData.refresh_token;
    tokenCache.expiresAt = Date.now() + (oauthData.expires_in || 7200) * 1000;

    const apiData = await getApiToken(oauthData.access_token);
    tokenCache.apiToken = apiData.Token || apiData.token;

    compass = new CompassClient(config, tokenCache);
    scheduleRefresh(oauthData.expires_in || 7200);
    return true;
  } catch (err) {
    console.error('[AUTH] Failed:', err.message);
    tokenCache = { accessToken: null, refreshToken: null, apiToken: null, expiresAt: 0 };
    return false;
  }
}

async function refreshTokens() {
  if (!tokenCache.refreshToken) return authenticate();
  try {
    const tokenUrl = `${config.ssoBase}/${config.tenantId}/as/token.oauth2`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: tokenCache.refreshToken,
      client_id: config.clientId, client_secret: config.clientSecret,
    });
    const res = await fetch(tokenUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return authenticate();

    const data = await res.json();
    tokenCache.accessToken = data.access_token;
    tokenCache.refreshToken = data.refresh_token || tokenCache.refreshToken;
    tokenCache.expiresAt = Date.now() + (data.expires_in || 7200) * 1000;

    const apiData = await getApiToken(data.access_token);
    tokenCache.apiToken = apiData.Token || apiData.token;
    compass = new CompassClient(config, tokenCache);
    scheduleRefresh(data.expires_in || 7200);
  } catch (err) {
    console.error('[AUTH] Refresh error:', err.message);
    return authenticate();
  }
}

function scheduleRefresh(expiresIn) {
  if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
  const refreshMs = Math.max((expiresIn - 300) * 1000, 60000);
  tokenRefreshTimer = setTimeout(() => refreshTokens(), refreshMs);
}

async function ensureAuthenticated() {
  if (tokenCache.accessToken && tokenCache.apiToken && Date.now() < tokenCache.expiresAt - 60000) return true;
  return tokenCache.refreshToken ? refreshTokens().then(() => !!tokenCache.accessToken) : authenticate();
}

// ─── Helper: Run allvariations query for a table with filters ───

async function queryVariations(table, { pono, posuf, fromDate, toDate, whse, whses, vendno, custno, prod } = {}) {
  const cfg = getTableConfig(table);
  const t = table.toLowerCase();
  let sql = `SELECT * FROM infor.allvariations('${sanitize(table)}') WHERE 1=1`;

  // Record number — quote string keys (prod), leave number keys (pono, orderno) unquoted
  if (pono) {
    if (cfg.recordKeyType === 'string') {
      sql += ` AND ${cfg.recordKey} = '${sanitize(pono)}'`;
    } else {
      const num = sanitizeNum(pono);
      if (num !== null) sql += ` AND ${cfg.recordKey} = ${num}`;
    }
  }
  if (cfg.suffixKey && posuf !== undefined && posuf !== null && posuf !== '') {
    const num = sanitizeNum(posuf);
    if (num !== null) sql += ` AND ${cfg.suffixKey} = ${num}`;
  }
  const safeFrom = sanitizeDate(fromDate);
  const safeTo = sanitizeDate(toDate);
  if (safeFrom) sql += ` AND transdt >= '${safeFrom}'`;
  if (safeTo) sql += ` AND transdt <= '${safeTo}'`;
  if (whse) sql += ` AND whse = '${sanitize(whse)}'`;
  if (whses && whses.length > 0) sql += ` AND whse IN (${whses.map(w => `'${sanitize(w)}'`).join(', ')})`;

  // Only apply column filters to tables that have them
  const TABLES_WITH_VENDNO = ['poeh', 'poel', 'apsv', 'apss', 'pdsc', 'pdsv'];
  const TABLES_WITH_CUSTNO = ['arsc', 'arss', 'oeeh', 'oeel', 'pdsc'];
  const TABLES_WITH_PROD   = ['poel', 'oeel', 'icsp', 'icsw', 'icsc', 'pdsc', 'pdsv'];

  if (vendno && TABLES_WITH_VENDNO.includes(t)) { const n = sanitizeNum(vendno); if (n !== null) sql += ` AND vendno = ${n}`; }
  if (custno && TABLES_WITH_CUSTNO.includes(t)) { const n = sanitizeNum(custno); if (n !== null) sql += ` AND custno = ${n}`; }
  if (prod && TABLES_WITH_PROD.includes(t)) sql += ` AND prod = '${sanitize(prod)}'`;

  console.log(`[QUERY] ${sql}`);

  let rows;
  try {
    rows = await compass.query(sql);
  } catch (err) {
    console.error(`[QUERY] Failed for ${table}: ${err.message}`);
    return [];
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`[QUERY] No rows returned for ${table}`);
    return [];
  }

  console.log(`[QUERY] ${table}: ${rows.length} variation rows`);
  return rows;
}

// ─── Helper: Process rows into change log ───

function processTableRows(table, rows) {
  const source = table.toUpperCase();
  const cfg = getTableConfig(table);

  // Determine grouping fields — use groupFields if defined, else standard record+suffix+line
  const groupFields = cfg.groupFields ||
    [cfg.recordKey, cfg.suffixKey, cfg.lineKey].filter(Boolean);

  const groups = {};
  for (const row of rows) {
    const key = groupFields.map(f => row[f] || '0').join('|');
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  let changes = [];
  for (const [, groupRows] of Object.entries(groups)) {
    const lineno = cfg.lineKey ? (groupRows[0]?.[cfg.lineKey] || 0) : 0;
    changes.push(...processVariations(source, table, groupRows, lineno));
  }
  return changes;
}

// ─── Helper: Enrich changes with lookup names ───

async function enrich(changes) {
  const [vendors, customers, operators] = await Promise.all([
    loadVendors(compass), loadCustomers(compass), loadOperators(config, tokenCache),
  ]);
  return enrichChanges(changes, vendors, customers, operators);
}

// ─── Routes: Cancel ───

app.post('/api/changes/cancel', async (req, res) => {
  if (!compass) return res.json({ cancelled: 0 });
  const count = await compass.cancelAll();
  console.log(`[CHANGES] Cancelled ${count} queries`);
  res.json({ cancelled: count });
});

// ─── Routes: Health & Auth ───

app.get('/api/health', (req, res) => {
  const authenticated = !!(tokenCache.accessToken && tokenCache.apiToken && Date.now() < tokenCache.expiresAt);
  res.json({
    status: 'ok',
    configured: !!(config.tenantId && config.clientId && config.username),
    authenticated,
    operator: config.oper,
    cono: config.cono,
    expiresIn: authenticated ? Math.round((tokenCache.expiresAt - Date.now()) / 1000) : 0,
  });
});

app.get('/api/auth/status', async (req, res) => {
  const authed = await ensureAuthenticated();
  res.json({ authenticated: authed, operator: config.oper, cono: config.cono });
});

app.post('/api/auth/reconnect', async (req, res) => {
  const success = await authenticate();
  res.json({ authenticated: success, operator: config.oper, message: success ? 'Connected' : 'Failed — check .env' });
});

// ─── Routes: Change Log ───

/**
 * GET /api/changes/po/:pono — All changes for a specific PO (POEH + POEL)
 * Query params: posuf (default 0)
 */
app.get('/api/changes/po/:pono', async (req, res) => {
  try {
    const authed = await ensureAuthenticated();
    if (!authed) return res.status(503).json({ message: 'Not connected to Infor' });

    const pono = req.params.pono;
    const posuf = req.query.posuf || '0';
    const filters = { pono, posuf };

    console.log(`[CHANGES] Fetching changes for PO ${pono}-${posuf}...`);

    const poehRows = await queryVariations('poeh', filters);
    const poehChanges = processTableRows('poeh', poehRows);

    const poelRows = await queryVariations('poel', filters);
    const poelChanges = processTableRows('poel', poelRows);

    let allChanges = [...poehChanges, ...poelChanges].sort((a, b) => {
      if (a.transdt !== b.transdt) return a.transdt > b.transdt ? -1 : 1;
      if (a.transtm !== b.transtm) return a.transtm > b.transtm ? -1 : 1;
      return 0;
    });

    console.log(`[CHANGES] PO ${pono}-${posuf}: ${poehChanges.length} header + ${poelChanges.length} line = ${allChanges.length} total`);

    const enriched = await enrich(allChanges);

    res.json({ changes: enriched, count: enriched.length, pono, posuf });
  } catch (err) {
    console.error('[CHANGES] Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch changes' });
  }
});

/**
 * GET /api/changes/recent — Recent changes across all POs
 * Query params: days (default 7), whse, limit (default 500)
 */
app.get('/api/changes/recent', async (req, res) => {
  try {
    const authed = await ensureAuthenticated();
    if (!authed) return res.status(503).json({ message: 'Not connected to Infor' });

    const days = parseInt(req.query.days || '7', 10);
    const whse = req.query.whse || '';
    const limit = parseInt(req.query.limit || '500', 10);
    const fromDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const rows = await queryVariations('poeh', { fromDate, whse });
    let allChanges = processTableRows('poeh', rows);

    // For recent, only show actual changes (not initial "New" records)
    allChanges = allChanges.filter(c => c.change_type === 'change');

    allChanges.sort((a, b) => {
      if (a.transdt !== b.transdt) return a.transdt > b.transdt ? -1 : 1;
      if (a.transtm !== b.transtm) return a.transtm > b.transtm ? -1 : 1;
      return 0;
    });

    if (allChanges.length > limit) allChanges = allChanges.slice(0, limit);

    const enriched = await enrich(allChanges);

    res.json({ changes: enriched, count: enriched.length, days });
  } catch (err) {
    console.error('[CHANGES] Error:', err.message);
    res.status(500).json({ message: 'Failed to fetch recent changes' });
  }
});

/**
 * POST /api/changes/search — Full filter search
 * Body: { pono, posuf, fromDate, toDate, whse, vendno, source, includeNew }
 */
app.post('/api/changes/search', async (req, res) => {
  try {
    const authed = await ensureAuthenticated();
    if (!authed) return res.status(503).json({ message: 'Not connected to Infor' });

    const { fromDate, toDate, pono, posuf, ponos, whse, whses, vendno, custno, prod, limit, source, tables: requestedTables, includeNew = true } = req.body;
    console.log(`[CHANGES] Search: pono=${pono || 'any'} ponos=${ponos ? ponos.length + ' records' : 'none'} custno=${custno || 'any'} prod=${prod || 'any'} limit=${limit || 'none'} source=${source || 'all'} from=${fromDate || 'any'} to=${toDate || 'any'}`);

    // Reset cancel flag for new search
    compass.resetCancel();

    const tables = source ? [source.toLowerCase()] : (requestedTables || ['poeh', 'poel']);
    let allChanges = [];

    if (ponos && ponos.length > 0) {
      // Multiple records — run a separate query per record to avoid slow IN clauses on allvariations
      for (const entry of ponos) {
        if (compass.cancelled) break;
        const filters = { pono: entry.pono, posuf: entry.posuf, fromDate, toDate, whse, whses, vendno, custno, prod };
        for (const table of tables) {
          if (compass.cancelled) break;
          const rows = await queryVariations(table, filters);
          allChanges.push(...processTableRows(table, rows));
        }
      }
    } else {
      // Single record or date range search
      const filters = { pono, posuf, fromDate, toDate, whse, whses, vendno, custno, prod };
      for (const table of tables) {
        if (compass.cancelled) break;
        const rows = await queryVariations(table, filters);
        allChanges.push(...processTableRows(table, rows));
      }
    }

    if (compass.cancelled) {
      return res.json({ changes: [], count: 0, cancelled: true });
    }

    if (!includeNew) {
      allChanges = allChanges.filter(c => c.change_type !== 'new');
    }

    allChanges.sort((a, b) => {
      if (a.transdt !== b.transdt) return a.transdt > b.transdt ? -1 : 1;
      if (a.transtm !== b.transtm) return a.transtm > b.transtm ? -1 : 1;
      return 0;
    });

    // Apply limit to final results (caps the number of change entries returned)
    if (limit && limit > 0) {
      allChanges = allChanges.slice(0, limit);
    }

    console.log(`[CHANGES] Search returned ${allChanges.length} changes`);

    const enriched = await enrich(allChanges);

    res.json({ changes: enriched, count: enriched.length });
  } catch (err) {
    console.error('[CHANGES] Search error:', err.message);
    res.status(500).json({ message: 'Search failed. Please try again.' });
  }
});

// ─── Routes: SXe API Proxy (whitelisted paths only) ───

const SXE_ALLOWED_PATHS = [
  'asaborepositoryquery',
  'asaborepositoryinquiry',
  'asaborestservice',
];

app.post('/api/sxe/*', async (req, res) => {
  try {
    const sxePath = req.path.replace('/api/sxe/', '');

    // Only allow whitelisted SXe endpoints
    const basePath = sxePath.split('/')[0].toLowerCase();
    if (!SXE_ALLOWED_PATHS.includes(basePath)) {
      return res.status(403).json({ message: 'SXe endpoint not allowed' });
    }

    const authed = await ensureAuthenticated();
    if (!authed) return res.status(503).json({ message: 'Not connected to Infor' });
    const targetUrl = `${config.ionBase}/${config.tenantId}/SX/webuiserviceinterface/sxeapi/${sxePath}`;

    let proxyRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'accept': 'application/json',
        'Authorization': `Bearer ${tokenCache.accessToken}`, 'Token': tokenCache.apiToken,
      },
      body: JSON.stringify(req.body),
    });

    if (proxyRes.status === 401) {
      const reauthed = await authenticate();
      if (reauthed) {
        proxyRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', 'accept': 'application/json',
            'Authorization': `Bearer ${tokenCache.accessToken}`, 'Token': tokenCache.apiToken,
          },
          body: JSON.stringify(req.body),
        });
      } else return res.status(401).json({ message: 'Re-auth failed' });
    }

    const ct = proxyRes.headers.get('content-type') || '';
    if (ct.includes('application/json')) res.status(proxyRes.status).json(await proxyRes.json());
    else res.status(proxyRes.status).send(await proxyRes.text());
  } catch (err) {
    console.error('[PROXY] Error:', err.message);
    res.status(500).json({ message: 'API call failed' });
  }
});

// ─── Start ───
app.listen(PORT, async () => {
  console.log('');
  console.log('🐉 Martin Audit System — Backend v2.0');
  console.log('─'.repeat(45));
  console.log(`   Port:     ${PORT}`);
  console.log(`   Tenant:   ${config.tenantId || '⚠ NOT SET'}`);
  console.log(`   Operator: ${config.oper}`);
  console.log(`   Cono:     ${config.cono}`);
  console.log(`   Health:   http://localhost:${PORT}/api/health`);
  console.log(`   Source:   Compass Data Lake (allvariations)`);
  console.log('');

  const missing = [];
  if (!config.tenantId) missing.push('INFOR_TENANT_ID');
  if (!config.clientId) missing.push('INFOR_CLIENT_ID');
  if (!config.clientSecret) missing.push('INFOR_CLIENT_SECRET');
  if (!config.username) missing.push('INFOR_USERNAME');
  if (!config.password) missing.push('INFOR_PASSWORD');

  if (missing.length > 0) {
    console.log(`   ⚠  Missing: ${missing.join(', ')}`);
    console.log('');
    return;
  }

  console.log('   Connecting to Infor CloudSuite...');
  const success = await authenticate();
  console.log(success ? '   ✅ Connected!' : '   ❌ Failed — check .env credentials');

  if (success) {
    try {
      await preloadCaches(compass, config, tokenCache);
      console.log('   ✅ Vendor & operator caches loaded');
    } catch (err) {
      console.log(`   ⚠  Cache preload failed: ${err.message}`);
    }
  }

  console.log('');
});
