export default async function fetchTarget({
  url,
  env,
  savedSearch,
  originalRequest,
}) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (originalRequest.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const host = env.TARGET_HOSTNAME;
  if (!host) {
    return new Response('TARGET_HOSTNAME is not configured', { status: 500 });
  }

  const qs = typeof savedSearch === 'string' ? savedSearch : '';
  const targetUrl = new URL(`${url.pathname}${qs}`, `https://${host}`);

  const reqInit = {
    method: originalRequest.method,
    headers: {
      'Content-Type': originalRequest.headers.get('Content-Type') || 'application/json',
    },
  };
  const methodUpper = originalRequest.method.toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(methodUpper)) {
    reqInit.body = originalRequest.body;
  }

  const response = await fetch(targetUrl, reqInit);

  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
