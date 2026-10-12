import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
export async function profilesBlocked(actor,target) {
  if(!actor||!target||actor===target||!isSupabaseEnabled())return false;
  const {data,error}=await supabaseAdmin.from('user_workspace').select('user_id,key').eq('namespace','blocks').or(`and(user_id.eq.${actor},key.eq.${target}),and(user_id.eq.${target},key.eq.${actor})`);
  if(error)throw Object.assign(new Error('No se pudieron comprobar los permisos de interacción.'),{status:503});return Boolean(data?.length);
}
export async function profileBlocks(req,res,next) {
  try{if(/^[0-9a-f-]{36}$/i.test(req.params.profileId||'') && await profilesBlocked(req.authUser?.id,req.params.profileId))return res.status(403).json({message:'Esta interacción no está disponible entre estas cuentas.'});next();}catch(error){next(error);}
}

export async function blockedProfileIds(actor){
 if(!actor || !isSupabaseEnabled())return new Set();
 const {data,error}=await supabaseAdmin.from('user_workspace').select('user_id,key').eq('namespace','blocks').or(`user_id.eq.${actor},key.eq.${actor}`);
 if(error)throw Object.assign(new Error('No se pudieron comprobar las cuentas bloqueadas.'),{status:503});
 return new Set((data||[]).map(item=>item.user_id===actor?item.key:item.user_id));
}
