import { isSupabaseEnabled, supabaseAdmin } from '../config/supabase.js';
import { NotificationModel } from '../models/notificationModel.js';
import {listWorkspaceRows} from '../models/workspaceModel.js';
import {chapterRecipients} from './storyFollowing.js';
export async function notifyChapterPublished(story,chapter) {
  if(!isSupabaseEnabled())return;
  const [preferences,follows]=await Promise.all([
    listWorkspaceRows(null,'preferences',`story-follow:${story.id}`),
    supabaseAdmin.from('profile_follows').select('follower_id').eq('followed_id',story.authorId)
  ]);
  if(follows.error)throw new Error('No se pudieron consultar los seguidores.');
  const recipients=chapterRecipients(story.authorId,(follows.data||[]).map(x=>x.follower_id),preferences);
  await Promise.allSettled(recipients.map(recipientId=>NotificationModel.create({recipientId,actorId:story.authorId,actorName:story.author,type:'chapter_published',title:`Nuevo capítulo de ${story.title}`,body:chapter.title,routeView:'reading',routeIdentifier:story.slug||story.id})));
}
