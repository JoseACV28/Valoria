import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineDocument } from '../src/utils/offlineDocument.js';

test('la copia descargable conserva todo el texto y un índice sin recursos externos',()=>{
  const html=createOfflineDocument({title:'Mi historia',author:'Autora',description:'Una sinopsis',chapters:[{title:'Inicio',content:'Primera escena\nUna segunda línea'},{title:'Final',content:'El desenlace 💜'}]});
  assert.match(html,/href="#capitulo-1"/);assert.match(html,/id="capitulo-2"/);
  assert.match(html,/Primera escena/);assert.match(html,/El desenlace 💜/);
  assert.doesNotMatch(html,/<script|<link|<img|src="/i);
  assert.match(html,/default-src 'none'/);
});

test('los nombres y el texto antiguo no pueden introducir contenido ejecutable',()=>{
  const html=createOfflineDocument({title:'<script>alert(1)</script>',author:'<img src=x onerror=alert(1)>',chapters:[{title:'</h2><script>bad()</script>',content:'<script>bad()</script>'}]});
  assert.doesNotMatch(html,/<script|<img/i);
  assert.match(html,/&lt;script&gt;/);
});
