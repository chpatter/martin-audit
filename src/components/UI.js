import React from 'react';
import { useTheme } from '../config/ThemeContext';

// ─── Glow Dot (status indicator) ───
export function GlowDot({ color, size = 8 }) {
  const { theme } = useTheme();
  const c = color || theme.colors.accent;
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: c,
        boxShadow: `0 0 ${size}px ${c}`,
      }}
    />
  );
}

// ─── Badge ───
export function Badge({ children, variant = 'default' }) {
  const { theme } = useTheme();
  const variants = {
    default: { bg: theme.colors.bgCard, color: theme.colors.textMuted, border: theme.colors.border },
    success: { bg: theme.colors.successBg, color: theme.colors.success, border: theme.colors.successBorder },
    warning: { bg: theme.colors.warningBg, color: theme.colors.warning, border: theme.colors.warningBorder },
    danger: { bg: theme.colors.dangerBg, color: theme.colors.danger, border: theme.colors.dangerBorder },
    info: { bg: theme.colors.infoBg, color: theme.colors.info, border: theme.colors.infoBorder },
  };
  const v = variants[variant] || variants.default;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: theme.radii.sm,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

// ─── Stage Badge (PO-specific) ───
const stageVariantMap = {
  Printed: 'info',
  Received: 'success',
  Ordered: 'warning',
  Cancelled: 'danger',
  Costed: 'success',
  Entered: 'default',
};

export function StageBadge({ stage }) {
  return <Badge variant={stageVariantMap[stage] || 'default'}>{stage}</Badge>;
}

// ─── Input ───
export function Input({ label, helper, style, ...props }) {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: 6,
            color: theme.colors.textMuted,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: '10px 14px',
          background: theme.colors.bgInput,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md,
          color: theme.colors.text,
          fontSize: 13,
          fontFamily: theme.fonts.mono,
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        {...props}
      />
      {helper && (
        <span
          style={{
            fontSize: 11,
            color: theme.colors.textMuted,
            marginTop: 4,
            display: 'block',
          }}
        >
          {helper}
        </span>
      )}
    </div>
  );
}

// ─── Section Card ───
export function SectionCard({ title, children, style }) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        background: theme.colors.bgCard,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radii.lg,
        padding: 24,
        marginBottom: 20,
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            color: theme.colors.accent,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          ● {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ─── Info Box ───
export function InfoBox({ children, variant = 'info' }) {
  const { theme } = useTheme();
  const styles = {
    info: { bg: theme.colors.infoBg, border: theme.colors.infoBorder, color: theme.colors.info },
    warning: { bg: theme.colors.warningBg, border: theme.colors.warningBorder, color: theme.colors.warning },
    success: { bg: theme.colors.successBg, border: theme.colors.successBorder, color: theme.colors.success },
    error: { bg: theme.colors.dangerBg, border: theme.colors.dangerBorder, color: theme.colors.danger },
  };
  const s = styles[variant] || styles.info;
  return (
    <div
      style={{
        padding: 16,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: theme.radii.lg,
        fontSize: 12,
        color: s.color,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}
