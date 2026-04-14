import React from 'react';
import { useTheme } from '../config/ThemeContext';
import useChangeSearch from '../hooks/useChangeSearch';
import StatsBar from '../components/StatsBar';
import FilterBar from '../components/FilterBar';
import ResultFilters from '../components/ResultFilters';
import ChangesTable from '../components/ChangesTable';
import { formatDateTime } from '../utils/format';

// ─── Purchases module config ───

const SOURCE_TABLES = [
  { key: 'POEH', color: '#60a5fa' },
  { key: 'POEL', color: '#fbbf24' },
];

const SOURCE_OPTIONS = [
  { value: 'poeh', label: 'POEH (Header)' },
  { value: 'poel', label: 'POEL (Lines)' },
];

const FILTER_KEYS = ['source', 'record', 'lineno', 'vendname', 'whse', 'field', 'transproc', 'new_value', 'old_value', 'transdt', 'effectiveEnd', 'oper', 'description'];

const FILTER_LABELS = {
  source: 'Data Source',
  record: 'Full PO',
  lineno: 'Line #',
  vendname: 'Vendor Name & Number',
  whse: 'Whse',
  field: 'Purchase Order Changes',
  transproc: 'Transaction Process',
  new_value: 'Purchase Order New Value',
  old_value: 'Purchase Order Original Value',
  transdt: 'Effective Start DateTime',
  effectiveEnd: 'Effective End DateTime',
  oper: 'User and OperID',
  description: 'Description',
};

const COLUMNS = [
  { key: 'source', label: 'Data Source', width: 70 },
  { key: 'pono', label: 'Full PO', width: 90 },
  { key: 'lineno', label: 'lineno', width: 50 },
  { key: 'vendname', label: 'Vendor Name & Number', width: 210 },
  { key: 'whse', label: 'whse', width: 50 },
  { key: 'field_label', label: 'Purchase Order Changes', width: 220 },
  { key: 'transproc', label: 'Transaction Process', width: 120 },
  { key: 'new_value', label: 'Purchase Order New Value', width: 190 },
  { key: 'old_value', label: 'Purchase Order Original Value', width: 190 },
  { key: 'transdt', label: 'Effective Start DateTime', width: 175 },
  { key: 'effectiveEnd', label: 'Effective End DateTime', width: 165 },
  { key: 'opername', label: 'User and OperID', width: 180 },
  { key: 'description', label: 'description', width: 280 },
];

const CSV_HEADERS = [
  'Data Source', 'Full PO', 'lineno', 'Vendor Name & Number', 'whse',
  'Purchase Order Changes', 'Transaction Process', 'Purchase Order New Value',
  'Purchase Order Original Value', 'Effective Start DateTime', 'Effective End DateTime',
  'User and OperID', 'description',
];

function csvRowMapper(row) {
  return [
    row.source, `${row.pono}-${row.posuf}`, row.lineno || 0, row.vendname || '', row.whse || '',
    `${row.field_label} - (${row.field_name})`, row.transproc || '', row.new_value || '', row.old_value || '',
    formatDateTime(row.transdt, row.transtm), row.effectiveEnd || '12/31/2046 12:00 AM',
    row.opername || row.oper || '', row.description || '',
  ];
}

// ─── Page Component ───

export default function PurchasesPage() {
  const { theme } = useTheme();
  const {
    changes, filters, setFilters, sortCol, sortDir, loading, error, queryInfo,
    expandedRow, setExpandedRow, resultFilter, setResultFilter,
    columnFilters, columnFiltersOpen, setColumnFiltersOpen, handleColumnFilterChange,
    sortedChanges, handleSearch, handleClear, handleCancel, handleSort, handleExportCSV,
  } = useChangeSearch({
    defaultTables: ['poeh', 'poel'],
    filterKeys: FILTER_KEYS, csvHeaders: CSV_HEADERS, csvRowMapper, exportFilename: 'purchase-order-changes',
  });

  return (
    <>
      <StatsBar changes={changes} sourceTables={SOURCE_TABLES} />

      <FilterBar
        filters={filters} setFilters={setFilters} loading={loading}
        onSearch={handleSearch} onClear={handleClear} onCancel={handleCancel} onExport={handleExportCSV} hasData={changes.length > 0}
        recordLabel="PO #" recordPlaceholder="5167702, 5184325-2" sourceOptions={SOURCE_OPTIONS}
        showWarehouse
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
            {(resultFilter || Object.values(columnFilters).some(s => s.size > 0)) && ` of ${changes.length}`} changes
            {loading && ' — querying Data Lake...'}
          </span>
          {changes.length > 0 && (
            <input placeholder="Filter results... (e.g. stagecd, 9, cancelled)" value={resultFilter}
              onChange={e => setResultFilter(e.target.value)}
              style={{ padding: '6px 12px', background: theme.colors.bgInput, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md, color: theme.colors.text, fontSize: 12, outline: 'none', width: 300, fontFamily: theme.fonts.mono }} />
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
