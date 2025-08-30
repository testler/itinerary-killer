import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

async function loadRuntimeConfig(): Promise<Record<string, string> | null> {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const res = await fetch(base + 'runtime-config.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function loadFromWorker(): Promise<{ url?: string; key?: string } | null> {
  try {
    let proxyUrl: string | undefined = import.meta.env.VITE_GOOGLE_PROXY_URL as string | undefined;
    if (!proxyUrl) {
      const rc = await loadRuntimeConfig();
      if (rc?.VITE_GOOGLE_PROXY_URL) proxyUrl = rc.VITE_GOOGLE_PROXY_URL;
    }
    if (!proxyUrl) return null;
    const u = new URL(proxyUrl);
    u.pathname = '/keys';
    const res = await fetch(u.toString(), { method: 'GET', mode: 'cors' });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
    return { url: data?.SUPABASE_URL, key: data?.SUPABASE_ANON_KEY };
  } catch {
    return null;
  }
}

export async function getSupabase(): Promise<SupabaseClient> {
  if (cached) return cached;

  let url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !key) {
    const rc = await loadRuntimeConfig();
    if (rc) {
      url = url || (rc.VITE_SUPABASE_URL as string | undefined);
      key = key || (rc.VITE_SUPABASE_ANON_KEY as string | undefined);
    }
  }

  if (!url || !key) {
    const fromWorker = await loadFromWorker();
    if (fromWorker) {
      url = url || fromWorker.url;
      key = key || fromWorker.key;
    }
  }

  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }

  cached = createClient(url, key);
  return cached;
}

export default getSupabase;


