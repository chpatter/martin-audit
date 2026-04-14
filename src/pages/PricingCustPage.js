import React from 'react';
import { useTheme } from '../config/ThemeContext';
import useChangeSearch from '../hooks/useChangeSearch';
import StatsBar from '../components/StatsBar';
import FilterBar from '../components/FilterBar';
import ResultFilters from '../components/ResultFilters';
import ChangesTable from '../components/ChangesTable';
import { formatDateTime } from '../utils/format';

// ─── Customer Pricing module config ───

const SOURCE_TABLES = [
  { key: 'PDSC', color: '#60a5fa' },
];

const SOURCE_OPTIONS = [
  { value: 'pdsc', label: 'PDSC (Customer Pricing)' },
];

const FILTER_KEYS = ['source', 'record', 'transproc', 'custname', 'levelcd', 'startdt', 'enddt', 'whse', 'field', 'transdt', 'effectiveEnd', 'oper', 'old_value', 'new_value', 'prod', 'description'];

const FILTER_LABELS = {
  source: 'Data Source',
  record: 'Price Disc. Record',
  transproc: 'Transaction Process',
  custname: 'Customer Name & Number',
  levelcd: 'Price Level Code',
  startdt: 'Start Date',
  enddt: 'End Date',
  whse: 'Whse',
  field: 'Pricing Changes',
  transdt: 'Effective Start DateTime',
  effectiveEnd: 'Effective End DateTime',
  oper: 'User and OperID',
  old_value: 'Price Original Value',
  new_value: 'Price New Value',
  prod: 'Product',
  description: 'description',
};

// Level code labels from SXe data dictionary (pdsc.levelcd)
const LEVEL_LABELS = {
  '1': '1-Customer/Product',
  '2': '2-Customer/(ProdTy or ProdLine or ProdCat)',
  '3': '3-Cust Ty/Product',
  '4': '4-Cust Ty/Prod Ty',
  '5': '5-Customer',
  '6': '6-Cust type',
  '7': '7-Product',
  '8': '8-Prod type',
};

const COLUMNS = [
  { key: 'source', label: 'Data Source', width: 70 },
  { key: 'pono', label: 'Price Disc. Record', width: 130 },
  { key: 'transproc', label: 'Transaction Process', width: 150 },
  { key: 'custname', label: 'Customer Name & Number', width: 220 },
  { key: 'levelcd', label: 'Price Level Code', width: 200 },
  { key: 'startdt', label: 'Start Date', width: 100 },
  { key: 'enddt', label: 'End Date', width: 100 },
  { key: 'whse', label: 'Whse', width: 60 },
  { key: 'field_label', label: 'Pricing Changes', width: 240 },
  { key: 'transdt', label: 'Effective Start DateTime', width: 175 },
  { key: 'effectiveEnd', label: 'Effective End DateTime', width: 165 },
  { key: 'opername', label: 'User and OperID', width: 180 },
  { key: 'old_value', label: 'Price Original Value', width: 190 },
  { key: 'new_value', label: 'Price New Value', width: 190 },
  { key: 'prod', label: 'Product', width: 100 },
  { key: 'description', label: 'description', width: 280 },
];

const CSV_HEADERS = [
  'Data Source', 'Price Disc. Record', 'Transaction Process',
  'Customer Name & Number', 'Price Level Code', 'Start Date', 'End Date', 'Whse',
  'Pricing Changes', 'Effective Start DateTime', 'Effective End DateTime',
  'User and OperID', 'Price Original Value', 'Price New Value', 'Product', 'description',
];

function csvRowMapper(row) {
  return [
    row.source, row.pono, row.transproc || '',
    row.custname || '', LEVEL_LABELS[row.levelcd] || row.levelcd || '',
    row.startdt || '', row.enddt || '', row.whse || '',
    `${row.field_label} - (${row.field_name})`,
    formatDateTime(row.transdt, row.transtm), row.effectiveEnd || '12/31/2046 12:00 AM',
    row.opername || row.oper || '', row.old_value || '', row.new_value || '',
    row.prod || '', row.description || '',
  ];
}

// ─── Page Component ───

export default function PricingCustPage() {
  const { theme } = useTheme();
  const {
    changes, filters, setFilters, sortCol, sortDir, loading, error, queryInfo,
    expandedRow, setExpandedRow, resultFilter, setResultFilter,
    columnFilters, columnFiltersOpen, setColumnFiltersOpen, handleColumnFilterChange,
    sortedChanges, handleSearch, handleClear, handleCancel, handleSort, handleExportCSV,
  } = useChangeSearch({
    defaultTables: ['pdsc'],
    filterKeys: FILTER_KEYS, csvHeaders: CSV_HEADERS, csvRowMapper, exportFilename: 'customer-pricing-changes',
  });

  // Map levelcd to labels for display
  const displayChanges = sortedChanges.map(row => ({
    ...row,
    levelcd: LEVEL_LABELS[row.levelcd] || row.levelcd || '',
  }));

  return (
    <>
      <StatsBar changes={changes} sourceTables={SOURCE_TABLES} />

      <FilterBar
        filters={filters} setFilters={setFilters} loading={loading}
        onSearch={handleSearch} onClear={handleClear} onCancel={handleCancel} onExport={handleExportCSV} hasData={changes.length > 0}
        recordLabel="Price Record #" recordPlaceholder="318506, 321516" sourceOptions={SOURCE_OPTIONS}
        showWarehouse showCustomer showProduct
      />

      {error && (
        <div style={{ padding: '12px 16px', background: theme.colors.dangerBg, border: `1px solid ${theme.colors.dangerBorder}`, borderRadius: theme.radii.md, color: '#f87171', fontSize: 12, marginBottom: 16 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
            Showing <strong style={{ color: theme.colors.text }}>{displayChanges.length}</strong>
            {displayChanges.length !== changes.length && ` of ${changes.length}`} changes
            {loading && ' — querying Data Lake...'}
          </span>
          {changes.length > 0 && (
            <input placeholder="Filter results... (e.g. prcmult, costmult, statustype)" value={resultFilter}
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

      <ChangesTable data={displayChanges} columns={COLUMNS} sortCol={sortCol} sortDir={sortDir} onSort={handleSort}
        expandedRow={expandedRow} onToggleExpand={key => setExpandedRow(expandedRow === key ? null : key)} />
    </>
  );
}
