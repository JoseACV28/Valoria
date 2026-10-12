import {httpError} from './contentAccess.js';
export const CONTENT_WARNING_CODES=['violence','grief','abuse','sexual','selfharm','discrimination','substances','disturbing'];
export function validateContentWarnings(value){if(!Array.isArray(value)||value.length>CONTENT_WARNING_CODES.length||value.some(x=>!CONTENT_WARNING_CODES.includes(x)))throw httpError(400,'Selecciona avisos de contenido válidos.');return [...new Set(value)];}
