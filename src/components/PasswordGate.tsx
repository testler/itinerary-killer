import { useMemo, useState } from 'react';
import { Button, FormField, SafeAreaFooter } from '../ui';
import { Eye, EyeOff } from 'lucide-react';

type PasswordGateProps = {
  expectedPassword: string | undefined;
  onAuthenticated: () => void;
};

export default function PasswordGate({ expectedPassword, onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 16 }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="password-title" style={{ maxWidth: 420, width: '100%', background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: 20 }}>
        <div className="modal-header" style={{ marginBottom: 12 }}>
          <h2 id="password-title" style={{ margin: 0 }}>Enter Password</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>This site is password protected.</p>
        </div>
        <div className="modal-body">
          <FormField id="password" label="Password" error={error || undefined}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="Enter password"
                inputMode="text"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </FormField>
        </div>
        <SafeAreaFooter>
          <Button onClick={submit} variant="primary">Unlock</Button>
        </SafeAreaFooter>
      </div>
    </div>
  );
}


