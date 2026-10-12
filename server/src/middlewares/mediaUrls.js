import { env } from '../config/env.js';
import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
function storageObject(value) {
  if(typeof value!=='string' || !env.supabaseUrl || !value.startsWith(`${env.supabaseUrl}/storage/v1/object/`))return null;
  const match=value.match(/\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  return match?{bucket:match[1],path:decodeURIComponent(match[2])}:null;
}
export async function signMedia(value,actor=null,memo=new Map()) {
  if(!isSupabaseEnabled())return value;
  if(Array.isArray(value))return Promise.all(value.map(item=>signMedia(item,actor,memo)));
  if(value && typeof value==='object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async([key,item])=>[key,await signMedia(item,actor,memo)])));
  const object=storageObject(value);
  if(!object || ![env.supabaseBucket,'story-private-media'].includes(object.bucket))return value;
  const cacheKey=`${object.bucket}:${object.path}`;
  if(!memo.has(cacheKey))memo.set(cacheKey,(async()=>{
    const allowed=await canAccessMedia(object,actor);
    if(!allowed)return '';
    const {data,error}=await supabaseAdmin.storage.from(object.bucket).createSignedUrl(object.path,3600);
    return error?'':data.signedUrl;
  })());
  return memo.get(cacheKey);
}
export function canonicalMedia(value) {
  if(Array.isArray(value))return value.map(canonicalMedia);
  if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,canonicalMedia(item)]));
  const object=storageObject(value);
  return object?`${env.supabaseUrl}/storage/v1/object/public/${object.bucket}/${object.path.split('/').map(encodeURIComponent).join('/')}`:value;
}
export async function canAccessMedia(object,actor) {
  if(actor && object.path.split('/')[0]===actor)return true;
  const {data,error}=await supabaseAdmin.rpc('can_read_media',{bucket:object.bucket,object_path:object.path,actor});
  if(!error)return data===true;
  return false;
}
async function validateMedia(value,actor) {
  if(Array.isArray(value)){await Promise.all(value.map(item=>validateMedia(item,actor)));return;}
  if(value && typeof value==='object'){await Promise.all(Object.values(value).map(item=>validateMedia(item,actor)));return;}
  const object=storageObject(value);
  if(object && !(await canAccessMedia(object,actor)))throw Object.assign(new Error('No tienes permiso para usar este archivo privado.'),{status:403});
}
export async function mediaUrls(req,res,next) {
  req.body=canonicalMedia(req.body);
  try {if(isSupabaseEnabled() && !['GET','HEAD'].includes(req.method))await validateMedia(req.body,req.authUser?.id||null);}catch(error){return next(error);}
  const json=res.json.bind(res);
  res.json=(payload)=>{signMedia(payload,req.authUser?.id||null).then(json).catch(next);return res;};
  next();
}
