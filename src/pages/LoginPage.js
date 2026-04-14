import React, { useState, useEffect } from 'react';
import { useTheme } from '../config/ThemeContext';
import { InfoBox, GlowDot } from '../components/UI';
import { checkBackendStatus, reconnectBackend } from '../services/api';

export default function LoginPage({ onConnected }) {
  const { theme } = useTheme();
  const [status, setStatus] = useState('checking'); // checking | connected | disconnected | error
  const [message, setMessage] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Check backend status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    setStatus('checking');
    setMessage('Checking backend connection...');
    try {
      const data = await checkBackendStatus();
      if (data.authenticated) {
        setStatus('connected');
        setMessage(`Connected as ${data.operator} (Cono ${data.cono})`);
        // Auto-proceed after a brief moment
        setTimeout(() => onConnected(data), 800);
      } else if (data.error) {
        setStatus('error');
        setMessage(data.error === 'Backend not reachable'
          ? 'Backend server is not running. Start it with: cd server && npm start'
          : `Connection error: ${data.error}`
        );
      } else {
        setStatus('disconnected');
        setMessage('Backend is running but not authenticated to Infor');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Cannot reach backend server. Make sure it\'s running on port 3001.');
    }
  }

  async function handleReconnect() {
    setConnecting(true);
    setMessage('Connecting to Infor CloudSuite...');
    try {
      const data = await reconnectBackend();
      if (data.authenticated) {
        setStatus('connected');
        setMessage(`Connected as ${data.operator}`);
        setTimeout(() => onConnected(data), 500);
      } else {
        setStatus('disconnected');
        setMessage(data.message || 'Authentication failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to connect — is the backend running?');
    }
    setConnecting(false);
  }

  const statusColors = {
    checking: theme.colors.warning,
    connected: theme.colors.success,
    disconnected: theme.colors.warning,
    error: theme.colors.danger,
  };

  return (
    <div style={{
      background: theme.colors.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: theme.fonts.body, color: theme.colors.text,
    }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '0 20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🐉</div>
          <h1 style={{
            fontSize: 36, fontWeight: 800, color: theme.colors.accent, margin: 0,
            letterSpacing: '0.02em', fontFamily: theme.fonts.display,
          }}>
            MARTIN AUDIT SYSTEM
          </h1>
          <p style={{ color: theme.colors.textMuted, fontSize: 14, marginTop: 8 }}>
            CloudSuite Distribution — Audit Log Viewer
          </p>
        </div>

        {/* Connection Card */}
        <div style={{
          background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.xl, padding: 32, marginBottom: 20,
        }}>
          {/* Status indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
            justifyContent: 'center',
          }}>
            <GlowDot color={statusColors[status]} size={10} />
            <span style={{ fontSize: 13, color: statusColors[status] }}>
              {status === 'checking' && 'Checking connection...'}
              {status === 'connected' && 'Connected to Infor'}
              {status === 'disconnected' && 'Not connected'}
              {status === 'error' && 'Connection error'}
            </span>
          </div>

          {/* Message */}
          {message && (
            <p style={{
              textAlign: 'center', fontSize: 12, color: theme.colors.textMuted,
              marginBottom: 24, lineHeight: 1.6,
            }}>
              {message}
            </p>
          )}

          {/* Connect button */}
          {(status === 'disconnected' || status === 'error') && (
            <button onClick={handleReconnect} disabled={connecting} style={{
              width: '100%', padding: '16px 24px',
              background: connecting ? theme.colors.border : `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentDim})`,
              border: 'none', borderRadius: theme.radii.lg, color: connecting ? theme.colors.textMuted : '#000',
              fontSize: 15, fontWeight: 700, cursor: connecting ? 'wait' : 'pointer',
              letterSpacing: '0.03em', boxShadow: connecting ? 'none' : theme.shadows.glow,
              fontFamily: theme.fonts.body, marginBottom: 16,
            }}>
              {connecting ? '⏳ CONNECTING...' : '🔌 CONNECT TO INFOR'}
            </button>
          )}

          {/* Loading spinner for checking state */}
          {status === 'checking' && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{
                width: 32, height: 32, border: `3px solid ${theme.colors.border}`,
                borderTopColor: theme.colors.accent, borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

        </div>

        {/* Help info */}
        {status === 'error' && (
          <InfoBox variant="warning">
            <strong>Setup required:</strong> The backend server handles all Infor authentication.
            Make sure <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3 }}>
            server/.env</code> is configured with your service account credentials, then run{' '}
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3 }}>
            cd server && npm start</code>
          </InfoBox>
        )}
      </div>
    </div>
  );
}
