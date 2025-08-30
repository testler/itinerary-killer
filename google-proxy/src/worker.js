// Google API Proxy Worker (Modules syntax)
// Securely proxies requests to Google APIs without exposing API keys.

// Cache duration in seconds (tunable)
const TEXT_MAX_AGE = 60;
const GOOGLE_BASE_URL = 'https://maps.googleapis.com';

// Explicit whitelist of allowed Google API GET endpoints
const ALLOWED_ENDPOINTS = [
	'/maps/api/place/textsearch/json',
	'/maps/api/geocode/json',
	'/maps/api/place/autocomplete/json',
	'/maps/api/place/details/json',
	'/maps/api/place/findplacefromtext/json'
];

// Clone all query params except a specific key (e.g., 'endpoint')
function cloneQueryParamsExcept(url, excludedKey) {
	const out = new URLSearchParams();
	for (const [key, value] of url.searchParams.entries()) {
		if (key !== excludedKey) {
			out.append(key, value);
		}
	}
	return out;
}

// Strict origin check. Missing Origin is treated as disallowed (except for OPTIONS).
function isOriginAllowed(origin, allowedOrigin) {
	if (!origin) return false;
	return origin === allowedOrigin;
}

// Apply standard CORS headers
function applyCorsHeaders(resp, allowedOrigin) {
	resp.headers.set('Access-Control-Allow-Origin', allowedOrigin);
	resp.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
	resp.headers.set('Access-Control-Allow-Headers', 'Content-Type');
	resp.headers.set('Vary', 'Origin');
	return resp;
}

// Tag response with header indicating whether secret is present
function tagSecretHeader(resp, env) {
	const hasSecret = Boolean(env && env.GOOGLE_API_KEY);
	resp.headers.set('X-Proxy-Secret', hasSecret ? 'present' : 'missing');
	return resp;
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const origin = request.headers.get('Origin');
		const allowedOrigin = env.ALLOWED_ORIGIN;

		// OPTIONS preflight: always return 204 with CORS headers
		if (request.method === 'OPTIONS') {
			return applyCorsHeaders(tagSecretHeader(new Response(null, { status: 204 }), env), allowedOrigin);
		}

		// Enforce strict CORS (non-OPTIONS must have an allowed Origin)
		if (!isOriginAllowed(origin, allowedOrigin)) {
			return applyCorsHeaders(
				tagSecretHeader(new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' }
				}), env),
				allowedOrigin
			);
		}

		// Only allow GET to prevent unintended methods
		if (request.method !== 'GET') {
			return applyCorsHeaders(
				tagSecretHeader(new Response(JSON.stringify({ error: 'method_not_allowed' }), {
					status: 405,
					headers: { 'Content-Type': 'application/json' }
				}), env),
				allowedOrigin
			);
		}

		// Validate endpoint against whitelist
		const endpoint = url.searchParams.get('endpoint');
		if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
			return applyCorsHeaders(
				tagSecretHeader(new Response(JSON.stringify({ error: 'endpoint_not_allowed' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}), env),
				allowedOrigin
			);
		}

		// Basic parameter validation to reduce abuse
		if (endpoint.includes('/place/details') && !url.searchParams.get('place_id')) {
			return applyCorsHeaders(
				tagSecretHeader(new Response(JSON.stringify({ error: 'missing_place_id' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}), env),
				allowedOrigin
			);
		}

		try {
			// Build Google API URL with forwarded params + injected key
			const forwardedParams = cloneQueryParamsExcept(url, 'endpoint');
			forwardedParams.set('key', env.GOOGLE_API_KEY);
			const googleUrl = `${GOOGLE_BASE_URL}${endpoint}?${forwardedParams.toString()}`;

			// Forward request
			const upstream = await fetch(googleUrl, {
				method: 'GET',
				headers: { 'Accept': 'application/json' }
			});

			// Pass through body and status; enforce response headers
			const resp = new Response(upstream.body, {
				status: upstream.status,
				statusText: upstream.statusText,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': `public, max-age=${TEXT_MAX_AGE}`
				}
			});

			return applyCorsHeaders(tagSecretHeader(resp, env), allowedOrigin);
		} catch (err) {
			return applyCorsHeaders(
				tagSecretHeader(new Response(JSON.stringify({ error: 'proxy_failed' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}), env),
				allowedOrigin
			);
		}
	}
};
