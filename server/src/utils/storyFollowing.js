export function chapterRecipients(authorId,authorFollowers,preferences){
 const overrides=new Map(preferences.map(row=>[row.user_id,row.data]));
 const candidates=new Set([...authorFollowers,...preferences.filter(x=>x.data?.following===true&&x.data?.muted===false).map(x=>x.user_id)]);
 return [...candidates].filter(id=>id!==authorId&&(!overrides.has(id)||(overrides.get(id)?.following===true&&overrides.get(id)?.muted===false)));
}
