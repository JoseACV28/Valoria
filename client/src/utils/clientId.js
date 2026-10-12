// UUIDs for drafts and notes. getRandomValues also works on a private HTTP QA origin.
export function newClientId(random=globalThis.crypto){
 if(typeof random?.randomUUID==='function')return random.randomUUID();
 if(typeof random?.getRandomValues!=='function')throw new Error('Este navegador no permite crear un identificador seguro.');
 const bytes=random.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const value=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');return `${value.slice(0,8)}-${value.slice(8,12)}-${value.slice(12,16)}-${value.slice(16,20)}-${value.slice(20)}`;
}
