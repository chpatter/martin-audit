/**
 * Compass Data Lake Query Module
 *
 * Handles the 3-step Compass API pattern:
 *   1. POST /jobs/ — submit SQL query (text/plain)
 *   2. GET /jobs/{id}/status/ — poll until FINISHED
 *   3. GET /jobs/{id}/result/?limit=N — fetch results
 *
 * Also supports cancelling running queries via PUT /jobs/{id}/cancel/
 */

const fetch = require('node-fetch');

class CompassClient {
  constructor(config, tokenCache) {
    this.config = config;
    this.tokenCache = tokenCache;
    this.baseUrl = `${config.ionBase}/${config.tenantId}/DATAFABRIC/compass/v2`;
    this.activeQueries = new Set(); // Track running query IDs
    this.cancelled = false;         // Flag to stop polling
  }

  /**
   * Cancel all active queries.
   */
  async cancelAll() {
    this.cancelled = true;
    const ids = [...this.activeQueries];
    console.log(`[COMPASS] Cancelling ${ids.length} active queries...`);

    const results = await Promise.allSettled(ids.map(async (queryId) => {
      try {
        const res = await fetch(`${this.baseUrl}/jobs/${queryId}/cancel/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.tokenCache.accessToken}`,
            'Accept': 'application/json',
          },
        });
        console.log(`[COMPASS] Cancel ${queryId}: ${res.status}`);
      } catch (err) {
        console.error(`[COMPASS] Cancel ${queryId} failed: ${err.message}`);
      }
    }));

    this.activeQueries.clear();
    return ids.length;
  }

  /**
   * Reset the cancelled flag (call before starting new queries).
   */
  resetCancel() {
    this.cancelled = false;
  }

  async query(sql, { limit = 10000, pollIntervalMs = 2000, maxPollAttempts = 120 } = {}) {
    console.log(`[COMPASS] Query: ${sql.substring(0, 200)}...`);

    // Step 1: Submit
    const jobRes = await fetch(`${this.baseUrl}/jobs/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.tokenCache.accessToken}`,
        'Content-Type': 'text/plain',
        'Accept': 'application/json',
      },
      body: sql,
    });

    if (!jobRes.ok) {
      const err = await jobRes.text();
      throw new Error(`Compass submit failed (${jobRes.status}): ${err.substring(0, 300)}`);
    }

    const jobData = await jobRes.json();
    const queryId = jobData.queryId;
    this.activeQueries.add(queryId);
    console.log(`[COMPASS] Job submitted: ${queryId}`);

    // Step 2: Poll for status
    let status = jobData.status || 'RUNNING';
    let attempts = 0;

    try {
      while (status === 'RUNNING' && attempts < maxPollAttempts) {
        // Check if cancelled
        if (this.cancelled) {
          console.log(`[COMPASS] Query ${queryId} cancelled by user`);
          throw new Error('Query cancelled');
        }

        await new Promise(r => setTimeout(r, pollIntervalMs));
        attempts++;

        const statusRes = await fetch(`${this.baseUrl}/jobs/${queryId}/status/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.tokenCache.accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (!statusRes.ok) {
          const err = await statusRes.text();
          throw new Error(`Compass status failed (${statusRes.status}): ${err.substring(0, 300)}`);
        }

        const statusData = await statusRes.json();
        status = statusData.status || 'UNKNOWN';

        if (attempts % 10 === 0) console.log(`[COMPASS] Polling... attempt ${attempts}, status: ${status}`);
      }

      if (status === 'FAILED') throw new Error('Compass query failed');
      if (status === 'CANCELED') throw new Error('Compass query was canceled');
      if (status !== 'FINISHED') throw new Error(`Compass query timed out after ${attempts} polls`);

      // Step 3: Get results
      const resultRes = await fetch(`${this.baseUrl}/jobs/${queryId}/result/?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokenCache.accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!resultRes.ok) {
        const err = await resultRes.text();
        throw new Error(`Compass result failed (${resultRes.status}): ${err.substring(0, 300)}`);
      }

      const data = await resultRes.json();
      console.log(`[COMPASS] Got ${Array.isArray(data) ? data.length : '?'} rows`);
      return data;

    } finally {
      this.activeQueries.delete(queryId);
    }
  }
}

module.exports = CompassClient;
