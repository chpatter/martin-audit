import React from 'react';
import { useTheme } from '../config/ThemeContext';
import useChangeSearch from '../hooks/useChangeSearch';
import StatsBar from '../components/StatsBar';
import FilterBar from '../components/FilterBar';
import ResultFilters from '../components/ResultFilters';
import ChangesTable from '../components/ChangesTable';
import { formatDateTime } from '../utils/format';

// ─── Security module config ───

const SOURCE_TABLES = [
  { key: 'SASOO', color: '#60a5fa' },
  { key: 'PV_USER', color: '#fbbf24' },
  { key: 'PV_SECURE', color: '#34d399' },
  { key: 'AUTHSECURE', color: '#f87171' },
];

const SOURCE_OPTIONS = [
  { value: 'sasoo', label: 'SASOO (Operator Setup)' },
  { value: 'pv_user', label: 'PV_USER (User Profile)' },
  { value: 'pv_secure', label: 'PV_SECURE (Function Security)' },
  { value: 'authsecure', label: 'AUTHSECURE (Auth Security)' },
];

const FILTER_KEYS = ['source', 'field', 'transproc', 'record', 'functionName', 'new_value', 'old_value', 'oper', 'transdt', 'effectiveEnd', 'description'];

const FILTER_LABELS = {
  source: 'User Security Source',
  field: 'User Security Changes',
  transproc: 'Transaction Process',
  record: 'User',
  functionName: 'FunctionName',
  new_value: 'User Security New Value',
  old_value: 'User Security Original Value',
  oper: 'Changed By',
  transdt: 'Effective Start DateTime',
  effectiveEnd: 'Effective End DateTime',
  description: 'description',
};

const COLUMNS = [
  { key: 'source', label: 'User Security Source', width: 110 },
  { key: 'field_label', label: 'User Security Changes', width: 280 },
  { key: 'transproc', label: 'Transaction Process', width: 150 },
  { key: 'pono', label: 'User', width: 180 },
  { key: 'functionName', label: 'FunctionName', width: 120 },
  { key: 'new_value', label: 'User Security New Value', width: 190 },
  { key: 'old_value', label: 'User Security Original Value', width: 190 },
  { key: 'opername', label: 'Changed By', width: 180 },
  { key: 'transdt', label: 'Effective Start DateTime', width: 175 },
  { key: 'effectiveEnd', label: 'Effective End DateTime', width: 165 },
  { key: 'description', label: 'description', width: 280 },
];

const CSV_HEADERS = [
  'User Security Source', 'User Security Changes', 'Transaction Process',
  'User', 'FunctionName',
  'User Security New Value', 'User Security Original Value',
  'Changed By', 'Effective Start DateTime', 'Effective End DateTime', 'description',
];

function csvRowMapper(row) {
  return [
    row.source, `${row.field_label} - (${row.field_name})`, row.transproc || '',
    row.pono || '', row.functionName || '',
    row.new_value || '', row.old_value || '',
    row.opername || row.oper || '',
    formatDateTime(row.transdt, row.transtm), row.effectiveEnd || '12/31/2046 12:00 AM',
    row.description || '',
  ];
}

// ─── Page Component ───

export default function SecurityPage() {
  const { theme } = useTheme();
  const {
    changes, filters, setFilters, sortCol, sortDir, loading, error, queryInfo,
    expandedRow, setExpandedRow, resultFilter, setResultFilter,
    columnFilters, columnFiltersOpen, setColumnFiltersOpen, handleColumnFilterChange,
    sortedChanges, handleSearch, handleClear, handleCancel, handleSort, handleExportCSV,
  } = useChangeSearch({
    defaultTables: ['sasoo', 'pv_user', 'pv_secure', 'authsecure'],
    filterKeys: FILTER_KEYS, csvHeaders: CSV_HEADERS, csvRowMapper, exportFilename: 'security-changes',
  });

  return (
    <>
      <StatsBar changes={changes} sourceTables={SOURCE_TABLES} />

      <FilterBar
        filters={filters} setFilters={setFilters} loading={loading}
        onSearch={handleSearch} onClear={handleClear} onCancel={handleCancel} onExport={handleExportCSV} hasData={changes.length > 0}
        recordLabel="Operator" recordPlaceholder="JK01, CB01" sourceOptions={SOURCE_OPTIONS}
      />

      {error && (
        <div style={{ padding: '12px 16px', background: theme.colors.dangerBg, border: `1px solid ${theme.colors.dangerBorder}`, borderRadius: theme.radii.md, color: '#f87171', fontSize: 12, marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
            Showing <strong style={{ color: theme.colors.text }}>{sortedChanges.length}</strong>
            {sortedChanges.length !== changes.length && ` of ${changes.length}`} changes
            {loading && ' — querying Data Lake...'}
          </span>
          {changes.length > 0 && (
            <input placeholder="Filter results... (e.g. notesfl, superfl, whse)" value={resultFilter}
              onChange={e => setResultFilter(e.target.value)}
              style={{ padding: '6px 12px', background: theme.colors.bgInput, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md, color: theme.colors.text, fontSize: 12, outline: 'none', width: 340, fontFamily: theme.fonts.mono }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: theme.colors.textMuted }}>Click any row to expand</span>
          {queryInfo && <span style={{ fontSize: 11, color: theme.colors.textMuted }}>Last query: {queryInfo.timestamp} ({queryInfo.count} results)</span>}
        </div>
      </div>

      {changes.length > 0 && (
        <ResultFilters changes={changes} columnFilters={columnFilters} onColumnFilterChange={handleColumnFilterChange}
          filterKeys={FILTER_KEYS} filterLabels={FILTER_LABELS} open={columnFiltersOpen} onToggle={() => setColumnFiltersOpen(!columnFiltersOpen)} />
      )}

      <ChangesTable data={sortedChanges} columns={COLUMNS} sortCol={sortCol} sortDir={sortDir} onSort={handleSort}
        expandedRow={expandedRow} onToggleExpand={key => setExpandedRow(expandedRow === key ? null : key)} />
    </>
  );
}
