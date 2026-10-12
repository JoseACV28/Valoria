import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('SQL aislado: historial atómico, permisos, orden único y cancelación de publicación',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
    create table auth.users(id uuid primary key,banned_until timestamptz);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz,not_after timestamptz);create table auth.mfa_factors(id uuid,user_id uuid,status text);
    create function auth.uid() returns uuid language sql as 'select null::uuid';create function auth.role() returns text language sql as 'select ''service_role''::text';
    create table storage.buckets(id text primary key,name text,public boolean);create table storage.objects(id uuid primary key,bucket_id text,name text);`);
    const names=['schema.sql','illustrations-schema.sql',...['20261001-content-visibility.sql','20261002_story_search_metadata.sql','20261003_editorial_workspace.sql','20261003_community_tools.sql','20261004_site_administration.sql','20261005_recovery_and_collaboration.sql','20261005_story_review_likes.sql','20261006_session_security.sql','20261006_reader_creator_experience.sql','20261007_launch_tools.sql'].map(x=>'migrations/'+x)];
    for(const name of names)await db.exec((await readFile(new URL('../../supabase/'+name,import.meta.url),'utf8')).replace(/create extension if not exists pgcrypto;/ig,''));
    // The incremental migration is safe to apply twice.
    await db.exec(await readFile(new URL('../../supabase/migrations/20261006_reader_creator_experience.sql',import.meta.url),'utf8'));
    const author='30000000-0000-4000-8000-000000000001',other='30000000-0000-4000-8000-000000000002',story='30000000-0000-4000-8000-000000000003',chapter='30000000-0000-4000-8000-000000000004';
    for(const id of [author,other]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into profiles(id,email,display_name) values($1,$2,$3)',[id,id+'@example.invalid','QA']);}
    await db.query("insert into stories(id,author_id,title,slug,description,category,author_name) values($1,$2,'QA','qa','QA','Fantasia','QA')",[story,author]);
    await db.query("insert into chapters(id,story_id,title,slug,chapter_number,content,status) values($1,$2,'Original','original',1,'Texto original','published')",[chapter,story]);
    await db.query("update chapters set content='Texto nuevo' where id=$1",[chapter]);
    const version=(await db.query('select * from chapter_versions where chapter_id=$1',[chapter])).rows[0];assert.equal(version.content,'Texto original');
    const restore=(actor,content)=>db.query('select restore_chapter_version($1,$2,$3,$4,$5) as chapter',[actor,chapter,version.id,content,'Original']);
    await assert.rejects(restore(other,'Texto nuevo'),/not_found/);await assert.rejects(restore(author,'Texto obsoleto'),/version_conflict/);
    await db.query("insert into user_workspace(user_id,namespace,key,data) values($1,'drafts',$2,'{}')",[author,'schedule:'+chapter]);
    const restored=(await restore(author,'Texto nuevo')).rows[0].chapter;assert.equal(restored.status,'draft');assert.equal(restored.content,'Texto original');
    assert.equal((await db.query('select * from user_workspace')).rows.length,0);assert.equal((await db.query('select * from chapter_versions')).rows.length,2);
    for(let i=0;i<55;i++)await db.query('update chapters set content=$1 where id=$2',['Texto '+i,chapter]);assert.equal((await db.query('select count(*)::int as n from chapter_versions')).rows[0].n,50);
    await db.query("insert into work_details(owner_id,work_type,work_id,series_name,series_position) values($1,'story',$2,'Saga',1)",[author,story]);
    await assert.rejects(db.query("insert into work_details(owner_id,work_type,work_id,series_name,series_position) values($1,'story',gen_random_uuid(),'saga',1)",[author]),e=>e.code==='23505');
    for(const role of ['anon','authenticated']){
      const grants=(await db.query("select has_table_privilege($1,'public.chapter_versions','select') as versions,has_table_privilege($1,'public.work_details','select') as details,has_table_privilege($1,'public.account_privacy_requests','insert') as privacy,has_function_privilege($1,'public.restore_chapter_version(uuid,uuid,uuid,text,text)','execute') as restore",[role])).rows[0];assert.deepEqual(grants,{versions:false,details:false,privacy:false,restore:false});
    }
  }finally{await db.close();}
});

