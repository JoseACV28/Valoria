import test from 'node:test';import assert from 'node:assert/strict';
import {requestRecovery,validateNewPassword,rememberRecovery,hasRecovery,clearRecovery,RECOVERY_MESSAGE,readCallbackSession} from '../src/utils/passwordRecovery.js';
test('recuperación: email request uses current origin, PKCE return route, generic reply and no provider details',async()=>{
  const calls=[],client={auth:{resetPasswordForEmail:async(...args)=>{calls.push(args);return {};}}};
  assert.equal(await requestRecovery(client,' QA@EXAMPLE.COM ',{origin:'https://valoria.example',pathname:'/'}),RECOVERY_MESSAGE);
  assert.deepEqual(calls[0],['qa@example.com',{redirectTo:'https://valoria.example/?recovery=1#/reset-password'}]);
  await assert.rejects(requestRecovery({auth:{resetPasswordForEmail:async()=>({error:{message:'private provider details'}})}},'qa@example.com',{origin:'https://valoria.example',pathname:'/'}),{message:'No se pudo solicitar el correo. Espera unos minutos y reintenta.'});
});
test('recuperación: marker binds account/session, expires, stores no token and tolerates denied storage',()=>{
  const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)};
  const token=id=>`e30.${btoa(JSON.stringify({session_id:id}))}.qa`,session={user:{id:'qa'},access_token:token('first')};
  rememberRecovery(session,storage,100);assert.equal(hasRecovery(session,storage,200),true);assert.equal(hasRecovery({...session,access_token:token('second')},storage,200),false);assert.equal(hasRecovery(session,storage,100+15*60000),false);assert.ok(!JSON.stringify([...data]).includes(session.access_token));clearRecovery(storage);assert.equal(data.size,0);
  assert.equal(hasRecovery(session,{getItem(){throw Error();}},200),false);
});
test('recuperación: passwords are preserved exactly and mismatch/short Unicode rejected',()=>{
  assert.doesNotThrow(()=>validateNewPassword(' long phrase with spaces ',' long phrase with spaces '));
  assert.throws(()=>validateNewPassword('😀'.repeat(8),'😀'.repeat(8)));assert.throws(()=>validateNewPassword('Long-password-123!','Different-password-456!'));
});
test('callback: SDK exchanges once; app reads resulting session and removes code from URL',async()=>{
  const session={user:{id:'qa'}},replacements=[],client={auth:{getSession:async()=>({data:{session}}),exchangeCodeForSession:()=>assert.fail('must not exchange twice')}};
  const location={href:'https://valoria.example/?code=qa-disposable-code&state=qa&recovery=1#/reset-password'},history={replaceState:(_,__,value)=>replacements.push(value)};
  assert.equal(await readCallbackSession(client,location,history),session);assert.deepEqual(replacements,['/#/reset-password']);
  assert.equal(await readCallbackSession({auth:{getSession:async()=>({error:{message:'private'}})}},location,history),null);
});
