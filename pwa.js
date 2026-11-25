(()=>{
 const status=document.getElementById('offline-status');
 const statusLabel=document.getElementById('offline-status-label');
 const installButton=document.getElementById('pwa-install');
 const persistButton=document.getElementById('offline-storage-persist');
 const storageStatus=document.getElementById('offline-storage-status');
 let installPrompt=null,serviceWorkerReady=false;
 const formatBytes=value=>value>=1024**3?(value/1024**3).toFixed(1)+' GB':value>=1024**2?(value/1024**2).toFixed(0)+' MB':Math.round(value/1024)+' KB';
 function setStatus(state,label,title){
  if(!status)return;
  status.dataset.state=state;
  statusLabel.textContent=label;
  status.title=title;
 }
 function refreshStatus(){
  if(!serviceWorkerReady)return;
  const offline=!navigator.onLine;
  setStatus(offline?'offline':'ready',offline?'Offline mode':'Offline ready',offline?'The app shell is cached. Games in your file library or available through saved folder access can still be opened.':'The app shell is cached. Previously loaded local runtime files and games in your file library are available offline.');
 }
 async function updateStorageStatus(){
  if(!navigator.storage||!storageStatus)return;
  try{
   const [persisted,estimate]=await Promise.all([
    navigator.storage.persisted?.()||Promise.resolve(false),
    navigator.storage.estimate?.()||Promise.resolve({})
   ]);
   const used=Number(estimate.usage)||0,quota=Number(estimate.quota)||0;
   storageStatus.textContent=(persisted?'Browser storage is protected from routine eviction.':'Browser storage may be cleared by the browser.')+(used?' '+formatBytes(used)+' used'+(quota?' of '+formatBytes(quota):'')+'.':'');
  }catch(error){
   storageStatus.textContent='Offline games are stored in this browser; storage usage is unavailable.';
  }
 }
 if(persistButton){
  if(navigator.storage&&typeof navigator.storage.persist==='function'){
   persistButton.hidden=false;
   persistButton.addEventListener('click',async()=>{
    persistButton.disabled=true;
    try{
     const persisted=await navigator.storage.persist();
     if(persisted)await updateStorageStatus();
     else storageStatus.textContent='Persistent storage was not granted. The browser may clear local files when space is low; keep a copy of your original games.';
    }catch(error){storageStatus.textContent='Could not request persistent storage: '+error.message}
    finally{persistButton.disabled=false}
   });
  }else if(storageStatus){
   storageStatus.textContent='Imported games stay in browser storage when supported; this browser does not offer storage persistence controls.';
  }
 }
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
  installButton.hidden=false;
 });
 installButton?.addEventListener('click',async()=>{
  if(!installPrompt)return;
  const prompt=installPrompt;
  installPrompt=null;
  installButton.disabled=true;
  try{
   await prompt.prompt();
   const choice=await prompt.userChoice;
   if(choice.outcome==='accepted')installButton.hidden=true;
  }catch(error){window.__retrotitlesLog?.('warn','Could not show the app install prompt: '+error.message,'offline')}
  finally{installButton.disabled=false}
 });
 window.addEventListener('appinstalled',()=>{
  installButton.hidden=true;
  window.__retrotitlesLog?.('info','RetroTitles was installed as an app.','offline');
 });
 window.addEventListener('online',refreshStatus);
 window.addEventListener('offline',refreshStatus);
 if(!('serviceWorker'in navigator)||!window.isSecureContext){
  setStatus('error','Offline unavailable','Offline app support requires HTTPS or localhost in a browser with service workers.');
  return;
 }
 navigator.serviceWorker.addEventListener('controllerchange',()=>{serviceWorkerReady=true;refreshStatus()});
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(async()=>{
  await navigator.serviceWorker.ready;
  serviceWorkerReady=true;
  refreshStatus();
 }).catch(error=>{
  setStatus('error','Offline setup failed','Could not cache the app shell: '+error.message);
  window.__retrotitlesLog?.('error','Could not register offline app support: '+error.message,'offline');
 });
 updateStorageStatus();
})();
