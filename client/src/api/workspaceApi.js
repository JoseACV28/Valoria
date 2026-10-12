const base=import.meta.env?.VITE_API_URL || 'http://localhost:4000/api';
export async function workspaceRequest(path,token,method='GET',body) {
  const response=await fetch(`${base}/${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(response.status===204)return null;
  const data=await response.json();
  if(!response.ok)throw Object.assign(new Error(data.message || 'No se pudo completar la solicitud'),{status:response.status});
  return data;
}
export const listWorkspace=(namespace,token)=>workspaceRequest(`workspace/${namespace}`,token);
// Serialize writes to each item so a slower autosave cannot overwrite a newer save.
const writes=new Map();
function enqueue(namespace,key,token,operation){
  const id=`${token}:${namespace}:${key}`;
  const pending=(writes.get(id)||Promise.resolve()).catch(()=>{}).then(operation);
  writes.set(id,pending);
  pending.finally(()=>{if(writes.get(id)===pending)writes.delete(id);}).catch(()=>{});
  return pending;
}
export const saveWorkspace=(namespace,key,data,token)=>enqueue(namespace,key,token,()=>workspaceRequest(`workspace/${namespace}/${encodeURIComponent(key)}`,token,'PUT',data));
export const deleteWorkspace=(namespace,key,token)=>enqueue(namespace,key,token,()=>workspaceRequest(`workspace/${namespace}/${encodeURIComponent(key)}`,token,'DELETE'));
export const submitReport=(data,token)=>workspaceRequest('reports',token,'POST',data);
