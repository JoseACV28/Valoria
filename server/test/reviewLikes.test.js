import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL='https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-service-key';
process.env.SUPABASE_ANON_KEY='';
const {supabaseAdmin}=await import('../src/config/supabase.js');
const {ReviewModel}=await import('../src/models/reviewModel.js');

test('los likes remotos usan una operación atómica y reconocen el duplicado',async t=>{
  const original=supabaseAdmin.rpc;t.after(()=>{supabaseAdmin.rpc=original;});
  const seen=new Set();let count=0;
  supabaseAdmin.rpc=async(name,args)=>{
    assert.equal(name,'like_story_review');assert.equal(args.p_review_id,'review');
    const duplicate=seen.has(args.p_user_id);if(!duplicate){seen.add(args.p_user_id);count++;}
    return {data:{review:{id:'review',reviewer_name:'Autora',likes_count:count},alreadyLiked:duplicate}};
  };
  const first=await ReviewModel.like('review','one');assert.equal(first.alreadyLiked,false);assert.equal(first.review.likesCount,1);
  const duplicate=await ReviewModel.like('review','one');assert.equal(duplicate.alreadyLiked,true);assert.equal(duplicate.review.likesCount,1);
  const another=await ReviewModel.like('review','two');assert.equal(another.review.likesCount,2);assert.equal(another.review.likedByCurrentUser,true);
});

test('una migración ausente o una reseña inaccesible no genera un like ficticio',async t=>{
  const original=supabaseAdmin.rpc;t.after(()=>{supabaseAdmin.rpc=original;});
  supabaseAdmin.rpc=async()=>({error:{code:'PGRST202',message:'Missing function'}});
  await assert.rejects(ReviewModel.like('review','one'),error=>error.status===503);
  supabaseAdmin.rpc=async()=>({error:{code:'P0002',message:'Not available'}});
  await assert.rejects(ReviewModel.like('review','one'),error=>error.status===404);
});
