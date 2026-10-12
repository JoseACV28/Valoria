import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

test('el perfil con sesión se renderiza sin errores, incluido el cuadro de denuncias', async t => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const storage = { getItem: () => null };
  globalThis.localStorage = storage;
  globalThis.window = { localStorage: storage, location: { origin: 'http://localhost:5174', pathname: '/' } };
  t.after(() => {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalStorage;
  });
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {renderToString} from 'react-dom/server';
        import {UserProfilePage} from './src/pages/UserProfilePage.jsx';
        export const renderProfile = auth => renderToString(React.createElement(UserProfilePage, {
          auth, navFilters: {}, onNavigate() {}
        }));`,
      resolveDir: root,
      loader: 'jsx'
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    define: { 'import.meta.env': '{}' },
    loader: { '.svg': 'text', '.png': 'dataurl', '.webp': 'dataurl' },
    plugins: [{ name: 'styles', setup(builder) {
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
    } }]
  });
  const compiled = new Module(`${root}profile-render-test.cjs`);
  compiled.paths = Module._nodeModulePaths(root);
  compiled._compile(result.outputFiles[0].text, compiled.id);
  const html = compiled.exports.renderProfile({
    isAuthenticated: true, token: 'test-only',
    user: { id: 'test-profile', displayName: 'Escritor de prueba', email: 'profile@example.invalid' }
  });
  assert.match(html, /Escritor de prueba/);
  assert.match(html, /Historias/);
  // El acceso personal está en el menú desplegable; comprobar el control real del perfil.
  assert.match(html, /Edita tu perfil/);
});
