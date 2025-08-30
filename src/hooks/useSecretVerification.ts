import { useEffect, useState } from 'react';

export type SecretVerificationState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'locked'; reason: string };

export function useSecretVerification(): SecretVerificationState {
  const [state, setState] = useState<SecretVerificationState>({ status: 'checking' });

  useEffect(() => {
    let aborted = false;
    const verify = async () => {
      try {
        // Prefer runtime-config JSON, then env
        let proxyUrl = (import.meta as any).env?.VITE_GOOGLE_PROXY_URL as string | undefined;
        if (!proxyUrl) {
          try {
            const rc = await fetch(`${(import.meta as any).env?.BASE_URL || '/'}runtime-config.json`, { cache: 'no-store' });
            if (rc.ok) {
              const json = await rc.json();
              proxyUrl = json?.VITE_GOOGLE_PROXY_URL || proxyUrl;
            }
          } catch {}
        }
        if (!proxyUrl) {
          if (!aborted) setState({ status: 'locked', reason: 'Proxy URL not configured' });
          return;
        }
        const u = new URL(proxyUrl);
        u.pathname = '/verify';
        const res = await fetch(u.toString(), { method: 'GET', mode: 'cors' });
        const pwHeader = res.headers.get('X-Password-Secret');
        const body = await res.json().catch(() => ({} as any));
        const ok = pwHeader === 'present' || body?.sitePassword === true;
        if (aborted) return;
        setState(ok ? { status: 'ok' } : { status: 'locked', reason: 'Required secrets missing' });
      } catch (e) {
        if (!aborted) setState({ status: 'locked', reason: 'Verification failed' });
      }
    };
    verify();
    return () => { aborted = true; };
  }, []);

  return state;
}

export default useSecretVerification;


