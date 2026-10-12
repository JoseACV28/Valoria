import test from 'node:test';import assert from 'node:assert/strict';import {newClientId} from '../src/utils/clientId.js';
test('identificador usa el generador nativo cuando está disponible',()=>assert.equal(newClientId({randomUUID:()=>'native-id'}),'native-id'));
test('identificador local usa bytes criptográficos y bits UUID v4 sin requerir randomUUID',()=>{let called=false;const id=newClientId({getRandomValues:bytes=>{called=true;return bytes.fill(255);}});assert.ok(called);assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);});
test('no se genera un identificador con aleatoriedad débil si falta Crypto',()=>assert.throws(()=>newClientId({}),/identificador seguro/));
