const key=user=>`valoria-offline:${user||'guest'}`;
export function readOfflineWorks(user){try{const data=JSON.parse(localStorage.getItem(key(user))||'[]');return Array.isArray(data)?data:[];}catch{return [];}}
export function saveOfflineWork(user,story,chapters){
  const entry={id:story.id,title:story.title,slug:story.slug,author:story.author,description:story.description,savedAt:new Date().toISOString(),chapters:chapters.map(c=>({id:c.id,title:c.title,content:c.content,chapter_number:c.chapter_number}))};
  const serialized=JSON.stringify(entry);if(serialized.length>2000000)throw new Error('Esta obra supera el límite de texto de 2 MB para lectura sin conexión.');
  const items=[entry,...readOfflineWorks(user).filter(x=>x.id!==story.id)].slice(0,10);
  localStorage.setItem(key(user),JSON.stringify(items));return entry;
}
export function removeOfflineWork(user,id){localStorage.setItem(key(user),JSON.stringify(readOfflineWorks(user).filter(x=>x.id!==id)));}
