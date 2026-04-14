/**
 * Shared formatting utilities used across all audit pages.
 */

/**
 * Format a transdt + transtm pair into a display string.
 * @param {string} dt - Date string like "2026-03-25"
 * @param {string|number} tm - Time as HHMM like "1430" or 1430
 * @returns {string} Formatted like "03/25/2026 2:30 PM"
 */
export function formatDateTime(dt, tm) {
  if (!dt) return '—';
  const d = new Date(dt + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  if (!tm) return dateStr;
  const t = String(tm).padStart(4, '0');
  const hr = parseInt(t.substring(0, 2));
  const min = t.substring(2, 4);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
  return `${dateStr} ${hr12}:${min} ${ampm}`;
}
