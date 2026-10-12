import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSiteBackup,restoreSiteBackup } from '../src/utils/siteBackup.js';
test('un respaldo valida contenido, imágenes y proyecto; la simulación no escribe',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'valoria-backup-'));t.after(()=>rm(root,{recursive:true,force:true}));
 let writes=0;const db={from(table){return {select(){return this;},order(){return this;},async range(){return {data:table==='profiles'?[{id:'fictional',display_name:'Prueba'}]:[]};},async upsert(){writes++;return {};}};},storage:{async listBuckets(){return {data:[{id:'test'}]};},from(){return {async list(){return {data:[{id:'file',name:'pixel.png'}]};},async download(){return {data:new Blob(['fake image'],{type:'image/png'})};},async upload(){writes++;return {};}};}}};
 const backup=await createSiteBackup(db,'https://example.invalid',root);
 assert.equal(backup.images,1);
 assert.equal((await restoreSiteBackup(db,backup.folder,'https://example.invalid')).applied,false);assert.equal(writes,0);
 await assert.rejects(restoreSiteBackup(db,backup.folder,'https://other.invalid'));
 assert.equal((await restoreSiteBackup(db,backup.folder,'https://example.invalid',{apply:true})).applied,true);assert.equal(writes,2);
 await writeFile(path.join(backup.folder,'tables/profiles.json'),'[]');
 await assert.rejects(restoreSiteBackup(db,backup.folder,'https://example.invalid'),/integridad/);
});
