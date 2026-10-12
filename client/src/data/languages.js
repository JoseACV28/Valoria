import { ui } from '../i18n/runtime.js';
// Stable values preserve existing stories and search links.
export const STORY_LANGUAGES = [
 ['Espanol','Español'],['English','English'],['Portugues','Português'],['Frances','Français'],['Italiano','Italiano'],['Aleman','Deutsch'],
 ['Chino','中文'],['Coreano','한국어'],['Japones','日本語'],['Hindi','हिन्दी'],['Arabe','العربية'],['Bengali','বাংলা'],['Ruso','Русский'],['Urdu','اردو'],
 ['Indonesio','Bahasa Indonesia'],['Swahili','Kiswahili'],['Turco','Türkçe'],['Vietnamita','Tiếng Việt'],['Tamil','தமிழ்'],['Telugu','తెలుగు']
];
const names={Espanol:'Español',English:'Inglés',Portugues:'Portugués',Frances:'Francés',Italiano:'Italiano',Aleman:'Alemán',Chino:'Chino',Coreano:'Coreano',Japones:'Japonés',Hindi:'Hindi',Arabe:'Árabe',Bengali:'Bengalí',Ruso:'Ruso',Urdu:'Urdu',Indonesio:'Indonesio',Swahili:'Suajili',Turco:'Turco',Vietnamita:'Vietnamita',Tamil:'Tamil',Telugu:'Telugu'};
export function languageLabel(value){
 const native=STORY_LANGUAGES.find(([key])=>key===value)?.[1];
 if(!native)return value;
 const name=ui(names[value]);return name===native?name:`${name} · ${native}`;
}
