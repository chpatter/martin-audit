import React from 'react';
import { useTheme } from '../config/ThemeContext';
import MultiSelect from './MultiSelect';

/**
 * Extract unique values with counts from an array of change records.
 * Returns sorted array of { value, label, count }.
 */
function extractOptions(changes, valueExtractor, labelExtractor) {
  const counts = {};
  const labels = {};
  for (const row of changes) {
    const val = valueExtractor(row);
    if (val === undefined || val === null || val === '') continue;
    const key = String(val);
    counts[key] = (counts[key] || 0) + 1;
    if (!labels[key]) labels[key] = labelExtractor ? labelExtractor(row) : key;
  }
  return Object.entries(counts)
    .map(([value, count]) => ({ value, label: labels[value], count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Standard filter definitions used across modules.
 * Each module's page can pass a subset of these via filterKeys.
 */
const FILTER_DEFS = {
  source: {
    label: 'Data Source',
    extract: (changes) => extractOptions(changes, r => r.source, r => r.source),
    match: (row, selected) => selected.has(row.source),
  },
  record: {
    label: 'Full Record',
    extract: (changes) => extractOptions(changes, r => `${r.pono}-${r.posuf}`, r => `${r.pono}-${r.posuf}`),
    match: (row, selected) => selected.has(`${row.pono}-${row.posuf}`),
  },
  lineno: {
    label: 'Line #',
    extract: (changes) => extractOptions(changes, r => String(r.lineno || 0)),
    match: (row, selected) => selected.has(String(row.lineno || 0)),
  },
  vendname: {
    label: 'Vendor',
    extract: (changes) => extractOptions(changes, r => r.vendname),
    match: (row, selected) => selected.has(String(row.vendname || '')),
  },
  custname: {
    label: 'Customer',
    extract: (changes) => extractOptions(changes, r => r.custname),
    match: (row, selected) => selected.has(String(row.custname || '')),
  },
  whse: {
    label: 'Warehouse',
    extract: (changes) => extractOptions(changes, r => r.whse),
    match: (row, selected) => selected.has(String(row.whse || '')),
  },
  field: {
    label: 'Changes',
    extract: (changes) => extractOptions(changes, r => r.field_name, r => `${r.field_label} (${r.field_name})`),
    match: (row, selected) => selected.has(row.field_name),
  },
  transproc: {
    label: 'Transaction Process',
    extract: (changes) => extractOptions(changes, r => r.transproc),
    match: (row, selected) => selected.has(String(row.transproc || '')),
  },
  new_value: {
    label: 'New Value',
    extract: (changes) => extractOptions(changes, r => r.new_value),
    match: (row, selected) => selected.has(String(row.new_value || '')),
  },
  old_value: {
    label: 'Original Value',
    extract: (changes) => extractOptions(changes, r => r.old_value),
    match: (row, selected) => selected.has(String(row.old_value || '')),
  },
  transdt: {
    label: 'Effective Start',
    extract: (changes) => extractOptions(changes, r => r.transdt),
    match: (row, selected) => selected.has(String(row.transdt || '')),
  },
  effectiveEnd: {
    label: 'Effective End',
    extract: (changes) => extractOptions(changes, r => r.effectiveEnd || '12/31/2046 12:00 AM'),
    match: (row, selected) => selected.has(String(row.effectiveEnd || '12/31/2046 12:00 AM')),
  },
  oper: {
    label: 'User',
    extract: (changes) => extractOptions(changes, r => r.oper, r => r.opername || r.oper),
    match: (row, selected) => selected.has(String(row.oper || '')),
  },
  description: {
    label: 'Description',
    extract: (changes) => extractOptions(changes, r => r.description),
    match: (row, selected) => selected.has(String(row.description || '')),
  },
  prod: {
    label: 'Product',
    extract: (changes) => extractOptions(changes, r => r.prod),
    match: (row, selected) => selected.has(String(row.prod || '')),
  },
  levelcd: {
    label: 'Price Level',
    extract: (changes) => extractOptions(changes, r => r.levelcd),
    match: (row, selected) => selected.has(String(row.levelcd || '')),
  },
  startdt: {
    label: 'Start Date',
    extract: (changes) => extractOptions(changes, r => r.startdt),
    match: (row, selected) => selected.has(String(row.startdt || '')),
  },
  enddt: {
    label: 'End Date',
    extract: (changes) => extractOptions(changes, r => r.enddt),
    match: (row, selected) => selected.has(String(row.enddt || '')),
  },
  functionName: {
    label: 'Function',
    extract: (changes) => extractOptions(changes, r => r.functionName),
    match: (row, selected) => selected.has(String(row.functionName || '')),
  },
};

/**
 * Collapsible panel with multi-select filter dropdowns.
 * All filtering is client-side on already-loaded data.
 *
 * @param {Array} changes - All loaded change records (unfiltered)
 * @param {object} columnFilters - { filterKey: Set of selected values }
 * @param {function} onColumnFilterChange - (filterKey, newSet) => void
 * @param {Array} filterKeys - Which filters to show (e.g. ['source', 'record', 'whse', 'field', 'transproc', 'oper'])
 * @param {boolean} open - Whether the panel is expanded
 * @param {function} onToggle - Toggle open/closed
 */
export default function ResultFilters({ changes, columnFilters, onColumnFilterChange, filterKeys, filterLabels = {}, open, onToggle }) {
  const { theme } = useTheme();
  const activeFilterCount = filterKeys.reduce((sum, key) => sum + (columnFilters[key]?.size || 0), 0);

  return (
    <div style={{ marginBottom: open ? 12 : 0 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: 'transparent', border: `1px solid ${activeFilterCount > 0 ? theme.colors.accent : theme.colors.border}`,
          borderRadius: theme.radii.md, color: activeFilterCount > 0 ? theme.colors.accent : theme.colors.textMuted,
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: theme.fonts.body,
          marginBottom: open ? 8 : 0,
        }}
      >
        <span>{open ? '▼' : '▶'}</span>
        <span>Column Filters{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}</span>
        {activeFilterCount > 0 && (
          <span
            onClick={e => {
              e.stopPropagation();
              filterKeys.forEach(key => onColumnFilterChange(key, new Set()));
            }}
            style={{ color: theme.colors.textMuted, fontSize: 10, marginLeft: 4, cursor: 'pointer' }}
          >
            — clear all
          </span>
        )}
      </button>

      {open && (
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 16px',
          background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md,
        }}>
          {filterKeys.map(key => {
            const def = FILTER_DEFS[key];
            if (!def) return null;
            const options = def.extract(changes);
            if (options.length <= 1) return null;
            return (
              <MultiSelect
                key={key}
                label={filterLabels[key] || def.label}
                options={options}
                selected={columnFilters[key] || new Set()}
                onChange={newSet => onColumnFilterChange(key, newSet)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export for use by the hook
export { FILTER_DEFS };
