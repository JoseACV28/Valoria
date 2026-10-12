import sharp from 'sharp';
export const IMAGE_LIMITS={pixels:40_000_000,dimension:16_000,frames:100,bytes:15*1024*1024};
sharp.cache({memory:32,files:0,items:64});
sharp.concurrency(2);
export function imageFormat(bytes) {
  if(!bytes || bytes.length<12)return null;
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime:'image/png',extension:'.png'};
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',extension:'.jpg'};
  if(['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString('ascii')))return {mime:'image/gif',extension:'.gif'};
  if(bytes.subarray(0,4).toString('ascii')==='RIFF'&&bytes.subarray(8,12).toString('ascii')==='WEBP')return {mime:'image/webp',extension:'.webp'};
  return null;
}

export async function sanitizeImage(bytes, mime, maxBytes=IMAGE_LIMITS.bytes) {
  const signature=imageFormat(bytes);
  if(!signature||signature.mime!==(mime==='image/jpg'?'image/jpeg':mime))throw Object.assign(new Error('El archivo no contiene una imagen PNG, JPG, GIF o WebP válida.'),{status:400});
  if(bytes.length>maxBytes)throw Object.assign(new Error('La imagen supera el límite de tamaño permitido.'),{status:413});
  try{
    const image=sharp(bytes,{animated:true,failOn:'warning',limitInputPixels:IMAGE_LIMITS.pixels,limitInputChannels:4}).timeout({seconds:8});
    const metadata=await image.metadata(),frames=metadata.pages||1,height=metadata.pageHeight||metadata.height;
    if(!metadata.width||!height||metadata.width>IMAGE_LIMITS.dimension||height>IMAGE_LIMITS.dimension||frames>IMAGE_LIMITS.frames||metadata.width*height*frames>IMAGE_LIMITS.pixels)throw Object.assign(new Error('La imagen supera los límites de dimensiones o animación.'),{status:413});
    const expected={'image/png':'png','image/jpeg':'jpeg','image/gif':'gif','image/webp':'webp'}[signature.mime];
    if(metadata.format!==expected)throw new Error('Format mismatch');
    // Re-encode every frame. Metadata is stripped by default; PNG stays lossless,
    // GIF/WebP keep their animation, JPEG applies its orientation before stripping.
    const pipeline=frames===1?image.rotate():image;
    const data=await pipeline.toFormat(expected,expected==='jpeg'?{quality:95,chromaSubsampling:'4:4:4'}:expected==='webp'?{lossless:true}:{}).toBuffer();
    if(data.length>maxBytes)throw Object.assign(new Error('La imagen procesada supera el límite de tamaño permitido.'),{status:413});
    return {buffer:data,...signature,width:metadata.width,height,frames};
  }catch(error){if(error.status===413)throw error;throw Object.assign(new Error('La imagen está dañada o no se pudo procesar de forma segura.'),{status:400});}
}
