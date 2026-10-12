import {ui} from '../../i18n/runtime';
import {HomeShelf} from './HomeShelf';
export function LaunchShelf({stories,onOpenStory,onNavigate}){
 const recent=[...stories].filter(x=>x.status==='published').sort((a,b)=>Date.parse(b.publishedAt||b.published_at||b.createdAt||b.created_at||0)-Date.parse(a.publishedAt||a.published_at||a.createdAt||a.created_at||0)).slice(0,6);
 if(!recent.length)return null;
 return <section><HomeShelf scrollable section={{title:'Recién llegadas a Valoria',subtitle:'Descubre las últimas historias publicadas por la comunidad.',stories:recent}} onOpenStory={onOpenStory} onOpenAuthor={id=>onNavigate('creator-profile',{profileId:id})}/></section>;
}
