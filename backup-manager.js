(()=>{
 const MAX_ARCHIVE_BYTES=512*1024*1024;
 const MAX_EXPANDED_BYTES=512*1024*1024;
 const MAX_ARCHIVE_ENTRIES=2500;
 const MAX_MANIFEST_BYTES=4*1024*1024;
 const settingKey=key=>key.startsWith('retrotitles-')||key==='gr-keys'||key==='ejs-settings'||/^ejs-.+-settings$/.test(key);
 const safeRelativePath=value=>{
  if(typeof value!=='string'||!value.trim()||value.startsWith('/')||value.includes('\\'))return null;
  const parts=value.split('/');
  if(parts.some(part=>!part||part==='.'||part==='..'||part.includes('\0')))return null;
  return parts.join('/');
 };
 function status(message){const output=document.getElementById('backup-status');if(output)output.textContent=message}
 function collectSettings(){
  const settings={};
  for(let index=0;index<localStorage.length;index++){
   const key=localStorage.key(index);
   if(key&&settingKey(key))settings[key]=localStorage.getItem(key);
  }
  return settings;
 }
 async function ensureZip(){
  if(window.JSZip)return window.JSZip;
  await new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=new URL('jszip.min.js',document.baseURI).href;script.async=true;
   script.onload=()=>window.JSZip?resolve():reject(new Error('The local ZIP library loaded without its API.'));
   script.onerror=()=>reject(new Error('The local ZIP library is unavailable. Reconnect and reload before creating or restoring a backup.'));
   document.head.append(script);
  });
  return window.JSZip;
 }
 function normalizeSettings(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('The backup preferences section is invalid.');
  const settings={};
  for(const [key,item] of Object.entries(value)){
   if(!settingKey(key)||typeof item!=='string'||item.length>65536)throw new Error('The backup contains an unsupported preference.');
   settings[key]=item;
  }
  return settings;
 }
 function manifestEntrySize(entry){
  const size=Number(entry?._data?.uncompressedSize??entry?._data?.compressedSize??0);
  return Number.isFinite(size)&&size>=0?size:0;
 }
 async function createBackup(){
  const button=document.getElementById('backup-export');
  button.disabled=true;
  try{
   status('Preparing your private backup…');
   const [Zip,library,saveEntries]=await Promise.all([
    ensureZip(),
    window.__retrotitlesFileBackup.createSnapshot({includeFiles:document.getElementById('backup-include-files').checked}),
    document.getElementById('backup-include-saves').checked?window.__retrotitlesSaveBackup.exportSaves():Promise.resolve([])
   ]);
   const estimatedBytes=library.files.reduce((total,entry)=>total+(entry.blob?.size||0),0)+saveEntries.reduce((total,entry)=>total+(entry.bytes?.byteLength||0),0)+Object.values(library.state.games||{}).reduce((total,entry)=>total+(entry.coverBlob?.size||0),0);
   if(estimatedBytes>MAX_ARCHIVE_BYTES-1024*1024)throw new Error('This backup would exceed 512 MB. Turn off library files or split the backup into smaller files.');
   const zip=new Zip(),manifest={format:'retrotitles-backup',version:1,createdAt:new Date().toISOString(),library:{favorites:library.state.favorites,recent:library.state.recent,games:{}},settings:collectSettings(),covers:[],files:[],saves:[],includedFiles:Boolean(document.getElementById('backup-include-files').checked)};
   let coverIndex=0;
   for(const [key,details] of Object.entries(library.state.games||{})){
    const game={title:details.title||'',tags:Array.isArray(details.tags)?details.tags:[],collections:Array.isArray(details.collections)?details.collections:[]};
    if(details.coverBlob instanceof Blob&&details.coverBlob.size<=12*1024*1024&&details.coverBlob.type.startsWith('image/')){
     const path='covers/'+coverIndex+'.'+(details.coverBlob.type.split('/')[1]?.replace(/[^a-z0-9]/gi,'')||'image');coverIndex++;
     zip.file(path,details.coverBlob);manifest.covers.push({key,path,type:details.coverBlob.type,size:details.coverBlob.size});game.coverPath=path;
    }
    manifest.library.games[key]=game;
   }
   library.files.forEach((entry,index)=>{
    const path=safeRelativePath(entry.path);
    if(!path||!(entry.blob instanceof Blob))return;
    const archivePath='files/'+path;
    zip.file(archivePath,entry.blob,{date:new Date(entry.lastModified||Date.now())});
    manifest.files.push({path,archivePath,type:entry.type||entry.blob.type||'application/octet-stream',lastModified:Number(entry.lastModified)||0,size:entry.blob.size});
   });
   saveEntries.forEach((entry,index)=>{
    if(!(entry.bytes instanceof Uint8Array)||!/^.+\.state$/i.test(entry.key)||entry.key.includes('/')||entry.key.includes('\\'))return;
    const path='saves/'+index+'.state';zip.file(path,entry.bytes);
    manifest.saves.push({key:entry.key,path,size:entry.bytes.byteLength});
   });
   zip.file('manifest.json',JSON.stringify(manifest,null,2));
   const blob=await zip.generateAsync({type:'blob',compression:'STORE',streamFiles:true},metadata=>{
    if(metadata.percent<100)status('Building backup… '+Math.round(metadata.percent)+'%');
   });
   if(blob.size>MAX_ARCHIVE_BYTES)throw new Error('This backup is larger than 512 MB. Turn off library files or split the backup into smaller files.');
   const url=URL.createObjectURL(blob),link=document.createElement('a'),date=new Date().toISOString().slice(0,10);
   link.href=url;link.download='retrotitles-backup-'+date+'.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
   const skippedFiles=library.skippedLinkedFiles||0;
   status('Backup downloaded: '+manifest.files.length+' library file'+(manifest.files.length===1?'':'s')+', '+manifest.saves.length+' save state'+(manifest.saves.length===1?'':'s')+'.');
   if(skippedFiles)status('Backup downloaded. '+skippedFiles+' disk-linked file'+(skippedFiles===1?' was':'s were')+' skipped; only locally copied files can be bundled.');
  }catch(error){status('Could not create backup: '+error.message);window.__retrotitlesLog?.('error','Could not create a portable backup: '+error.message,'backup')}
  finally{button.disabled=false}
 }
 async function restoreBackup(file){
  if(!file) return;
  if(file.size>MAX_ARCHIVE_BYTES)throw new Error('This backup is larger than 512 MB and cannot be opened safely in this browser.');
  const Zip=await ensureZip(),zip=await Zip.loadAsync(file,{checkCRC32:false}),manifestFile=zip.file('manifest.json');
  if(!manifestFile||manifestEntrySize(manifestFile)>MAX_MANIFEST_BYTES)throw new Error('This ZIP does not contain a valid RetroTitles backup manifest.');
  const manifest=JSON.parse(await manifestFile.async('string'));
  if(manifest.format!=='retrotitles-backup'||manifest.version!==1||!manifest.library)throw new Error('This backup format is not supported.');
  if(!Array.isArray(manifest.covers)||!Array.isArray(manifest.files)||!Array.isArray(manifest.saves)||Object.keys(zip.files).length>MAX_ARCHIVE_ENTRIES)throw new Error('This backup has an invalid or oversized file list.');
  const declared=[
   ...manifest.covers.map(item=>({archivePath:item.path,size:item.size})),
   ...manifest.files.map(item=>({archivePath:item.archivePath,size:item.size})),
   ...manifest.saves.map(item=>({archivePath:item.path,size:item.size}))
  ];
  let expandedBytes=manifestEntrySize(manifestFile);
  for(const item of declared){
   const archivePath=safeRelativePath(item.archivePath);
   if(!archivePath)throw new Error('The backup contains an unsafe archive path.');
   const archived=zip.file(archivePath);
   if(!archived)throw new Error('A backup entry is missing: '+archivePath);
   const declaredSize=Number(item.size);
   if(Number.isFinite(declaredSize)&&declaredSize<0)throw new Error('A backup entry has an invalid size.');
   const size=Math.max(manifestEntrySize(archived),Number.isFinite(declaredSize)?declaredSize:0);
   expandedBytes+=size;
   if(expandedBytes>MAX_EXPANDED_BYTES)throw new Error('This backup expands beyond the 512 MB safety limit.');
  }
  const settings=normalizeSettings(manifest.settings||{});
  const shouldReplaceSaves=document.getElementById('backup-replace-saves').checked;
  const confirmed=window.confirm('Restore this backup? Library details and preferences will merge into this browser. Existing game files at matching paths will stay untouched. Existing save states will '+(shouldReplaceSaves?'be replaced.':'be kept unless they are missing.')+' Library files are restored only when this archive includes them.');
  if(!confirmed)return;
  const button=document.getElementById('backup-restore');button.disabled=true;
  try{
   const coverFiles=[];
   for(const item of manifest.covers){
    if(typeof item.key!=='string'||!item.key||!item.path.startsWith('covers/')||!String(item.type||'').startsWith('image/'))continue;
    const blob=await zip.file(item.path).async('blob');
    if(blob.size<=12*1024*1024)coverFiles.push({key:item.key,blob:blob.slice(0,blob.size,item.type)});
   }
   const fileEntries=[];let totalFileBytes=0;
   for(const item of manifest.files){
    const path=safeRelativePath(item.path);
    if(!path||!item.archivePath||!item.archivePath.startsWith('files/')||item.archivePath!=='files/'+path)throw new Error('A game file has an invalid library path.');
    totalFileBytes+=Number(item.size)||manifestEntrySize(zip.file(item.archivePath));
    if(totalFileBytes>MAX_EXPANDED_BYTES)throw new Error('Library files exceed the 512 MB restore limit.');
    const archived=zip.file(item.archivePath);
    if(!archived)throw new Error('A game file is missing from the backup.');
    const blob=await archived.async('blob');
    fileEntries.push({path,file:new File([blob],path.split('/').pop(),{type:item.type||blob.type||'application/octet-stream',lastModified:Number(item.lastModified)||Date.now()})});
   }
   const saveEntries=[];
   for(const item of manifest.saves){
    if(typeof item.key!=='string'||!/^.+\.state$/i.test(item.key)||item.key.includes('/')||item.key.includes('\\')||!item.path.startsWith('saves/'))continue;
    const archived=zip.file(item.path);
    if(!archived)throw new Error('A save state is missing from the backup.');
    saveEntries.push({key:item.key,bytes:await archived.async('uint8array')});
   }
   status('Restoring library files…');
   const libraryResult=await window.__retrotitlesFileBackup.restoreSnapshot({state:manifest.library,covers:coverFiles,files:fileEntries});
   const saveResult=await window.__retrotitlesSaveBackup.restoreSaves(saveEntries,{replace:shouldReplaceSaves});
   await window.__retrotitlesSaveBackup.refresh?.();
   let restoredSettings=0;
   for(const [key,value] of Object.entries(settings)){localStorage.setItem(key,value);restoredSettings++}
   await window.__retrotitlesRefreshFiles?.();
   status('Restore complete: '+libraryResult.filesAdded+' new library file'+(libraryResult.filesAdded===1?'':'s')+', '+libraryResult.filesSkipped+' existing file'+(libraryResult.filesSkipped===1?'':'s')+' kept, '+saveResult.imported+' save state'+(saveResult.imported===1?'':'s')+' restored, '+saveResult.skipped+' existing save state'+(saveResult.skipped===1?'':'s')+' kept, '+restoredSettings+' preference'+(restoredSettings===1?'':'s')+' applied.'+(restoredSettings?' Reload to apply imported preferences.':''));
  }catch(error){status('Restore stopped: '+error.message);window.__retrotitlesLog?.('error','Could not restore a portable backup: '+error.message,'backup')}
  finally{button.disabled=false}
 }
 function initialize(){
  const exportButton=document.getElementById('backup-export'),restoreButton=document.getElementById('backup-restore'),fileInput=document.getElementById('backup-import-file');
  exportButton.addEventListener('click',createBackup);
  restoreButton.addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',event=>{
   const file=event.target.files?.[0];event.target.value='';
   if(!file)return;
   const button=document.getElementById('backup-restore');button.disabled=true;status('Reading backup…');
   restoreBackup(file).catch(error=>{status('Could not restore backup: '+error.message);window.__retrotitlesLog?.('error','Could not read a portable backup: '+error.message,'backup')}).finally(()=>{button.disabled=false});
  });
 }
 document.addEventListener('DOMContentLoaded',initialize);
})();
