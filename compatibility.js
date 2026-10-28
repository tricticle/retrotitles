(()=>{
 const norm=path=>{
  const parts=[];
  path.split('/').forEach(part=>{
   if(part==='..')parts.pop();
   else if(part&&part!=='.')parts.push(part);
  });
  return parts.join('/');
 };
 const RPG_CORE_FILES=['js/rpg_core.js','js/rpg_core.min.js','js/rmmz_core.js','js/rmmz_core.min.js'];
 const rpgMakerName=core=>!core?'RPG Maker MV/MZ':/rmmz/.test(core)?'RPG Maker MZ':'RPG Maker MV';
 function inspectRpgMaker(names){
  const clean=names.map(name=>norm(name).replace(/\\/g,'/')).filter(Boolean);
  const indexes=clean.filter(name=>/(^|\/)index\.html?$/i.test(name)).sort((a,b)=>a.split('/').length-b.split('/').length);
  for(const index of indexes){
   const slash=index.lastIndexOf('/'),base=slash<0?'':index.slice(0,slash+1),baseLower=base.toLowerCase();
   const files=new Set(clean.filter(path=>path.toLowerCase().startsWith(baseLower)).map(path=>path.slice(base.length).toLowerCase()));
   const hasSystem=files.has('data/system.json'),core=RPG_CORE_FILES.find(path=>files.has(path));
   const hasMarker=hasSystem||core||['js/plugins.js','js/rpg_managers.js','js/rmmz_managers.js','data/actors.json','data/mapinfos.json','game.rpgproject'].some(path=>files.has(path));
   if(!hasMarker)continue;
   const missing=[];
   if(!hasSystem)missing.push('data/System.json');
   if(!core)missing.push('js/rpg_core.js (MV) or js/rmmz_core.js (MZ)');
   return{name:rpgMakerName(core),index,missing};
  }
  const markers=clean.map(path=>({path,match:path.match(/^(.*?)(?:data\/(?:system|actors|mapinfos)\.json|js\/(?:rpg|rmmz)_(?:core|managers)(?:\.min)?\.js|js\/plugins\.js|game\.rpgproject)$/i)})).filter(item=>item.match);
  if(!markers.length)return null;
  const root=markers[0].match[1],rootLower=root.toLowerCase();
  const files=new Set(clean.filter(path=>path.toLowerCase().startsWith(rootLower)).map(path=>path.slice(root.length).toLowerCase()));
  const core=RPG_CORE_FILES.find(path=>files.has(path));
  const missing=[];
  if(!files.has('index.html'))missing.push('index.html');
  if(!files.has('data/system.json'))missing.push('data/System.json');
  if(!core)missing.push('js/rpg_core.js (MV) or js/rmmz_core.js (MZ)');
  return{name:rpgMakerName(core),index:root+'index.html',missing};
 }
 function findRpgMakerIndex(names){
  const project=inspectRpgMaker(names);
  return project&&!project.missing.length?project.index:'';
 }
 function isDesktopRpgMaker(names){
  return names.some(name=>{
   const path=norm(name).replace(/\\/g,'/');
   return /(^|\/)(game\.ini|game\.rgssad|game\.rgss3a)$/i.test(path)||/\.(rgssad|rgss3a)$/i.test(path);
  });
 }
 function findStreamIndex(names){
  return findRpgMakerIndex(names)||names.filter(name=>/(^|\/)index\.html?$/i.test(name)).sort((a,b)=>a.split('/').length-b.split('/').length)[0]||'';
 }
 async function findMissingRpgMakerScripts(entries,index){
  const pageEntry=entries.find(entry=>norm(entry.name).toLowerCase()===norm(index).toLowerCase());
  if(!pageEntry)return['index.html'];
  const page=await pageEntry.get(),documentText=typeof page==='string'?page:await page.text();
  const documentPage=new DOMParser().parseFromString(documentText,'text/html');
  const available=new Set(entries.map(entry=>norm(entry.name).toLowerCase()));
  const base=index.includes('/')?index.slice(0,index.lastIndexOf('/')+1):'';
  const missing=new Set();
  for(const script of documentPage.querySelectorAll('script[src]')){
   const source=script.getAttribute('src')||'';
   if(!source||/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|blob:|data:)/i.test(source))continue;
   const clean=source.split(/[?#]/)[0].replace(/\\/g,'/');
   let decoded=clean;
   try{decoded=decodeURIComponent(clean)}catch(error){}
   const path=norm(decoded.startsWith('/')?decoded.slice(1):base+decoded);
   if(path&&!available.has(path.toLowerCase()))missing.add(source);
  }
  return[...missing];
 }
 window.__retrotitlesCompatibility={inspectRpgMaker,findRpgMakerIndex,isDesktopRpgMaker,findStreamIndex,findMissingRpgMakerScripts};
})();
