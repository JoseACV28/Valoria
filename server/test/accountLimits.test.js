import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {accountLoginLimits} from '../src/middlewares/requestLimits.js';
function attempt(email,success=false){
  const res=new EventEmitter();res.set=()=>{};res.status=function(n){this.statusCode=n;return this;};res.json=()=>{};
  let passed=false;accountLoginLimits({method:'POST',path:'/api/auth/login',body:{email},ip:randomUUID()},res,()=>{passed=true;});
  if(passed&&success){res.statusCode=200;res.emit('finish');}
  return passed;
}
test('cambiar IP o mayúsculas no evade el límite de intentos por cuenta',()=>{
  const email=`${randomUUID()}@example.invalid`;
  for(let i=0;i<10;i++)assert.equal(attempt(i%2?email.toUpperCase():email),true);
  assert.equal(attempt(email),false);
  assert.equal(attempt(`${randomUUID()}@example.invalid`),true);
});
test('un login válido reinicia su contador sin afectar otra cuenta',()=>{
  const email=`${randomUUID()}@example.invalid`;
  for(let i=0;i<9;i++)assert.equal(attempt(email),true);
  assert.equal(attempt(email,true),true);
  assert.equal(attempt(email),true);
});
