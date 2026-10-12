let state='preparing';
const listeners=new Set();
let preparationTimer;
function update(value){state=value;if(value!=='preparing')clearTimeout(preparationTimer);listeners.forEach(fn=>fn(value));}
export function offlineSupportState(){return state;}
export function subscribeOfflineSupport(fn){listeners.add(fn);fn(state);return()=>listeners.delete(fn);}
export function prepareOfflineShell(production){
  if(!production){update('preview');return;}
  if(!('serviceWorker' in navigator)){update('unsupported');return;}
  update('preparing');
  clearTimeout(preparationTimer);
  preparationTimer=setTimeout(()=>{if(state==='preparing')update('failed');},20000);
  navigator.serviceWorker.addEventListener('controllerchange',()=>update('ready'));
  navigator.serviceWorker.register('/sw.js').then(registration=>{
    const watch=worker=>{if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='redundant'&&!navigator.serviceWorker.controller)update('failed');});};
    watch(registration.installing);
    registration.addEventListener('updatefound',()=>watch(registration.installing));
    return navigator.serviceWorker.ready;
  }).then(()=>{if(navigator.serviceWorker.controller)update('ready');}).catch(error=>{update('failed');console.warn('No se pudo preparar la lectura sin conexión:',error.message);});
}
