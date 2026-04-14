import React from 'react';
import { useTheme } from '../config/ThemeContext';
import MODULES from '../config/modules';

export default function Sidebar({ activeModule, onModuleChange, collapsed, onToggle, connectionInfo, onSignOut }) {
  const { theme, isDark, toggleTheme } = useTheme();

  // Sidebar always uses dark colors regardless of theme
  const sidebarColors = {
    bg: '#141414',
    border: '#2a2a2a',
    text: '#e2e8f0',
    textMuted: '#888888',
    accentGlow: 'rgba(192, 0, 0, 0.12)',
  };

  return (
    <div
      style={{
        width: collapsed ? 56 : 220,
        background: sidebarColors.bg,
        borderRight: `1px solid ${sidebarColors.border}`,
        transition: 'width 0.2s',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? '16px 0' : '20px 16px',
          borderBottom: `1px solid ${sidebarColors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        <img src="/triangle.svg" alt="Martin" style={{ width: 32, height: 32, flexShrink: 0 }} />
        {!collapsed && (
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: theme.colors.accent,
                letterSpacing: '-0.01em',
                fontFamily: theme.fonts.body,
                lineHeight: 1,
              }}
            >
              MARTIN AUDIT
            </div>
            <div
              style={{
                fontSize: 9,
                color: sidebarColors.textMuted,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              CloudSuite Dist.
            </div>
          </div>
        )}
      </div>

      {/* Dashboard link */}
      <button
        onClick={() => onModuleChange('dashboard')}
        title={collapsed ? 'Dashboard' : ''}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          border: 'none',
          background: activeModule === 'dashboard' ? sidebarColors.accentGlow : 'transparent',
          color: activeModule === 'dashboard' ? theme.colors.accent : sidebarColors.text,
          cursor: 'pointer',
          fontSize: 13,
          textAlign: 'left',
          borderLeft: activeModule === 'dashboard'
            ? `3px solid ${theme.colors.accent}`
            : '3px solid transparent',
          borderBottom: `1px solid ${sidebarColors.border}`,
          transition: 'all 0.15s',
          fontFamily: theme.fonts.body,
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>📊</span>
        {!collapsed && <span>Dashboard</span>}
      </button>

      {/* Module List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {MODULES.map((m) => (
          <button
            key={m.id}
            onClick={() => m.active && onModuleChange(m.id)}
            title={collapsed ? m.label : m.description}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              border: 'none',
              background: activeModule === m.id ? sidebarColors.accentGlow : 'transparent',
              color: !m.active
                ? sidebarColors.textMuted
                : activeModule === m.id
                ? theme.colors.accent
                : sidebarColors.text,
              cursor: m.active ? 'pointer' : 'not-allowed',
              fontSize: 13,
              textAlign: 'left',
              borderLeft:
                activeModule === m.id
                  ? `3px solid ${theme.colors.accent}`
                  : '3px solid transparent',
              transition: 'all 0.15s',
              opacity: m.active ? 1 : 0.4,
              fontFamily: theme.fonts.body,
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
            {!collapsed && <span>{m.label}</span>}
            {!collapsed && !m.active && (
              <span style={{ marginLeft: 'auto', fontSize: 9, color: sidebarColors.textMuted }}>
                SOON
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: collapsed ? '8px 0' : 16, borderTop: `1px solid ${sidebarColors.border}`, display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch' }}>
        {collapsed ? (
          <button
            onClick={toggleTheme}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
            style={{
              width: 36, height: 36, background: 'transparent',
              border: `1px solid ${sidebarColors.border}`, borderRadius: theme.radii.sm,
              color: sidebarColors.textMuted, fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isDark ? '☀' : '🌙'}
          </button>
        ) : (
          <>
            <button
              onClick={toggleTheme}
              style={{
                width: '100%', padding: '8px 12px', marginBottom: 8,
                background: 'transparent', border: `1px solid ${sidebarColors.border}`,
                borderRadius: theme.radii.sm, color: sidebarColors.textMuted,
                fontSize: 11, cursor: 'pointer', fontFamily: theme.fonts.body,
              }}
            >
              {isDark ? '☀ LIGHT MODE' : '🌙 DARK MODE'}
            </button>
            <div
              style={{
                marginTop: 4, fontSize: 9, color: sidebarColors.textMuted,
                textAlign: 'center', letterSpacing: '0.1em',
              }}
            >
              {connectionInfo?.operator || 'CONNECTED'} · v2.0.0
            </div>
          </>
        )}
      </div>
    </div>
  );
}
