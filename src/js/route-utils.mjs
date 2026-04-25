export function routeFromHash(hash, fallback = 'home') {
  const raw = typeof hash === 'string' ? hash : '';
  const cleaned = raw.startsWith('#') ? raw.slice(1) : raw;
  const route = cleaned || fallback;
  const [page, ...rest] = route.split('/');
  return {
    page: page || fallback,
    params: rest.length ? { name: rest[0] } : {},
  };
}
