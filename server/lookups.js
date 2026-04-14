/**
 * Lookup Cache Module
 *
 * Fetches and caches:
 *   - Vendor names from Compass Data Lake (apsv table)
 *   - Customer names from Compass Data Lake (arsc table)
 *   - Operator names from SXe API (sasogetoperatorlist endpoint)
 *
 * All caches refresh every hour. Operator list loads in a single API call.
 */

const fetch = require('node-fetch');

const CACHE_TTL = 3600000; // 1 hour

let vendorCache = {};
let customerCache = {};
let operatorCache = {};
let vendorCacheTime = 0;
let customerCacheTime = 0;
let operatorCacheTime = 0;

/**
 * Load vendor names from apsv table via Compass
 */
async function loadVendors(compass) {
  if (Date.now() - vendorCacheTime < CACHE_TTL && Object.keys(vendorCache).length > 0) {
    return vendorCache;
  }

  try {
    console.log('[LOOKUP] Loading vendor names from apsv...');
    const rows = await compass.query("SELECT vendno, name FROM apsv", { limit: 50000 });

    vendorCache = {};
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const vno = String(row.vendno || '').replace(/\.0+$/, '');
        vendorCache[vno] = row.name || '';
      }
    }
    vendorCacheTime = Date.now();
    console.log(`[LOOKUP] Cached ${Object.keys(vendorCache).length} vendors`);
  } catch (err) {
    console.error('[LOOKUP] Failed to load vendors:', err.message);
  }

  return vendorCache;
}

/**
 * Load customer names from arsc table via Compass
 */
async function loadCustomers(compass) {
  if (Date.now() - customerCacheTime < CACHE_TTL && Object.keys(customerCache).length > 0) {
    return customerCache;
  }

  try {
    console.log('[LOOKUP] Loading customer names from arsc...');
    const rows = await compass.query("SELECT custno, name FROM arsc", { limit: 50000 });

    customerCache = {};
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const cno = String(row.custno || '').replace(/\.0+$/, '');
        customerCache[cno] = row.name || '';
      }
    }
    customerCacheTime = Date.now();
    console.log(`[LOOKUP] Cached ${Object.keys(customerCache).length} customers`);
  } catch (err) {
    console.error('[LOOKUP] Failed to load customers:', err.message);
  }

  return customerCache;
}

/**
 * Load operator names from SXe API (single call returns all operators)
 * @param {object} config - Server config with ionBase, tenantId
 * @param {object} tokenCache - Token cache with accessToken, apiToken
 */
async function loadOperators(config, tokenCache) {
  if (Date.now() - operatorCacheTime < CACHE_TTL && Object.keys(operatorCache).length > 0) {
    return operatorCache;
  }

  try {
    console.log('[LOOKUP] Loading operator names from SXe API...');
    const url = `${config.ionBase}/${config.tenantId}/SX/webuiserviceinterface/sxeapi/api/sa/assasetup/sasogetoperatorlist`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'Authorization': `Bearer ${tokenCache.accessToken}`,
        'Token': tokenCache.apiToken,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`SXe operator list failed (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data = await res.json();

    operatorCache = {};
    if (Array.isArray(data)) {
      for (const entry of data) {
        const oper = String(entry.operinit || '').trim().toUpperCase();
        if (oper) operatorCache[oper] = entry.name || '';
      }
    }
    operatorCacheTime = Date.now();
    console.log(`[LOOKUP] Cached ${Object.keys(operatorCache).length} operators`);
  } catch (err) {
    console.error('[LOOKUP] Failed to load operators:', err.message);
  }

  return operatorCache;
}

/**
 * Enrich change records with vendor/customer/operator display names
 */
function enrichChanges(changes, vendors, customers, operators) {
  return changes.map(change => {
    const vendno = String(change.vendno || '').replace(/\.0+$/, '');
    const vendName = vendors[vendno] || '';
    const custno = String(change.custno || '').replace(/\.0+$/, '');
    const custName = customers[custno] || '';
    const operCode = String(change.oper || '').trim().toUpperCase();
    const operName = operators[operCode] || '';

    return {
      ...change,
      vendname: vendName ? `${vendName} (${vendno})` : vendno || '',
      custname: custName ? `${custName} (${custno})` : custno || '',
      opername: operName ? `${operName} (${operCode})` : operCode || '',
      effectiveEnd: '12/31/2046 12:00 AM',
    };
  });
}

/**
 * Pre-load all caches (call on startup after auth)
 * @param {object} compass - Compass client for vendor/customer queries
 * @param {object} config - Server config for SXe API calls
 * @param {object} tokenCache - Token cache for SXe API auth
 */
async function preloadCaches(compass, config, tokenCache) {
  console.log('[LOOKUP] Pre-loading lookup caches...');
  await Promise.all([
    loadVendors(compass),
    loadCustomers(compass),
    loadOperators(config, tokenCache),
  ]);
}

module.exports = {
  loadVendors,
  loadCustomers,
  loadOperators,
  enrichChanges,
  preloadCaches,
};
