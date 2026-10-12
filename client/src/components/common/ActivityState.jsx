import {ui} from '../../i18n/runtime';
import styles from '../../styles/ActivityState.module.css';
export function ActivityState({kind='empty',title,message,action,onAction}) {
  return <section className={styles.state} role={kind==='error'?'alert':'status'} aria-busy={kind==='loading'}>
    <span className={styles.icon} aria-hidden="true">{kind==='loading'?'◌':kind==='error'?'!':'✦'}</span>
    <div><h2>{ui(title||(kind==='loading'?'Cargando…':kind==='error'?'No pudimos cargar esta sección':'Todavía no hay contenido'))}</h2>{message&&<p>{ui(message)}</p>}{action&&onAction&&<button type="button" onClick={onAction}>{ui(action)}</button>}</div>
  </section>;
}
