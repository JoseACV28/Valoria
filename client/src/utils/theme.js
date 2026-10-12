const KEY='valoria-interface-theme';
export function readTheme(storage=globalThis.localStorage){try{return storage?.getItem(KEY)==='light'?'light':'dark';}catch{return 'dark';}}
export function applyTheme(value,storage=globalThis.localStorage,root=globalThis.document?.documentElement){const theme=value==='light'?'light':'dark';if(root)root.dataset.theme=theme;try{storage?.setItem(KEY,theme);}catch{}return theme;}
