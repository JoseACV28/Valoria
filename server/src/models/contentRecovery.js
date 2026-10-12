import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { demoStories, demoChapters } from '../data/demoStore.js';
import { httpError } from '../utils/contentAccess.js';
export const RECOVERY_DAYS = 30;
const tables = { story: 'stories', chapter: 'chapters', illustration: 'illustration_posts' };
function localRows(type) { return type === 'story' ? demoStories : type === 'chapter' ? demoChapters : []; }
export async function rawWork(type, id) {
  if (!tables[type]) throw httpError(400, 'Tipo de contenido inválido.');
  if (!isSupabaseEnabled()) return localRows(type).find(x => x.id === id) || null;
  const { data, error } = await supabaseAdmin.from(tables[type]).select('*').eq('id', id).maybeSingle();
  if (error) throw httpError(503, 'Aplica la migración de recuperación en Supabase.');
  return data;
}
async function ownerOf(type, row) {
  return type === 'chapter' ? (await rawWork('story', row.story_id))?.author_id : row.author_id;
}
async function updateRaw(type, id, changes) {
  if (!isSupabaseEnabled()) Object.assign(localRows(type).find(x => x.id === id), changes);
  else { const { error } = await supabaseAdmin.from(tables[type]).update(changes).eq('id', id); if (error) throw httpError(503, 'No se pudo actualizar el contenido.'); }
}
export async function moveToTrash(type, id, actor) {
  const row = await rawWork(type, id);
  if (!row || await ownerOf(type, row) !== actor) throw httpError(404, 'Contenido no encontrado.');
  if (!row.deleted_at) await updateRaw(type, id, { deleted_at: new Date().toISOString() });
  if (isSupabaseEnabled() && type !== 'illustration') {
    let cleanup = supabaseAdmin.from('user_workspace').delete().eq('user_id',actor).eq('namespace','drafts').like('key','schedule:%');
    cleanup = type === 'story' ? cleanup.eq('data->>storyId',id) : cleanup.eq('key',`schedule:${id}`);
    const {error}=await cleanup; if(error)throw httpError(503,'La obra está en la papelera, pero no se pudo cancelar su programación. Reintenta.');
  }
}
export async function restoreFromTrash(type, id, actor) {
  const row = await rawWork(type, id);
  if (!row || await ownerOf(type, row) !== actor || !row.deleted_at) throw httpError(404, 'Contenido no encontrado en tu papelera.');
  if (Date.now() - Date.parse(row.deleted_at) > RECOVERY_DAYS * 86400000) throw httpError(410, 'El plazo de recuperación de 30 días terminó.');
  if (type === 'chapter' && (await rawWork('story', row.story_id))?.deleted_at) throw httpError(409, 'Restaura primero la historia de este capítulo.');
  // Restore privately: publication must always be an explicit editorial action.
  if (type === 'story') {
    if (!isSupabaseEnabled()) demoChapters.filter(x => x.story_id === id).forEach(x => { x.status = 'draft'; });
    else { const { error } = await supabaseAdmin.from('chapters').update({ status: 'draft' }).eq('story_id', id); if (error) throw httpError(503, 'No se pudo recuperar la historia: sus capítulos deben quedar en borrador.'); }
  }
  await updateRaw(type, id, { deleted_at: null, status: 'draft' });
}
export async function getTrash(actor) {
  const items = [];
  for (const type of Object.keys(tables)) {
    let rows;
    if (!isSupabaseEnabled()) rows = localRows(type).filter(x => x.deleted_at);
    else {
      let query = supabaseAdmin.from(tables[type]).select('*').not('deleted_at', 'is', null);
      if (type !== 'chapter') query = query.eq('author_id', actor);
      else query = supabaseAdmin.from('chapters').select('*,stories!inner(author_id)').not('deleted_at', 'is', null).eq('stories.author_id', actor);
      const { data, error } = await query; if (error) throw httpError(503, 'La papelera necesita la migración de recuperación.'); rows = data;
    }
    for (const row of rows) if (type !== 'chapter' || await ownerOf(type, row) === actor) {
      if (type !== 'chapter' && row.author_id !== actor) continue;
      const recoverUntil = new Date(Date.parse(row.deleted_at) + RECOVERY_DAYS * 86400000).toISOString();
      items.push({ type, id: row.id, title: row.title, deletedAt: row.deleted_at, recoverUntil, canRestore: Date.parse(recoverUntil) > Date.now() });
    }
  }
  return items.sort((a,b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));
}
export async function setModerationVisibility(type, id, hidden) {
  if (!['story', 'illustration'].includes(type)) throw httpError(400, 'Solo se puede ocultar una obra completa desde esta opción.');
  const row = await rawWork(type, id); if (!row || row.deleted_at) throw httpError(404, 'Obra no encontrada.');
  await updateRaw(type, id, { moderation_hidden_at: hidden ? new Date().toISOString() : null });
}
