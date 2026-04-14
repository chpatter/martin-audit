import { useState, useMemo, useCallback } from 'react';
import { searchChanges, cancelSearch } from '../services/api';
import { FILTER_DEFS } from '../components/ResultFilters';

/**
 * Shared hook for audit change search pages.
 * Handles: search with record# parsing, column filters, text filter, sorting, CSV export.
 *
 * @param {object} options
 * @param {Array} options.defaultTables - Default tables when no source selected
 * @param {Array} options.filterKeys - Which column filters to enable
 * @param {Array} options.csvHeaders - Column headers for CSV export
 * @param {function} options.csvRowMapper - Maps a change record to a CSV row array
 * @param {string} options.exportFilename - Base filename for CSV export
 */
export default function useChangeSearch({
  defaultTables = ['poeh', 'poel'],
  filterKeys = ['source', 'record', 'whse', 'field', 'transproc', 'oper'],
  csvHeaders = [],
  csvRowMapper = null,
  exportFilename = 'changes',
} = {}) {
  const [changes, setChanges] = useState([]);
  const [filters, setFilters] = useState({ fromDate: '', toDate: '', pono: '', whse: '', source: '', custno: '', prod: '', limit: '', includeNew: true });
  const [sortCol, setSortCol] = useState('transdt');
  const [sortDir, setSortDir] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryInfo, setQueryInfo] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [resultFilter, setResultFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [columnFiltersOpen, setColumnFiltersOpen] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setExpandedRow(null);
    setResultFilter('');
    setColumnFilters({});
    try {
      const searchFilters = {};

      // Parse record# — supports comma-separated and suffix format
      // e.g. "5167702" or "5156656-2" or "5167702, 5184325, 5156656-2"
      if (filters.pono) {
        const values = filters.pono.split(',').map(v => v.trim()).filter(Boolean);
        if (values.length === 1) {
          // Single value — may have suffix
          if (values[0].includes('-')) {
            const [po, suf] = values[0].split('-');
            searchFilters.pono = po;
            searchFilters.posuf = suf;
          } else {
            searchFilters.pono = values[0];
          }
        } else {
          // Multiple values — parse each, send as array
          searchFilters.ponos = values.map(v => {
            if (v.includes('-')) {
              const [po, suf] = v.split('-');
              return { pono: po, posuf: suf };
            }
            return { pono: v };
          });
        }
      }

      // Parse warehouse — supports comma-separated
      if (filters.whse) {
        const whses = filters.whse.split(',').map(v => v.trim()).filter(Boolean);
        if (whses.length === 1) {
          searchFilters.whse = whses[0];
        } else {
          searchFilters.whses = whses;
        }
      }

      if (filters.fromDate) searchFilters.fromDate = filters.fromDate;
      if (filters.toDate) searchFilters.toDate = filters.toDate;
      if (filters.source) searchFilters.source = filters.source;
      if (!filters.source) searchFilters.tables = defaultTables;
      if (filters.custno) searchFilters.custno = filters.custno.trim();
      if (filters.prod) searchFilters.prod = filters.prod.trim();
      if (filters.limit) searchFilters.limit = parseInt(filters.limit, 10);
      searchFilters.includeNew = filters.includeNew;

      // Default to last 7 days if no specific search criteria entered and no limit set
      if (!searchFilters.pono && !searchFilters.ponos && !searchFilters.fromDate && !searchFilters.custno && !searchFilters.prod && !searchFilters.limit) {
        searchFilters.fromDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      }

      const result = await searchChanges(searchFilters);
      setChanges(result.changes || []);
      setQueryInfo({ count: result.count, timestamp: new Date().toLocaleTimeString() });
    } catch (err) {
      setError(err.message);
      setChanges([]);
    }
    setLoading(false);
  }

  function handleClear() {
    setFilters({ fromDate: '', toDate: '', pono: '', whse: '', source: '', custno: '', prod: '', limit: '', includeNew: true });
    setChanges([]);
    setError(null);
    setQueryInfo(null);
    setExpandedRow(null);
    setResultFilter('');
    setColumnFilters({});
  }

  async function handleCancel() {
    try {
      await cancelSearch();
      setLoading(false);
      setError('Search cancelled');
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function handleColumnFilterChange(key, newSet) {
    setColumnFilters(prev => ({ ...prev, [key]: newSet }));
  }

  // Apply column filters first, then text filter
  const filteredChanges = useMemo(() => {
    let result = changes;

    // Column filters (multi-select dropdowns)
    for (const key of filterKeys) {
      const selected = columnFilters[key];
      if (!selected || selected.size === 0) continue;
      const def = FILTER_DEFS[key];
      if (!def) continue;
      result = result.filter(row => def.match(row, selected));
    }

    // Text filter
    if (resultFilter.trim()) {
      const q = resultFilter.toLowerCase();
      result = result.filter(row =>
        [row.source, `${row.pono}-${row.posuf}`, row.vendname, row.custname, row.whse, row.field_label,
         row.field_name, row.transproc, row.new_value, row.old_value, row.opername,
         row.oper, row.description, row.functionName, row.ourproc, row.key1, row.prod]
          .some(v => String(v || '').toLowerCase().includes(q))
      );
    }

    return result;
  }, [changes, columnFilters, filterKeys, resultFilter]);

  // Sort filtered results
  const sortedChanges = useMemo(() => {
    return [...filteredChanges].sort((a, b) => {
      let va, vb;

      if (sortCol === 'transdt' || sortCol === 'effectiveEnd') {
        va = `${a.transdt || '0000-00-00'}${String(a.transtm || '0000').padStart(4, '0')}`;
        vb = `${b.transdt || '0000-00-00'}${String(b.transtm || '0000').padStart(4, '0')}`;
      } else if (sortCol === 'pono') {
        const na = Number(a.pono), nb = Number(b.pono);
        if (!isNaN(na) && !isNaN(nb)) { va = na; vb = nb; }
        else { va = String(a.pono || '').toLowerCase(); vb = String(b.pono || '').toLowerCase(); }
        if (va === vb) { va = Number(a.posuf) || 0; vb = Number(b.posuf) || 0; }
      } else if (sortCol === 'lineno') {
        va = Number(a.lineno) || 0;
        vb = Number(b.lineno) || 0;
      } else if (sortCol === 'new_value' || sortCol === 'old_value') {
        const na = parseFloat(a[sortCol]);
        const nb = parseFloat(b[sortCol]);
        if (!isNaN(na) && !isNaN(nb)) { va = na; vb = nb; }
        else { va = String(a[sortCol] || '').toLowerCase(); vb = String(b[sortCol] || '').toLowerCase(); }
      } else {
        va = String(a[sortCol] || '').toLowerCase();
        vb = String(b[sortCol] || '').toLowerCase();
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredChanges, sortCol, sortDir]);

  // CSV export — exports whatever is currently visible
  const handleExportCSV = useCallback(() => {
    if (sortedChanges.length === 0 || !csvRowMapper) return;

    const rows = sortedChanges.map(csvRowMapper);
    const csvContent = [csvHeaders, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedChanges, csvHeaders, csvRowMapper, exportFilename]);

  return {
    changes,
    filters, setFilters,
    sortCol, sortDir,
    loading, error,
    queryInfo,
    expandedRow, setExpandedRow,
    resultFilter, setResultFilter,
    columnFilters, columnFiltersOpen, setColumnFiltersOpen,
    handleColumnFilterChange,
    sortedChanges,
    handleSearch,
    handleClear,
    handleCancel,
    handleSort,
    handleExportCSV,
  };
}
