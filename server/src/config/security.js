// Production must never silently switch to the development data/auth stores.
export function validateProductionConfig(config = process.env) {
  if (config.NODE_ENV !== 'production') return;
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGINS', 'SITE_OWNER_ID'];
  if (required.some(key => !config[key]?.trim())) throw new Error('Configuración de producción incompleta. Se bloqueó el arranque; el modo local solo está permitido en desarrollo.');
  const service = new URL(config.SUPABASE_URL);
  if (service.protocol !== 'https:' || service.username || service.password) throw new Error('Supabase requiere HTTPS en producción.');
  for (const origin of config.CORS_ORIGINS.split(',').map(x => x.trim())) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Configura orígenes HTTPS exactos para producción.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.SITE_OWNER_ID)) throw new Error('Configura un propietario válido para producción.');
  if(config.SITE_BACKUP_ENABLED==='true'&&!/^[0-9a-f]{64}$/i.test(config.BACKUP_ENCRYPTION_KEY||''))throw new Error('Los respaldos de producción requieren una clave de cifrado válida.');
}
