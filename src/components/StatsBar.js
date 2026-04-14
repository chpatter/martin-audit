import React from 'react';
import { useTheme } from '../config/ThemeContext';

/**
 * Stats bar showing summary counts for any audit change page.
 * @param {Array} changes - Array of change records
 * @param {Array} sourceTables - e.g. [{ key: 'POEH', label: 'POEH', color: theme.colors.info }, ...]
 */
export default function StatsBar({ changes, sourceTables = [] }) {
  const { theme } = useTheme();
  const total = changes.length;
  const changesOnly = changes.filter(c => c.change_type === 'change').length;
  const uniqueRecords = new Set(changes.map(c => `${c.pono}-${c.posuf}`)).size;

  const stat = (label, value, color = theme.colors.text) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: theme.fonts.mono }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
    </div>
  );

  const sourceStats = sourceTables.map(st => {
    const count = changes.filter(c => c.source === st.key).length;
    return stat(st.key, count, st.color);
  });

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${3 + sourceTables.length}, 1fr)`,
      gap: 20, background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radii.lg, padding: 3, marginBottom: 20,
    }}>
      {stat('Total Records', total, theme.colors.accent)}
      {stat('Records Affected', uniqueRecords)}
      {stat('Changes', changesOnly, theme.colors.warning)}
      {sourceStats}
    </div>
  );
}
