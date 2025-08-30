type SiteLockedProps = {
  reason?: string;
};

export default function SiteLocked({ reason }: SiteLockedProps) {
  return (
    <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 16 }}>
      <div className="modal" style={{ maxWidth: 420, width: '100%', background: 'white', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: 20 }}>
        <div className="modal-header" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: '#dc2626' }}>🚫 Site Unavailable</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>Required secrets are not configured.</p>
        </div>
        <div className="modal-body">
          <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }}>
            <p style={{ margin: 0 }}>The site is locked until Cloudflare Worker secrets are set.{reason ? ` (${reason})` : ''}</p>
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
          <button 
            onClick={() => window.location.reload()}
            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}


