import { ui } from '../../i18n/runtime.js';
export function SaveStatus({text}) {
  if(!text)return null;
  const pending=/Guardando|pendiente|Sin sincronizar|Sin conexión|No se pudo/i.test(text);
  return <p role="status" style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderRadius:'var(--radius-panel)',border:'1px solid var(--line-soft)',background:'var(--bg-surface)',color:'var(--text-soft)'}}><span aria-hidden="true">{pending?'◷':'✓'}</span>{ui(text)}</p>;
}
