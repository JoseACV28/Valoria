import {ui,getLocale} from '../../i18n/runtime';
import {creativeChallenge} from '../../utils/creativeChallenge';
import styles from '../../styles/Experience.module.css';
export function CreativeChallenge({onNavigate,showLink=true}){
 const challenge=creativeChallenge();
 return <section className={styles.hero}><span>{ui('Desafío creativo del mes')}</span><h2>{ui(challenge.title)}</h2><p>{ui(challenge.prompt)}</p><p>{challenge.startsAt.toLocaleDateString(getLocale(),{month:'long',year:'numeric',timeZone:'UTC'})} · <strong>#{challenge.tag}</strong></p><p>{ui('Participa a tu ritmo, con una historia o una ilustración. Sin puntuaciones ni premios.')}</p>{showLink&&<button type="button" onClick={()=>onNavigate('challenges')}>{ui('Ver desafío y participaciones')}</button>}</section>;
}
