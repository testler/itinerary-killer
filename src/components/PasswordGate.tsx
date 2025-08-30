import { useMemo, useState } from 'react';

type PasswordGateProps = {
  expectedPassword: string | undefined;
  onAuthenticated: () => void;
};

export default function PasswordGate({ expectedPassword, onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasPassword = useMemo(() => typeof expectedPassword === 'string' && expectedPassword.length > 0, [expectedPassword]);

  // Remove the automatic authentication when no password is configured
  // Now the site will be locked by default unless a password is explicitly set

  const submit = () => {
    setError(null);
    if (!hasPassword) {
      setError('Site is currently unavailable. Please contact administrator.');
      return;
    }
    if (password === expectedPassword) {
      onAuthenticated();
      return;
    }
    setError('Incorrect password');
  };

  // If no password is configured, show unavailable message
  if (!hasPassword) {
    return (
      <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
        <div className="modal" style={{ maxWidth: 420, width: '100%', background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: 20 }}>
          <div className="modal-header" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: '#dc2626' }}>🚫 Site Unavailable</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666' }}>This site is currently locked and unavailable for access.</p>
          </div>
          <div className="modal-body">
            <div style={{ 
              padding: '16px', 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px',
              color: '#991b1b'
            }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Access Denied:</strong> The site administrator has not configured access credentials.
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Please contact the site administrator to enable access or check the environment configuration.
              </p>
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <div className="modal" style={{ maxWidth: 420, width: '100%', background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: 20 }}>
        <div className="modal-header" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Enter Password</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>This site is password protected.</p>
        </div>
        <div className="modal-body">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Password"
            aria-label="Password"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }}
          />
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={submit}>Unlock</button>
        </div>
      </div>
    </div>
  );
}


