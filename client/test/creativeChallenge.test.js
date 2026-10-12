import test from 'node:test';
import assert from 'node:assert/strict';
import {creativeChallenge,challengeEntries,launchCommunity} from '../src/utils/creativeChallenge.js';
test('desafío mensual conserva etiqueta UTC y cambia al mes siguiente',()=>{
 const a=creativeChallenge(new Date('2026-10-01T00:00:00Z')),b=creativeChallenge(new Date('2026-10-31T23:59:59Z')),c=creativeChallenge(new Date('2026-11-01T00:00:00Z'));
 assert.equal(a.tag,b.tag);assert.equal(a.tag,'reto-2026-10');assert.notEqual(a.tag,c.tag);assert.equal(a.endsAt.toISOString(),'2026-11-01T00:00:00.000Z');
});
test('participaciones excluyen borradores, obras privadas y etiquetas parecidas',()=>{
 const works=[{id:1,status:'published',tags:['reto-2026-10']},{id:2,status:'draft',tags:['reto-2026-10']},{id:3,status:'published',visibility:'private',tags:['reto-2026-10']},{id:4,status:'published',visibility:'unlisted',tags:['reto-2026-10']},{id:5,status:'published',tags:['reto-2026-100']}];
 assert.deepEqual(challengeEntries(works,'reto-2026-10').map(x=>x.id),[1]);
});
test('la portada omite mensajes explícitos del seed sin modificar contenido real',()=>{
 const posts=[{id:1,content:'Este mensaje forma parte del seed de prueba.'},{id:2,content:'Hoy escribí el primer capítulo.'}];assert.deepEqual(launchCommunity(posts).map(x=>x.id),[2]);assert.equal(posts.length,2);
});
