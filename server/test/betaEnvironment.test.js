import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBetaEnvironment} from '../src/config/betaEnvironment.js';

const config = {APP_ENV:'beta', NODE_ENV:'production', SUPABASE_URL:'https://cjbwjbmgrpjvinoczluc.supabase.co', PUBLIC_SITE_URL:'https://beta.example.com', CORS_ORIGINS:'https://beta.example.com'};
test('la beta pública exige producción, el proyecto QA y un único origen HTTPS', () => {
  assert.doesNotThrow(() => validateBetaEnvironment(config));
  for (const patch of [{NODE_ENV:'development'}, {SUPABASE_URL:'https://caieuouvehvukmcnmkyg.supabase.co'}, {CORS_ORIGINS:'https://other.example.com'}, {PUBLIC_SITE_URL:'http://beta.example.com', CORS_ORIGINS:'http://beta.example.com'}]) {
    assert.throws(() => validateBetaEnvironment({...config, ...patch}));
  }
});
test('el perfil beta no altera el servidor local ni staging', () => {
  assert.doesNotThrow(() => validateBetaEnvironment({APP_ENV:'staging'}));
  assert.doesNotThrow(() => validateBetaEnvironment({}));
});
