import {useState} from 'react';
import {ui} from '../../i18n/runtime';
import {applyTheme,readTheme} from '../../utils/theme';
import styles from '../../styles/ThemeSwitcher.module.css';
export function ThemeSwitcher(){const [theme,setTheme]=useState(readTheme);return <button className={styles.toggle} type="button" aria-label={ui(theme==='dark'?'Activar tema claro':'Activar tema oscuro')} title={ui(theme==='dark'?'Tema claro':'Tema oscuro')} onClick={()=>setTheme(applyTheme(theme==='dark'?'light':'dark'))}><span aria-hidden="true">{theme==='dark'?'☀':'☾'}</span></button>;}
