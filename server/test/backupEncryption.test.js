import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createSiteBackup,restoreSiteBackup} from '../src/utils/siteBackup.js';
test('respaldo cifrado autentica archivos y manifiesto; clave incorrecta o corrupción impiden restaurar',async t=>{
  const root=await mkdtemp(path.join(tmpdir(),'valoria-encrypted-'));t.after(()=>rm(root,{recursive:true,force:true}));const key=randomBytes(32).toString('hex');let restored;
  const db={from(table){return {select(){return this;},order(){return this;},async range(){return {data:table==='profiles'?[{id:'QA',email:'private-test@example.invalid'}]:[]};},async upsert(rows){restored=rows;return {};}};},storage:{listBuckets:async()=>({data:[]})}};
  const result=await createSiteBackup(db,'https://qa.invalid',root,{encryptionKey:key});
  assert.equal((await readFile(path.join(result.folder,'tables/profiles.json'))).includes(Buffer.from('private-test')),false);
  await assert.rejects(restoreSiteBackup(db,result.folder,'https://qa.invalid',{apply:true,encryptionKey:randomBytes(32).toString('hex')}),/autenticar/);assert.equal(restored,undefined);
  assert.equal((await restoreSiteBackup(db,result.folder,'https://qa.invalid',{apply:true,encryptionKey:key})).applied,true);assert.equal(restored[0].email,'private-test@example.invalid');
  const bytes=await readFile(path.join(result.folder,'tables/profiles.json'));bytes[bytes.length-1]^=1;await writeFile(path.join(result.folder,'tables/profiles.json'),bytes);await assert.rejects(restoreSiteBackup(db,result.folder,'https://qa.invalid',{encryptionKey:key}),/integridad/);
});
