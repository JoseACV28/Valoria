import { useEffect, useRef } from 'react';
export function useDialogFocus(open,onClose) {
  const root=useRef(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{if(!open||!root.current)return;const previous=document.activeElement;const element=root.current;const getFocusable=()=>[...element.querySelectorAll('button,input,textarea,select,a[href],[tabindex="0"]')].filter(node=>!node.disabled&&node.getClientRects().length);getFocusable()[0]?.focus({preventScroll:true});function handle(event){if(event.key==='Escape'){event.preventDefault();close.current();}if(event.key==='Tab'){const nodes=getFocusable(),first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}element.addEventListener('keydown',handle);return()=>{element.removeEventListener('keydown',handle);previous?.focus?.({preventScroll:true});};},[open]);
  return root;
}
