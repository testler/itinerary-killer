import { Button } from '../ui';

type SiteLockedProps = {
  reason?: string;
};

export default function SiteLocked({ reason }: SiteLockedProps) {
  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 16 }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="site-locked-title" style={{ maxWidth: 420, width: '100%', background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: 20 }}>
        <div className="modal-header" style={{ marginBottom: 12 }}>
          <h2 id="site-locked-title" style={{ margin: 0, color: '#dc2626' }}>🚫 Site Unavailable</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>Required secrets are not configured.</p>
        </div>
        <div className="modal-body">
          <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }}>
            <p style={{ margin: 0 }}>The site is locked until Cloudflare Worker secrets are set.{reason ? ` (${reason})` : ''}</p>
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <Button onClick={() => window.location.reload()} variant="primary">Refresh</Button>
        </div>
      </div>
    </div>
  );
}


