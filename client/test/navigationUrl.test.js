import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalHashUrl } from '../src/utils/navigationUrl.js';

test('internal navigation from a public work drops its pathname and preserves hash filters', () => {
  for (const pathname of ['/illustration/una-escena', '/story/mi-historia']) {
    assert.equal(canonicalHashUrl({pathname,hash:'#/'}), '/#/');
    assert.equal(canonicalHashUrl({pathname,hash:'#/search?q=mar%20y%20sol&category=Romance'}), '/#/search?q=mar%20y%20sol&category=Romance');
    assert.equal(canonicalHashUrl({pathname,search:'?recovery=1',hash:'#/reset-password'}), '/?recovery=1#/reset-password');
  }
});

test('public work links and authentication callbacks are left intact', () => {
  assert.equal(canonicalHashUrl({pathname:'/illustration/una-escena'}), null);
  assert.equal(canonicalHashUrl({pathname:'/story/mi-historia',hash:'#access_token=fictitious'}), null);
  assert.equal(canonicalHashUrl({pathname:'/',hash:'#/'}), null);
});
