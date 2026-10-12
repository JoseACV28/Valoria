import { createHash } from 'node:crypto';
const buckets=new Map();
const authBuckets = new Map();
const accountBuckets = new Map();
const passwordBuckets=new Map();
const exportBuckets=new Map();
export function personalExportLimits(req,res,next){
  if(!take(exportBuckets,req.authUser.id,Date.now(),15*60000,3)){res.set('Retry-After','900');return res.status(429).json({message:'Espera 15 minutos antes de solicitar otra exportación.'});}next();
}
function take(map, key, now, duration, limit) {
  for (const [id, entry] of map) if (now - entry.start >= duration) map.delete(id);
  if (!map.has(key) && map.size >= 5000) return false;
  const entry = map.get(key) || { start: now, count: 0 };
  entry.count++; map.set(key, entry);
  return entry.count <= limit;
}

export function accountLoginLimits(req,res,next) {
  if(req.method!=='POST'||!/^\/api\/auth\/login\/?$/i.test(req.path)||typeof req.body?.email!=='string')return next();
  const key=createHash('sha256').update(req.body.email.trim().toLowerCase()).digest('hex');
  if(!take(accountBuckets,key,Date.now(),15*60000,10)){
    res.set('Retry-After','900');return res.status(429).json({message:'Demasiados intentos para esta cuenta. Espera 15 minutos y reintenta.'});
  }
  // Reserve attempts before authentication to also bound concurrent requests.
  res.once('finish',()=>{if(res.statusCode===200)accountBuckets.delete(key);});
  next();
}
export function requestLimits(req,res,next) {
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const now=Date.now();
  const auth = /^\/api\/auth\/(login|register|change-password)\/?$/i.test(req.path);
  if(auth && !take(authBuckets,req.ip,now,15*60000,20)){
    res.set('Retry-After','900');return res.status(429).json({message:'Demasiados intentos de acceso. Espera 15 minutos y reintenta.'});
  }
  if(!take(buckets,req.ip,now,60000,120)){res.set('Retry-After','60');return res.status(429).json({message:'Demasiadas solicitudes. Espera un minuto y reintenta.'});}
  next();
}

export function passwordChangeLimits(req,res,next){
  if(!take(passwordBuckets,req.authUser.id,Date.now(),15*60000,10)){res.set('Retry-After','900');return res.status(429).json({message:'Demasiados intentos para esta cuenta. Espera 15 minutos y reintenta.'});}
  res.once('finish',()=>{if(res.statusCode===200)passwordBuckets.delete(req.authUser.id);});next();
}
