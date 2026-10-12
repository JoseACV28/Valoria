import {mkdtemp, readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {gzipSync, gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSiteBackup, validateBackup, backupStatus} from './siteBackup.js';
import {backupKey, encryptBackup, decryptBackup} from './backupEncryption.js';
export const REMOTE_BACKUP_BUCKET='valoria-backups';
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function restoreRemoteArchive(bytes,url,key,root) {
  const envelope=JSON.parse(gunzipSync(decryptBackup(bytes,backupKey(key)),{maxOutputLength:128*1024*1024}).toString('utf8'));
  if(envelope.format!=='valoria-remote-v1'||!Array.isArray(envelope.files)||envelope.files.length>5000)throw new Error('Archivo de respaldo inválido.');
  const seen=new Set();
  for(const item of envelope.files) {
    const target=path.resolve(root,item.file);
    if(typeof item.file!=='string'||!target.startsWith(path.resolve(root)+path.sep)||seen.has(item.file))throw new Error('Ruta de respaldo inválida.');
    seen.add(item.file);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,Buffer.from(item.data,'base64'));
  }
  return validateBackup(root,url,{encryptionKey:key});
}
export async function createRemoteBackup(db,url,{encryptionKey=process.env.BACKUP_ENCRYPTION_KEY}={}) {
  if(!backupKey(encryptionKey))throw new Error('El respaldo externo requiere cifrado.');
  const bucket=await db.storage.getBucket(REMOTE_BACKUP_BUCKET);
  if(bucket.error||bucket.data?.public!==false)throw new Error('Configura el depósito privado valoria-backups antes de respaldar.');
  const root=await mkdtemp(path.join(tmpdir(),'valoria-remote-'));
  try {
    const result=await createSiteBackup(db,url,root,{encryptionKey});
    const manifest=await validateBackup(result.folder,url,{encryptionKey});
    const names=['header.json','manifest.enc',...[...manifest.tables,...manifest.files,...manifest.schemas].filter(x=>!x.absent).map(x=>x.file)];
    const files=await Promise.all(names.map(async file=>({file,data:(await readFile(path.join(result.folder,file))).toString('base64')})));
    const archive=encryptBackup(gzipSync(Buffer.from(JSON.stringify({format:'valoria-remote-v1',files}))),backupKey(encryptionKey));
    const remote=db.storage.from(REMOTE_BACKUP_BUCKET);
    const existing=await remote.list('',{limit:1000});
    if(existing.error||existing.data.length>=30||existing.data.reduce((sum,f)=>sum+Number(f.metadata?.size||0),0)+archive.length>250*1024*1024)throw new Error('Revisa la capacidad y conservación de respaldos externos. No se borraron copias anteriores.');
    const name=result.createdAt.replace(/[:.]/g,'-')+'.vlb';
    const upload=await remote.upload(name,archive,{contentType:'application/octet-stream',upsert:false});
    if(upload.error)throw new Error('No se pudo guardar el respaldo externo.');
    const check=await remote.download(name);
    if(check.error)throw new Error('No se pudo verificar el respaldo externo.');
    const downloaded=Buffer.from(await check.data.arrayBuffer());
    if(digest(downloaded)!==digest(archive))throw new Error('La copia remota no conserva la integridad.');
    await restoreRemoteArchive(downloaded,url,encryptionKey,path.join(root,'recovered'));
    const marker=await remote.upload('last-success.json',Buffer.from(JSON.stringify({createdAt:result.createdAt,archive:name,sha256:digest(archive)})),{contentType:'application/json',upsert:true});
    if(marker.error)throw new Error('Respaldo validado; no se pudo actualizar su estado.');
    return {...result,archive:name,bytes:archive.length,downloadVerified:true,restoreValidated:true};
  } finally {await rm(root,{recursive:true,force:true});}
}
export async function runRemoteBackup(db,url) {
  if(backupStatus.running||(backupStatus.lastSuccess&&Date.now()-Date.parse(backupStatus.lastSuccess)<86400000))return;
  backupStatus.running=true;
  try {const result=await createRemoteBackup(db,url);backupStatus.lastSuccess=result.createdAt;backupStatus.lastError=null;}
  catch {backupStatus.lastError='No se completó el respaldo externo cifrado. Revisa depósito, clave y capacidad.';}
  finally {backupStatus.running=false;}
}
export async function initializeRemoteBackup(db,url) {
  backupStatus.enabled=true;
  const marker=await db.storage.from(REMOTE_BACKUP_BUCKET).download('last-success.json');
  if(!marker.error)try {const data=JSON.parse(await marker.data.text());if(Number.isFinite(Date.parse(data.createdAt)))backupStatus.lastSuccess=data.createdAt;}catch{}
  await runRemoteBackup(db,url);
}
