import { useMemo, useState } from 'react';

type PasswordGateProps = {
  expectedPassword: string | undefined;
  onAuthenticated: () => void;
};

export default function PasswordGate({ expectedPassword, onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasPassword = useMemo(() => typeof expectedPassword === 'string' && expectedPassword.length > 0, [expectedPassword]);
  // PasswordGate is UI-only again; external verification should gate rendering

  // If no password is configured, DO NOT authenticate. Keep the site locked.

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

  // Secret verification is handled globally in App; no gating here

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


