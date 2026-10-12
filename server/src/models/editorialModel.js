import { randomUUID } from 'node:crypto';
import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { StoryModel } from './storyModel.js';
import { ChapterModel } from './chapterModel.js';
import { slugify } from '../utils/slugify.js';
const submissions=new Map();
export async function createEditorial(input) {
  const key=`${input.authorId}:${input.submissionId}`;
  if(!isSupabaseEnabled()) {
    if(submissions.has(key)) return submissions.get(key);
    const operation=(async()=>{
      const story=await StoryModel.create(input);
      try {
        const chapter=await ChapterModel.create(story.id,{title:'Capítulo 1',chapterNumber:1,content:input.storyContent,excerpt:input.description,status:input.status});
        return {story,chapter};
      }catch(error){await StoryModel.delete(story.id);submissions.delete(key);throw error;}
    })();
    submissions.set(key,operation);return operation;
  }
  const {data,error}=await supabaseAdmin.rpc('create_story_with_chapter',{
    actor:input.authorId, submission:input.submissionId,
    story_data:{...input,slug:`${slugify(input.title)}-${randomUUID().slice(0,8)}`,excerpt:input.description,status:input.status||'draft',audience:input.audience||'General',language:input.language||'Espanol',rights:input.rights||'Todos los derechos reservados',characters:input.characters||[],tags:input.tags||[]},
    chapter_data:{content:input.storyContent}
  });
  if(error) throw Object.assign(new Error('No se pudo guardar la historia completa. Comprueba la migración editorial de Supabase y reintenta; tu borrador se conserva.'),{status:503});
  return {story:await StoryModel.getByIdOrSlug(data.story.id),chapter:data.chapter};
}
