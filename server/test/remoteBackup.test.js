import test from 'node:test';import assert from 'node:assert/strict';
import {createRemoteBackup} from '../src/utils/remoteBackup.js';
test('el respaldo externo exige depósito privado, cifra, descarga y valida restauración',async()=>{
 const objects=new Map();let uploads=0;
 const storage={async getBucket(){return {data:{public:false}};},async listBuckets(){return {data:[{id:'valoria-backups'}]};},from(){return {async list(){return {data:[]};},async upload(name,bytes){uploads++;objects.set(name,Buffer.from(bytes));return {};},async download(name){return {data:new Blob([objects.get(name)])};}};}};
 const db={storage,from(){return {select(){return this;},order(){return this;},async range(){return {data:[]};}};}};
 const result=await createRemoteBackup(db,'https://qa.example',{encryptionKey:'a'.repeat(64)});
 assert.equal(result.downloadVerified,true);assert.equal(result.restoreValidated,true);assert.equal(uploads,2);
 assert.ok(objects.has('last-success.json'));
 assert.equal(objects.get(result.archive).includes(Buffer.from('valoria-remote-v1')),false);
 assert.equal(result.images,0); // Backup bucket is never backed up into itself.
 await assert.rejects(createRemoteBackup(db,'https://qa.example',{encryptionKey:''}),/cifrado/);
 storage.getBucket=async()=>({data:{public:true}});
 await assert.rejects(createRemoteBackup(db,'https://qa.example',{encryptionKey:'a'.repeat(64)}),/privado/);
});
