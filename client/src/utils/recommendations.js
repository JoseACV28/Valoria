import {newClientId} from './clientId.js';
import {listWorkspace,saveWorkspace} from '../api/workspaceApi.js';
const key=id=>`valoria-recommendations:${id||'guest'}`;
function read(id){try{const value=JSON.parse(localStorage.getItem(key(id))||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
function cache(id,value){try{localStorage.setItem(key(id),JSON.stringify(value));}catch{}}
export function hiddenRecommendations(id){const items=read(id);return Object.keys(items).filter(workId=>items[workId]?.hidden===true);}
export async function loadRecommendationPreferences(auth){
 const local=read(auth.user?.id);if(!auth.token)return hiddenRecommendations(auth.user?.id);
 for(const [id,value] of Object.entries(local)){if(value.pending)try{await saveWorkspace('preferences',`recommendation-hidden:${id}`,{enabled:value.hidden===true},auth.token);value.pending=false;}catch{}}
 const {items}=await listWorkspace('preferences',auth.token);
 const remote=Object.fromEntries(items.filter(x=>x.key.startsWith('recommendation-hidden:')).map(x=>[x.key.slice(22),{hidden:x.data?.enabled===true,pending:false}]));
 const latest=read(auth.user?.id);for(const [id,value] of Object.entries(latest))if(value.pending||value.revision!==local[id]?.revision)remote[id]=value;
 cache(auth.user?.id,remote);return Object.keys(remote).filter(id=>remote[id].hidden);
}
export async function setRecommendationHidden(auth,id,hidden){
 const value={hidden,pending:Boolean(auth.token),revision:newClientId()},items=read(auth.user?.id);cache(auth.user?.id,{...items,[id]:value});
 if(auth.token){await saveWorkspace('preferences',`recommendation-hidden:${id}`,{enabled:hidden},auth.token);const latest=read(auth.user?.id);if(latest[id]?.revision===value.revision){latest[id].pending=false;cache(auth.user?.id,latest);}}
}
export function recommendedStories(stories,library,hidden=[]){
 const saved=Object.entries(library).filter(([key,item])=>item.type==='story'||(!item.type&&!key.startsWith('illustration:'))).map(([key,item])=>({...item,id:item.id||key}));
 const savedIds=new Set(saved.map(item=>item.id)),hiddenIds=new Set(hidden);
 const catalog=new Map(stories.map(item=>[item.id,item]));
 const categories=new Set(saved.map(item=>item.category||catalog.get(item.id)?.category).filter(Boolean));
 const authors=new Set(saved.map(item=>item.authorId||catalog.get(item.id)?.authorId).filter(Boolean));
 return stories.filter(item=>item.status==='published'&&!savedIds.has(item.id)&&!hiddenIds.has(item.id)&&(categories.has(item.category)||authors.has(item.authorId))).map(item=>({...item,recommendation:authors.has(item.authorId)?{kind:'author',value:item.author}:{kind:'category',value:item.category}})).sort((a,b)=>(Date.parse(b.created_at||b.createdAt)||0)-(Date.parse(a.created_at||a.createdAt)||0)).slice(0,6);
}
