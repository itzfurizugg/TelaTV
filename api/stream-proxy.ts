interface Env { }

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function isM3u8Path(url: string, contentType: string): boolean {
  if (contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl')) return true;
  const path = new URL(url).pathname;
  return path.endsWith('.m3u8');
}

function rewriteManifest(body: string, baseUrl: string, proxyOrigin: string, referer: string): string {
  const proxyBase = `${proxyOrigin}?referer=${encodeURIComponent(referer)}&url=`;
  return body.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    try {
      new URL(trimmed);
      return proxyBase + encodeURIComponent(trimmed);
    } catch {
      const absolute = resolveUrl(baseUrl, trimmed);
      return proxyBase + encodeURIComponent(absolute);
    }
  }).join('\n');
}

export default {
  async fetch(req: Request, _env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Access-Control-Max-Age': '86400' },
      });
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');
    const referer = searchParams.get('referer') || undefined;

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing "url" query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      new URL(targetUrl);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid "url" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; TelaStreamProxy/1.0)',
    };
    if (referer) fetchHeaders['Referer'] = referer;

    const upstream = await fetch(targetUrl, { headers: fetchHeaders });

    const contentType = upstream.headers.get('content-type') || '';

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
    };

    if (upstream.headers.get('content-length')) {
      corsHeaders['Content-Length'] = upstream.headers.get('content-length')!;
    }

    if (isM3u8Path(targetUrl, contentType)) {
      const body = await upstream.text();
      const proxyOrigin = `${req.url.split('?')[0]}`;
      const origin = referer || new URL(targetUrl).origin;
      const rewritten = rewriteManifest(body, targetUrl, proxyOrigin, origin);
      return new Response(rewritten, {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': contentType },
      });
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': contentType },
    });
  },
};
