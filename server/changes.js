/**
 * Change Detection Module
 *
 * Takes raw allvariations() rows from the Data Lake and produces
 * a field-level change log. Field definitions and key field mappings
 * come from tracked-fields.js.
 */

const { getTrackedFields, getTableConfig } = require('./tracked-fields');

/**
 * Clean a value for display — strip trailing zeros from decimals, trim whitespace.
 */
function cleanValue(val) {
  if (val === null || val === undefined || val === '') return '';
  let s = String(val).trim();
  if (s.match(/^\d+\.\d+$/) && s.includes('000')) {
    s = parseFloat(s).toString();
  }
  return s;
}

/**
 * Compare two consecutive variation rows and produce change records.
 * Uses table config to determine which fields hold the record number/suffix.
 */
function compareRows(source, table, prev, curr, trackedFields, lineno = 0) {
  const changes = [];
  const cfg = getTableConfig(table);

  // Read record number from the correct field
  const recordno = curr[cfg.recordKey];
  const recordsuf = curr[cfg.suffixKey] || 0;
  const transdt = curr.transdt || '';
  const transtm = curr.transtm || '';
  const transproc = curr.transproc || '';
  const oper = curr.operinit || '';
  const whse = curr.whse || '';
  const vendno = curr.vendno ? cleanValue(curr.vendno) : '';
  const custno = curr.custno ? cleanValue(curr.custno) : '';

  // Extra context fields for display
  const levelcd = curr.levelcd ? cleanValue(curr.levelcd) : '';
  const startdt = curr.startdt || '';
  const enddt = curr.enddt || '';
  const prod = curr.prod ? cleanValue(curr.prod) : '';
  const functionName = curr.FunctionName || '';
  const ourproc = curr.ourproc || '';
  const key1 = curr.key1 || '';

  // Handle string vs number record keys
  const pono = cfg.recordKeyType === 'string' ? String(recordno || '').trim() : Number(recordno);

  for (const [field, info] of Object.entries(trackedFields)) {
    const newVal = cleanValue(curr[field]);
    const oldVal = prev ? cleanValue(prev[field]) : '';

    if (prev === null) {
      const displayVal = (newVal === '' || newVal === '0' || newVal === 'false') ? '(is missing)' : newVal;
      // Skip fields that were created with no meaningful value
      if (displayVal === '(is missing)') continue;
      changes.push({
        source, pono,
        posuf: Number(recordsuf),
        lineno, vendno, custno, whse, levelcd, startdt, enddt, prod,
        functionName, ourproc, key1,
        field_name: field, field_label: info.label,
        old_value: 'New', new_value: displayVal, change_type: 'new',
        transdt, transtm, transproc, oper,
        description: info.desc, variationId: curr.VariationId || '',
      });
    } else if (oldVal !== newVal) {
      changes.push({
        source, pono,
        posuf: Number(recordsuf),
        lineno, vendno, custno, whse, levelcd, startdt, enddt, prod,
        functionName, ourproc, key1,
        field_name: field, field_label: info.label,
        old_value: oldVal || '(empty)', new_value: newVal || '(empty)', change_type: 'change',
        transdt, transtm, transproc, oper,
        description: info.desc, variationId: curr.VariationId || '',
      });
    }
  }

  return changes;
}

/**
 * Process allvariations() results into a change log.
 * @param {string} source - Display name like 'POEH' or 'OEEH'
 * @param {string} table - Data Lake table name like 'poeh' or 'oeeh'
 * @param {Array} variations - Rows from allvariations()
 * @param {number} lineno - Line number (0 for header tables)
 * @returns {Array} Change log entries
 */
function processVariations(source, table, variations, lineno = 0) {
  if (!variations || variations.length === 0) return [];

  const trackedFields = getTrackedFields(table);
  if (Object.keys(trackedFields).length === 0) {
    console.warn(`[CHANGES] No tracked fields defined for table: ${table}`);
    return [];
  }

  const sorted = [...variations].sort((a, b) => {
    const va = a.VariationId || '';
    const vb = b.VariationId || '';
    return va < vb ? -1 : va > vb ? 1 : 0;
  });

  const allChanges = [];
  for (let i = 0; i < sorted.length; i++) {
    const prev = i === 0 ? null : sorted[i - 1];
    const curr = sorted[i];
    allChanges.push(...compareRows(source, table, prev, curr, trackedFields, lineno));
  }

  return allChanges;
}

module.exports = { processVariations };
