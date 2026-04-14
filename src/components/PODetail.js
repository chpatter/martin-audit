import React, { useState, useEffect } from 'react';
import { useTheme } from '../config/ThemeContext';
import { Badge, StageBadge, SectionCard } from '../components/UI';

function FieldRow({ label, value, highlight, danger }) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <span style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</span>
      <span
        style={{
          color: danger ? theme.colors.danger : highlight ? theme.colors.accent : theme.colors.text,
          fontSize: 12,
          fontFamily: theme.fonts.mono,
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function TimelineEntry({ entry, isLast }) {
  const { theme } = useTheme();
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US') : '—');
  const stageColors = {
    Entered: theme.colors.textMuted,
    Ordered: theme.colors.warning,
    Printed: theme.colors.info,
    Received: theme.colors.success,
    Costed: '#4ade80',
    Cancelled: theme.colors.danger,
  };
  const dotColor = stageColors[entry.cStage] || theme.colors.textMuted;

  return (
    <div style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 20 }}>
      {/* Timeline spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              background: `linear-gradient(to bottom, ${dotColor}44, ${theme.colors.border})`,
              marginTop: 4,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <StageBadge stage={entry.cStage} />
          <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
            Suffix: {entry.posuf}
          </span>
        </div>
        <div
          style={{
            background: theme.colors.bg,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.md,
            padding: 12,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            <span style={{ color: theme.colors.textMuted }}>Order Date:</span>
            <span style={{ color: theme.colors.text, fontFamily: theme.fonts.mono }}>{formatDate(entry.orderdt)}</span>

            <span style={{ color: theme.colors.textMuted }}>Receipt Date:</span>
            <span style={{ color: theme.colors.text, fontFamily: theme.fonts.mono }}>{formatDate(entry.receiptdt)}</span>

            <span style={{ color: theme.colors.textMuted }}>Costed Date:</span>
            <span style={{ color: theme.colors.text, fontFamily: theme.fonts.mono }}>{formatDate(entry.dtCosted)}</span>

            <span style={{ color: theme.colors.textMuted }}>Qty Ordered:</span>
            <span style={{ color: theme.colors.text, fontFamily: theme.fonts.mono, fontWeight: 600 }}>
              {entry.dQtyOrdered} {entry.unit}
            </span>

            <span style={{ color: theme.colors.textMuted }}>Qty Received:</span>
            <span
              style={{
                color: entry.dQtyReceived > 0 && entry.dQtyReceived < entry.dQtyOrdered
                  ? theme.colors.danger
                  : theme.colors.text,
                fontFamily: theme.fonts.mono,
                fontWeight: 600,
              }}
            >
              {entry.dQtyReceived} {entry.unit}
            </span>

            {entry.lCorrectionTy && (
              <>
                <span style={{ color: theme.colors.danger }}>⚠ Correction:</span>
                <span style={{ color: theme.colors.danger, fontWeight: 600 }}>Yes</span>
              </>
            )}

            {entry.countryoforigin && (
              <>
                <span style={{ color: theme.colors.textMuted }}>Origin:</span>
                <span style={{ color: theme.colors.text }}>{entry.countryoforigin}</span>
              </>
            )}

            {entry.tariffcd && (
              <>
                <span style={{ color: theme.colors.textMuted }}>Tariff:</span>
                <span style={{ color: theme.colors.text, fontFamily: theme.fonts.mono }}>
                  {entry.tariffcd} ({entry.dutyrate}%)
                </span>
              </>
            )}

            {entry.userfield && (
              <>
                <span style={{ color: theme.colors.warning }}>Note:</span>
                <span style={{ color: theme.colors.warning }}>{entry.userfield}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CostActivityTable({ data }) {
  const { theme } = useTheme();
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: theme.colors.textMuted, fontSize: 12 }}>
        No costing activity found
      </div>
    );
  }

  const cellStyle = {
    padding: '8px 10px',
    fontSize: 11,
    fontFamily: theme.fonts.mono,
    color: theme.colors.text,
    borderBottom: `1px solid ${theme.colors.border}`,
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Jrnl#', 'Set', 'Product', 'Qty', 'Cost', 'Disc%', 'Addon', 'Net'].map((h) => (
              <th
                key={h}
                style={{
                  ...cellStyle,
                  color: theme.colors.textMuted,
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: theme.colors.bgHeader,
                  textAlign: 'left',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td style={cellStyle}>{row.jrnlno}</td>
              <td style={cellStyle}>{row.setno}</td>
              <td style={{ ...cellStyle, color: theme.colors.accent }}>{row.shipprod}</td>
              <td style={cellStyle}>{row.cQtyCosted}</td>
              <td style={cellStyle}>{row.cCost}</td>
              <td style={cellStyle}>{row.discount > 0 ? `${row.discount}%` : '—'}</td>
              <td style={cellStyle}>{row.addonamt > 0 ? `$${row.addonamt.toFixed(2)}` : '—'}</td>
              <td style={{ ...cellStyle, fontWeight: 600 }}>{row.cNetAmt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PODetail({ po, onClose }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('details');
  const [lineHistory, setLineHistory] = useState([]);
  const [costActivity, setCostActivity] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!po) return;
    // TODO: Call live APIs
    // fetchPOLineHistory(po.pono, 1).then(setLineHistory)
    // fetchPOCostActivity(po.pono, po.posuf, 1).then(setCostActivity)
  }, [po]);

  if (!po) return null;

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US') : '—');
  const formatMoney = (v) =>
    v != null
      ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—';

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'timeline', label: `Timeline (${lineHistory.length})` },
    { id: 'costing', label: `Costing (${costActivity.length})` },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 460,
        background: theme.colors.bgSidebar,
        borderLeft: `2px solid ${theme.colors.accent}`,
        zIndex: 100,
        overflowY: 'auto',
        boxShadow: theme.shadows.drawer,
        animation: 'slideIn 0.2s ease-out',
        fontFamily: theme.fonts.body,
        color: theme.colors.text,
      }}
    >
      <style>
        {`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}
      </style>

      <div style={{ padding: 24 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: theme.colors.textMuted,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Purchase Order
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: theme.colors.accent,
                fontFamily: theme.fonts.mono,
              }}
            >
              {po.pono}-{po.posuf}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.sm,
              color: theme.colors.textMuted,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: theme.fonts.body,
            }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Status badges */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
          <StageBadge stage={po.stagedesc} />
          <Badge variant={po.approvty === 'y' ? 'success' : 'warning'}>
            {po.approvty === 'y' ? 'Approved' : 'Pending'}
          </Badge>
          {po.notesfl === '*' && <Badge variant="default">📝 Notes</Badge>}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderBottom: `1px solid ${theme.colors.border}`,
            marginBottom: 20,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom:
                  activeTab === tab.id
                    ? `2px solid ${theme.colors.accent}`
                    : '2px solid transparent',
                color: activeTab === tab.id ? theme.colors.accent : theme.colors.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: theme.fonts.body,
                letterSpacing: '0.03em',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  color: theme.colors.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  margin: '0 0 12px 0',
                }}
              >
                ● VENDOR
              </h4>
              <FieldRow label="Vendor#" value={po.vendno} highlight />
              <FieldRow label="Name" value={po.name} />
              <FieldRow label="Warehouse" value={`${po.whse} — ${po.icsdname || ''}`} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  color: theme.colors.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  margin: '0 0 12px 0',
                }}
              >
                ● DATES
              </h4>
              <FieldRow label="Entered" value={formatDate(po.enterdt)} />
              <FieldRow label="Ordered" value={formatDate(po.orderdt)} />
              <FieldRow label="Due" value={formatDate(po.duedt)} />
              <FieldRow label="Printed" value={formatDate(po.printeddt)} />
              <FieldRow label="Received" value={formatDate(po.receiptdt)} />
              <FieldRow label="Costed" value={formatDate(po.costeddt)} />
              <FieldRow label="Paid" value={formatDate(po.paiddt)} />
              <FieldRow label="Days Old" value={po.daysold} danger={po.daysold > 365} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  color: theme.colors.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  margin: '0 0 12px 0',
                }}
              >
                ● AMOUNTS
              </h4>
              <FieldRow label="Total Line Amt" value={formatMoney(po.totlineamt)} />
              <FieldRow label="Total Received Amt" value={formatMoney(po.totrcvamt)} />
              <FieldRow label="Total Invoice Amt" value={formatMoney(po.totinvamt)} />
              <FieldRow label="Qty Ordered" value={po.totqtyord} />
              <FieldRow
                label="Qty Received"
                value={po.totqtyrcv}
                danger={po.totqtyrcv > 0 && po.totqtyrcv < po.totqtyord}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  color: theme.colors.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  margin: '0 0 12px 0',
                }}
              >
                ● DETAILS
              </h4>
              <FieldRow label="Buyer" value={`${po.buyer} — ${po.buyername || ''}`} />
              <FieldRow label="Created By" value={po.createdby} />
              <FieldRow label="Reference" value={po.refer || '—'} />
              <FieldRow label="Trans Type" value={po.transtype} />
              <FieldRow label="Approval" value={po.approvty === 'y' ? 'Approved' : 'Pending'} />
              {po.rcvoperinit && <FieldRow label="Received By" value={po.rcvoperinit} />}
              {po.receiverno && <FieldRow label="Receiver#" value={po.receiverno} />}
            </div>
          </>
        )}

        {activeTab === 'timeline' && (
          <div>
            {lineHistory.length > 0 ? (
              <>
                <p
                  style={{
                    fontSize: 12,
                    color: theme.colors.textMuted,
                    marginBottom: 20,
                    lineHeight: 1.5,
                  }}
                >
                  Line 1 lifecycle — showing stage progression with quantities and dates at each step.
                </p>
                {lineHistory.map((entry, i) => (
                  <TimelineEntry
                    key={i}
                    entry={entry}
                    isLast={i === lineHistory.length - 1}
                  />
                ))}
              </>
            ) : (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: theme.colors.textMuted,
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                No line history available for this PO.
              </div>
            )}
          </div>
        )}

        {activeTab === 'costing' && (
          <div>
            <p
              style={{
                fontSize: 12,
                color: theme.colors.textMuted,
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              Costing journal entries — product costs, discounts, and add-on amounts.
            </p>
            <CostActivityTable data={costActivity} />
          </div>
        )}
      </div>
    </div>
  );
}
