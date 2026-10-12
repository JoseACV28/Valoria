// Public beta uses production protections with only the isolated QA database.
export function configureBetaOrigin(config = process.env) {
  if (config.APP_ENV === 'beta' && config.RENDER === 'true' && config.RENDER_EXTERNAL_URL) {
    config.PUBLIC_SITE_URL ||= config.RENDER_EXTERNAL_URL;
    config.CORS_ORIGINS ||= config.RENDER_EXTERNAL_URL;
  }
}
export function validateBetaEnvironment(config = process.env) {
  if (config.APP_ENV !== 'beta') return;
  if (config.NODE_ENV !== 'production') throw new Error('La beta pública requiere los controles de producción.');
  if (config.SUPABASE_URL !== 'https://cjbwjbmgrpjvinoczluc.supabase.co') throw new Error('La beta pública solo puede usar el proyecto Supabase de pruebas.');
  if (config.PUBLIC_SITE_URL !== config.CORS_ORIGINS) throw new Error('La beta requiere un único origen público coincidente con CORS.');
  const site = new URL(config.PUBLIC_SITE_URL);
  if (site.protocol !== 'https:' || site.origin !== config.PUBLIC_SITE_URL) throw new Error('La beta requiere un origen HTTPS exacto.');
}
