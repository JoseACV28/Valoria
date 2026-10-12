import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {sanitizeImage} from '../src/utils/imageValidation.js';
import {enforceStorageQuota,withUploadLock,STORAGE_LIMITS} from '../src/utils/uploadQuota.js';
import {storeImageFile} from '../src/utils/storage.js';
test('imagen: decodifica formatos, elimina EXIF y conserva transparencia',async()=>{
  for(const [format,mime] of [['png','image/png'],['jpeg','image/jpeg'],['webp','image/webp'],['gif','image/gif']]){
    const source=await sharp({create:{width:4,height:3,channels:4,background:{r:120,g:40,b:180,alpha:0.5}}}).withMetadata().toFormat(format).toBuffer();
    const result=await sanitizeImage(source,mime),meta=await sharp(result.buffer).metadata();
    assert.equal(meta.format,format);assert.equal(meta.width,4);assert.equal(meta.height,3);assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);
    if(format==='png'||format==='webp')assert.equal(meta.hasAlpha,true);
  }
});
test('imagen: rechaza contenido truncado, firmas falsas, MIME distinto y dimensiones excesivas',async()=>{
  const png=await sharp({create:{width:3,height:3,channels:3,background:'#123456'}}).png().toBuffer();
  for(const [bytes,mime] of [[png.subarray(0,30),'image/png'],[Buffer.from('<svg><script>bad()</script></svg>'),'image/png'],[png,'image/jpeg']])await assert.rejects(sanitizeImage(bytes,mime),e=>e.status===400);
  const damaged=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await assert.rejects(sanitizeImage(damaged,'image/png'),e=>e.status===400);
  const wide=await sharp({create:{width:17000,height:1,channels:3,background:'#123456'}}).png().toBuffer();await assert.rejects(sanitizeImage(wide,'image/png'),e=>e.status===413);
  await assert.rejects(sanitizeImage(png,'image/png',10),e=>e.status===413);
});
test('imagen: conserva los fotogramas de GIF animado',async()=>{
  const gif=await sharp(Buffer.from([255,0,0,255,0,255,0,255]),{raw:{width:1,height:2,channels:4,pageHeight:1}}).gif({delay:[100,100],loop:0}).toBuffer();
  assert.equal((await sharp(gif,{animated:true}).metadata()).pages,2);
  const result=await sanitizeImage(gif,'image/gif');assert.equal(result.frames,2);assert.equal((await sharp(result.buffer,{animated:true}).metadata()).pages,2);
});
test('imagen: extensión ejecutable no se acepta aunque los píxeles sean válidos',async()=>{
  const buffer=await sharp({create:{width:1,height:1,channels:3,background:'#8833aa'}}).png().toBuffer();
  await assert.rejects(storeImageFile({file:{buffer,mimetype:'image/png',originalname:'avatar.php',size:buffer.length},folder:'chapters',request:{authUser:{id:'qa-extension'}}}),e=>e.status===400);
});
test('cuota: suma depósitos y aplica máximos; fallos de Storage no permiten subir',async()=>{
  const now=Date.now(),old=new Date(now-2*86400000).toISOString();
  const db=items=>({storage:{from:()=>({list:async prefix=>({data:prefix==='qa'?[{name:'covers',id:null}]:items})})}});
  const result=await enforceStorageQuota(db([{id:'file',name:'a.png',metadata:{size:100},created_at:old}]),'qa',10,['one','two'],now);assert.equal(result.bytes,200);assert.equal(result.files,2);
  await assert.rejects(enforceStorageQuota(db([{id:'file',name:'a',metadata:{size:STORAGE_LIMITS.bytes},created_at:old}]),'qa',1,['one'],now),e=>e.status===413);
  await assert.rejects(enforceStorageQuota(db([{id:'file',name:'a',metadata:{size:STORAGE_LIMITS.dailyBytes},created_at:new Date(now).toISOString()}]),'qa',1,['one'],now),e=>e.status===413);
  await assert.rejects(enforceStorageQuota({storage:{from:()=>({list:async()=>({error:{}})})}},'qa',10,['one']),e=>e.status===503);
});
test('cuota: bloqueo por cuenta evita carreras y se libera tras errores',async()=>{
  let release;const first=withUploadLock('qa',()=>new Promise(resolve=>{release=resolve;}));
  await assert.rejects(withUploadLock('qa',async()=>{}),e=>e.status===429);release();await first;
  await assert.rejects(withUploadLock('qa',async()=>{throw new Error('failed');}));
  assert.equal(await withUploadLock('qa',async()=>true),true);
});
