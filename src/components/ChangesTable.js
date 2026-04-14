import React from 'react';
import { useTheme } from '../config/ThemeContext';
import { Badge } from './UI';
import ExpandedRow from './ExpandedRow';
import { formatDateTime } from '../utils/format';

/**
 * Badge colored by data source.
 */
function SourceBadge({ source }) {
  const variant = source === 'POEH' ? 'info'
    : source === 'POEL' ? 'warning'
    : source === 'OEEH' ? 'info'
    : source === 'OEEL' ? 'warning'
    : source === 'ICSP' ? 'info'
    : source === 'ICSW' ? 'warning'
    : source === 'ARSC' ? 'info'
    : source === 'ARSS' ? 'warning'
    : source === 'ICSC' ? 'info'
    : source === 'WTEH' ? 'info'
    : source === 'WTEL' ? 'warning'
    : source === 'PDSC' ? 'info'
    : source === 'PDSV' ? 'info'
    : source === 'APSV' ? 'info'
    : source === 'APSS' ? 'warning'
    : source === 'SASOO' ? 'info'
    : source === 'PV_USER' ? 'warning'
    : source === 'PV_SECURE' ? 'info'
    : source === 'AUTHSECURE' ? 'warning'
    : 'default';
  return <Badge variant={variant}>{source}</Badge>;
}

/**
 * Renders a single cell value based on the column key.
 */
function CellValue({ row, colKey, theme }) {
  const base = { overflow: 'hidden', textOverflow: 'ellipsis' };

  switch (colKey) {
    case 'source':
      return <SourceBadge source={row.source} />;
    case 'pono':
      return <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.accent, fontWeight: 600 }}>{row.pono}-{row.posuf}</span>;
    case 'lineno':
      return <span style={{ fontFamily: theme.fonts.mono, textAlign: 'center', display: 'block' }}>{row.lineno || 0}</span>;
    case 'vendname':
      return <span style={{ fontFamily: theme.fonts.body, maxWidth: 210, ...base }}>{row.vendname || '—'}</span>;
    case 'custname':
      return <span style={{ fontFamily: theme.fonts.body, maxWidth: 210, ...base }}>{row.custname || '—'}</span>;
    case 'whse':
      return <span style={{ fontFamily: theme.fonts.mono }}>{row.whse || '—'}</span>;
    case 'field_label':
      return <span style={{ fontFamily: theme.fonts.body, color: theme.colors.textBright }}>{row.field_label} - ({row.field_name})</span>;
    case 'transproc':
      return <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.textMuted }}>{row.transproc || '—'}</span>;
    case 'new_value':
      return <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.success, fontWeight: 500 }}>{row.new_value || '(empty)'}</span>;
    case 'old_value':
      return <span style={{ fontFamily: theme.fonts.mono, color: row.old_value === 'New' ? theme.colors.textMuted : theme.colors.warning }}>{row.old_value || '(empty)'}</span>;
    case 'transdt':
      return <span style={{ fontFamily: theme.fonts.mono, fontSize: 11 }}>{formatDateTime(row.transdt, row.transtm)}</span>;
    case 'effectiveEnd':
      return <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.textMuted }}>{row.effectiveEnd || '12/31/2046 12:00 AM'}</span>;
    case 'opername':
      return <span style={{ fontFamily: theme.fonts.body }}>{row.opername || row.oper || '—'}</span>;
    case 'description':
      return <span style={{ fontFamily: theme.fonts.body, fontSize: 11, color: theme.colors.textMuted }} title={row.description}>{row.description || '—'}</span>;
    default:
      return <span>{row[colKey] || '—'}</span>;
  }
}

/**
 * Reusable sortable changes table with expandable rows.
 */
export default function ChangesTable({
  data, columns, sortCol, sortDir, onSort,
  expandedRow, onToggleExpand,
}) {
  const { theme } = useTheme();

  const thStyle = (col) => ({
    padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: sortCol === col.key ? theme.colors.accent : theme.colors.textMuted,
    cursor: 'pointer', userSelect: 'none', borderBottom: `2px solid ${sortCol === col.key ? theme.colors.accent : theme.colors.border}`,
    width: col.width, whiteSpace: 'nowrap', background: theme.colors.bgHeader, position: 'sticky', top: 0, zIndex: 2,
  });

  const tdBase = {
    padding: '10px 12px', fontSize: 12, color: theme.colors.text,
    borderBottom: `1px solid ${theme.colors.border}`, whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280,
  };

  const minWidth = columns.reduce((sum, col) => sum + (col.width || 100), 0);

  return (
    <div style={{ background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.lg, overflow: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={thStyle(col)} onClick={() => onSort(col.key)}>
                {col.label} {sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const rowKey = `${row.pono}-${row.field_name}-${row.transdt}-${row.transtm}-${i}`;
            const isExpanded = expandedRow === rowKey;
            return (
              <React.Fragment key={rowKey}>
                <tr onClick={() => onToggleExpand(rowKey)}
                  style={{
                    cursor: 'pointer', transition: 'background 0.15s',
                    background: isExpanded ? theme.colors.accentGlow : i % 2 === 0 ? 'transparent' : (theme.id === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)'),
                  }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = theme.colors.accentGlow; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : (theme.id === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)'); }}>
                  {columns.map(col => (
                    <td key={col.key} style={tdBase}>
                      <CellValue row={row} colKey={col.key} theme={theme} />
                    </td>
                  ))}
                </tr>
                {isExpanded && <ExpandedRow row={row} colSpan={columns.length} columns={columns} />}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: theme.colors.textMuted }}>
          No changes found. Enter a record number or date range and click Search.
        </div>
      )}
    </div>
  );
}
