import test from 'node:test';import assert from 'node:assert/strict';import {validateQaEnvironment} from '../src/config/qaEnvironment.js';
const config={APP_ENV:'staging',SUPABASE_URL:'https://qa-isolated.supabase.co',PRIMARY_SUPABASE_URL:'https://primary.supabase.co',SUPABASE_ANON_KEY:'qa-public',SUPABASE_SERVICE_ROLE_KEY:'qa-private',SITE_OWNER_ID:'10000000-0000-4000-8000-000000000001',SESSION_CHECK_REQUIRED:'true',ADMIN_MFA_REQUIRED:'true'};
test('staging rechaza proyecto principal, claves reutilizadas, MFA omitido y configuración incompleta',()=>{
 assert.doesNotThrow(()=>validateQaEnvironment(config));
 for(const patch of [{SUPABASE_URL:config.PRIMARY_SUPABASE_URL},{SUPABASE_URL:'https://caieuouvehvukmcnmkyg.supabase.co'},{SUPABASE_SERVICE_ROLE_KEY:''},{ADMIN_MFA_REQUIRED:'false'},{SESSION_CHECK_REQUIRED:'false'},{NODE_ENV:'production'}])assert.throws(()=>validateQaEnvironment({...config,...patch}));
 assert.throws(()=>validateQaEnvironment(config,{SUPABASE_SERVICE_ROLE_KEY:'qa-private'}));assert.throws(()=>validateQaEnvironment(config,{SUPABASE_URL:'https://qa-isolated.supabase.co'}));
});
test('QA local no puede heredar conexiones o claves de Supabase',()=>{
 assert.doesNotThrow(()=>validateQaEnvironment({APP_ENV:'qa-local'}));for(const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'])assert.throws(()=>validateQaEnvironment({APP_ENV:'qa-local',[key]:'inherited'}));
});
