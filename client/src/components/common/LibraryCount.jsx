import {useEffect,useState} from 'react';
import {loadLibrary,readLibrary} from '../../utils/library';
export function LibraryCount({auth}){
 const [count,setCount]=useState(()=>Object.keys(readLibrary(auth.user?.id)).length);
 useEffect(()=>{let active=true;const update=()=>{if(active)setCount(Object.keys(readLibrary(auth.user?.id)).length);};window.addEventListener('valoria-library-updated',update);loadLibrary(auth).then(update).catch(()=>{});return()=>{active=false;window.removeEventListener('valoria-library-updated',update);};},[auth.token,auth.user?.id]);
 return count;
}
