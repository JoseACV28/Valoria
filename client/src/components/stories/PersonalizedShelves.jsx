import {ui} from '../../i18n/runtime';
import {hiddenRecommendations,loadRecommendationPreferences,setRecommendationHidden,recommendedStories} from '../../utils/recommendations';
import {useEffect,useState} from 'react';
import {fetchFollowingProfiles} from '../../api/profileApi';
import {loadLibrary,readLibrary} from '../../utils/library';
import {HomeShelf} from './HomeShelf';
import {LibraryBookShelf} from './LibraryBookShelf';
export function PersonalizedShelves({auth,stories,onOpenStory,onNavigate,variant='default'}){
 const Shelf=variant==='library'?LibraryBookShelf:HomeShelf;
 const [hidden,setHidden]=useState(()=>hiddenRecommendations(auth.user?.id)),[message,setMessage]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{let active=true;setReady(false);setHidden(hiddenRecommendations(auth.user?.id));loadRecommendationPreferences(auth).then(items=>{if(active){setHidden(items);setReady(true);}}).catch(()=>{if(active){setReady(true);setMessage('Las preferencias locales se conservan; no se pudieron sincronizar.');}});return()=>{active=false;};},[auth.token,auth.user?.id]);
 async function hide(id,enabled){setHidden(current=>enabled?[...new Set([...current,id])]:current.filter(x=>x!==id));try{await setRecommendationHidden(auth,id,enabled);setMessage('Preferencias guardadas.');}catch{setMessage('Las preferencias locales se conservan; no se pudieron sincronizar.');}}
 const [library,setLibrary]=useState(()=>readLibrary(auth.user?.id)),[following,setFollowing]=useState([]);
 useEffect(()=>{let active=true;setLibrary(readLibrary(auth.user?.id));setFollowing([]);loadLibrary(auth).then(items=>{if(active)setLibrary(items);}).catch(()=>{});if(auth.user?.id)fetchFollowingProfiles(auth.user.id,auth.token).then(data=>{if(active)setFollowing(data.profiles.map(item=>item.id));}).catch(()=>{});return()=>{active=false;};},[auth.token]);
 const categories=new Set(Object.values(library).map(item=>item.category).filter(Boolean));
 const recent=items=>[...items].sort((a,b)=>Date.parse(b.created_at||b.createdAt||0)-Date.parse(a.created_at||a.createdAt||0)).slice(0,6);
 const updates=recent(stories.filter(item=>following.includes(item.authorId)));
 const recommended=ready?recommendedStories(stories,library,hidden):[];
 const author=id=>onNavigate('creator-profile',{profileId:id});
 return <>{updates.length>0&&<Shelf section={{title:'Novedades de tus creadores',subtitle:'Historias de las cuentas que sigues.',stories:updates}} onOpenStory={onOpenStory} onOpenAuthor={author}/ >}{recommended.length>0&&<Shelf section={{title:'Según tus lecturas',subtitle:'Recomendaciones a partir de las obras que guardaste.',stories:recommended}} onHideRecommendation={id=>hide(id,true)} onOpenStory={onOpenStory} onOpenAuthor={author}/>}{hidden.length>0&&<details style={{margin:'18px 0',padding:18,borderRadius:'var(--radius-panel)',border:'1px solid var(--line-soft)'}}><summary>{ui('Recomendaciones ocultas')}</summary>{hidden.map(id=><p key={id}>{stories.find(x=>x.id===id)?.title||ui('Obra oculta')} <button type="button" onClick={()=>hide(id,false)}>{ui('Volver a recomendar')}</button></p>)}</details>}<p role="status">{ui(message)}</p></>;
}

