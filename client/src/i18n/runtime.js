const normalize=value=>value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let translations=new Map(),templates=[];
let dictionaryPromise;
async function loadTranslations(){
 dictionaryPromise ||= import('./translations.js').catch(error=>{dictionaryPromise=null;throw error;});
 const {dictionaries,aliases}=await dictionaryPromise;
 translations=new Map(Object.entries(dictionaries).map(([key,value])=>[normalize(key),value]));
 for(const [alias,key] of Object.entries(aliases))translations.set(normalize(alias),translations.get(normalize(key)));
 templates=buildTemplates(dictionaries);
}

export const INTERFACE_LANGUAGES = [
 ['es','🇪🇸','Español'],['en','🇬🇧','English'],['fr','🇫🇷','Français'],
 ['zh','🇨🇳','中文'],['ko','🇰🇷','한국어'],['ja','🇯🇵','日本語']
];
const buildTemplates=dictionaries=>Object.entries(dictionaries).filter(([key])=>/\{\d+\}/.test(key)).map(([key,values])=>{
 const indices=[];
 const parts=key.split(/(\{\d+\})/);
 const pattern=parts.map(part=>{if(/^\{\d+\}$/.test(part)){indices.push(Number(part.slice(1,-1)));return '([\\s\\S]*?)';}return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('');
 return {expression:new RegExp('^'+pattern+'$','i'),indices,values};
});
let locale='es';
try { const saved=globalThis.localStorage?.getItem('valoria-interface-language'); if(INTERFACE_LANGUAGES.some(([id])=>id===saved))locale=saved; } catch {}
const listeners=new Set();
export const getLocale=()=>locale;
export const subscribeLocale=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
let requested=locale;
export async function initializeLocale(){try{await setLocale(locale);}catch{await setLocale('es');}}
export async function setLocale(value) {
 if(!INTERFACE_LANGUAGES.some(([id])=>id===value))return;
 requested=value;
 if(value!=='es')await loadTranslations();
 if(requested!==value)return;
 locale=value;
 try { globalThis.localStorage?.setItem('valoria-interface-language',value); } catch {}
 if(globalThis.document)document.documentElement.lang=value;
 for(const listener of listeners)listener();
}
export function ui(source,values=[]) {
 if(typeof source!=='string')return source;
 const key=source.trim();
 if(!key)return source;
 const index=INTERFACE_LANGUAGES.findIndex(([id])=>id===locale)-1;
 let translated=key;
 let replacements=values;
 if(locale!=='es'){
  translated=translations.get(normalize(key))?.[index]||key;
  if(translated===key&&!values.length&&key.length<=2000){
   // Match original text to capture names exactly, without translating authored content.
   for(const template of templates){const match=template.expression.exec(key);if(!match)continue;
    const args=[];template.indices.forEach((n,i)=>{args[n]=match[i+1];});
    translated=template.values[index];replacements=args;break;
   }
  }
 }
 const interpolated=translated.replace(/\{(\d+)\}/g,(match,i)=>replacements[Number(i)]===undefined?match:String(replacements[Number(i)]));
 return (source.match(/^\s*/)?.[0]||'')+interpolated+(source.match(/\s*$/)?.[0]||'');
}
