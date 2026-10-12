import { backupStatus, runScheduledBackup, initializeDailyBackup } from './utils/siteBackup.js';
import {initializeRemoteBackup, runRemoteBackup} from './utils/remoteBackup.js';
import { supabaseAdmin } from './config/supabase.js';
import { publishDueChapters } from "./utils/publicationSchedule.js";
import {publicationStatus} from './utils/publicationSchedule.js';
import {checkOperations} from './utils/operationalAlerts.js';
import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, process.env.HOST||(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'), () => {
  console.log(`HistoPad server listening on http://localhost:${env.port}`);
});

setInterval(()=>publishDueChapters().catch(()=>{}),60000).unref();
publishDueChapters().catch(()=>{});
setInterval(()=>checkOperations({backup:backupStatus,publication:publicationStatus}).catch(()=>{}),60000).unref();

backupStatus.enabled=process.env.SITE_BACKUP_ENABLED==='true';
if(backupStatus.enabled){const remote=process.env.SITE_BACKUP_STORAGE==='supabase';(remote?initializeRemoteBackup:initializeDailyBackup)(supabaseAdmin,env.supabaseUrl).then(()=>console.log(JSON.stringify({event:'backup.ready',storage:remote?'supabase':'local',lastSuccess:backupStatus.lastSuccess,error:backupStatus.lastError}))).catch(()=>{backupStatus.lastError='No se pudo inicializar el respaldo.';});setInterval(()=>(remote?runRemoteBackup:runScheduledBackup)(supabaseAdmin,env.supabaseUrl).catch(()=>{backupStatus.lastError='No se pudo ejecutar el respaldo.';}),3600000).unref();}
