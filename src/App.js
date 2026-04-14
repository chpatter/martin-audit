import React, { useState } from 'react';
import { useTheme } from './config/ThemeContext';
import MODULES from './config/modules';
import { GlowDot, Badge } from './components/UI';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import PurchasesPage from './pages/PurchasesPage';
import OrdersPage from './pages/OrdersPage';
import ProdWhsePage from './pages/ProdWhsePage';
import CustomersPage from './pages/CustomersPage';
import CatalogPage from './pages/CatalogPage';
import TransfersPage from './pages/TransfersPage';
import PricingCustPage from './pages/PricingCustPage';
import PricingVendPage from './pages/PricingVendPage';
import VendorsPage from './pages/VendorsPage';
import SecurityPage from './pages/SecurityPage';

// ─── Dashboard Landing Page ───

function DashboardPage({ onNavigate }) {
  const { theme } = useTheme();
  const activeModules = MODULES.filter(m => m.active);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: theme.colors.textBright, margin: '0 0 6px 0' }}>
          Audit Dashboard
        </h2>
        <p style={{ fontSize: 13, color: theme.colors.textMuted, margin: 0 }}>
          Select a module to begin searching change history.
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {activeModules.map(m => (
          <button
            key={m.id}
            onClick={() => onNavigate(m.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 16, padding: 20,
              background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.lg, cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              fontFamily: theme.fonts.body, color: theme.colors.text,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.colors.accent; e.currentTarget.style.boxShadow = theme.shadows.glow; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.textBright, marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.textMuted, lineHeight: 1.4 }}>
                {m.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ───

export default function App() {
  const { theme } = useTheme();
  const [screen, setScreen] = useState('login');
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function handleConnected(info) {
    setConnectionInfo(info);
    setScreen('main');
  }

  function handleSignOut() {
    setScreen('login');
    setConnectionInfo(null);
    setActiveModule('dashboard');
  }

  if (screen === 'login') {
    return <LoginPage onConnected={handleConnected} />;
  }

  const currentModule = MODULES.find(m => m.id === activeModule);

  const PAGE_MAP = {
    purchases: PurchasesPage,
    orders: OrdersPage,
    prod_whse: ProdWhsePage,
    customers: CustomersPage,
    catalog: CatalogPage,
    transfers: TransfersPage,
    pricing_cust: PricingCustPage,
    pricing_vend: PricingVendPage,
    vendors: VendorsPage,
    security: SecurityPage,
  };

  const ActivePage = PAGE_MAP[activeModule];

  return (
    <div style={{
      display: 'flex', height: '100vh', background: theme.colors.bg,
      color: theme.colors.text, fontFamily: theme.fonts.body, overflow: 'hidden',
    }}>
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        connectionInfo={connectionInfo}
        onSignOut={handleSignOut}
      />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 24px', background: theme.colors.bgHeader,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.colors.textBright }}>
              {activeModule === 'dashboard' ? '📊 Dashboard' : `${currentModule?.icon} ${currentModule?.label}`}
            </h2>
            {currentModule?.badge && <Badge variant="warning">{currentModule.badge}</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <GlowDot color={theme.colors.success} />
            <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
              {connectionInfo?.operator || 'Connected'} · Cono {connectionInfo?.cono || '1'}
            </span>
            <span style={{ fontSize: 11, color: theme.colors.textMuted }}>|</span>
            <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
              {new Date().toLocaleDateString('en-US')}{' '}
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button onClick={handleSignOut} style={{
              padding: '6px 12px', background: 'transparent',
              border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.sm,
              color: theme.colors.textMuted, fontSize: 11, cursor: 'pointer',
              fontFamily: theme.fonts.body,
            }}>
              SIGN OUT
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {activeModule === 'dashboard' && <DashboardPage onNavigate={setActiveModule} />}
          {ActivePage && <ActivePage />}
        </div>
      </div>
    </div>
  );
}
