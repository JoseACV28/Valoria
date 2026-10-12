import { publicationStatus } from '../utils/publicationSchedule.js';
import { backupStatus } from '../utils/siteBackup.js';
import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { Router } from 'express';
import { requireAdminMfa, adminMfaRequired } from '../utils/sessionSecurity.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { ADMIN_PERMISSIONS, SITE_OWNER_ID, getSiteAccess, requireSitePermission, listAdminRoles, saveAdminRole, listUsers, updatePublicProfile, getSiteSettings, saveSiteSettings, recordAdminAction, runAdminAction, listAdminAudit } from '../models/siteAdministration.js';
const router = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
router.get('/public-settings', async (req, res, next) => {
  try { res.json({ settings: await getSiteSettings() }); } catch (error) {
    if (error.status === 503) return res.json({ settings: { announcement: '', communityGuidelines: '' } });
    next(error);
  }
});
router.use(requireAuth);
router.get('/access', async (req, res, next) => { try { res.json({...await getSiteAccess(req.authUser.id),mfaRequired:adminMfaRequired(req.authUser),mfaVerified:req.authUser.mfaVerified===true,sessionCheck:req.authUser.sessionCheck||'local'}); } catch (e) { next(e); } });
router.use(requireAdminMfa);
router.get('/users', requireSitePermission('users'), async (req, res, next) => {
  try {
    const page = Math.max(1, Math.min(10000, parseInt(req.query.page, 10) || 1));
    res.json({ ...await listUsers(String(req.query.q || '').slice(0, 100), page), ownerId: SITE_OWNER_ID });
  } catch (e) { next(e); }
});
router.patch('/users/:id', requireSitePermission('users'), async (req, res, next) => {
  try {
    if (!uuid.test(req.params.id)) return res.status(400).json({ message: 'Usuario inválido.' });
    if (req.params.id === SITE_OWNER_ID && !req.siteAccess.isOwner) return res.status(403).json({ message: 'Solo el propietario puede modificar su perfil.' });
    if (Object.keys(req.body).some(key => !['display_name', 'bio'].includes(key)) || typeof req.body.display_name !== 'string' || !req.body.display_name.trim() || req.body.display_name.length > 80 || typeof req.body.bio !== 'string' || req.body.bio.length > 2000) return res.status(400).json({ message: 'Solo puedes editar el nombre público (1–80 caracteres) y la biografía (hasta 2000).' });
    // Record the attempt before mutation: an unavailable audit log prevents the write.
    await runAdminAction(req.authUser.id, 'profile.update.requested', req.params.id, { fields: ['display_name', 'bio'] },()=>updatePublicProfile(req.params.id, { display_name: req.body.display_name.trim(), bio: req.body.bio }));
    res.json({ message: 'Perfil público actualizado.' });
  } catch (e) { next(e); }
});
router.get('/settings', requireSitePermission('settings'), async (req, res, next) => { try { res.json({ settings: await getSiteSettings() }); } catch (e) { next(e); } });
router.put('/settings', requireSitePermission('settings'), async (req, res, next) => {
  try {
    const { announcement, communityGuidelines } = req.body;
    if (Object.keys(req.body).some(key => !['announcement', 'communityGuidelines'].includes(key)) || typeof announcement !== 'string' || announcement.length > 500 || typeof communityGuidelines !== 'string' || communityGuidelines.length > 4000) return res.status(400).json({ message: 'Aviso de hasta 500 caracteres y normas de hasta 4000.' });
    await runAdminAction(req.authUser.id, 'settings.update.requested', 'general', { fields: ['announcement', 'communityGuidelines'] },()=>saveSiteSettings({ announcement: announcement.trim(), communityGuidelines: communityGuidelines.trim() }));
    res.json({ message: 'Configuración guardada.' });
  } catch (e) { next(e); }
});
router.get('/roles', requireSitePermission('owner'), async (req, res, next) => { try { res.json({ roles: await listAdminRoles(), ownerId: SITE_OWNER_ID }); } catch (e) { next(e); } });
router.put('/roles/:id', requireSitePermission('owner'), async (req, res, next) => {
  try {
    const permissions = req.body.permissions;
    if (!uuid.test(req.params.id) || !Array.isArray(permissions) || permissions.some(x => !ADMIN_PERMISSIONS.includes(x)) || Object.keys(req.body).some(x => x !== 'permissions')) return res.status(400).json({ message: 'Selecciona permisos válidos.' });
    if (req.params.id === SITE_OWNER_ID) return res.status(403).json({ message: 'No se pueden cambiar los permisos del propietario.' });
    await runAdminAction(req.authUser.id, 'permissions.update.requested', req.params.id, { permissions },()=>saveAdminRole(req.params.id, [...new Set(permissions)], req.authUser.id));
    res.json({ message: permissions.length ? 'Permisos actualizados.' : 'Acceso administrativo revocado.' });
  } catch (e) { next(e); }
});
router.get('/system',requireSitePermission('owner'),async(req,res,next)=>{try{let database='local';if(isSupabaseEnabled()){const {error}=await supabaseAdmin.from('site_settings').select('id').limit(1);database=error?'unavailable':'connected';}res.json({database,backups:backupStatus,scheduledPublication:'Revisión cada 60 segundos mientras el servidor está activo',publication:publicationStatus,uptimeSeconds:Math.floor(process.uptime())});}catch(error){next(error);}});
router.get('/audit', requireSitePermission('owner'), async (req, res, next) => { try { res.json({ entries: await listAdminAudit() }); } catch (e) { next(e); } });
export default router;
