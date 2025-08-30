# google-proxy (Cloudflare Worker)

Secure proxy for Google APIs from GitHub Pages without exposing your API key.

## What it does
- Strict CORS: only allows your configured origin (`ALLOWED_ORIGIN`)
- Whitelist: only these GET endpoints are allowed for now:
  - `/maps/api/place/textsearch/json`
  - `/maps/api/geocode/json`
- Forwards all other query params as-is and injects `key=<GOOGLE_API_KEY>`
- OPTIONS preflight: 204 with proper CORS headers
- Caching: `Cache-Control: public, max-age=60`
- Transparent upstream status + JSON body
- Adds header `X-Proxy-Secret: present|missing` to help you surface toasts

## Files
- `wrangler.toml` — Worker config (edit `ALLOWED_ORIGIN`)
- `src/worker.js` — Worker code (modules runtime)

## Deploy
```bash
# Install Wrangler if needed
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler deploy
```

## Attach the secret
- Dashboard → Workers & Pages → `google-proxy` → Settings → Variables → Secrets
- Add secret: `GOOGLE_API_KEY` (paste the value from your Secrets Store)

## Configure CORS origin
- Set `ALLOWED_ORIGIN` in `wrangler.toml` (or as a plain variable in the dashboard)
- Example: `https://YOUR-USER.github.io` (origins don’t include path)
- If you use a custom Pages domain, put that instead

## Test (cURL)
```bash
curl -i "https://<your-subdomain>.workers.dev?endpoint=/maps/api/geocode/json&address=1600+Pennsylvania+Ave+NW+Washington+DC"
# Look for: X-Proxy-Secret: present
```

## Call from GitHub Pages
```javascript
const params = new URLSearchParams({
  endpoint: '/maps/api/place/textsearch/json',
  query: 'coffee near bentonville ar'
});
const res = await fetch(`https://<your-subdomain>.workers.dev?${params.toString()}`);
// Optional: header to confirm secret presence
const secretHeader = res.headers.get('X-Proxy-Secret');
const data = await res.json();
console.log(secretHeader, data);
```

## Show toasts based on secret presence
Below is a minimal example using a simple toast helper. Replace with your UI lib (e.g., react-hot-toast, shadcn/ui, etc.).

```javascript
function toast(message, type = 'info') {
  const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#334155';
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', right: '16px', top: '16px', zIndex: 9999,
    padding: '10px 14px', color: 'white', background: bg, borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontFamily: 'system-ui, sans-serif'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

async function callProxy() {
  const params = new URLSearchParams({
    endpoint: '/maps/api/geocode/json',
    address: '1600 Pennsylvania Ave NW Washington DC'
  });
  const res = await fetch(`https://<your-subdomain>.workers.dev?${params.toString()}`);
  const secretHeader = res.headers.get('X-Proxy-Secret');
  if (secretHeader === 'present') toast('Proxy secret is configured', 'success');
  else toast('Proxy secret missing. Set GOOGLE_API_KEY in Worker.', 'error');

  const data = await res.json();
  return data;
}
```

## Notes
- Missing `Origin` is treated as disallowed unless it’s an OPTIONS preflight
- To add endpoints, update `ALLOWED_ENDPOINTS` in `src/worker.js`
- Tunable cache: change `TEXT_MAX_AGE` in `src/worker.js`
