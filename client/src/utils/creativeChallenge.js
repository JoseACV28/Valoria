const prompts=[
 ['Una puerta inesperada','Escribe o ilustra el momento en que alguien descubre una puerta que no estaba allí.'],
 ['Una carta sin destinatario','Crea una historia o una imagen alrededor de una carta que nadie esperaba recibir.'],
 ['La ciudad después de la lluvia','Imagina un encuentro en una ciudad que acaba de despertar bajo la lluvia.'],
 ['Un pequeño acto de valentía','Cuenta o dibuja una decisión pequeña que cambia el rumbo de un personaje.']
];
export function creativeChallenge(date=new Date()) {
  const year=date.getUTCFullYear(),month=date.getUTCMonth();
  const [title,prompt]=prompts[(year*12+month)%prompts.length];
  return {title,prompt,tag:`reto-${year}-${String(month+1).padStart(2,'0')}`,startsAt:new Date(Date.UTC(year,month,1)),endsAt:new Date(Date.UTC(year,month+1,1))};
}
export function challengeEntries(works,tag){return works.filter(work=>work.status==='published'&&(!work.visibility||work.visibility==='public')&&Array.isArray(work.tags)&&work.tags.some(value=>String(value).toLowerCase()===tag.toLowerCase()));}
export function launchCommunity(posts){return posts.filter(post=>!/(seed de prueba|forma parte del seed|sembrad[oa]s? sobre la base)/i.test(post.content||post.body||post.text||''));}
