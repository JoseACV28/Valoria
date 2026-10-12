import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryCounts } from '../src/utils/categoryCounts.js';

test('category counts separate work types and count a multi-category work once per category', () => {
  const result = categoryCounts(
    [{category:'Romance'}, {category:'Fantasia'}, {}],
    [{category:'Romance',categories:['Romance','Fantasia','Fantasia']}, {categories:['Portadas']}]
  );
  assert.deepEqual(result, {
    Romance: {stories:1,illustrations:1},
    Fantasia: {stories:1,illustrations:1},
    Portadas: {stories:0,illustrations:1}
  });
});
