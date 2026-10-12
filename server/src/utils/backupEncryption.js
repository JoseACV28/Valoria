import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
export function backupKey(value=process.env.BACKUP_ENCRYPTION_KEY){
  if(!value)return null;
  if(!/^[0-9a-f]{64}$/i.test(value))throw new Error('BACKUP_ENCRYPTION_KEY debe contener 64 caracteres hexadecimales.');
  return Buffer.from(value,'hex');
}
export function encryptBackup(bytes,key){const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce),data=Buffer.concat([cipher.update(bytes),cipher.final()]);return Buffer.concat([nonce,cipher.getAuthTag(),data]);}
export function decryptBackup(bytes,key){
  if(!key||bytes.length<28)throw new Error('Se requiere la clave válida del respaldo cifrado.');
  try{const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]);}catch{throw new Error('No se pudo autenticar el respaldo: clave incorrecta o archivo modificado.');}
}
