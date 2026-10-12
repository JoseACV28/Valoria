import test from 'node:test';import assert from 'node:assert/strict';
import {clientIp} from '../src/utils/clientIp.js';
test('solo Render en producción usa la cabecera de su ingreso Cloudflare',()=>{
 const req={ip:'127.0.0.1',headers:{'cf-connecting-ip':'203.0.113.4','x-forwarded-for':'192.0.2.9'}};
 assert.equal(clientIp(req,{RENDER:'true',NODE_ENV:'production'}),'203.0.113.4');
 assert.equal(clientIp(req,{}),'127.0.0.1');
 assert.equal(clientIp(req,{RENDER:'true',NODE_ENV:'development'}),'127.0.0.1');
 assert.equal(clientIp({...req,headers:{'cf-connecting-ip':'bad','x-forwarded-for':'192.0.2.9'}},{RENDER:'true',NODE_ENV:'production'}),'127.0.0.1');
});
