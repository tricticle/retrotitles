(()=>{
 window.__retrotitlesFileManager=({$,msg,sizeLabel,openFile})=>{
  const DB_NAME='retrotitles-files',STORE='files';
  const manager=$('file-manager'),list=$('file-list'),empty=$('file-empty'),status=$('file-manager-status');
  const supported=Boolean(window.indexedDB);
  let dbPromise;
  function openDb(){
   if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const request=window.indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not open browser file storage.'));
    request.onblocked=()=>reject(new Error('Browser file storage is blocked by another tab. Close other retrotitles tabs and retry.'));
   });
   return dbPromise;
  }
  async function getFiles(){
   const db=await openDb();
   return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readonly'),request=transaction.objectStore(STORE).getAll();
    let files=[];
    request.onsuccess=()=>{files=request.result};
    request.onerror=()=>reject(request.error||new Error('Could not list stored files.'));
    transaction.oncomplete=()=>resolve(files.sort((a,b)=>a.name.localeCompare(b.name)||a.addedAt-b.addedAt));
    transaction.onerror=()=>reject(transaction.error||new Error('Could not read stored files.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Reading stored files was interrupted.'));
   });
  }
  async function saveFiles(files){
   const db=await openDb();
   await new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readwrite'),store=transaction.objectStore(STORE);
    try{
     for(const file of files)store.put({name:file.name,size:file.size,type:file.type||'application/octet-stream',blob:file,addedAt:Date.now()});
    }catch(error){transaction.abort();reject(error);return}
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(transaction.error||new Error('Could not store these files.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Saving files was interrupted.'));
   });
  }
  async function removeFile(id){
   const db=await openDb();
   await new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete=resolve;
    transaction.onerror=()=>reject(transaction.error||new Error('Could not remove this file.'));
    transaction.onabort=()=>reject(transaction.error||new Error('Removing this file was interrupted.'));
   });
  }
  function downloadFile(file){
   const url=URL.createObjectURL(file.blob);
   const link=document.createElement('a');link.href=url;link.download=file.name;link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function refresh(){
   const files=await getFiles();list.replaceChildren();empty.hidden=files.length>0;
   for(const file of files){
    const row=document.createElement('li');row.className='lp-library-row lp-file-row';
    const details=document.createElement('span');details.className='lp-file-name';
    details.append(document.createTextNode(file.name));
    const size=document.createElement('span');size.className='lp-save-size';size.textContent=sizeLabel(file.size);details.append(size);
    const actions=document.createElement('span');actions.className='lp-library-actions';
    const open=document.createElement('button');open.type='button';open.className='lp-button';open.textContent='Open';open.setAttribute('aria-label','Open '+file.name);open.onclick=()=>openFile(new File([file.blob],file.name,{type:file.type,lastModified:file.addedAt})).catch(error=>msg('Could not open file: '+error.message,false,'error'));
    const download=document.createElement('button');download.type='button';download.className='lp-button';download.textContent='Download';download.setAttribute('aria-label','Download '+file.name);download.onclick=()=>downloadFile(file);
    const remove=document.createElement('button');remove.type='button';remove.className='lp-button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+file.name);remove.onclick=()=>removeFile(file.id).then(refresh).catch(error=>msg('Could not remove file: '+error.message,false,'error'));
    actions.append(open,download,remove);row.append(details,actions);list.append(row);
   }
  }
  manager.hidden=false;
  if(!supported){
   status.textContent='This browser does not support local file storage.';
   $('file-import-button').disabled=true;
   $('file-refresh').disabled=true;
   return;
  }
  $('file-import-button').onclick=()=>$('file-import').click();
  $('file-refresh').onclick=()=>refresh().catch(error=>msg('Could not refresh stored files: '+error.message,false,'error'));
  $('file-import').onchange=event=>{
   const files=Array.from(event.target.files||[]);event.target.value='';
   if(!files.length)return;
   status.textContent='Saving '+files.length+' file'+(files.length===1?'':'s')+' to this browser…';
   saveFiles(files).then(async()=>{await refresh();status.textContent='Files stored in this browser only.';msg('Saved '+files.length+' file'+(files.length===1?'':'s')+' to this browser.')}).catch(error=>{status.textContent='Could not store the selected files.';msg('Could not save files: '+error.message,false,'error')});
  };
  refresh().catch(error=>msg('Could not load stored files: '+error.message,false,'error'));
 };
})();
