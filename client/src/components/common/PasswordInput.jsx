import {useId,useState} from 'react';
import {ui} from '../../i18n/runtime.js';
import styles from '../../styles/ProductTools.module.css';
export function PasswordInput({label,value,onChange,autoComplete='new-password',minLength,maxLength=128,disabled=false}){
  const id=useId(),[visible,setVisible]=useState(false);
  return <div className={styles.passwordField}><label htmlFor={id}>{ui(label)}</label><div className={styles.passwordInputRow}>
    <input id={id} type={visible?'text':'password'} value={value} onChange={onChange} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required disabled={disabled}/>
    <button type="button" aria-controls={id} aria-pressed={visible} aria-label={`${ui(visible?'Ocultar contraseña':'Mostrar contraseña')}: ${ui(label)}`} onClick={()=>setVisible(current=>!current)} disabled={disabled}>{visible?ui('Ocultar'):ui('Mostrar')}</button>
  </div></div>;
}
