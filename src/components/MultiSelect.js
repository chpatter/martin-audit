import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../config/ThemeContext';

/**
 * Multi-select dropdown with checkboxes.
 * @param {string} label - Display label
 * @param {Array} options - Array of { value, label, count } objects
 * @param {Set} selected - Set of currently selected values
 * @param {function} onChange - Called with updated Set
 */
export default function MultiSelect({ label, options, selected, onChange }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const activeCount = selected.size;
  const allSelected = activeCount === options.length;

  function toggleValue(val) {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onChange(next);
  }

  function toggleAll() {
    if (allSelected) onChange(new Set());
    else onChange(new Set(options.map(o => o.value)));
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 160 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, background: theme.colors.bgInput, border: `1px solid ${activeCount > 0 ? theme.colors.accent : theme.colors.border}`,
          borderRadius: theme.radii.md, color: activeCount > 0 ? theme.colors.accent : theme.colors.textMuted,
          fontSize: 11, cursor: 'pointer', fontFamily: theme.fonts.body, textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeCount === 0 ? label : `${label} (${activeCount})`}
        </span>
        <span style={{ fontSize: 9, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4,
          minWidth: '100%', maxWidth: 320, maxHeight: 280, overflowY: 'auto',
          background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {/* Select All / Clear */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '6px 10px',
            borderBottom: `1px solid ${theme.colors.border}`, fontSize: 10,
          }}>
            <button onClick={toggleAll} style={{
              background: 'none', border: 'none', color: theme.colors.accent,
              cursor: 'pointer', fontSize: 10, padding: 0, fontFamily: theme.fonts.body,
            }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            {activeCount > 0 && (
              <button onClick={clearAll} style={{
                background: 'none', border: 'none', color: theme.colors.textMuted,
                cursor: 'pointer', fontSize: 10, padding: 0, fontFamily: theme.fonts.body,
              }}>
                Clear
              </button>
            )}
          </div>

          {/* Options */}
          {options.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                cursor: 'pointer', fontSize: 11, color: theme.colors.text,
                background: selected.has(opt.value) ? theme.colors.accentGlow : 'transparent',
              }}
              onMouseEnter={e => { if (!selected.has(opt.value)) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (!selected.has(opt.value)) e.currentTarget.style.background = 'transparent'; }}
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => toggleValue(opt.value)}
                style={{ margin: 0, accentColor: theme.colors.accent }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: theme.fonts.mono, fontSize: 11 }}>
                {opt.label}
              </span>
              <span style={{ fontSize: 10, color: theme.colors.textMuted, flexShrink: 0 }}>
                {opt.count}
              </span>
            </label>
          ))}

          {options.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 11, color: theme.colors.textMuted, textAlign: 'center' }}>
              No data loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
