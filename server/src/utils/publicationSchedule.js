import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { ChapterModel } from '../models/chapterModel.js';
import { StoryModel } from '../models/storyModel.js';
import { notifyChapterPublished } from './chapterNotifications.js';
export async function savePublicationSchedule(actor,storyId,chapterId,date) {
  if(!isSupabaseEnabled())return;
  const key=`schedule:${chapterId}`;
  if(!date){const {error}=await supabaseAdmin.from('user_workspace').delete().eq('user_id',actor).eq('namespace','drafts').eq('key',key);if(error)throw error;return;}
  const {error}=await supabaseAdmin.from('user_workspace').upsert({user_id:actor,namespace:'drafts',key,data:{storyId,chapterId,date,state:'pending'},updated_at:new Date().toISOString()});
  if(error)throw error;
}
export const publicationStatus={lastCheckedAt:null,lastError:null,published:0,failed:0};
let running=false;
export async function publishDueChapters() {
  if(running||!isSupabaseEnabled())return;running=true;
  try{
    const {data:items,error}=await supabaseAdmin.from('user_workspace').select('*').eq('namespace','drafts').like('key','schedule:%').in('data->>state',['pending','processing']).order('updated_at',{ascending:true}).limit(100);
    publicationStatus.lastCheckedAt=new Date().toISOString();
    if(error){publicationStatus.lastError='No se pudieron consultar las publicaciones programadas.';return;}publicationStatus.lastError=null;
    for(const item of items){
      if((item.data.state!=='pending' && !(item.data.state==='processing' && Date.now()-Date.parse(item.updated_at)>300000))||Date.parse(item.data.date)>Date.now()||!Number.isFinite(Date.parse(item.data.date)))continue;
      const claim=await supabaseAdmin.from('user_workspace').update({data:{...item.data,state:'processing'},updated_at:new Date().toISOString()}).eq('user_id',item.user_id).eq('namespace','drafts').eq('key',item.key).eq('updated_at',item.updated_at).select('key');
      if(claim.error||!claim.data?.length)continue;
      try{
        const story=await StoryModel.getByIdOrSlug(item.data.storyId);
        if(story?.moderation_hidden_at)throw new Error('Historia oculta por moderación');
        if(story?.authorId!==item.user_id)throw new Error('Autor inválido');
        const chapters=await ChapterModel.getByStoryId(story.id);
        const chapter=chapters.find(x=>x.id===item.data.chapterId);
        if(!chapter)throw new Error('Capítulo eliminado');
        if(chapter.status!=='published'){
          await ChapterModel.update(story.id,chapter.id,{title:chapter.title,chapterNumber:chapter.chapter_number,excerpt:chapter.excerpt,content:chapter.content,status:'published'});
          await StoryModel.update(story.id,{status:'published'});
          await notifyChapterPublished(story,chapter);
          publicationStatus.published++;
        }
        await supabaseAdmin.from('user_workspace').update({data:{...item.data,state:'published'},updated_at:new Date().toISOString()}).eq('user_id',item.user_id).eq('namespace','drafts').eq('key',item.key);
      }catch{
        publicationStatus.failed++;
        await supabaseAdmin.from('user_workspace').update({data:{...item.data,state:'failed'},updated_at:new Date().toISOString()}).eq('user_id',item.user_id).eq('namespace','drafts').eq('key',item.key);
      }
    }
  }finally{running=false;}
}
