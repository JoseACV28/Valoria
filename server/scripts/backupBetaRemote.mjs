import {supabaseAdmin} from '../src/config/supabase.js';
import {env} from '../src/config/env.js';
import {createRemoteBackup} from '../src/utils/remoteBackup.js';
if(env.supabaseUrl!=='https://cjbwjbmgrpjvinoczluc.supabase.co')throw new Error('Este ensayo solo admite Supabase QA.');
const result=await createRemoteBackup(supabaseAdmin,env.supabaseUrl);
console.log(JSON.stringify({archive:result.archive,bytes:result.bytes,tables:result.tables,images:result.images,downloadVerified:result.downloadVerified,restoreValidated:result.restoreValidated}));
