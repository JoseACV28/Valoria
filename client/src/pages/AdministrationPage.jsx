import { ui } from "../i18n/runtime.js";
import {ExperienceAdministration} from '../components/common/ExperienceAdministration';
import {ReporterResponse} from '../components/common/ReporterResponse';
import {LaunchAdministration} from '../components/common/LaunchAdministration';
import { ReportReview } from '../components/common/ReportReview';
import { AccountSecurity } from '../components/common/AccountSecurity';
import { useEffect, useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Navbar } from '../components/layout/Navbar';
import { workspaceRequest } from '../api/workspaceApi';
import styles from '../styles/AdministrationPage.module.css';

const permissions = { users: 'Gestionar perfiles públicos', settings: 'Editar avisos y normas', reports: 'Revisar denuncias',support:'Gestionar solicitudes de soporte' };
export function AdministrationPage({ auth, navFilters, onNavigate }) {
  const [access, setAccess] = useState(null);
  const [tab, setTab] = useState('users');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [ownerId, setOwnerId] = useState('');
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [settings, setSettings] = useState({ announcement: '', communityGuidelines: '' });
  const [reports, setReports] = useState([]);
  const [resolutions, setResolutions] = useState({});
  const [audit, setAudit] = useState([]);
  const [system,setSystem]=useState(null);
  const request = (path, method, body) => workspaceRequest(path, auth.token, method, body);

  useEffect(() => {
    let active = true;
    setAccess(null); setLoading(true); setMessage('');
    if (!auth.token) { setLoading(false); return; }
    request('admin/access').then(data => {
      if (!active) return;
      setAccess(data); setTab(data.isOwner ? 'users' : data.permissions[0] || 'users');
    }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.token]);

  useEffect(() => {
    if (!access?.isAdmin || (access.mfaRequired&&!access.mfaVerified)) return;
    if(['editorial','privacy','support','documents','alerts'].includes(tab)){setLoading(false);return;}
    let active = true;
    setLoading(true); setMessage(''); setEditing(null);
    const endpoint = tab === 'users' || tab === 'roles' ? `admin/users?q=${encodeURIComponent(search)}&page=${page}` : tab === 'reports' ? 'reports' : `admin/${tab}`;
    Promise.all([request(endpoint), ...(tab === 'roles' ? [request('admin/roles')] : [])]).then(([data, roleData]) => {
      if (!active) return;
      if (tab === 'users' || tab === 'roles') { setUsers(data.users); setTotal(data.total); setOwnerId(data.ownerId); }
      if (tab === 'roles') setRoles(roleData.roles);
      if (tab === 'settings') setSettings(data.settings);
      if (tab === 'reports') setReports(data.reports);
      if (tab === 'audit') setAudit(data.entries);
      if(tab==='system')setSystem(data);
    }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [access, tab, search, page, auth.token]);

  async function mutate(action, done) {
    if (busy) return;
    setBusy(true); setMessage('');
    try { const result = await action(); done?.(); setMessage(result.message || 'Cambios guardados.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const tabs = Object.entries(permissions).filter(([key]) => access?.isOwner || access?.permissions.includes(key)).map(([key]) => ({ key, label: { users: 'Usuarios', settings: 'Configuración', reports: 'Denuncias',support:'Centro de soporte' }[key] }));
  if(access?.isOwner||access?.permissions.includes('settings'))tabs.push({key:'editorial',label:'Selecciones editoriales'});
  if(access?.isOwner)tabs.push({key:'privacy',label:'Solicitudes de privacidad'});
  if (access?.isOwner) tabs.push({key:'documents',label:'Información pública del sitio'},{key:'alerts',label:'Alertas operativas'},{ key: 'roles', label: 'Administradores' }, { key: 'audit', label: 'Registro de acciones' }, {key:'system',label:'Estado y respaldos'});

  return <AppShell auth={auth} currentView="administration" onNavigate={onNavigate}><main className={styles.page}>
    <Navbar auth={auth} currentView="administration" {...navFilters} onNavigate={onNavigate} />
    <header className={styles.header}><span>{ui("GESTIÓN DEL SITIO")}</span><h1>{ui("Administración")}</h1><p>{access?.isOwner ? ui("Tu cuenta es la propietaria. Tú decides quién puede administrar y qué permisos tiene.") : ui("Gestiona las secciones que el propietario te ha autorizado.")}</p></header>
    {!auth.token ? <section className={styles.card}><p>{ui("Inicia sesión para acceder.")}</p><button type="button" onClick={() => onNavigate('login')}>{ui("Iniciar sesión")}</button></section> : access && !access.isAdmin ? <section className={styles.card}><h2>{ui("Acceso restringido")}</h2><p>{ui("Tu cuenta no tiene permisos administrativos.")}</p></section> : null}
    {access?.isAdmin && <AccountSecurity auth={auth} required={access.mfaRequired} sessionCheck={access.sessionCheck}/>}
    {access?.isAdmin && (!access.mfaRequired||access.mfaVerified) && <>
      <nav className={styles.tabs} aria-label={ui("Secciones de administración")}>{tabs.map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} onClick={() => { setTab(item.key); setPage(1); }}>{ui(item.label)}</button>)}</nav>
      {(tab === 'users' || tab === 'roles') && <section className={styles.card}>
        <h2>{tab === 'roles' ? ui("Delegar administración") : ui("Perfiles de usuario")}</h2>
        {tab === 'roles' && <p>{ui("Selecciona una cuenta y concede solo las tareas que necesita. Desmarca todos los permisos para revocar su acceso. El rol de propietario no se puede delegar desde aquí.")}</p>}
        <form className={styles.search} onSubmit={event => { event.preventDefault(); setSearch(query.trim()); setPage(1); }}><label>{ui("Buscar por nombre público")}<input value={query} onChange={event => setQuery(event.target.value)} placeholder={ui("Nombre del usuario")} maxLength={100} /></label><button type="submit">{ui("Buscar")}</button></form>
        <div className={styles.users}>{users.map(user => <article className={styles.user} key={user.id}><div><strong>{user.display_name || ui("Creador de Valoria")}</strong><small>{user.id === ownerId ? ui("Propietario · acceso permanente") : roles.find(role => role.user_id === user.id)?.permissions.length ? ui("Administrador delegado") : tab === 'roles' ? ui("Sin permisos administrativos") : ui("Perfil público")}</small></div><div className={styles.actions}><button type="button" onClick={() => onNavigate('creator-profile', { profileId: user.id })}>{ui("Ver perfil")}</button>{(user.id !== ownerId || access.isOwner) && (tab !== 'roles' || user.id !== ownerId) && <button type="button" disabled={busy} aria-expanded={editing?.id === user.id} aria-controls={editing?.id === user.id ? `user-options-${user.id}` : undefined} onClick={() => { setMessage(''); setEditing(current => current?.id === user.id ? null : { ...user }); setSelectedPermissions(roles.find(role => role.user_id === user.id)?.permissions || []); }}>{tab === 'roles' ? ui("Permisos") : ui("Editar")} <span aria-hidden="true">{editing?.id === user.id ? '▴' : '▾'}</span></button>}</div>
        {editing?.id === user.id && <form id={`user-options-${user.id}`} aria-label={tab === 'roles' ? ui("Permisos de {0}",[user.display_name]) : ui("Editar perfil de {0}",[user.display_name])} className={styles.editor} onSubmit={event => { event.preventDefault(); if (tab === 'roles') mutate(() => request(`admin/roles/${editing.id}`, 'PUT', { permissions: selectedPermissions }), () => { setRoles(current => [...current.filter(x => x.user_id !== editing.id), { user_id: editing.id, permissions: selectedPermissions }]); setEditing(null); }); else mutate(() => request(`admin/users/${editing.id}`, 'PATCH', { display_name: editing.display_name, bio: editing.bio || '' }), () => { setUsers(current => current.map(x => x.id === editing.id ? editing : x)); setEditing(null); }); }}>
          <h3>{tab === 'roles' ? ui("Permisos de {0}",[editing.display_name]) : ui("Editar perfil público")}</h3>
          {tab === 'roles' ? <fieldset className={styles.permissionList}><legend>{ui("Tareas autorizadas")}</legend>{Object.entries(permissions).map(([key, label]) => <label key={key}><input type="checkbox" checked={selectedPermissions.includes(key)} onChange={event => setSelectedPermissions(current => event.target.checked ? [...current, key] : current.filter(x => x !== key))} /><span>{ui(label)}</span></label>)}</fieldset> : <><label>{ui("Nombre público")}<input required maxLength={80} value={editing.display_name || ''} onChange={event => setEditing({ ...editing, display_name: event.target.value })} /></label><label>{ui("Biografía")}<textarea maxLength={2000} rows={4} value={editing.bio || ''} onChange={event => setEditing({ ...editing, bio: event.target.value })} /></label></>}
          <div className={styles.actions}><button disabled={busy} type="submit">{tab === 'roles' ? ui("Guardar permisos") : ui("Guardar perfil")}</button><button disabled={busy} type="button" onClick={() => setEditing(null)}>{ui("Cancelar")}</button></div>
          {message && <p className={styles.message} role="status">{ui(message)}</p>}
        </form>}
        </article>)}</div>
        {!loading && !users.length && <p>{ui("No se encontraron usuarios.")}</p>}
        <div className={styles.pagination}><button type="button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>{ui("Anterior")}</button><span>{ui("Página ")}{page} · {total}{ui(" usuarios")}</span><button type="button" disabled={page * 20 >= total || loading} onClick={() => setPage(page + 1)}>{ui("Siguiente")}</button></div>

      </section>}
      {tab === 'settings' && <form className={styles.card} onSubmit={event => { event.preventDefault(); mutate(() => request('admin/settings', 'PUT', settings)); }}><h2>{ui("Avisos y normas")}</h2><label>{ui("Aviso en la portada")}<textarea rows={3} maxLength={500} value={settings.announcement} onChange={event => setSettings({ ...settings, announcement: event.target.value })} /></label><small>{ui("Déjalo vacío para ocultar el aviso.")}</small><label>{ui("Normas de la comunidad")}<textarea rows={6} maxLength={4000} value={settings.communityGuidelines} onChange={event => setSettings({ ...settings, communityGuidelines: event.target.value })} /></label><button disabled={busy || loading} type="submit">{ui("Guardar configuración")}</button></form>}
      {tab === 'reports' && <section className={styles.card}><h2>{ui("Denuncias")}</h2>{!loading && !reports.length && <p>{ui("No hay denuncias pendientes de revisar.")}</p>}{reports.map(report => <article className={styles.editor} key={report.id}><strong>{report.target_type} · {report.status}</strong><p>{report.reason}</p><small>{ui("Contenido: ")}{report.target_id}</small><ReportReview report={report} auth={auth}/><ReporterResponse report={report} auth={auth}/><label>{ui("Resolución")}<textarea maxLength={2000} value={resolutions[report.id] ?? report.resolution ?? ''} onChange={event => setResolutions({ ...resolutions, [report.id]: event.target.value })} /></label><div className={styles.actions}>{['reviewing', 'resolved', 'dismissed'].map(status => <button disabled={busy} type="button" key={status} onClick={() => mutate(() => request(`reports/${report.id}`, 'PATCH', { status, resolution: resolutions[report.id] ?? report.resolution ?? '' }), () => setReports(current => current.map(x => x.id === report.id ? { ...x, status, resolution: resolutions[report.id] ?? x.resolution } : x)))}>{status === 'reviewing' ? ui("En revisión") : status === 'resolved' ? ui("Resolver") : ui("Descartar")}</button>)}</div></article>)}</section>}
      {tab === 'audit' && <section className={styles.card}><h2>{ui("Registro de acciones")}</h2><p>{ui("Las acciones indican si se completaron, fallaron o siguen sin confirmar.")}</p>{audit.map(entry => <article className={styles.user} key={entry.id}><div><strong>{entry.action} · {({completed:'Completada',failed:'Fallida',requested:'Sin confirmar'})[entry.outcome||'requested']}</strong><small>{new Date(entry.created_at).toLocaleString()} · {entry.actor_id}</small><small>{ui("Destino: ")}{entry.target_id}</small><small>{entry.details.permissions ? ui("Permisos: {0}",[entry.details.permissions.join(', ') || 'ninguno']) : ui("Campos: {0}",[(entry.details.fields || []).join(', ')])}</small></div></article>)}{!loading && !audit.length && <p>{ui("Aún no hay acciones registradas.")}</p>}</section>}
      {tab==='system' && system && <section className={styles.card}><h2>{ui("Estado del sitio y respaldos")}</h2><p>{ui("Base de datos: ")}{system.database==='connected'?ui("Conectada"):system.database==='local'?ui("Entorno de prueba local"):ui("No disponible")}</p><p>{ui("Publicación programada: ")}{system.scheduledPublication}</p>{system.publication?.lastError && <p role="alert">{system.publication.lastError}</p>}<p>{ui("Respaldo diario: ")}{system.backups.enabled?ui("Activo mientras el servidor está funcionando"):ui("Desactivado")}</p><p>{system.backups.running?ui("Respaldo en curso…"):system.backups.lastSuccess?ui("Última copia completa: {0}",[new Date(system.backups.lastSuccess).toLocaleString()]):ui("Todavía no se ha completado una copia en esta ejecución del servidor.")}</p>{system.backups.lastError && <p role="alert">{system.backups.lastError}</p>}<p>{ui("Las copias se guardan en el servidor, fuera de los archivos públicos. Su restauración se realiza con tus accesos de propietario siguiendo la guía de respaldos.")}</p></section>}
      {['support','documents','alerts'].includes(tab)&&<LaunchAdministration key={tab} auth={auth} mode={tab}/>} {['editorial','privacy'].includes(tab)&&<ExperienceAdministration key={tab} mode={tab} auth={auth} access={access}/>}{access.isOwner && <section className={styles.ownerNotice}><strong>{ui("Control exclusivo del propietario")}</strong><p>{ui("Solo tú puedes administrar permisos. Eliminar el sitio, transferir su propiedad y modificar credenciales de infraestructura se gestionan fuera de este panel, con tus accesos al alojamiento y Supabase.")}</p></section>}
    </>}
    {loading && <p role="status">{ui("Cargando administración…")}</p>}
    {message && !editing && <p className={styles.message} role="status">{ui(message)}</p>}
  </main></AppShell>;
}



