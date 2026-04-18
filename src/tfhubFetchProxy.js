/**
 * TensorFlow Hub does not send Access-Control-Allow-Origin on model assets, so
 * direct browser fetches from https://tfhub.dev fail. Rewrite those URLs to a
 * same-origin path proxied by Vite (dev/preview) or the Express backend.
 */
const TFHUB_ORIGIN = 'https://tfhub.dev';

const proxyBase = (import.meta.env.VITE_TFHUB_PROXY_BASE ?? '').replace(/\/$/, '');

function rewriteTfhubUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(TFHUB_ORIGIN)) return url;
  const pathAndQuery = url.slice(TFHUB_ORIGIN.length);
  return `${proxyBase}/__tfhub__${pathAndQuery}`;
}

if (typeof window !== 'undefined' && !window.__tfhubFetchPatched) {
  const origFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    if (typeof input === 'string') {
      const next = rewriteTfhubUrl(input);
      if (next !== input) return origFetch(next, init);
    } else if (input instanceof Request) {
      const nextUrl = rewriteTfhubUrl(input.url);
      if (nextUrl !== input.url) {
        return origFetch(new Request(nextUrl, input), init);
      }
    }
    return origFetch(input, init);
  };
  window.__tfhubFetchPatched = true;
}
