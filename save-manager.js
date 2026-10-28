(()=>{
 window.__retrotitlesSaveManager=({$,msg,sizeLabel,getTitleName})=>{
  const SAVE_DB='EmulatorJS-states',SAVE_STORE='states',SAVE_INDEX_KEY='?EJS_KEYS!';
  function openSaveDb(){
   return new Promise((resolve,reject)=>{
    const request=window.indexedDB.open(SAVE_DB,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(SAVE_STORE))request.result.createObjectStore(SAVE_STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not open browser save storage.'));
    request.onblocked=()=>reject(new Error('Browser save storage is blocked by another tab. Close other retrotitles tabs and retry.'));
   });
  }
  function saveByteLength(value){
   if(value instanceof ArrayBuffer)return value.byteLength;
   if(ArrayBuffer.isView(value))return value.byteLength;
   return 0;
  }
  function saveBytes(value){
   if(value instanceof ArrayBuffer)return new Uint8Array(value);
   if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
   throw new Error('This browser save has an unsupported format. Download it from the emulator menu instead.');
  }
  async function listBrowserSaves(){
   const db=await openSaveDb();
   return new Promise((resolve,reject)=>{
    const entries=[],transaction=db.transaction(SAVE_STORE,'readonly'),store=transaction.objectStore(SAVE_STORE),cursorRequest=store.openCursor();
    cursorRequest.onsuccess=()=>{
     const cursor=cursorRequest.result;
     if(!cursor)return;
     const key=cursor.key,value=cursor.value;
     if(typeof key==='string'&&/\.state$/i.test(key))entries.push({key,size:saveByteLength(value)});
     cursor.continue();
    };
    cursorRequest.onerror=()=>reject(cursorRequest.error||new Error('Could not list browser saves.'));
    transaction.oncomplete=()=>resolve(entries.sort((a,b)=>a.key.localeCompare(b.key)));
    transaction.onerror=()=>reject(transaction.error||new Error('Could not read browser saves.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Reading browser saves was interrupted.'));
   });
  }
  async function getBrowserSave(key){
   const db=await openSaveDb();
   return new Promise((resolve,reject)=>{
    const transaction=db.transaction(SAVE_STORE,'readonly'),request=transaction.objectStore(SAVE_STORE).get(key);
    let value;
    request.onsuccess=()=>{value=request.result};
    request.onerror=()=>reject(request.error||new Error('Could not read this browser save.'));
    transaction.oncomplete=()=>resolve(value);
    transaction.onerror=()=>reject(transaction.error||new Error('Could not read this browser save.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Reading this browser save was interrupted.'));
   });
  }
  async function putBrowserSave(key,value){
   const db=await openSaveDb();
   return new Promise((resolve,reject)=>{
    const transaction=db.transaction(SAVE_STORE,'readwrite'),store=transaction.objectStore(SAVE_STORE),indexRequest=store.get(SAVE_INDEX_KEY);
    indexRequest.onsuccess=()=>{
     const keys=Array.isArray(indexRequest.result)?indexRequest.result:[];
     if(!keys.includes(key))keys.push(key);
     store.put(new Uint8Array(value),key);store.put(keys,SAVE_INDEX_KEY);
    };
    indexRequest.onerror=()=>transaction.abort();
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(transaction.error||new Error('Could not store this browser save.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Saving to browser storage was interrupted.'));
   });
  }
  async function deleteBrowserSave(key){
   const db=await openSaveDb();
   return new Promise((resolve,reject)=>{
    const transaction=db.transaction(SAVE_STORE,'readwrite'),store=transaction.objectStore(SAVE_STORE),indexRequest=store.get(SAVE_INDEX_KEY);
    indexRequest.onsuccess=()=>{
     const keys=(Array.isArray(indexRequest.result)?indexRequest.result:[]).filter(item=>item!==key);
     store.delete(key);store.put(keys,SAVE_INDEX_KEY);
    };
    indexRequest.onerror=()=>transaction.abort();
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(transaction.error||new Error('Could not delete this browser save.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Deleting this browser save was interrupted.'));
   });
  }
  function activeEmulator(){
   if($('stage').style.display==='none'||$('save-manager').hidden)return null;
   const player=$('fr').contentWindow,emulator=player?.EJS_emulator;
   if(!emulator||!emulator.gameManager||typeof emulator.getBaseFileName!=='function')return null;
   const title=emulator.getBaseFileName();
   const expected=getTitleName().replace(/[#<$+%>!`&*'|{}\/\\?"=@:^\r\n]/ig,'').trim();
   if(expected&&title!==expected)return null;
   return{emulator,title,key:title+'.state'};
  }
  async function showStorageEstimate(){
   const output=$('save-storage-status');
   if(!navigator.storage?.estimate){output.textContent='Storage usage estimates are unavailable in this browser.';return}
   let estimate;
   try{estimate=await navigator.storage.estimate()}
   catch(error){
    output.textContent='Storage usage estimate failed: '+error.message;
    window.__retrotitlesLog?.('warn','Could not estimate browser storage: '+error.message,'saves');
    return;
   }
   if(!Number.isFinite(estimate.quota)||estimate.quota<=0||!Number.isFinite(estimate.usage)){output.textContent='Browser storage usage could not be estimated.';return}
   const used=Math.min(100,Math.round(estimate.usage/estimate.quota*100));
   output.textContent='Browser storage estimate: '+sizeLabel(estimate.usage)+' used of '+sizeLabel(estimate.quota)+' ('+used+'%).';
   output.classList.toggle('is-low-space',used>=85);
   if(used>=85)window.__retrotitlesLog?.('warn','Browser storage is nearly full ('+used+'% of the estimated quota). Download save backups and free device storage.','saves');
  }
  async function confirmSaveCapacity(bytes){
   if(!navigator.storage?.estimate)return true;
   let estimate;
   try{estimate=await navigator.storage.estimate()}
   catch(error){
    window.__retrotitlesLog?.('warn','Could not estimate available browser storage before saving: '+error.message,'saves');
    return true;
   }
   if(!Number.isFinite(estimate.quota)||!Number.isFinite(estimate.usage))return true;
   const available=Math.max(0,estimate.quota-estimate.usage);
   if(bytes>available)return window.confirm('This save is '+sizeLabel(bytes)+', but the browser estimates only '+sizeLabel(available)+' available. Saving may fail or use most of your remaining storage. Continue?');
   return true;
  }
  async function refreshSaveManager(){
   if($('save-manager').hidden)return;
   const list=$('save-list');list.replaceChildren();
   const [entries]=await Promise.all([listBrowserSaves(),showStorageEstimate()]);
   const current=activeEmulator();
   $('save-empty').hidden=entries.length>0;
   $('save-now').disabled=!current;$('save-import-button').disabled=!current;$('save-import').disabled=!current;
   for(const entry of entries){
    const row=document.createElement('li');row.className='lp-library-row lp-save-row';
    const details=document.createElement('span');details.className='lp-save-name';
    details.append(document.createTextNode(entry.key.replace(/\.state$/i,'')));
    const size=document.createElement('span');size.className='lp-save-size';size.textContent=sizeLabel(entry.size)+(entry.key===current?.key?' · Current title':'');details.append(size);
    const actions=document.createElement('span');actions.className='lp-library-actions';
    const loadButton=document.createElement('button');loadButton.type='button';loadButton.className='lp-button';loadButton.textContent='Load';loadButton.disabled=entry.key!==current?.key||!current;loadButton.setAttribute('aria-label','Load '+entry.key);loadButton.onclick=()=>loadBrowserSave(entry.key).catch(error=>msg('Could not load save: '+error.message,false,'error'));
    const download=document.createElement('button');download.type='button';download.className='lp-button';download.textContent='Download';download.setAttribute('aria-label','Download '+entry.key);download.onclick=()=>downloadBrowserSave(entry.key).catch(error=>msg('Could not download save: '+error.message,false,'error'));
    const remove=document.createElement('button');remove.type='button';remove.className='lp-button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+entry.key);remove.onclick=()=>removeBrowserSave(entry.key).catch(error=>msg('Could not remove save: '+error.message,false,'error'));
    actions.append(loadButton,download,remove);row.append(details,actions);list.append(row);
   }
  }
  async function saveBrowserState(){
   const current=activeEmulator();
   if(!current)throw new Error('Wait for the emulator to finish loading before saving.');
   const state=current.emulator.gameManager.getState();
   if(!await confirmSaveCapacity(state.byteLength))return;
   await putBrowserSave(current.key,state);await refreshSaveManager();
   msg('Saved '+current.title+' to this browser. Download a backup to protect it from browser storage cleanup.');
  }
  async function loadBrowserSave(key){
   const current=activeEmulator();
   if(!current||current.key!==key)throw new Error('Load this save while its matching title is open.');
   const value=await getBrowserSave(key);
   if(!value)throw new Error('This browser save is no longer available.');
   current.emulator.gameManager.loadState(saveBytes(value));msg('Loaded '+current.title+' from browser storage.');
  }
  async function downloadBrowserSave(key){
   const value=await getBrowserSave(key);
   if(!value)throw new Error('This browser save is no longer available.');
   const url=URL.createObjectURL(new Blob([saveBytes(value)],{type:'application/octet-stream'}));
   const link=document.createElement('a');link.href=url;link.download=key;link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);msg('Downloaded '+key+'. Keep this file as a backup.');
  }
  async function removeBrowserSave(key){
   if(!window.confirm('Remove '+key+' from this browser? Download a backup first if you may need it later.'))return;
   await deleteBrowserSave(key);await refreshSaveManager();msg('Removed '+key+' from browser storage.');
  }
  async function importBrowserSave(file){
   const current=activeEmulator();
   if(!current)throw new Error('Open an emulator title and wait for it to finish loading before importing a save.');
   if(!file.name.toLowerCase().endsWith('.state'))throw new Error('Choose an EmulatorJS .state file.');
   if(file.size===0)throw new Error('This save file is empty.');
   const existing=await getBrowserSave(current.key);
   if(existing&&!window.confirm('Replace the browser save for '+current.title+' with '+file.name+'?'))return;
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(!await confirmSaveCapacity(bytes.byteLength))return;
   await putBrowserSave(current.key,bytes);current.emulator.gameManager.loadState(bytes);
   await refreshSaveManager();msg('Imported and loaded '+file.name+' for '+current.title+'.');
  }
  if(window.indexedDB){
   $('save-now').onclick=()=>saveBrowserState().catch(error=>msg('Could not save: '+error.message,false,'error'));
   $('save-import-button').onclick=()=>$('save-import').click();
   $('save-refresh').onclick=()=>refreshSaveManager().catch(error=>msg('Could not refresh browser saves: '+error.message,false,'error'));
   $('save-import').onchange=event=>{
    const file=event.target.files[0];event.target.value='';
    if(file)importBrowserSave(file).catch(error=>msg('Could not import save: '+error.message,false,'error'));
   };
   $('fr').addEventListener('load',()=>refreshSaveManager().catch(error=>msg('Could not refresh browser saves: '+error.message,false,'error')));
   window.addEventListener('message',event=>{
    if(event.source!==$('fr').contentWindow||event.data?.type!=='rt-emulator-ready')return;
    refreshSaveManager().catch(error=>msg('Could not refresh browser saves: '+error.message,false,'error'));
   });
  }
 };
})();
