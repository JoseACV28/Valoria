import { blockedProfileIds } from '../middlewares/profileBlocks.js';
import { Router } from 'express';
import { StoryModel } from '../models/storyModel.js';
import { IllustrationModel } from '../models/illustrationModel.js';
import { categoryCounts } from '../utils/categoryCounts.js';
const router=Router();
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function creators(works,q){const people=new Map();for(const work of works){if(!work.authorId)continue;const person=people.get(work.authorId)||{id:work.authorId,name:work.author,avatar:work.authorAvatarUrl,count:0};person.count++;people.set(person.id,person);}return [...people.values()].filter(person=>norm(person.name).includes(q));}
router.get('/',async(req,res,next)=>{
  try{
    let [stories,illustrations]=await Promise.all([StoryModel.getAll({}),IllustrationModel.getAll()]);
    const blocked=await blockedProfileIds(req.authUser?.id);stories=stories.filter(item=>!blocked.has(item.authorId));illustrations=illustrations.filter(item=>!blocked.has(item.authorId));
    const q=norm(req.query.q).trim(),field=req.query.field;
    const matches=work=>{
      const fields=field==='character'?work.characters:field==='tag'?work.tags:[work.title,work.description,work.author,...(work.characters||[]),...(work.tags||[])];
      const keyword=(fields||[]).some(value=>field?norm(value)===q:norm(value).includes(q));
      return keyword && (!req.query.category||[work.category,...(work.categories||[])].includes(req.query.category)) && (!req.query.language||(work.language||'Espanol')===req.query.language) && (req.query.completed!=='true'||work.is_complete===true);
    };
    if(req.query.suggest==='true')return res.json({suggestions:[...new Set([...stories.filter(matches).map(item=>item.title),...illustrations.filter(matches).map(item=>item.title),...creators(stories,q).map(item=>item.name),...creators(illustrations,q).map(item=>item.name)])].slice(0,8)});
    const sort=(a,b)=>req.query.sort==='popular'?Number(b.reads_count||b.viewsCount||0)-Number(a.reads_count||a.viewsCount||0):req.query.sort==='rating'?Number(b.ratingAverage||b.likesCount||0)-Number(a.ratingAverage||a.likesCount||0):Date.parse(b.created_at||b.createdAt||0)-Date.parse(a.created_at||a.createdAt||0);
    const size=12,page=Math.max(1,Math.min(10000,Number(req.query.page)||1));
    const matchingStories=stories.filter(matches).sort(sort),matchingIllustrations=illustrations.filter(matches).sort(sort);
    const all={stories:matchingStories,illustrations:matchingIllustrations,writers:creators(matchingStories,q),illustrators:creators(matchingIllustrations,q)};
    res.json({categories:categoryCounts(stories,illustrations),languages:[...new Set(stories.map(story=>story.language||'Espanol'))].sort(),page,pageSize:size,counts:Object.fromEntries(Object.entries(all).map(([key,items])=>[key,items.length])),groups:Object.fromEntries(Object.entries(all).map(([key,items])=>[key,items.slice((page-1)*size,page*size)]))});
  }catch(error){next(error);}
});
export default router;
