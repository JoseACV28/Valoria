import test from 'node:test';
import assert from 'node:assert/strict';
import { authRequest } from '../src/utils/authRequest.js';

test('acceso: conexión interrumpida termina y los errores HTTP conservan su estado', async () => {
  await assert.rejects(authRequest('/api/auth/login', {}, { timeoutMs: 5, fetchImpl: (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) }), /no respondió a tiempo/);
  await assert.rejects(authRequest('/api/auth/login', {}, { fetchImpl: async () => { throw new TypeError('network'); } }), /No se pudo conectar/);
  await assert.rejects(authRequest('/api/auth/login', {}, { fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ message: 'Credenciales incorrectas' }) }) }), error => error.status === 401 && error.message === 'Credenciales incorrectas');
});

test('acceso: envía el payload y devuelve la sesión sin alterar contraseñas', async () => {
  const body = JSON.stringify({ email: 'demo@example.invalid', password: ' exact password ' });
  assert.deepEqual(await authRequest('/api/auth/login', { method: 'POST', body }, { fetchImpl: async (url, options) => {
    assert.equal(url, '/api/auth/login'); assert.equal(options.body, body); assert.ok(options.signal);
    return { ok: true, json: async () => ({ user: { id: 'fictional' } }) };
  } }), { user: { id: 'fictional' } });
});
