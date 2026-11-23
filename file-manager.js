(()=>{
 window.__retrotitlesFileManager=({$,msg,sizeLabel,openFile,extractArchive})=>{
  const DB_NAME='retrotitles-file-index',DB_VERSION=2,STORE='files',META='metadata';
  const LEGACY_DATABASES=['retrotitles-files','retrotitles-library'];
  const manager=$('file-manager'),list=$('file-list'),empty=$('file-empty'),status=$('file-manager-status');
  const supported=Boolean(window.indexedDB);
  let dbPromise,ready,writeQueue=Promise.resolve();
  const normalizePath=path=>{
   const parts=[];
   String(path||'').replace(/\\/g,'/').replace(/^\/+/,'').split('/').forEach(part=>{
    if(!part||part==='.')return;
    if(part==='..'){parts.pop();return}
    parts.push(part);
   });
   return parts.join('/');
  };
  const newId=()=>crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join('');
  const extOf=name=>String(name||'').split('.').pop().toLowerCase();
  const isArchive=name=>['zip','rar'].includes(extOf(name));
  const systemFor=name=>{
   const extension=extOf(name);
   const systems={nes:'nes',fds:'nes',unif:'nes',unf:'nes',smc:'snes',sfc:'snes',gb:'gb',gbc:'gb',gba:'gba',n64:'n64',z64:'n64',nds:'nds',md:'segaMD',gen:'segaMD',iso:'psp',cso:'psp',prx:'psp',chd:null,cue:null,bin:null};
   return systems[extension]||null;
  };
  function openDb(){
   if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const request=window.indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
     const db=request.result;
     const store=db.objectStoreNames.contains(STORE)?request.transaction.objectStore(STORE):db.createObjectStore(STORE,{keyPath:'id'});
     [['normalizedPath','normalizedPath'],['addedAt','addedAt'],['parentArchiveId','parentArchiveId'],['hash','hash']].forEach(([name,keyPath])=>{
      if(!store.indexNames.contains(name))store.createIndex(name,keyPath,{unique:false});
     });
     if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:'key'});
    };
    request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result)};
    request.onerror=()=>reject(request.error||new Error('Could not open browser file storage.'));
    request.onblocked=()=>reject(new Error('Browser file storage is blocked by another tab. Close other retrotitles tabs and retry.'));
   });
   return dbPromise;
  }
  const transactionDone=transaction=>new Promise((resolve,reject)=>{
   transaction.oncomplete=resolve;
   transaction.onerror=()=>reject(transaction.error||new Error('Browser file storage operation failed.'));
   transaction.onabort=()=>reject(transaction.error||new Error('Browser file storage operation was interrupted.'));
  });
  async function getAllRecords(){
   const db=await openDb();
   return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readonly'),request=transaction.objectStore(STORE).getAll();
    let records=[];
    request.onsuccess=()=>{records=request.result};
    request.onerror=()=>reject(request.error||new Error('Could not list stored files.'));
    transaction.oncomplete=()=>resolve(records);
    transaction.onerror=()=>reject(transaction.error||new Error('Could not read stored files.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Reading stored files was interrupted.'));
   });
  }
  async function getPathRecords(path){
   const db=await openDb();
   return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,'readonly').objectStore(STORE).index('normalizedPath').getAll(path);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not check for duplicate file paths.'));
   });
  }
  async function getHashRecords(hash){
   const db=await openDb();
   return new Promise((resolve,reject)=>{
    const request=db.transaction(STORE,'readonly').objectStore(STORE).index('hash').getAll(hash);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not check for duplicate file contents.'));
   });
  }
  async function getMetadata(key){
   const db=await openDb();
   return new Promise((resolve,reject)=>{
    const request=db.transaction(META,'readonly').objectStore(META).get(key);
    request.onsuccess=()=>resolve(request.result?.value);
    request.onerror=()=>reject(request.error||new Error('Could not read file index metadata.'));
   });
  }
  async function hashBlob(blob){
   if(!window.crypto?.subtle||!blob?.slice)return null;
   const chunkSize=2*1024*1024,digests=[];
   for(let offset=0;offset<blob.size;offset+=chunkSize){
    const bytes=await blob.slice(offset,offset+chunkSize).arrayBuffer();
    digests.push(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
   }
   const combined=new Uint8Array(digests.length*32);
   digests.forEach((digest,index)=>combined.set(digest,index*32));
   const finalInput=new Uint8Array(combined.length+8),view=new DataView(finalInput.buffer);
   view.setUint32(0,Math.floor(blob.size/0x100000000));view.setUint32(4,blob.size>>>0);
   finalInput.set(combined,8);
   return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',finalInput)),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  function asInput(item){
   if(item&&item.file)return{file:item.file,path:item.path||item.file.name,handleRef:item.handleRef||null};
   return{file:item,path:item?.webkitRelativePath||item?.name||'',handleRef:null};
  }
  async function writeRecord(record){
   const db=await openDb(),records=await getPathRecords(record.normalizedPath),previous=records.filter(item=>!item.superseded).sort((a,b)=>b.addedAt-a.addedAt)[0];
   if(previous&&previous.addedAt>record.addedAt)return{id:previous.id,duplicate:true,record:previous};
   if(previous&&previous.size===record.size&&previous.hash&&previous.hash===record.hash)return{id:previous.id,duplicate:true,record:previous};
   if(previous?.blob&&!record.blob&&!record.hash)return{id:previous.id,duplicate:true,record:previous};
   if(!previous&&record.hash){
    const duplicate=(await getHashRecords(record.hash)).find(item=>!item.superseded&&item.size===record.size);
    if(duplicate)return{id:duplicate.id,duplicate:true,record:duplicate};
   }
   const now=Date.now();
   if(previous){
    previous.superseded=true;
    const replacedChildren=isArchive(record.name)&&previous.hash!==record.hash
     ?(await getAllRecords()).filter(item=>item.parentArchiveId===previous.id&&!item.superseded):[];
    const transaction=db.transaction(STORE,'readwrite'),store=transaction.objectStore(STORE);
    store.put(previous);
    replacedChildren.forEach(item=>{item.superseded=true;store.put(item)});
    store.put(record);await transactionDone(transaction);
    if(previous.hash!==record.hash)msg('Updated '+record.name+'.');
   }else{
    const transaction=db.transaction(STORE,'readwrite');
    transaction.objectStore(STORE).put(record);await transactionDone(transaction);
   }
   return{id:record.id,duplicate:false,record:{...record,addedAt:record.addedAt||now}};
  }
  function queueRecord(record){
   const pending=writeQueue.then(()=>writeRecord(record));
   writeQueue=pending.catch(()=>{});
   return pending;
  }
  async function ingestFiles(files,{source='picker',parentArchiveId=null,depth=0,emit=true}={}){
   if(!supported){msg('This browser cannot store files locally. The selected title can still be opened, but it will not appear in the persistent file manager.',false,'warn');return[]}
   if(ready)await ready;
   const inputs=Array.from(files||[]).map(asInput).filter(item=>item.file);
   const results=[];
   for(const input of inputs){
    const file=input.file,path=normalizePath(input.path||file.name);
    if(!path||path.split('/').some(part=>part==='..'))throw new Error('A selected file has an invalid path.');
    const name=path.split('/').pop(),blob=file instanceof Blob?file:null;
    if(!blob&&!input.handleRef)throw new Error('Could not read '+name+'.');
    const record={
     id:newId(),path,name,size:Number(file.size)||0,type:file.type||'application/octet-stream',
     source,parentArchiveId,system:systemFor(name),addedAt:Date.now(),normalizedPath:path.toLowerCase(),
     hash:blob?await hashBlob(blob):null,blob:input.handleRef?null:blob,handleRef:input.handleRef||null,superseded:false
    };
    const saved=await queueRecord(record);
    results.push(saved.record);
    if(saved.duplicate||!isArchive(name)||depth>=5)continue;
    if(!extractArchive)continue;
    const extracted=await extractArchive(file);
    if(!extracted.length)continue;
    const archiveDirectory=path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'';
    for(const entry of extracted){
     const entryPath=normalizePath(entry.name);
     if(!entryPath||entryPath.startsWith('__MACOSX/')||entryPath==='.DS_Store')continue;
     const child=await entry.get();
     const childPath=archiveDirectory+entryPath;
     results.push(...await ingestFiles([{file:child,path:childPath}],{source:'archive',parentArchiveId:saved.id,depth:depth+1,emit:false}));
    }
   }
   if(inputs.length&&emit){
    window.dispatchEvent(new CustomEvent('library-updated'));
   }
   return results;
  }
  async function ingestHandles(handles){
   const inputs=[];
   for(const handle of handles){
    const file=await handle.getFile();
    inputs.push({file,path:handle.name,handleRef:handle});
   }
   return ingestFiles(inputs,{source:'file-handle'});
  }
  async function legacyRecords(databaseName){
   if(window.indexedDB.databases){
    const databases=await window.indexedDB.databases();
    if(!databases.some(database=>database.name===databaseName))return [];
   }
   return new Promise((resolve,reject)=>{
    const request=window.indexedDB.open(databaseName);
    let created=false;
    request.onupgradeneeded=event=>{
     if(event.oldVersion===0){created=true;request.result.close();request.transaction.abort()}
    };
    request.onsuccess=()=>{
     const db=request.result;
     const storeName=databaseName==='retrotitles-files'?'files':'titles';
     if(!db.objectStoreNames.contains(storeName)){db.close();resolve([]);return}
     const transaction=db.transaction(storeName,'readonly'),cursor=transaction.objectStore(storeName).getAll();
     cursor.onsuccess=()=>{const result=cursor.result;db.close();resolve(result)};
     cursor.onerror=()=>{db.close();reject(cursor.error||new Error('Could not read legacy file records.'))};
    };
    request.onerror=()=>{
     if(!created){reject(request.error||new Error('Could not open legacy file storage.'));return}
     const deletion=window.indexedDB.deleteDatabase(databaseName);
     deletion.onsuccess=()=>resolve([]);
     deletion.onerror=()=>reject(deletion.error||new Error('Could not clean up an empty legacy database.'));
    };
   });
  }
  async function migrateLegacy(){
   if(await getMetadata('migration-v1'))return;
   const files=[],handles=[];
   for(const database of LEGACY_DATABASES){
    const records=await legacyRecords(database);
    if(database==='retrotitles-files')files.push(...records);
    else handles.push(...records);
   }
   const migrated=[];
   for(const old of files){
    const path=normalizePath(old.path||old.name);
    if(!path)continue;
    const blob=old.blob instanceof Blob?old.blob:null;
    const id=newId();
    migrated.push({
     id,path,name:path.split('/').pop(),size:Number(old.size??blob?.size)||0,type:old.type||blob?.type||'application/octet-stream',
     source:old.source||'legacy-file-manager',parentArchiveId:null,system:systemFor(path),addedAt:Number(old.addedAt)||Date.now(),
     normalizedPath:path.toLowerCase(),hash:blob?await hashBlob(blob):null,blob,handleRef:null,superseded:false
    });
   }
   for(const old of handles){
    if(!old.handle||!old.handle.name)continue;
    const path=normalizePath(old.path||old.name||old.handle.name);
    if(!path)continue;
    let file;
    try{if(await old.handle.queryPermission({mode:'read'})==='granted')file=await old.handle.getFile()}catch(error){window.__retrotitlesLog?.('warn','Could not inspect a saved file handle during migration: '+error.message,'file-index')}
    migrated.push({
     id:newId(),path,name:path.split('/').pop(),size:Number(file?.size)||0,type:file?.type||'application/octet-stream',
     source:'file-handle',parentArchiveId:null,system:systemFor(path),addedAt:Number(old.addedAt)||Date.now(),
     normalizedPath:path.toLowerCase(),hash:file?await hashBlob(file):null,blob:null,handleRef:old.handle,superseded:false
    });
   }
   migrated.sort((a,b)=>a.addedAt-b.addedAt);
   let imported=0;
   for(const record of migrated){const result=await queueRecord(record);if(!result.duplicate)imported++}
   const db=await openDb(),transaction=db.transaction(META,'readwrite');
   transaction.objectStore(META).put({key:'migration-v1',value:true});
   await transactionDone(transaction);
   if(files.length||handles.length)window.__retrotitlesLog?.('info','Legacy file migration imported '+imported+' of '+migrated.length+' valid record(s) ('+files.length+' stored file(s), '+handles.length+' saved handle(s)).','file-index');
  }
  function makeButton(text,label,action){
   const button=document.createElement('button');button.type='button';button.className='lp-button';button.textContent=text;
   if(label)button.setAttribute('aria-label',label);
   button.onclick=action;return button;
  }
  async function removeFile(id){
   const db=await openDb(),transaction=db.transaction(STORE,'readwrite');
   transaction.objectStore(STORE).delete(id);await transactionDone(transaction);
   window.dispatchEvent(new CustomEvent('library-updated'));
  }
  async function openRecord(record){
   let file=record.blob;
   if(!file&&record.handleRef){
    let permission=await record.handleRef.queryPermission({mode:'read'});
    if(permission!=='granted')permission=await record.handleRef.requestPermission({mode:'read'});
    if(permission!=='granted')throw new Error('Read access was not granted for '+record.name+'.');
    file=await record.handleRef.getFile();
   }
   if(!file)throw new Error('The local data for '+record.name+' is no longer available.');
   return openFile(new File([file],record.name,{type:record.type,lastModified:record.addedAt}));
  }
  function visibleRecords(records){
   const search=$('file-search').value.trim().toLocaleLowerCase(),system=$('file-system-filter').value,type=$('file-type-filter').value,source=$('file-source-filter').value;
   return records.filter(record=>!record.superseded)
    .filter(record=>!system||record.system===system)
    .filter(record=>!type||extOf(record.name)===type)
    .filter(record=>!source||record.source===source)
    .filter(record=>!search||(record.path+' '+record.name+' '+record.source).toLocaleLowerCase().includes(search))
    .sort((a,b)=>a.path.localeCompare(b.path)||a.addedAt-b.addedAt);
  }
  async function refresh(){
   const records=await getAllRecords(),files=visibleRecords(records);
   list.replaceChildren();empty.hidden=files.length>0;
   const systems=[...new Set(records.filter(record=>!record.superseded&&record.system).map(record=>record.system))].sort();
   const types=[...new Set(records.filter(record=>!record.superseded).map(record=>extOf(record.name)))].sort();
   const sources=[...new Set(records.filter(record=>!record.superseded).map(record=>record.source))].sort();
   for(const [select,values,label] of [[$('file-system-filter'),systems,'All systems'],[$('file-type-filter'),types,'All types'],[$('file-source-filter'),sources,'All sources']]){
    const selected=select.value,options=[new Option(label,'')];
    values.forEach(value=>options.push(new Option(value,value)));
    select.replaceChildren(...options);
    if(values.includes(selected))select.value=selected;
   }
   const parentNames=new Map(records.map(record=>[record.id,record.name]));
   for(const record of files){
    const row=document.createElement('li');row.className='lp-library-row lp-file-row';
    const details=document.createElement('span');details.className='lp-file-name';
    details.append(document.createTextNode(record.path));
    const metadata=document.createElement('span');metadata.className='lp-save-size';
    metadata.textContent=sizeLabel(record.size)+' · '+record.source+(record.parentArchiveId?' · from '+(parentNames.get(record.parentArchiveId)||'archive'):'');
    details.append(metadata);
    const actions=document.createElement('span');actions.className='lp-library-actions';
    actions.append(makeButton('Open','Open '+record.name,()=>openRecord(record).catch(error=>msg('Could not open file: '+error.message,false,'error'))));
    if(record.blob){
     actions.append(makeButton('Download','Download '+record.name,()=>{
      const url=URL.createObjectURL(record.blob),link=document.createElement('a');link.href=url;link.download=record.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
     }));
    }
    actions.append(makeButton('Remove','Remove '+record.name,()=>removeFile(record.id).catch(error=>msg('Could not remove file: '+error.message,false,'error'))));
    row.append(details,actions);list.append(row);
   }
   status.textContent=files.length+' file'+(files.length===1?'':'s')+' stored locally in this browser; nothing is uploaded.';
  }
  async function rebuildIndex(){
   const records=await getAllRecords(),db=await openDb(),updates=[];
   for(const record of records){
    const path=normalizePath(record.path||record.name);
    if(!path)continue;
    const content=record.blob||null,hash=content?await hashBlob(content):record.hash||null;
    updates.push({...record,path,name:path.split('/').pop(),normalizedPath:path.toLowerCase(),hash,superseded:false});
   }
   const grouped=new Map();
   updates.sort((a,b)=>b.addedAt-a.addedAt).forEach(record=>{
    const prior=grouped.get(record.normalizedPath);
    if(prior)record.superseded=true;
    else grouped.set(record.normalizedPath,record);
   });
   const transaction=db.transaction(STORE,'readwrite'),store=transaction.objectStore(STORE);
   updates.forEach(record=>store.put(record));await transactionDone(transaction);
   window.dispatchEvent(new CustomEvent('library-updated'));
   msg('Rebuilt the file index. '+grouped.size+' current file(s) indexed.');
  }
  async function clearRuntimeCache(){
   if('serviceWorker'in navigator){
    const registrations=await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(registration=>{
     const script=registration.active?.scriptURL||registration.waiting?.scriptURL||registration.installing?.scriptURL||'';
     return script===new URL('sw.js',location.href).href;
    }).map(registration=>registration.unregister()));
   }
   if(window.caches){
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith('retrotitles-')).map(name=>caches.delete(name)));
   }
   location.reload();
  }
  window.__retrotitlesIngestFiles=ingestFiles;
  window.__retrotitlesIngestHandles=ingestHandles;
  window.__retrotitlesRefreshFiles=refresh;
  manager.hidden=false;
  if(!supported){
   status.textContent='This browser does not support local file storage.';
   $('file-import-button').disabled=true;$('file-refresh').disabled=true;$('file-rebuild').disabled=true;
   $('runtime-cache-clear').onclick=()=>clearRuntimeCache().catch(error=>msg('Could not clear runtime cache: '+error.message,false,'error'));
   return;
  }
  const refreshOnChange=()=>refresh().catch(error=>msg('Could not refresh stored files: '+error.message,false,'error'));
  ['file-search','file-system-filter','file-type-filter','file-source-filter'].forEach(id=>{
   $(id).addEventListener('input',refreshOnChange);$(id).addEventListener('change',refreshOnChange);
  });
  $('file-import-button').onclick=()=>$('file-import').click();
  $('file-refresh').onclick=refreshOnChange;
  $('file-rebuild').onclick=()=>rebuildIndex().catch(error=>msg('Could not rebuild the file index: '+error.message,false,'error'));
  $('runtime-cache-clear').onclick=()=>clearRuntimeCache().catch(error=>msg('Could not clear runtime cache: '+error.message,false,'error'));
  $('file-import').onchange=event=>{
   const files=Array.from(event.target.files||[]);event.target.value='';
   if(!files.length)return;
   status.textContent='Adding '+files.length+' file'+(files.length===1?'':'s')+'…';
   ingestFiles(files,{source:'file-manager'}).then(()=>msg('Added '+files.length+' file'+(files.length===1?'':'s')+' to the unified file view.')).catch(error=>{status.textContent='Could not add the selected files.';msg('Could not save files: '+error.message,false,'error')});
  };
  if(window.showOpenFilePicker&&window.indexedDB){
   $('library-add').hidden=false;
   $('library-add').onclick=async()=>{
    try{const [handle]=await window.showOpenFilePicker({multiple:false}),[record]=await ingestHandles([handle]);msg('Added '+handle.name+' to the unified file view.');await openRecord(record)}
    catch(error){if(error.name!=='AbortError')msg('Could not add title: '+error.message,false,'error')}
   };
  }
  window.addEventListener('library-updated',refreshOnChange);
  ready=migrateLegacy().then(refresh).catch(error=>{msg('Could not migrate browser file storage: '+error.message,false,'error')});
 };
})();
