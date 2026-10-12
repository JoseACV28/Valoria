import { randomUUID } from 'node:crypto';
import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { demoUsers } from '../data/authStore.js';

// The owner is configured on the server, never through editable profile metadata.
export const SITE_OWNER_ID = process.env.SITE_OWNER_ID || 'c9f926b5-b052-4e76-9af0-2f11f016a93e';
export const ADMIN_PERMISSIONS = ['users', 'settings', 'reports','support'];
const roles = new Map(), audit = [];
let settings = { announcement: '', communityGuidelines: '' };
function databaseError(error) {
  if (error) throw Object.assign(new Error('La administración necesita la migración 20261004_site_administration.sql en Supabase.'), { status: 503 });
}
export async function getSiteAccess(userId) {
  if (userId === SITE_OWNER_ID) return { isOwner: true, isAdmin: true, permissions: [...ADMIN_PERMISSIONS] };
  let role;
  if (!isSupabaseEnabled()) role = roles.get(userId);
  else {
    const { data, error } = await supabaseAdmin.from('site_admin_roles').select('permissions').eq('user_id', userId).maybeSingle();
    // Until the migration exists, delegation is unavailable and access fails closed.
    if (!error) role = data;
  }
  const permissions = (role?.permissions || []).filter(x => ADMIN_PERMISSIONS.includes(x));
  return { isOwner: false, isAdmin: permissions.length > 0, permissions };
}
export function requireSitePermission(permission) {
  return async (req, res, next) => {
    try {
      const access = await getSiteAccess(req.authUser?.id);
      if (!req.authUser || !(permission === 'owner' ? access.isOwner : access.isOwner || access.permissions.includes(permission))) {
        return res.status(403).json({ message: permission === 'owner' ? 'Esta acción está reservada al propietario del sitio.' : 'No tienes permiso para esta sección de administración.' });
      }
      req.siteAccess = access;
      next();
    } catch (error) { next(error); }
  };
}
export async function listAdminRoles() {
  if (!isSupabaseEnabled()) return [...roles].map(([user_id, value]) => ({ user_id, ...value }));
  const { data, error } = await supabaseAdmin.from('site_admin_roles').select('*'); databaseError(error); return data;
}
export async function saveAdminRole(userId, permissions, actorId) {
  if (userId === SITE_OWNER_ID) throw Object.assign(new Error('Los permisos del propietario son permanentes y no se pueden modificar desde el sitio.'), { status: 403 });
  const entry = { permissions, granted_by: actorId, updated_at: new Date().toISOString() };
  if (!isSupabaseEnabled()) roles.set(userId, entry);
  else { const { error } = await supabaseAdmin.from('site_admin_roles').upsert({ user_id: userId, ...entry }); databaseError(error); }
}
export async function listUsers(query = '', page = 1) {
  const start = (page - 1) * 20;
  if (!isSupabaseEnabled()) {
    const items = demoUsers.filter(x => x.displayName.toLowerCase().includes(query.toLowerCase()));
    return { users: items.slice(start, start + 20).map(x => ({ id: x.id, display_name: x.displayName, bio: x.bio || '' })), total: items.length };
  }
  let request = supabaseAdmin.from('profiles').select('id,display_name,bio,avatar_url,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(start, start + 19);
  if (query) request = request.ilike('display_name', `%${query}%`);
  const { data, error, count } = await request; databaseError(error); return { users: data, total: count };
}
export async function updatePublicProfile(id, data) {
  if (!isSupabaseEnabled()) {
    const user = demoUsers.find(x => x.id === id);
    if (!user) throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
    user.displayName = data.display_name; user.bio = data.bio; return;
  }
  const { data: updated, error } = await supabaseAdmin.from('profiles').update(data).eq('id', id).select('id').maybeSingle();
  databaseError(error); if (!updated) throw Object.assign(new Error('Usuario no encontrado.'), { status: 404 });
}
export async function getSiteSettings() {
  if (!isSupabaseEnabled()) return settings;
  const { data, error } = await supabaseAdmin.from('site_settings').select('data').eq('id', 'general').maybeSingle();
  databaseError(error); return data?.data || { announcement: '', communityGuidelines: '' };
}
export async function saveSiteSettings(data) {
  if (!isSupabaseEnabled()) settings = data;
  else { const { error } = await supabaseAdmin.from('site_settings').upsert({ id: 'general', data, updated_at: new Date().toISOString() }); databaseError(error); }
}
export async function recordAdminAction(actorId, action, targetId, details) {
  const entry = { id: randomUUID(), actor_id: actorId, action, target_id: targetId, details, created_at: new Date().toISOString() };
  if (!isSupabaseEnabled()) audit.unshift(entry);
  else { const { error } = await supabaseAdmin.from('site_admin_audit').insert(entry); databaseError(error); }
  return entry.id;
}
export async function runAdminAction(actorId, action, targetId, details, operation) {
  const id=await recordAdminAction(actorId,action,targetId,details);
  const finish=async outcome=>{
    const completed_at=new Date().toISOString();
    if(!isSupabaseEnabled())Object.assign(audit.find(x=>x.id===id),{outcome,completed_at});
    else {const {error}=await supabaseAdmin.from('site_admin_audit').update({outcome,completed_at}).eq('id',id);if(error)throw new Error('No se pudo confirmar el resultado en el registro de acciones.');}
  };
  let result;
  try {result=await operation();} catch(error){await finish('failed').catch(()=>{});throw error;}
  await finish('completed'); return result;
}
export async function listAdminAudit() {
  if (!isSupabaseEnabled()) return audit.slice(0, 100);
  const { data, error } = await supabaseAdmin.from('site_admin_audit').select('*').order('created_at', { ascending: false }).limit(100); databaseError(error); return data;
}
