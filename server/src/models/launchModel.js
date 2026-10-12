import {randomUUID} from 'node:crypto';
import {isSupabaseEnabled,supabaseAdmin} from '../config/supabase.js';
import {httpError} from '../utils/contentAccess.js';
export const LAUNCH_TABLES=['support_tickets','support_messages','operational_alerts'];
const local={support_tickets:[],support_messages:[],operational_alerts:[]};let number=0;
export const publicDocuments={
 privacy:{title:'Privacidad',content:'Valoria utiliza tu correo y los datos de autenticación para gestionar el acceso a tu cuenta. Tu nombre público, perfil y obras publicadas son visibles para otros visitantes. Los borradores, notas privadas y solicitudes personales se restringen mediante los permisos de la plataforma.\n\nLa infraestructura actual utiliza Supabase para autenticación, datos e imágenes. El navegador conserva preferencias y puede guardar copias de lectura cuando utilizas esa función.\n\nEn Cuenta y privacidad puedes descargar tus datos y solicitar la eliminación de tu cuenta. La solicitud requiere revisión del propietario; no elimina contenido automáticamente. Puedes contactar al responsable mediante el centro de soporte.\n\nInformación provisional del sitio en pruebas. Antes del lanzamiento el propietario debe completar su identidad, contacto, plazos de conservación y condiciones aplicables.'},
 terms:{title:'Condiciones de uso',content:'Valoria es un espacio para publicar y descubrir historias e ilustraciones. Utiliza una cuenta propia, protege sus accesos y respeta las normas de comunidad.\n\nPublica únicamente contenido que tengas derecho a compartir. El autor conserva los derechos de su obra; publicar en Valoria no significa que otros usuarios puedan reutilizarla libremente.\n\nLas obras deben respetar su clasificación de audiencia y las decisiones de moderación. Puedes denunciar contenido y solicitar una revisión de la respuesta recibida.\n\nTexto provisional para el sitio en pruebas. Estas páginas no incorporan una aceptación contractual automática. El propietario debe revisar y completar las condiciones antes del lanzamiento.'},
 copyright:{title:'Derechos de autor',content:'Cada obra muestra los permisos de uso elegidos por su autor. Si no existe un permiso explícito, solicita autorización antes de reutilizar textos o imágenes. Da crédito a los colaboradores y no atribuyas a otra persona trabajo que no realizó.\n\nSi consideras que una publicación infringe tus derechos, utiliza el centro de soporte en la categoría Derechos de autor. Identifica la publicación y explica tu relación con la obra. No incluyas contraseñas, documentos de identidad ni información sensible en el primer mensaje.\n\nLa administración revisará la solicitud y podrá pedir información adicional por un canal adecuado.'},
 community:{title:'Normas de comunidad',content:'Respeta a los lectores y creadores. No publiques amenazas, acoso, datos privados de otras personas, suplantaciones ni spam.\n\nMarca los spoilers y clasifica correctamente las obras para adultos. Respeta los permisos de las imágenes y las decisiones editoriales de cada autor.\n\nUsa las denuncias para informar sobre contenido que requiere revisión y soporte para preguntas o problemas técnicos. La administración puede limitar la visibilidad según las normas y ofrece seguimiento de denuncias.'}
};
export async function documentData(){
 if(!isSupabaseEnabled())return structuredClone(publicDocuments);
 const {data,error}=await supabaseAdmin.from('site_settings').select('data').eq('id','public-documents').maybeSingle();if(error)throw httpError(503,'No se pudieron consultar los documentos.');return {...structuredClone(publicDocuments),...data?.data};
}
export async function saveDocuments(data){
 for(const [key,value]of Object.entries(data)){if(!Object.hasOwn(publicDocuments,key)||typeof value.title!=='string'||value.title.length>120||typeof value.content!=='string'||value.content.length>20000)throw httpError(400,'Documento inválido.');}
 if(!isSupabaseEnabled())Object.assign(publicDocuments,data);else {const {error}=await supabaseAdmin.from('site_settings').upsert({id:'public-documents',data,updated_at:new Date().toISOString()});if(error)throw httpError(503,'No se pudieron guardar los documentos.');}
}
export async function listLaunch(table,filters={}){
 if(!LAUNCH_TABLES.includes(table))throw new Error('Invalid table');
 if(!isSupabaseEnabled())return local[table].filter(x=>Object.entries(filters).every(([k,v])=>x[k]===v)).sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(x=>structuredClone(x));
 let q=supabaseAdmin.from(table).select('*');for(const [key,value]of Object.entries(filters))q=q.eq(key,value);
 const {data,error}=await q.order('created_at',{ascending:false}).limit(200);if(error)throw httpError(503,'Aplica la migración 20261007_launch_tools.sql para activar soporte y alertas.');return data;
}
export async function createTicket(actor,body){
 if(Object.keys(body).some(k=>!['category','subject','content'].includes(k))||!['question','technical','suggestion','copyright'].includes(body.category)||typeof body.subject!=='string'||body.subject.trim().length<5||body.subject.length>160||typeof body.content!=='string'||body.content.trim().length<5||body.content.length>4000)throw httpError(400,'Indica una categoría, asunto y mensaje válidos.');
 if(!isSupabaseEnabled()){const ticket={id:randomUUID(),number:++number,user_id:actor,category:body.category,subject:body.subject.trim(),status:'open',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};local.support_tickets.push(ticket);await addSupportMessage(ticket.id,actor,false,body.content);return ticket;}
 const {data,error}=await supabaseAdmin.rpc('create_support_ticket',{p_actor:actor,p_category:body.category,p_subject:body.subject.trim(),p_content:body.content.trim()});if(error)throw httpError(503,'No se pudo crear la solicitud.');return data;
}
export async function addSupportMessage(id,actor,staff,content){
 if(typeof content!=='string'||content.trim().length<5||content.length>4000)throw httpError(400,'Escribe un mensaje de entre 5 y 4000 caracteres.');
 const row={id:randomUUID(),ticket_id:id,sender_id:actor,staff,content:content.trim(),created_at:new Date().toISOString()};
 if(!isSupabaseEnabled())local.support_messages.push(row);else{const {error}=await supabaseAdmin.from('support_messages').insert(row);if(error)throw httpError(503,'No se pudo guardar la respuesta.');}return row;
}
export async function ticketStatus(id,status){if(!['open','reviewing','resolved','closed'].includes(status))throw httpError(400,'Estado inválido.');if(!isSupabaseEnabled()){const row=local.support_tickets.find(x=>x.id===id);row.status=status;row.updated_at=new Date().toISOString();}else{const {error}=await supabaseAdmin.from('support_tickets').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw httpError(503,'No se pudo cambiar el estado.');}}
