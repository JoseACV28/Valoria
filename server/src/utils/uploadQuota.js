export const STORAGE_LIMITS={bytes:500*1024*1024,files:1000,dailyBytes:100*1024*1024,dailyFiles:50};
const locks=new Set();
export async function withUploadLock(userId,action){
  if(locks.has(userId))throw Object.assign(new Error('Ya hay una imagen subiendo en tu cuenta. Espera a que termine.'),{status:429});
  locks.add(userId);try{return await action();}finally{locks.delete(userId);}
}
export async function enforceStorageQuota(db,userId,newBytes,buckets,now=Date.now()){
  let bytes=0,files=0,dailyBytes=0,dailyFiles=0,visited=0;
  const queue=[...new Set(buckets)].map(bucket=>({bucket,prefix:userId}));
  while(queue.length){const {bucket,prefix}=queue.shift();
    for(let offset=0;;offset+=100){
      if(++visited>200)throw Object.assign(new Error('No se pudo verificar tu cuota de imágenes. Reintenta más tarde.'),{status:503});
      const result=await db.storage.from(bucket).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
      if(result.error)throw Object.assign(new Error('No se pudo verificar tu cuota de imágenes. Reintenta más tarde.'),{status:503});
      for(const item of result.data){
        if(!item.id){queue.push({bucket,prefix:`${prefix}/${item.name}`});continue;}
        const size=Number(item.metadata?.size);if(!Number.isFinite(size)||size<0)throw Object.assign(new Error('No se pudo verificar tu cuota de imágenes.'),{status:503});
        bytes+=size;files++;const created=Date.parse(item.created_at);if(!Number.isFinite(created))throw Object.assign(new Error('No se pudo verificar tu cuota de imágenes.'),{status:503});
        if(created>=now-86400000){dailyBytes+=size;dailyFiles++;}
      }
      if(result.data.length<100)break;
    }
  }
  if(bytes+newBytes>STORAGE_LIMITS.bytes||files+1>STORAGE_LIMITS.files||dailyBytes+newBytes>STORAGE_LIMITS.dailyBytes||dailyFiles+1>STORAGE_LIMITS.dailyFiles)throw Object.assign(new Error('Alcanzaste el límite de imágenes de tu cuenta. Reintenta más tarde o contacta con administración.'),{status:413});
  return {bytes,files,dailyBytes,dailyFiles};
}
