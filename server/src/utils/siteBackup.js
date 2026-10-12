import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { backupKey, encryptBackup, decryptBackup } from './backupEncryption.js';
import {EXPERIENCE_TABLES} from '../models/experienceModel.js';
import {LAUNCH_TABLES} from '../models/launchModel.js';
export const BACKUP_TABLES=['profiles','profile_roles','illustration_series','illustration_categories','illustration_tags','stories','chapters','chapter_images','story_reviews','story_review_likes','creator_wall_posts','creator_wall_comments','creator_wall_comment_likes','profile_follows','user_notifications','illustration_posts','illustration_images','illustration_post_categories','illustration_post_tags','illustration_comments','illustration_comment_likes','illustration_post_likes','illustration_saves','illustration_fanarts','user_workspace','content_reports','collaboration_invites','collaboration_suggestions','site_admin_roles','site_settings','site_admin_audit'];
export const backupDirectory=fileURLToPath(new URL('../../backups/',import.meta.url));
BACKUP_TABLES.push(...EXPERIENCE_TABLES);
BACKUP_TABLES.push(...LAUNCH_TABLES);
const hash=data=>createHash('sha256').update(data).digest('hex');
export async function createSiteBackup(db,projectUrl,root=backupDirectory,{encryptionKey=process.env.BACKUP_ENCRYPTION_KEY}={}){
  if(!db)throw new Error('El respaldo requiere Supabase.');
  const folder=path.join(root,new Date().toISOString().replace(/[:.]/g,'-'));
  await mkdir(folder,{recursive:true});
  const manifest={format:'valoria-backup-v1',projectUrl,createdAt:new Date().toISOString(),tables:[],files:[],schemas:[]};
  const key=backupKey(encryptionKey);
  async function save(file,data){const stored=key?encryptBackup(data,key):data;await mkdir(path.dirname(path.join(folder,file)),{recursive:true});await writeFile(path.join(folder,file),stored);return {file,sha256:hash(stored),bytes:stored.length,...(key?{encrypted:true}:{})};}
  // A manifest is written last: interrupted backups cannot be mistaken for complete ones.
  for(const table of BACKUP_TABLES){
    const rows=[];
    for(let offset=0;;offset+=1000){let query=db.from(table).select('*');const ordering=table==='user_workspace'?['user_id','namespace','key']:table==='site_admin_roles'?['user_id']:table==='illustration_post_categories'?['illustration_post_id','category_id']:table==='illustration_post_tags'?['illustration_post_id','tag_id']:['id'];for(const column of ordering)query=query.order(column,{ascending:true});const {data,error}=await query.range(offset,offset+999);if(error){if(table==='story_review_likes'&&error.code==='PGRST205'){manifest.tables.push({table,absent:true,rows:0});break;}throw new Error(`No se pudo respaldar ${table}: ${error.message}`);}rows.push(...data);if(data.length<1000)break;}
    if(manifest.tables.some(x=>x.table===table&&x.absent))continue;const data=Buffer.from(JSON.stringify(rows));manifest.tables.push({table,rows:rows.length,...await save(`tables/${table}.json`,data)});
  }
  const {data:buckets,error}=await db.storage.listBuckets();if(error)throw new Error('No se pudieron consultar los depósitos de imágenes.');
  for(const bucket of buckets){
    async function visit(prefix=''){
      for(let offset=0;;offset+=1000){const {data,error}=await db.storage.from(bucket.id).list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}});if(error)throw new Error(`No se pudo listar ${bucket.id}.`);
        for(const item of data){const name=prefix?`${prefix}/${item.name}`:item.name;if(!item.id){await visit(name);continue;}const download=await db.storage.from(bucket.id).download(name);if(download.error)throw new Error(`No se pudo descargar una imagen de ${bucket.id}.`);const binary=Buffer.from(await download.data.arrayBuffer());const file=`media/${bucket.id}/${hash(Buffer.from(name))}.bin`;manifest.files.push({bucket:bucket.id,name,contentType:download.data.type||'application/octet-stream',...await save(file,binary)});}
        if(data.length<1000)break;
      }
    }
    await visit();
  }
  const schemaRoot=fileURLToPath(new URL('../../../supabase/',import.meta.url));
  for(const base of ['', 'migrations'])for(const name of await readdir(path.join(schemaRoot,base))){if(!name.endsWith('.sql'))continue;const file=`schemas/${base?base+'/':''}${name}`;manifest.schemas.push(await save(file,await readFile(path.join(schemaRoot,base,name))));}
  const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2));
  if(key){await writeFile(path.join(folder,'manifest.enc'),encryptBackup(manifestBytes,key));await writeFile(path.join(folder,'header.json'),JSON.stringify({format:'valoria-backup-encrypted-v2',createdAt:manifest.createdAt}));}
  else await writeFile(path.join(folder,'manifest.json'),manifestBytes);
  return {folder,tables:manifest.tables.length,images:manifest.files.length,createdAt:manifest.createdAt};
}
export async function readBackupManifest(folder,encryptionKey=process.env.BACKUP_ENCRYPTION_KEY){
  let header;
  try{header=JSON.parse(await readFile(path.join(folder,'header.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(header){if(header.format!=='valoria-backup-encrypted-v2')throw new Error('Formato de respaldo cifrado desconocido.');return JSON.parse(decryptBackup(await readFile(path.join(folder,'manifest.enc')),backupKey(encryptionKey)).toString('utf8'));}
  return JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
}
export async function readBackupPayload(folder,item,encryptionKey=process.env.BACKUP_ENCRYPTION_KEY){
  const target=path.resolve(folder,item.file);if(!target.startsWith(path.resolve(folder)+path.sep))throw new Error('Ruta de respaldo inválida.');
  const bytes=await readFile(target);if(hash(bytes)!==item.sha256)throw new Error(`La integridad de ${item.file} no coincide.`);
  return item.encrypted?decryptBackup(bytes,backupKey(encryptionKey)):bytes;
}
export async function validateBackup(folder,projectUrl,{encryptionKey=process.env.BACKUP_ENCRYPTION_KEY}={}){
  const manifest=await readBackupManifest(folder,encryptionKey);
  if(manifest.format!=='valoria-backup-v1'||manifest.projectUrl!==projectUrl)throw new Error('El respaldo debe corresponder al mismo proyecto Supabase.');
  const required=BACKUP_TABLES.filter(table=>![...EXPERIENCE_TABLES,...LAUNCH_TABLES].includes(table));
  if(required.some(table=>!manifest.tables.some(x=>x.table===table))||manifest.tables.some(x=>!BACKUP_TABLES.includes(x.table))||new Set(manifest.tables.map(x=>x.table)).size!==manifest.tables.length)throw new Error('El respaldo no contiene todas las tablas requeridas.');
  for(const item of [...manifest.tables,...manifest.files,...manifest.schemas]){
    if(item.absent){if(item.table!=='story_review_likes')throw new Error('Tabla requerida ausente.');continue;}const target=path.resolve(folder,item.file);if(!target.startsWith(path.resolve(folder)+path.sep))throw new Error('Ruta de respaldo inválida.');
    await readBackupPayload(folder,item,encryptionKey);
  }
  return manifest;
}
export async function restoreSiteBackup(db,folder,projectUrl,{apply=false,encryptionKey=process.env.BACKUP_ENCRYPTION_KEY}={}){
  const manifest=await validateBackup(folder,projectUrl,{encryptionKey});
  if(!apply)return {validated:true,tables:manifest.tables.length,images:manifest.files.length,applied:false};
  // Upsert restores rows while preserving newer, unrelated data. It never drops tables.
  for(const item of manifest.tables){if(item.absent)continue;const rows=JSON.parse((await readBackupPayload(folder,item,encryptionKey)).toString('utf8'));const ordered=[],pending=[...rows],known=new Set();while(pending.length){const ready=pending.filter(x=>{const parent=x.parent_review_id||x.parent_comment_id||x.parent_id;return !parent||known.has(parent);});if(!ready.length)throw new Error(`Relaciones cíclicas en ${item.table}.`);for(const row of ready){ordered.push(row);known.add(row.id);pending.splice(pending.indexOf(row),1);}}for(const group of [ordered])for(let i=0;i<group.length;i+=100){const {error}=await db.from(item.table).upsert(group.slice(i,i+100));if(error)throw new Error(`Restauración detenida en ${item.table}: ${error.message}`);}}
  for(const item of manifest.files){const {error}=await db.storage.from(item.bucket).upload(item.name,await readBackupPayload(folder,item,encryptionKey),{upsert:true,contentType:item.contentType});if(error)throw new Error(`Restauración detenida en imágenes de ${item.bucket}.`);}
  return {validated:true,tables:manifest.tables.length,images:manifest.files.length,applied:true};
}
export const backupStatus={enabled:false,running:false,lastSuccess:null,lastError:null};
export async function runScheduledBackup(db,url){
  if(backupStatus.running||(backupStatus.lastSuccess&&Date.now()-Date.parse(backupStatus.lastSuccess)<86400000))return;
  backupStatus.running=true;
  try{const result=await createSiteBackup(db,url);backupStatus.lastSuccess=result.createdAt;backupStatus.lastError=null;}
  catch{backupStatus.lastError='No se completó el respaldo. Revisa las tablas, almacenamiento y espacio en disco.';}
  finally{backupStatus.running=false;}
}

export async function initializeDailyBackup(db,url){
  backupStatus.enabled=true;
  try{const names=(await readdir(backupDirectory)).sort().reverse();for(const name of names){try{const manifest=await readBackupManifest(path.join(backupDirectory,name));if(manifest.format==='valoria-backup-v1'&&manifest.projectUrl===url){backupStatus.lastSuccess=manifest.createdAt;break;}}catch{}}}catch{}
  await runScheduledBackup(db,url);
}
