import React from 'react';
import { useTheme } from '../config/ThemeContext';
import { formatDateTime } from '../utils/format';

/**
 * Get the display value for a column key from a row.
 */
function getDisplayValue(row, colKey) {
  switch (colKey) {
    case 'source':      return row.source || '—';
    case 'pono':        return `${row.pono}-${row.posuf}`;
    case 'lineno':      return String(row.lineno || 0);
    case 'vendname':    return row.vendname || '—';
    case 'custname':    return row.custname || '—';
    case 'whse':        return row.whse || '—';
    case 'field_label': return `${row.field_label} - (${row.field_name})`;
    case 'transproc':   return row.transproc || '—';
    case 'new_value':   return row.new_value || '(empty)';
    case 'old_value':   return row.old_value || '(empty)';
    case 'transdt':     return formatDateTime(row.transdt, row.transtm);
    case 'effectiveEnd': return row.effectiveEnd || '12/31/2046 12:00 AM';
    case 'opername':    return row.opername || row.oper || '—';
    case 'description': return row.description || '—';
    case 'levelcd':     return row.levelcd || '—';
    case 'startdt':     return row.startdt || '—';
    case 'enddt':       return row.enddt || '—';
    case 'prod':        return row.prod || '—';
    case 'functionName': return row.functionName || '—';
    default:            return row[colKey] || '—';
  }
}

/**
 * Expandable detail panel shown below a table row when clicked.
 * Dynamically renders fields based on the page's column definitions.
 */
export default function ExpandedRow({ row, colSpan, columns = [] }) {
  const { theme } = useTheme();

  // Build fields from columns config + add change type
  const fields = columns.map(col => ({
    label: col.label,
    value: getDisplayValue(row, col.key),
  }));

  // Add change type as extra context
  fields.push({
    label: 'Change Type',
    value: row.change_type === 'new' ? 'New Record' : 'Changed',
  });

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <div style={{ position: 'sticky', left: 0, width: 'calc(100vw - 280px)', padding: '16px 24px', background: theme.colors.bgCardHover, borderBottom: `2px solid ${theme.colors.accent}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 24px' }}>
            {fields.map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.mono, wordBreak: 'break-all' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}
