const primaryHost='caieuouvehvukmcnmkyg.supabase.co';
export function validateQaEnvironment(config,primary={}){
 if(!['qa-local','staging'].includes(config.APP_ENV))return;
 if(config.NODE_ENV==='production')throw new Error('El perfil de pruebas no puede arrancar como producción.');
 if(config.APP_ENV==='qa-local'){
  if(['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].some(key=>config[key]))throw new Error('El modo QA local no admite claves ni conexiones de Supabase.');
  return;
 }
 const required=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','PRIMARY_SUPABASE_URL','SITE_OWNER_ID'];
 if(required.some(key=>!config[key]?.trim()))throw new Error('Falta completar server/.env.staging con el proyecto separado de pruebas.');
 const target=new URL(config.SUPABASE_URL),original=new URL(config.PRIMARY_SUPABASE_URL);
 if(target.protocol!=='https:'||target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw new Error('La URL de staging debe ser un origen HTTPS de Supabase.');
 const forbidden=new Set([primaryHost,original.hostname,...(primary.SUPABASE_URL?[new URL(primary.SUPABASE_URL).hostname]:[])]);
 if(forbidden.has(target.hostname))throw new Error('Staging no puede utilizar el proyecto principal de Supabase.');
 for(const key of ['SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])if(primary[key]&&primary[key]===config[key])throw new Error('Las claves de staging deben pertenecer al proyecto separado.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.SITE_OWNER_ID))throw new Error('Configura el propietario del entorno de pruebas.');
 if(config.SESSION_CHECK_REQUIRED!=='true'||config.ADMIN_MFA_REQUIRED!=='true')throw new Error('Staging debe conservar los controles de sesión y MFA.');
}
