(()=>{
 window.__retrotitlesFileManager=({$,msg,sizeLabel,openFile,openFolder,extractArchive})=>{
  const DB_NAME='retrotitles-file-index',DB_VERSION=2,STORE='files',META='metadata';
  const LEGACY_DATABASES=['retrotitles-files','retrotitles-library'];
  const manager=$('file-manager'),list=$('file-list'),empty=$('file-empty'),status=$('file-manager-status');
  const supported=Boolean(window.indexedDB);
  let dbPromise,ready,writeQueue=Promise.resolve();
  const selectedFileIds=new Set(),libraryFilters={system:'',source:''};
  let libraryView='grid';
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
   const systems={nes:'nes',fds:'nes',unif:'nes',unf:'nes',smc:'snes',sfc:'snes',gb:'gb',gbc:'gb',gba:'gba',n64:'n64',z64:'n64',nds:'nds',md:'segaMD',gen:'segaMD',cso:'psp',prx:'psp',chd:null,cue:null,bin:null,iso:null,tap:null,dsk:null};
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
  async function getMetadata(key){
   const db=await openDb();
   return new Promise((resolve,reject)=>{
    const request=db.transaction(META,'readonly').objectStore(META).get(key);
    request.onsuccess=()=>resolve(request.result?.value);
    request.onerror=()=>reject(request.error||new Error('Could not read file index metadata.'));
   });
  }
  async function hashBlob(blob,onProgress){
   if(!window.crypto?.subtle||!blob?.slice)return null;
   const chunkSize=2*1024*1024,digests=[];
   for(let offset=0;offset<blob.size;offset+=chunkSize){
    const bytes=await blob.slice(offset,offset+chunkSize).arrayBuffer();
    digests.push(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));
    onProgress?.(Math.min(offset+bytes.byteLength,blob.size),blob.size);
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
   if(previous&&!window.confirm('Replace "'+previous.path+'" with the dropped or selected file?')){
    return{id:previous.id,duplicate:true,replacementDeclined:true,record:previous};
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
  async function ingestFiles(files,{source='picker',parentArchiveId=null,depth=0,emit=true,onProgress=null,onReplaceDeclined=null}={}){
   if(!supported){msg('This browser cannot store files locally. The selected title can still be opened, but it will not appear in the persistent file manager.',false,'warn');return[]}
   if(ready)await ready;
   const inputs=Array.from(files||[]).map(asInput).filter(item=>item.file);
   const totalBytes=inputs.reduce((total,input)=>total+(Number(input.file.size)||0),0),progressTotal=totalBytes||inputs.length;
   let completedBytes=0;
   const results=[];
   for(let index=0;index<inputs.length;index++){
    const input=inputs[index];
    const file=input.file,path=normalizePath(input.path||file.name);
    if(!path||path.split('/').some(part=>part==='..'))throw new Error('A selected file has an invalid path.');
    const name=path.split('/').pop(),blob=file instanceof Blob?file:null;
    if(!blob&&!input.handleRef)throw new Error('Could not read '+name+'.');
    const record={
     id:newId(),path,name,size:Number(file.size)||0,type:file.type||'application/octet-stream',
     source,parentArchiveId,system:systemFor(name),addedAt:Date.now(),normalizedPath:path.toLowerCase(),
     hash:null,blob:input.handleRef?null:blob,handleRef:input.handleRef||null,superseded:false
    };
    if(blob){
     onProgress?.({phase:'hash',fileName:path,fileIndex:index+1,fileCount:inputs.length,done:totalBytes?completedBytes:index,total:progressTotal});
     record.hash=await hashBlob(blob,(done,total)=>{
      onProgress?.({phase:'hash',fileName:path,fileIndex:index+1,fileCount:inputs.length,done:totalBytes?completedBytes+done:index+(total?done/total:1),total:progressTotal});
     });
    }
    const saved=await queueRecord(record);
    if(saved.replacementDeclined){
     if(onReplaceDeclined)onReplaceDeclined(path);
     else msg('Kept the existing file: '+path+'.',false,'info');
     continue;
    }
    results.push(saved.record);
    completedBytes+=Number(file.size)||0;
    onProgress?.({phase:'save',fileName:path,fileIndex:index+1,fileCount:inputs.length,done:totalBytes?completedBytes:index+1,total:progressTotal});
    if(saved.duplicate||!isArchive(name)||depth>=5)continue;
    if(!extractArchive)continue;
    const extracted=await extractArchive(file);
    if(!extracted.length)continue;
    const archiveDirectory=path.includes('/')?path.slice(0,path.lastIndexOf('/')+1):'';
    for(let entryIndex=0;entryIndex<extracted.length;entryIndex++){
     const entry=extracted[entryIndex];
     onProgress?.({phase:'extract',fileName:path,fileIndex:entryIndex+1,fileCount:extracted.length,done:entryIndex,total:extracted.length});
     const entryPath=normalizePath(entry.name);
     if(!entryPath||entryPath.startsWith('__MACOSX/')||entryPath==='.DS_Store')continue;
     const child=await entry.get();
     const childPath=archiveDirectory+entryPath;
     results.push(...await ingestFiles([{file:child,path:childPath}],{source:'archive',parentArchiveId:saved.id,depth:depth+1,emit:false,onProgress}));
     onProgress?.({phase:'extract',fileName:path,fileIndex:entryIndex+1,fileCount:extracted.length,done:entryIndex+1,total:extracted.length});
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
  function makeButton(text,label,action,iconName=''){
   const button=document.createElement('button');button.type='button';button.className='lp-button';
   const iconPaths={
    replace:'M20 7v5h-5M4 17v-5h5m-4.1-3A8 8 0 0 1 19 7l1 5M4 12l1 5a8 8 0 0 0 14.1 3',
    play:'M8 5v14l11-7z'
   };
   if(iconPaths[iconName]){
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',iconPaths[iconName]);
    icon.append(path);button.append(icon);
   }
   button.append(document.createTextNode(text));
   if(label)button.setAttribute('aria-label',label);
   button.onclick=action;return button;
  }
  async function removeFile(id){
   const db=await openDb(),transaction=db.transaction(STORE,'readwrite');
   transaction.objectStore(STORE).delete(id);await transactionDone(transaction);
   window.dispatchEvent(new CustomEvent('library-updated'));
  }
  async function getRecordFile(record){
   let file=record.blob;
   if(!file&&record.handleRef){
    let permission=await record.handleRef.queryPermission({mode:'read'});
    if(permission!=='granted')permission=await record.handleRef.requestPermission({mode:'read'});
    if(permission!=='granted')throw new Error('Read access was not granted for '+record.name+'.');
    file=await record.handleRef.getFile();
   }
   if(!file)throw new Error('The local data for '+record.name+' is no longer available.');
   return new File([file],record.name,{type:record.type,lastModified:record.addedAt});
  }
  async function openRecord(record,systemOverride=''){
   return openFile(await getRecordFile(record),record,systemOverride);
  }
  async function openFolderRecord(path){
   if(ready)await ready;
   const folderPath=normalizePath(path),prefix=folderPath.toLowerCase()+'/',folderName=folderPath.split('/').pop();
   const records=(await getAllRecords())
    .filter(record=>!record.superseded&&record.normalizedPath.startsWith(prefix))
    .sort((a,b)=>a.path.localeCompare(b.path));
   if(!records.length)throw new Error('No stored files were found in '+folderPath+'.');
   const files=[],paths=[];
   for(const record of records){
    files.push(await getRecordFile(record));
    paths.push(folderName+'/'+record.path.slice(folderPath.length+1));
   }
   return openFolder(files,paths);
  }
  function renderLibrary(records){
   const search=$('library-search').value.trim().toLocaleLowerCase();
   const current=records.filter(record=>!record.superseded);
   const systems=[...new Set(current.filter(record=>record.system).map(record=>record.system))].sort();
   const sources=[...new Set(current.map(record=>record.source))].sort();
   if(!systems.includes(libraryFilters.system))libraryFilters.system='';
   if(!sources.includes(libraryFilters.source))libraryFilters.source='';
   const renderChips=(container,values,selected,onSelect)=>{
    const buttons=[['All',''],...values.map(value=>[value,value])].map(([label,value])=>{
     const button=document.createElement('button');button.type='button';button.className='lp-filter-chip';button.textContent=label;
     button.setAttribute('aria-pressed',String(selected===value));
     button.addEventListener('click',()=>onSelect(value));return button;
    });
    container.replaceChildren(...buttons);
   };
   renderChips($('library-system-filters'),systems,libraryFilters.system,value=>{libraryFilters.system=value;refresh().catch(error=>msg('Could not refresh the library: '+error.message,false,'error'))});
   renderChips($('library-source-filters'),sources,libraryFilters.source,value=>{libraryFilters.source=value;refresh().catch(error=>msg('Could not refresh the library: '+error.message,false,'error'))});
   const files=current.filter(record=>
    (!libraryFilters.system||record.system===libraryFilters.system)&&
    (!libraryFilters.source||record.source===libraryFilters.source)&&
    (!search||(record.path+' '+record.name+' '+record.source).toLocaleLowerCase().includes(search))
   ).sort((a,b)=>a.path.localeCompare(b.path)||a.addedAt-b.addedAt);
   const target=$('library-list');target.dataset.view=libraryView;target.replaceChildren();
   $('library-empty').hidden=current.length>0&&files.length>0;
   $('library-empty').textContent=current.length&&!files.length?'No games match these filters.':'No games added yet. Use the + button or drag files in.';
   for(const record of files){
    const row=document.createElement('li');row.className='lp-game-card';
    row.addEventListener('contextmenu',event=>{event.preventDefault();window.__retrotitlesOpenControls?.(record)});
    const details=document.createElement('div');details.className='lp-game-card-main';
    const title=document.createElement('span');title.className='lp-game-card-title';title.textContent=record.name;title.title=record.path;
    const meta=document.createElement('span');meta.className='lp-game-card-meta';
    meta.textContent=record.path+(record.system?' · '+record.system:'')+' · '+sizeLabel(record.size);
    const source=document.createElement('span');source.className='lp-source-badge';source.textContent=record.source.replace(/[-_]/g,' ');
    details.append(title,meta,source);
    const actions=document.createElement('div');actions.className='lp-game-card-actions';
    actions.append(makeButton('Open','Open '+record.name,()=>openRecord(record).catch(error=>msg('Could not open file: '+error.message,false,'error'))));
    if(['exe','com','bat'].includes(extOf(record.name))){
     actions.append(makeButton('Try DOS','Try running '+record.name+' as a DOS program',()=>openRecord(record,'dos').catch(error=>msg('Could not run '+record.name+' as DOS: '+error.message,false,'error'))));
    }
    actions.append(makeButton('Controls','Configure controls for '+record.name,()=>window.__retrotitlesOpenControls?.(record)));
    row.append(details,actions);target.append(row);
   }
   document.querySelectorAll('[data-library-view]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.libraryView===libraryView));
   });
  }
  function fileRow(record,parentNames){
   const row=document.createElement('li');row.className='lp-library-row lp-file-row';
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='lp-file-selection';
   checkbox.checked=selectedFileIds.has(record.id);checkbox.setAttribute('aria-label','Select '+record.path);
   checkbox.addEventListener('change',()=>{
    if(checkbox.checked)selectedFileIds.add(record.id);else selectedFileIds.delete(record.id);
    $('file-delete-selected').disabled=selectedFileIds.size===0;
   });
   const fileInfo=document.createElement('span');fileInfo.className='lp-file-name';fileInfo.title=record.path;
   const title=document.createElement('span');title.className='lp-file-title';title.textContent=record.name;
   const metadata=document.createElement('span');metadata.className='lp-save-size';
   metadata.textContent=(record.system?record.system+' · ':'')+sizeLabel(record.size);
   fileInfo.append(title,metadata);
   const tags=document.createElement('span');tags.className='lp-file-tags';
   const source=document.createElement('span');source.className='lp-source-badge';source.textContent=record.source.replace(/[-_]/g,' ');
   tags.append(source);
   if(record.parentArchiveId){
    const archive=document.createElement('span');archive.className='lp-source-badge';archive.textContent='from '+(parentNames.get(record.parentArchiveId)||'archive');
    tags.append(archive);
   }
   const actions=document.createElement('span');actions.className='lp-library-actions';
   actions.append(makeButton('Open','Open '+record.name,()=>openRecord(record).catch(error=>msg('Could not open file: '+error.message,false,'error'))));
   if(['exe','com','bat'].includes(extOf(record.name))){
    actions.append(makeButton('Try DOS','Try running '+record.name+' as a DOS program',()=>openRecord(record,'dos').catch(error=>msg('Could not run '+record.name+' as DOS: '+error.message,false,'error'))));
   }
   if(record.blob){
    actions.append(makeButton('Download','Download '+record.name,()=>{
     const url=URL.createObjectURL(record.blob),link=document.createElement('a');link.href=url;link.download=record.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }));
   }
   const replaceInput=document.createElement('input');replaceInput.type='file';replaceInput.className='lp-hidden-input';replaceInput.setAttribute('aria-label','Choose replacement for '+record.name);
   replaceInput.onchange=event=>{
    const file=event.target.files?.[0];event.target.value='';
    if(file)ingestFiles([{file,path:record.path}],{source:'file-manager'}).then(records=>{
     if(records.length)msg('Updated '+record.path+'.');
    }).catch(error=>msg('Could not replace '+record.path+': '+error.message,false,'error'));
   };
   actions.append(makeButton('Replace','Replace '+record.name,()=>replaceInput.click(),'replace'));
   actions.append(replaceInput);
   actions.append(makeButton('Remove','Remove '+record.name,()=>removeFile(record.id).catch(error=>msg('Could not remove file: '+error.message,false,'error'))));
   row.append(checkbox,fileInfo,tags,actions);
   return row;
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
   renderLibrary(records);
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
   const currentIds=new Set(records.filter(record=>!record.superseded).map(record=>record.id));
   selectedFileIds.forEach(id=>{if(!currentIds.has(id))selectedFileIds.delete(id)});
   $('file-delete-selected').disabled=selectedFileIds.size===0;
   const parentNames=new Map(records.map(record=>[record.id,record.name]));
   const expandFolders=$('file-search').value.trim().length>0;
   const root={folders:new Map(),files:[]};
   files.forEach(record=>{
    const parts=record.path.split('/').filter(Boolean),filename=parts.pop();
    let node=root;
    parts.forEach(name=>{
     if(!node.folders.has(name))node.folders.set(name,{name,folders:new Map(),files:[]});
     node=node.folders.get(name);
    });
    node.files.push({...record,name:filename||record.name});
   });
   const folderCount=node=>{
    node.fileCount=node.files.length+[...node.folders.values()].reduce((total,child)=>total+folderCount(child),0);
    return node.fileCount;
   };
   folderCount(root);
   const renderNode=(node,depth=0,prefix='')=>{
    const children=[];
    for(const folder of [...node.folders.values()].sort((a,b)=>a.name.localeCompare(b.name))){
     const item=document.createElement('li');item.className='lp-path-item lp-folder-item';
     const details=document.createElement('details');details.className='lp-path-group';details.open=expandFolders;
     const summary=document.createElement('summary');
     summary.dataset.folderPath=prefix+folder.name;
     const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
     icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
     const path=document.createElementNS('http://www.w3.org/2000/svg','path');
     path.setAttribute('d','M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
     icon.append(path);
     const name=document.createElement('span');name.className='lp-folder-name';name.textContent=folder.name;
     const count=document.createElement('span');count.className='lp-folder-count';
     const total=folder.fileCount;count.textContent=String(total);count.setAttribute('aria-label',total+' file'+(total===1?'':'s'));
     summary.append(icon,name,count);
     const nested=document.createElement('ul');nested.className='lp-path-children';
     nested.append(...renderNode(folder,depth+1,prefix+folder.name+'/'));
     details.append(summary,nested);
     const play=makeButton('Play','Play folder '+folder.name,()=>openFolderRecord(summary.dataset.folderPath).catch(error=>msg('Could not play folder: '+error.message,false,'error')),'play');
     play.classList.add('lp-folder-play');
     item.append(details,play);children.push(item);
    }
    node.files.sort((a,b)=>a.name.localeCompare(b.name)).forEach(record=>children.push(fileRow(record,parentNames)));
    return children;
   };
   list.classList.add('lp-file-tree');
   list.replaceChildren(...renderNode(root));
   status.textContent=files.length+' file'+(files.length===1?'':'s')+' stored locally in this browser; nothing is uploaded.';
  }
  async function deleteSelectedFiles(){
   const ids=Array.from(selectedFileIds);
   if(!ids.length)return;
   if(!window.confirm('Delete '+ids.length+' selected file'+(ids.length===1?'':'s')+' from this browser? This cannot be undone.'))return;
   const db=await openDb(),transaction=db.transaction(STORE,'readwrite'),store=transaction.objectStore(STORE);
   ids.forEach(id=>store.delete(id));await transactionDone(transaction);
   selectedFileIds.clear();window.dispatchEvent(new CustomEvent('library-updated'));
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
  async function clearLegacyDatabase(databaseName){
   if(window.indexedDB.databases){
    const databases=await window.indexedDB.databases();
    if(!databases.some(database=>database.name===databaseName))return;
   }
   await new Promise((resolve,reject)=>{
    const request=window.indexedDB.open(databaseName);
    let created=false;
    request.onupgradeneeded=event=>{
     if(event.oldVersion===0){created=true;request.result.close();request.transaction.abort()}
    };
    request.onsuccess=()=>{
     const db=request.result,storeName=databaseName==='retrotitles-files'?'files':'titles';
     if(!db.objectStoreNames.contains(storeName)){db.close();resolve();return}
     const transaction=db.transaction(storeName,'readwrite');
     transaction.objectStore(storeName).clear();
     transaction.oncomplete=()=>{db.close();resolve()};
     transaction.onerror=()=>{db.close();reject(transaction.error||new Error('Could not clear legacy file storage.'))};
     transaction.onabort=()=>{db.close();reject(transaction.error||new Error('Clearing legacy file storage was interrupted.'))};
    };
    request.onerror=()=>{
     if(created){resolve();return}
     reject(request.error||new Error('Could not open legacy file storage for cleanup.'));
    };
    request.onblocked=()=>reject(new Error('Legacy file storage is blocked by another tab. Close other RetroTitles tabs and retry.'));
   });
  }
  async function clearAllIndexedFiles(){
   if(!supported)return;
   await ready;
   await writeQueue;
   for(const databaseName of LEGACY_DATABASES)await clearLegacyDatabase(databaseName);
   const db=await openDb(),transaction=db.transaction([STORE,META],'readwrite');
   transaction.objectStore(STORE).clear();
   transaction.objectStore(META).clear();
   transaction.objectStore(META).put({key:'migration-v1',value:true});
   await transactionDone(transaction);
   selectedFileIds.clear();
   window.dispatchEvent(new CustomEvent('library-updated'));
  }
  async function clearRuntimeCache({reload=true}={}){
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
   if(reload)location.reload();
  }
  window.__retrotitlesIngestFiles=ingestFiles;
  window.__retrotitlesIngestHandles=ingestHandles;
  window.__retrotitlesRefreshFiles=refresh;
  window.__retrotitlesClearIndexedFiles=clearAllIndexedFiles;
  window.__retrotitlesClearRuntimeCache=()=>clearRuntimeCache({reload:false});
  manager.hidden=false;
  if(!supported){
   status.textContent='This browser does not support local file storage.';
   $('file-import-button').disabled=true;$('file-import-folder-button').disabled=true;$('library-add-files').disabled=true;$('file-refresh').disabled=true;$('file-rebuild').disabled=true;$('file-delete-selected').disabled=true;
   $('runtime-cache-clear').onclick=()=>clearRuntimeCache().catch(error=>msg('Could not clear runtime cache: '+error.message,false,'error'));
   return;
  }
  const refreshOnChange=()=>refresh().catch(error=>msg('Could not refresh stored files: '+error.message,false,'error'));
  ['file-search','file-system-filter','file-type-filter','file-source-filter'].forEach(id=>{
   $(id).addEventListener('input',refreshOnChange);$(id).addEventListener('change',refreshOnChange);
  });
  $('library-search').addEventListener('input',refreshOnChange);
  $('library-add-files').onclick=()=>$('file-import-button').click();
  $('file-delete-selected').onclick=()=>deleteSelectedFiles().catch(error=>msg('Could not delete selected files: '+error.message,false,'error'));
  document.querySelectorAll('[data-library-view]').forEach(button=>button.addEventListener('click',()=>{
   libraryView=button.dataset.libraryView;refreshOnChange();
  }));
  $('file-import-button').onclick=()=>$('file-import').click();
  $('file-import-folder-button').onclick=()=>{
   if(!window.showDirectoryPicker){$('file-import-folder').click();return}
   window.showDirectoryPicker().then(async handle=>{
    const files=await window.__retrotitlesCompatibility.filesFromDirectoryHandle(handle);
    if(!files.length){status.textContent='The selected folder contains no files.';return}
    const skipped=[];
    status.textContent='Adding '+files.length+' file'+(files.length===1?'':'s')+' from '+handle.name+'…';
    await ingestFiles(files,{source:'folder',onProgress:window.__retrotitlesIngestProgress,onReplaceDeclined:path=>skipped.push(path)});
    status.textContent=skipped.length?'Kept existing files where replacement was declined ('+skipped.length+').':'Added '+files.length+' file'+(files.length===1?'':'s')+' locally.';
    msg(skipped.length?'Kept existing files where replacement was declined.':'Added '+files.length+' file'+(files.length===1?'':'s')+' to the unified file view.');
   }).catch(error=>{if(error.name!=='AbortError')msg('Could not add folder: '+error.message,false,'error')});
  };
  $('file-refresh').onclick=refreshOnChange;
  $('file-rebuild').onclick=()=>rebuildIndex().catch(error=>msg('Could not rebuild the file index: '+error.message,false,'error'));
  $('runtime-cache-clear').onclick=()=>clearRuntimeCache().catch(error=>msg('Could not clear runtime cache: '+error.message,false,'error'));
  $('file-import').onchange=event=>{
   const files=Array.from(event.target.files||[]);event.target.value='';
   if(!files.length)return;
   const skipped=[];
   status.textContent='Adding '+files.length+' file'+(files.length===1?'':'s')+'…';
   ingestFiles(files,{source:'file-manager',onProgress:window.__retrotitlesIngestProgress,onReplaceDeclined:path=>skipped.push(path)}).then(()=>{
    status.textContent=skipped.length?'Kept existing files where replacement was declined ('+skipped.length+').':'Added '+files.length+' file'+(files.length===1?'':'s')+' locally.';
    msg(skipped.length?'Kept existing files where replacement was declined.':'Added '+files.length+' file'+(files.length===1?'':'s')+' to the unified file view.');
   }).catch(error=>{status.textContent='Could not add the selected files.';msg('Could not save files: '+error.message,false,'error')});
  };
  $('file-import-folder').onchange=event=>{
   const files=Array.from(event.target.files||[]);event.target.value='';
   if(!files.length)return;
   const skipped=[];
   status.textContent='Adding '+files.length+' file'+(files.length===1?'':'s')+' from folder…';
   ingestFiles(files,{source:'folder',onProgress:window.__retrotitlesIngestProgress,onReplaceDeclined:path=>skipped.push(path)}).then(()=>{
    status.textContent=skipped.length?'Kept existing files where replacement was declined ('+skipped.length+').':'Added '+files.length+' file'+(files.length===1?'':'s')+' locally.';
    msg(skipped.length?'Kept existing files where replacement was declined.':'Added '+files.length+' file'+(files.length===1?'':'s')+' to the unified file view.');
   }).catch(error=>{status.textContent='Could not add the selected folder.';msg('Could not save folder files: '+error.message,false,'error')});
  };
  const setDropTarget=(target,active)=>{
   manager.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
   manager.classList.remove('is-drop-target');
   if(active)target.classList.add('is-drop-target');
  };
  const folderSummaryAt=target=>{
   const summary=target.closest('summary[data-folder-path]');
   return summary||target.closest('details.lp-path-group')?.querySelector('summary[data-folder-path]')||null;
  };
  manager.addEventListener('dragover',event=>{
   if(!Array.from(event.dataTransfer?.types||[]).includes('Files'))return;
   event.preventDefault();
   const summary=folderSummaryAt(event.target);
   if(summary)summary.closest('details').open=true;
   setDropTarget(summary||manager,true);
  });
  manager.addEventListener('dragleave',event=>{
   if(event.relatedTarget&&manager.contains(event.relatedTarget))return;
   setDropTarget(null,false);
  });
  manager.addEventListener('drop',async event=>{
   if(!Array.from(event.dataTransfer?.types||[]).includes('Files'))return;
   event.preventDefault();event.stopPropagation();
   const summary=folderSummaryAt(event.target),folderPath=summary?.dataset.folderPath||'';
   setDropTarget(null,false);
   try{
    status.textContent='Scanning dropped files…';
    const items=await window.__retrotitlesCompatibility.filesFromDrop(event.dataTransfer);
    if(!items.length){status.textContent='No files were found in that drop.';return}
    const destination=folderPath?folderPath+'/':'',files=items.map(item=>({file:item.file,path:destination+item.path})),skipped=[];
    status.textContent='Adding '+files.length+' file'+(files.length===1?'':'s')+(folderPath?' to '+folderPath:'')+'…';
    await ingestFiles(files,{source:'drag-drop',onProgress:window.__retrotitlesIngestProgress,onReplaceDeclined:path=>skipped.push(path)});
    status.textContent=skipped.length?'Kept existing files where replacement was declined ('+skipped.length+').':'Added '+files.length+' file'+(files.length===1?'':'s')+(folderPath?' to '+folderPath:'')+' locally.';
    msg(skipped.length?'Kept existing files where replacement was declined.':'Added dropped files to the unified file view.');
   }catch(error){status.textContent='Could not add the dropped files.';msg('Could not save dropped files: '+error.message,false,'error')}
  });
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
