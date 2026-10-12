import test from 'node:test';
import assert from 'node:assert/strict';
import { syncApiSession, closeAuthSession } from '../src/utils/authSession.js';
test('la sesión de correo sincroniza ambos tokens con el SDK; demo no crea sesión remota', async()=>{
  const calls=[]; const client={auth:{async setSession(value){calls.push(value);return {error:null};}}};
  await syncApiSession(client,{accessToken:'test-only-access',refreshToken:'test-only-refresh'});
  assert.deepEqual(calls,[{access_token:'test-only-access',refresh_token:'test-only-refresh'}]);
  await syncApiSession(client,{accessToken:'local',refreshToken:null});
  await syncApiSession(null,{accessToken:'local'}); assert.equal(calls.length,1);
});
test('un fallo de sincronización no refleja tokens ni errores del proveedor',async()=>{
  await assert.rejects(syncApiSession({auth:{setSession:async()=>({error:new Error('secret provider details')})}},{accessToken:'test',refreshToken:'test'}),{message:'No se pudo preparar la sesión. Reintenta el acceso.'});
});
test('logout revoca en API antes de limpiar el SDK y solo cierra la sesión actual',async()=>{
  const calls=[];
  await closeAuthSession({auth:{async signOut(options){calls.push(options);return {error:null};}}},'test-only',async token=>calls.push(token));
  assert.deepEqual(calls,['test-only',{scope:'local'}]);
});
test('logout no informa éxito si falla la red o el proveedor',async()=>{
  const sdk={auth:{signOut:async()=>({error:new Error('private provider details')})}};
  const message='No se pudo confirmar el cierre de sesión. Comprueba la conexión y reintenta.';
  await assert.rejects(closeAuthSession(sdk,'test-only',async()=>{}),{message});
  await assert.rejects(closeAuthSession(null,'test-only',async()=>{throw new Error('network');}),{message});
});
