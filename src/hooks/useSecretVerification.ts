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
        console.log('[secrets] Starting verification');
        // On GitHub Pages or when no runtime config available, don't block the app
        const origin = window.location.origin;
        const isGithubPages = /\.github\.io$/.test(window.location.host);
        console.log('[secrets] origin:', origin, 'host:', window.location.host, 'isGithubPages:', isGithubPages);
        if (isGithubPages) {
          console.warn('[secrets] Running on GitHub Pages; skipping secret verification');
          if (!aborted) setState({ status: 'ok' });
          return;
        }

        // Prefer runtime-config JSON, then env
        let proxyUrl = (import.meta as any).env?.VITE_GOOGLE_PROXY_URL as string | undefined;
        if (!proxyUrl) {
          try {
            const rc = await fetch(`${(import.meta as any).env?.BASE_URL || '/'}runtime-config.json`, { cache: 'no-store' });
            if (rc.ok) {
              const json = await rc.json();
              proxyUrl = json?.VITE_GOOGLE_PROXY_URL || proxyUrl;
              console.log('[secrets] runtime-config.json loaded; VITE_GOOGLE_PROXY_URL =', json?.VITE_GOOGLE_PROXY_URL);
            } else {
              console.warn('[secrets] runtime-config.json not found or not ok:', rc.status);
            }
          } catch {}
        }
        if (!proxyUrl) {
          // If proxy is not configured, allow app to proceed (features using proxy may be disabled separately)
          console.warn('[secrets] Proxy URL not configured; proceeding without verification');
          if (!aborted) setState({ status: 'ok' });
          return;
        }
        const u = new URL(proxyUrl);
        u.pathname = '/verify';
        let ok = false;
        try {
          console.log('[secrets] Calling verify endpoint:', u.toString());
          const res = await fetch(u.toString(), { method: 'GET', mode: 'cors' });
          console.log('[secrets] verify response status:', res.status);
          const pwHeader = res.headers.get('X-Password-Secret');
          const body = await res.json().catch(() => ({} as any));
          console.log('[secrets] verify payload:', body, 'X-Password-Secret:', pwHeader);
          ok = pwHeader === 'present' || body?.sitePassword === true;
        } catch (_e) {
          // CORS failure: do not block the app; assume ok
          console.warn('[secrets] verify request failed (likely CORS); proceeding open');
          ok = true;
        }
        if (aborted) return;
        const finalState = ok ? { status: 'ok' } as const : { status: 'locked', reason: 'Required secrets missing' } as const;
        console.log('[secrets] final state:', finalState);
        setState(finalState);
      } catch (e) {
        console.warn('[secrets] verification threw; proceeding open', e);
        if (!aborted) setState({ status: 'ok' });
      }
    };
    verify();
    return () => { aborted = true; };
  }, []);

  return state;
}

export default useSecretVerification;


