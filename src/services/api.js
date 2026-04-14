const API_BASE = process.env.REACT_APP_API_BASE || '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function get(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.message || `Failed: ${res.status}`, res.status, err);
  }
  return res.json();
}

async function post(endpoint, body = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.message || `Failed: ${res.status}`, res.status, err);
  }
  return res.json();
}

// ─── Auth ───
export async function checkBackendStatus() {
  try { return await get('/auth/status'); }
  catch { return { authenticated: false, error: 'Backend not reachable' }; }
}

export async function reconnectBackend() {
  return post('/auth/reconnect');
}

// ─── Change Log ───
export async function fetchPOChanges(pono, posuf = 0) {
  return get(`/changes/po/${pono}?posuf=${posuf}`);
}

export async function fetchRecentChanges(days = 7, whse = '') {
  let url = `/changes/recent?days=${days}`;
  if (whse) url += `&whse=${whse}`;
  return get(url);
}

export async function searchChanges(filters) {
  return post('/changes/search', filters);
}

export async function cancelSearch() {
  return post('/changes/cancel');
}

// ─── PO Inquiry (SXe API) ───
export async function fetchPOList(params = {}) {
  const body = {
    fromprinteddt: params.fromDate || null,
    toprinteddt: params.toDate || null,
    whse: params.whse || '',
    buyer: params.buyer || '',
    stage: params.stage || '',
    posuf: params.posuf || '0',
    irecordcountlimit: params.limit || 9999,
    ...params,
  };
  const res = await post('/sxe/api/po/aspoinquiry/poipbuildpolist', body);
  return res.poipbuildpolistresults || res;
}

export { ApiError };
