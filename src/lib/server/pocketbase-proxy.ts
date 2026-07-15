const pocketbaseOrigin = 'http://127.0.0.1:8090';

export async function proxyPocketBase(request: Request, targetPath: string) {
  const url = new URL(request.url);
  const upstream = new URL(`${targetPath}${url.search}`, pocketbaseOrigin);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(upstream, init);
  const headersOut = new Headers(response.headers);
  headersOut.delete('content-encoding');
  headersOut.delete('content-length');
  headersOut.delete('transfer-encoding');

  const contentType = headersOut.get('content-type') || '';
  if (targetPath.startsWith('/_/') && contentType.includes('text/html')) {
    const html = await response.text();
    const rewritten = html.includes('<head>')
      ? html.replace('<head>', '<head><base href="/_/">')
      : `<!doctype html><base href="/_/">${html}`;

    headersOut.set('content-type', 'text/html; charset=utf-8');
    return new Response(rewritten, {
      status: response.status,
      headers: headersOut
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: headersOut
  });
}
