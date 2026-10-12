import { listWorkspace, saveWorkspace, deleteWorkspace } from '../api/workspaceApi.js';
const cacheKey=userId=>`valoria-library:${userId||'guest'}`;
function readCache(userId){try{return JSON.parse(localStorage.getItem(cacheKey(userId))||'{}');}catch{return {};}}
export function readLibrary(userId){return Object.fromEntries(Object.entries(readCache(userId)).filter(([,item])=>!item.deleted));}
function cache(userId,items){try{localStorage.setItem(cacheKey(userId),JSON.stringify(items));}catch{}window.dispatchEvent(new Event('valoria-library-updated'));}
export async function loadLibrary(auth){
  const local=readCache(auth.user?.id);
  if(!auth.token)return readLibrary(auth.user?.id);
  // Retry offline changes, including removals, before treating the server as authoritative.
  for(const [key,item] of Object.entries(local)){
    if(!item.pending)continue;
    try{if(item.deleted)await deleteWorkspace('library',key,auth.token);else await saveWorkspace('library',key,item,auth.token);delete item.pending;}catch{}
  }
  const {items}=await listWorkspace('library',auth.token);
  const merged=Object.fromEntries(items.map(item=>[item.key,{...item.data,pending:false}]));
  for(const [key,item] of Object.entries(local))if(item.pending)merged[key]=item;
  cache(auth.user?.id,merged);return readLibrary(auth.user?.id);
}
export async function saveLibraryItem(auth,key,patch){
  const items=readCache(auth.user?.id);
  const item={...items[key],...patch,deleted:false,pending:Boolean(auth.token),updatedAt:Date.now()};
  cache(auth.user?.id,{...items,[key]:item});
  if(auth.token){await saveWorkspace('library',key,item,auth.token);const latest=readCache(auth.user?.id);if(latest[key]?.updatedAt===item.updatedAt){latest[key].pending=false;cache(auth.user?.id,latest);}}
  return item;
}
export async function removeLibraryItem(auth,key){
  const items=readCache(auth.user?.id);
  cache(auth.user?.id,{...items,[key]:{...items[key],deleted:true,pending:Boolean(auth.token),updatedAt:Date.now()}});
  if(auth.token)await deleteWorkspace('library',key,auth.token);
  const latest=readCache(auth.user?.id);if(latest[key]?.deleted){delete latest[key];cache(auth.user?.id,latest);}
}
