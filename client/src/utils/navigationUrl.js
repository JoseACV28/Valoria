// Public works use pathname routes; internal hash routes always start at the root.
// OAuth callback fragments are not internal routes and must remain untouched.
export function canonicalHashUrl({pathname, search = '', hash = ''}) {
  return pathname !== '/' && hash.startsWith('#/') ? `/${search}${hash}` : null;
}
