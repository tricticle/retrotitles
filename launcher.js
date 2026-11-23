const $=id=>document.getElementById(id);let html='',name='Title',portable=true;
const {inspectRpgMaker,isDesktopRpgMaker,findStreamIndex,findMissingRpgMakerScripts,filesFromDrop}=window.__retrotitlesCompatibility;
const EMULATORJS_VERSION='4.2.3';
const desktopRpgMakerMessage='Native desktop RPG Maker/Steam builds cannot run in this browser. If the install includes a compatible MV/MZ browser export under www/ (index.html, data/System.json, and js/rpg_core.js or js/rmmz_core.js), choose the game folder or ZIP; otherwise run it through Steam.';
const tabIds=['library','files','play','controls'];
function activateTab(id,focus=false){
 if(!tabIds.includes(id))return;
 tabIds.forEach(tabId=>{
  const tab=$('tab-'+tabId),panel=$('panel-'+tabId),selected=tabId===id;
  tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;panel.hidden=!selected;
 });
 if(focus)$('tab-'+id).focus();
}
const tabbar=document.querySelector('.lp-tabbar');
tabbar.addEventListener('click',event=>{const tab=event.target.closest('[role="tab"]');if(tab)activateTab(tab.id.slice(4))});
tabbar.addEventListener('keydown',event=>{
 const current=tabIds.indexOf(document.activeElement.id.slice(4));
 let next=current;
 if(event.key==='ArrowRight')next=(current+1)%tabIds.length;
 else if(event.key==='ArrowLeft')next=(current+tabIds.length-1)%tabIds.length;
 else if(event.key==='Home')next=0;
 else if(event.key==='End')next=tabIds.length-1;
 else return;
 event.preventDefault();activateTab(tabIds[next],true);
});
const settingsDialog=$('settings-dialog');
$('settings-open').addEventListener('click',()=>settingsDialog.showModal());
$('settings-controls-link').addEventListener('click',()=>{settingsDialog.close();activateTab('controls')});
$('settings-files-link').addEventListener('click',()=>{settingsDialog.close();activateTab('files')});
let runtimePreference=null;
try{runtimePreference=localStorage.getItem('retrotitles-local-runtimes');if(runtimePreference!==null)$('local-runtime').checked=runtimePreference==='true'}catch(e){}
$('runtime-note').hidden=!$('local-runtime').checked;
$('local-runtime').onchange=()=>{$('runtime-note').hidden=!runtimeIsLocal();runtimePreference=String(runtimeIsLocal());try{localStorage.setItem('retrotitles-local-runtimes',runtimePreference)}catch(e){}};
let busyWarningTimer=null;
const msg=(text,busy=false,level='info',progress=null,cancelable=true)=>{
 const output=$('msg'),textOutput=$('msg-text'),bar=$('load-progress');
 textOutput.textContent=text;output.setAttribute('aria-busy',String(busy));output.classList.toggle('is-visible',Boolean(text)||busy);
 bar.hidden=!busy;
 if(busy&&progress&&Number.isFinite(progress.total)&&progress.total>0)bar.value=Math.min(100,progress.done/progress.total*100);
 else bar.removeAttribute('value');
 $('load-cancel').hidden=!busy||!cancelable;
 if(!progress)window.__retrotitlesLog?.(level,text,'app');
 if(busyWarningTimer)clearTimeout(busyWarningTimer);
 if(busy)busyWarningTimer=setTimeout(()=>{
  if(output.getAttribute('aria-busy')!=='true')return;
  const warning='Still processing after 90 seconds. Large files can take time; open Console to inspect errors.';
  textOutput.textContent=warning;window.__retrotitlesLog?.('warn',warning,'app');
 },90000);
};
let lastIngestProgressAt=0;
const reportIngestProgress=progress=>{
 if(progress.phase==='hash'&&progress.done<progress.total){
  const now=performance.now();
  if(now-lastIngestProgressAt<120)return;
  lastIngestProgressAt=now;
 }
 const percent=progress.total>0?Math.min(100,Math.floor(progress.done/progress.total*100)):0;
 let text;
 if(progress.phase==='extract'){
  text='Unpacking '+progress.fileName+' — '+progress.fileIndex+' of '+progress.fileCount+' files ('+percent+'%)';
 }else if(progress.phase==='hash'){
  text='Saving '+progress.fileName+' locally — '+percent+'% ('+progress.fileIndex+' of '+progress.fileCount+')';
 }else{
  text='Saved '+progress.fileName+' locally — '+percent+'% ('+progress.fileIndex+' of '+progress.fileCount+')';
 }
 msg(text,true,'info',progress.total>0?{done:progress.done,total:progress.total}:null,false);
};
window.__retrotitlesIngestProgress=reportIngestProgress;
const b64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const esc=s=>s.replace(/<\/script/gi,'<\\/script');
const HEAD='<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>retrotitles</title>';
const CORES={
 a52:'atari5200',a26:'atari2600',a78:'atari7800',vb:'vb',vboy:'vb',
 nes:'nes',fds:'nes',unif:'nes',unf:'nes',smc:'snes',sfc:'snes',swc:'snes',fig:'snes',bs:'snes',st:'snes',
 gb:'gb',gbc:'gb',dmg:'gb',gba:'gba',n64:'n64',z64:'n64',v64:'n64',u1:'n64',ndd:'n64',nds:'nds',
 md:'segaMD',mdx:'segaMD',gen:'segaMD',smd:'segaMD',sms:'segaMS',gg:'segaGG',sg:'segaMS',sgd:'segaMS','32x':'sega32x',
 col:'coleco',cv:'coleco',lnx:'lynx',ngp:'ngp',ngc:'ngp',pce:'pce',ws:'ws',wsc:'ws',pc2:'ws',j64:'jaguar',jag:'jaguar',
 adf:'amiga',adz:'amiga',dms:'amiga',fdi:'amiga',ipf:'amiga',hdf:'amiga',hdz:'amiga',lha:'amiga',uae:'amiga',
 d64:'c64',d71:'c64',d80:'c64',d81:'c64',d82:'c64',g64:'c64',g41:'c64',x64:'c64',nib:'c64',d2m:'c64',d4m:'c64',t64:'c64',tcrt:'c64',prg:'c64',p00:'c64',crt:'c64',cmd:'c64',vfl:'c64',vsf:'c64',
 sna:'cap32',cdt:'cap32',cpr:'cap32',voc:'cap32',kcr:'crocods',
 p:'81',z80:'fuse',rzx:'fuse',scl:'fuse',trd:'fuse',wad:'prboom',iwad:'prboom',pwad:'prboom',
 cso:'psp',prx:'psp',elf:'psp',conf:'dos'
};
const SYSTEM_CORES={
 nes:['fceumm','nestopia'],snes:['snes9x'],gb:['gambatte'],gba:['mgba'],n64:['mupen64plus_next','parallel_n64'],
 nds:['melonds','desmume','desmume2015'],segaMD:['genesis_plus_gx','picodrive'],segaMS:['smsplus','genesis_plus_gx','picodrive'],
 segaGG:['genesis_plus_gx'],segaCD:['genesis_plus_gx','picodrive'],sega32x:['picodrive'],atari5200:['a5200'],atari2600:['stella2014'],
 atari7800:['prosystem'],vb:['beetle_vb'],coleco:['gearcoleco'],lynx:['handy'],ngp:['mednafen_ngp'],pce:['mednafen_pce'],
 ws:['mednafen_wswan'],jaguar:['virtualjaguar'],psx:['pcsx_rearmed','mednafen_psx_hw'],psp:['ppsspp'],segaSaturn:['yabause'],
 '3do':['opera'],arcade:['fbneo','fbalpha2012_cps1','fbalpha2012_cps2'],mame:['mame2003_plus','mame2003'],amiga:['puae'],
 c64:['vice_x64sc'],c128:['vice_x128'],pet:['vice_xpet'],plus4:['vice_xplus4'],vic20:['vice_xvic'],dos:['dosbox_pure'],
 '81':['81'],fuse:['fuse'],cap32:['cap32'],crocods:['crocods'],same_cdi:['same_cdi']
};
const BIOS_REQUIREMENTS={
 psx:{filename:'scph5501.bin',system:'psx'},
 segaCD:{filename:'bios_CD_U.bin',system:'segaCD'},
 segaSaturn:{filename:'sega_101.bin',system:'segaSaturn'},
 '3do':{filename:'panafz10.bin',system:'3do'}
};
const requiresSharedArrayBuffer=system=>['psp','dos'].includes(String(system).toLowerCase());
const systemCores=system=>SYSTEM_CORES[system]||[system];
const runtimeIsLocal=()=>$('local-runtime').checked;
const LOCAL_RUNTIME_FILES=['jszip.min.js','runtime/ruffle/ruffle.js','runtime/ruffle/172de42e6619eac8f371.wasm','runtime/ruffle/878d548199cddef07035.wasm','runtime/pyodide/pyodide.js','runtime/pyodide/pyodide.asm.js','runtime/pyodide/pyodide.asm.wasm','runtime/pyodide/python_stdlib.zip','runtime/pyodide/pyodide-lock.json','runtime/emulatorjs/data/loader.js','runtime/emulatorjs/data/emulator.min.js','runtime/emulatorjs/data/emulator.min.css','runtime/emulatorjs/data/src/emulator.js','runtime/emulatorjs/data/cores/cores.json','runtime/emulatorjs/data/cores/fceumm-legacy-wasm.data','runtime/emulatorjs/data/cores/ppsspp-thread-wasm.data','runtime/emulatorjs/data/cores/dosbox_pure-thread-wasm.data'];
if(runtimePreference===null&&window.isSecureContext&&typeof fetch==='function'){
 Promise.all(LOCAL_RUNTIME_FILES.map(path=>fetch(path,{method:'HEAD'}).then(response=>({path,ok:response.ok})))).then(responses=>{
  const missing=responses.filter(response=>!response.ok).map(response=>response.path);
  if(missing.length)window.__retrotitlesLog?.('warn','Local runtime check found missing files: '+missing.join(', '),'runtime');
  if(runtimePreference!==null||missing.length)return;
  $('local-runtime').checked=true;$('runtime-note').hidden=false;
  try{localStorage.setItem('retrotitles-local-runtimes','true')}catch(e){}
 }).catch(error=>window.__retrotitlesLog?.('warn','Local runtime check could not finish: '+(error.message||error),'runtime'));
}

const wrapJS=js=>HEAD+'<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}canvas{display:block;margin:0 auto;max-width:100%}</style></head><body><canvas id="canvas" width="800" height="600"></canvas><script>\n'+esc(js)+'\n<\/script></body></html>';

const swfPage=(source,streamed=false)=>{const local=runtimeIsLocal(),runtime=local?'runtime/ruffle/ruffle.js':'https://unpkg.com/@ruffle-rs/ruffle',failure=local?'Missing local Ruffle runtime at '+runtime:'Could not load Ruffle from the CDN.';return HEAD+'<style>html,body{margin:0;height:100%;background:#000}#c{width:100%;height:100%}</style><script src="'+runtime+'" crossorigin="anonymous" onerror=\'document.addEventListener("DOMContentLoaded",()=>{document.body.textContent='+JSON.stringify(failure)+'})\'><\/script></head><body><div id="c"></div><script>\naddEventListener("load",()=>{const p=RufflePlayer.newest().createPlayer();p.style.cssText="width:100%;height:100%";document.getElementById("c").appendChild(p);p.ruffle().load('+ (streamed?'{url:'+JSON.stringify(source)+'}':'{data:Uint8Array.from(atob('+JSON.stringify(source)+'),c=>c.charCodeAt(0))}') +')});\n<\/script></body></html>'};

const fallbackShaders=['2xScaleHQ.glslp','4xScaleHQ.glslp','sabr','crt-aperture.glslp','crt-easymode.glslp','crt-geom.glslp','crt-mattias.glslp','crt-beam','crt-caligari','crt-lottes','crt-zfast','crt-yeetron','bicubic','mix-frames'];
let availableShaders=fallbackShaders.slice(),emulatorShader='disabled';
const readStoredValue=(key,fallback)=>{
 try{const value=localStorage.getItem(key);return value===null?fallback:value}
 catch(error){window.__retrotitlesLog?.('warn','Could not read setting '+key+': '+error.message,'settings');return fallback}
};
const writeStoredValue=(key,value)=>{
 try{localStorage.setItem(key,value);return true}
 catch(error){window.__retrotitlesLog?.('warn','Could not save setting '+key+': '+error.message,'settings');return false}
};
function readStoredObject(key,fallback){
 const value=readStoredValue(key,'');
 if(!value)return fallback;
 try{const parsed=JSON.parse(value);return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:fallback}
 catch(error){window.__retrotitlesLog?.('warn','Could not parse saved setting '+key+': '+error.message,'settings');return fallback}
}
const displaySettings={renderer:'auto',vsync:true,performanceOverlay:false,upscaleFilter:'auto',displayScale:'fit',aspectRatio:'auto',integerScaling:false,pauseOnHidden:false,muteOnHidden:false,...readStoredObject('retrotitles-display-settings',{})};
if(!['auto','webgl2'].includes(displaySettings.renderer))displaySettings.renderer='auto';
if(!['auto','nearest'].includes(displaySettings.upscaleFilter))displaySettings.upscaleFilter='auto';
if(!['fit','100','150','200','integer'].includes(displaySettings.displayScale))displaySettings.displayScale='fit';
if(!['auto','4:3','16:9','stretch'].includes(displaySettings.aspectRatio))displaySettings.aspectRatio='auto';
let shaderOverrides=readStoredObject('retrotitles-shader-overrides',{});
const savedShader=readStoredValue('retrotitles-emulator-shader','disabled');
if(savedShader)emulatorShader=savedShader;
function persistShader(value){
 emulatorShader=value||'disabled';
 writeStoredValue('retrotitles-emulator-shader',emulatorShader);
}
function persistDisplaySettings(){
 writeStoredValue('retrotitles-display-settings',JSON.stringify(displaySettings));
}
function populateShaderOptions(){
 const select=$('emulator-shader'),custom=$('custom-shader');
 select.replaceChildren(new Option('Default', 'disabled'));
 availableShaders.forEach(shader=>select.add(new Option(shader,shader)));
 select.add(new Option('Custom shader key', 'custom'));
 if(availableShaders.includes(emulatorShader)||emulatorShader==='disabled'){
  select.value=emulatorShader;custom.value='';
 }else{
  select.value='custom';custom.value=emulatorShader;
 }
 document.querySelectorAll('[data-system-shader]').forEach(option=>{
  const selected=shaderOverrides[option.dataset.systemShader]||'';
  option.replaceChildren(new Option('Use default shader',''),...availableShaders.map(shader=>new Option(shader,shader)));
  option.value=selected;
 });
 const gameSelect=$('game-shader'),previous=gameSelect.value||'default';
 gameSelect.replaceChildren(new Option('Use saved default','default'),new Option('No shader','disabled'),...availableShaders.map(shader=>new Option(shader,shader)),new Option('Custom shader key','custom'));
 gameSelect.value=previous;
 if(gameSelect.value!==previous)gameSelect.value='default';
}
$('emulator-shader').onchange=()=>{
 if($('emulator-shader').value==='custom'){$('custom-shader').focus();return}
 $('custom-shader').value='';persistShader($('emulator-shader').value);
};
$('custom-shader').addEventListener('change',()=>persistShader($('custom-shader').value.trim()||'disabled'));
$('renderer-setting').value=displaySettings.renderer;
$('renderer-setting').onchange=()=>{displaySettings.renderer=$('renderer-setting').value;persistDisplaySettings()};
$('vsync-setting').checked=displaySettings.vsync!==false;
$('vsync-setting').onchange=()=>{displaySettings.vsync=$('vsync-setting').checked;persistDisplaySettings()};
$('performance-overlay').checked=Boolean(displaySettings.performanceOverlay);
$('performance-overlay').onchange=()=>{displaySettings.performanceOverlay=$('performance-overlay').checked;persistDisplaySettings()};
$('upscale-filter').value=displaySettings.upscaleFilter;
$('upscale-filter').onchange=()=>{displaySettings.upscaleFilter=$('upscale-filter').value;persistDisplaySettings();syncEmulatorDisplaySettings()};
$('display-scale').value=displaySettings.displayScale;
$('display-scale').onchange=()=>{displaySettings.displayScale=$('display-scale').value;persistDisplaySettings();syncEmulatorDisplaySettings()};
$('aspect-ratio').value=displaySettings.aspectRatio;
$('aspect-ratio').onchange=()=>{displaySettings.aspectRatio=$('aspect-ratio').value;persistDisplaySettings();syncEmulatorDisplaySettings()};
$('integer-scaling').checked=displaySettings.integerScaling;
$('integer-scaling').onchange=()=>{displaySettings.integerScaling=$('integer-scaling').checked;if(displaySettings.integerScaling)displaySettings.displayScale='integer';else if(displaySettings.displayScale==='integer')displaySettings.displayScale='fit';$('display-scale').value=displaySettings.displayScale;persistDisplaySettings();syncEmulatorDisplaySettings()};
$('pause-on-hidden').checked=Boolean(displaySettings.pauseOnHidden);
$('pause-on-hidden').onchange=()=>{displaySettings.pauseOnHidden=$('pause-on-hidden').checked;persistDisplaySettings()};
$('mute-on-hidden').checked=Boolean(displaySettings.muteOnHidden);
$('mute-on-hidden').onchange=()=>{displaySettings.muteOnHidden=$('mute-on-hidden').checked;persistDisplaySettings()};
populateShaderOptions();
function runtimeAssetUrl(path){return new URL(path+(path.includes('?')?'&':'?')+'v='+EMULATORJS_VERSION,location.href).href}
function renderSystemShaderOverrides(){
 const container=$('system-shader-overrides');
 const systems=Array.from($('core-select').options).filter(option=>option.value);
 container.replaceChildren(...systems.map(option=>{
  const label=document.createElement('label');label.className='lp-setting-row';
  const title=document.createElement('span');title.textContent=option.textContent;
  const select=document.createElement('select');select.dataset.systemShader=option.value;select.setAttribute('aria-label',option.textContent+' shader');
  select.replaceChildren(new Option('Use default shader',''),...availableShaders.map(shader=>new Option(shader,shader)));
  select.value=shaderOverrides[option.value]||'';
  select.addEventListener('change',()=>{
   if(select.value)shaderOverrides[option.value]=select.value;else delete shaderOverrides[option.value];
   writeStoredValue('retrotitles-shader-overrides',JSON.stringify(shaderOverrides));
  });
  label.append(title,select);return label;
 }));
}
renderSystemShaderOverrides();
function loadRuntimeShaders(){
 const root=runtimeIsLocal()?'runtime/emulatorjs/data/':'https://cdn.emulatorjs.net/stable/data/';
 const script=document.createElement('script');script.crossOrigin='anonymous';script.src=runtimeAssetUrl(root+'src/shaders.js');
 script.onload=()=>{
  const runtimeShaders=window.EJS_SHADERS&&Object.keys(window.EJS_SHADERS);
  if(runtimeShaders?.length)availableShaders=runtimeShaders;
  else window.__retrotitlesLog?.('warn','EmulatorJS returned no shader definitions; using the bundled shader fallback list.','settings');
  populateShaderOptions();syncGameSettings();script.remove();
 };
 script.onerror=()=>{
  window.__retrotitlesLog?.('warn','Could not load EmulatorJS shader definitions; using the bundled shader fallback list.','settings');
  script.remove();
 };
 document.head.appendChild(script);
}
loadRuntimeShaders();
function shaderForSystem(system){return shaderOverrides[system]||emulatorShader}
function emulatorOptions(system){
 const options={shader:shaderForSystem(system),vsync:displaySettings.vsync?'enabled':'disabled',fps:displaySettings.performanceOverlay?'show':'hide'};
 if(displaySettings.renderer==='webgl2')options.webgl2Enabled='enabled';
 if(hasTouchInput())options['virtual-gamepad']=touchControlsEnabled?'enabled':'disabled';
 return options;
}
async function checkRuntimeAssets(system,cores){
 const root=runtimeIsLocal()?'runtime/emulatorjs/data/':'https://cdn.emulatorjs.net/stable/data/';
 const common=['loader.js','emulator.min.js','emulator.min.css'];
 for(const path of common){
  const url=runtimeAssetUrl(root+path);
  try{
   const response=await fetch(url,{method:'HEAD',cache:'no-store'});
   if(response.status===404){window.__retrotitlesLog?.('error','Runtime asset missing: '+url,'runtime');throw new Error('Runtime asset missing: '+root+path+'. Check that runtime/ was deployed.')}
  }catch(error){
   if(error.message.startsWith('Runtime asset missing:'))throw error;
   window.__retrotitlesLog?.('warn','Could not verify runtime asset '+url+': '+error.message,'runtime');
  }
 }
 const corePaths=cores.map(core=>root+'cores/'+core+(requiresSharedArrayBuffer(system)?'-thread':'')+'-wasm.data');
 const available=[];
 for(const path of corePaths){
  const url=runtimeAssetUrl(path);
  try{
   const response=await fetch(url,{method:'HEAD',cache:'no-store'});
   if(response.ok||response.status!==404)available.push(path.slice((root+'cores/').length).replace(/(?:-thread)?-wasm\.data$/,''));
   else if(response.status===404)window.__retrotitlesLog?.('error','Runtime asset missing: '+url,'runtime');
  }catch(error){window.__retrotitlesLog?.('warn','Could not verify runtime asset '+url+': '+error.message,'runtime');available.push(path.slice((root+'cores/').length).replace(/(?:-thread)?-wasm\.data$/,''))}
 }
 if(!available.length)throw new Error('Runtime asset missing: '+corePaths[0]+'. Check that runtime/ was deployed.');
 return available;
}
const uploadedBios=new Map();
async function findRequiredBios(system){
 const requirement=BIOS_REQUIREMENTS[system];
 if(uploadedBios.has(system))return uploadedBios.get(system);
 if(!requirement)return'';
 const path='runtime/bios/'+requirement.system+'/'+requirement.filename,url=new URL(path,location.href).href;
 try{
  const response=await fetch(url,{method:'HEAD',cache:'no-store'});
  if(response.ok)return path;
  console.error('Expected BIOS filename:',requirement.filename,'at',url);
 }catch(error){
  console.error('Expected BIOS filename:',requirement.filename,'at',url,error);
 }
 throw new Error('This system requires a BIOS file. Upload '+requirement.filename+' in Settings > BIOS files, or place it in runtime/bios/'+requirement.system+'/ and reload.');
}
const biosSystemSelect=$('bios-system');
biosSystemSelect.replaceChildren(...Array.from($('core-select').options).filter(option=>option.value).map(option=>new Option(option.textContent,option.value)));
biosSystemSelect.value='psx';
$('bios-file').addEventListener('change',event=>{
 const input=event.currentTarget,file=input.files?.[0];
 input.value='';
 if(!file)return;
 if(!file.size){$('bios-status').textContent='The selected BIOS file is empty.';return}
 const system=$('bios-system').value,requirement=BIOS_REQUIREMENTS[system];
 const url=URL.createObjectURL(file),previous=uploadedBios.get(system);
 uploadedBios.set(system,url);
 if(previous)URL.revokeObjectURL(previous);
 const detail=requirement?' Expected filename: '+requirement.filename+'.':' Make sure it is the BIOS expected by this system.';
 $('bios-status').textContent='BIOS selected for '+$('bios-system').selectedOptions[0].textContent+'.'+detail+' It will be used on the next launch.';
});
function romPage(source,system,n,streamed=false,coreId=system,biosPath=''){
 const root=runtimeIsLocal()?'runtime/emulatorjs/data/':'https://cdn.emulatorjs.net/stable/data/';
 const failure=runtimeIsLocal()?'Missing local EmulatorJS runtime at '+root+'loader.js':'Could not load EmulatorJS from the CDN.';
 const shared=requiresSharedArrayBuffer(system);
 const bustFn=function(version){
  const bust=url=>{
   try{
    const parsed=new URL(url,location.href);
    if(parsed.pathname.includes('/data/cores/')||/\/data\/(?:loader|emulator\.min)\./.test(parsed.pathname))parsed.searchParams.set('v',version);
    return parsed.href;
   }catch(error){return url}
  };
  const originalFetch=window.fetch;
  if(originalFetch)window.fetch=function(input,options){const url=typeof input==='string'?bust(input):input instanceof URL?bust(input.href):input;return originalFetch.call(this,url,options)};
  const originalOpen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,url){const args=Array.from(arguments);args[1]=bust(url);return originalOpen.apply(this,args)};
 };
 const monitorFn=function(runId){
  const workers=[],originalWorker=window.Worker;
  if(originalWorker)window.Worker=function(){const worker=new originalWorker(...arguments);workers.push(worker);return worker};
  window.Worker&&(window.Worker.prototype=originalWorker.prototype);
  window.__rtCleanup=()=>{
   workers.forEach(worker=>worker.terminate());
   if(window.EJS_emulator){window.EJS_emulator.game=null;window.EJS_emulator.config=null;window.EJS_emulator=null}
  };
  let failed=false,frames=0;
  const report=(reason)=>{if(failed)return;failed=true;parent.postMessage({type:'rt-emulator-failed',reason:String(reason||'Emulator could not start.'),core:window.EJS_core,runId},'*')};
  const frame=()=>{frames++;if(frames===1)parent.postMessage({type:'rt-emulator-frame',runId},'*')};
  const watch=(prototype,names)=>{
   if(!prototype)return;
   names.forEach(name=>{
    const original=prototype[name];
    if(typeof original==='function')prototype[name]=function(){frame();return original.apply(this,arguments)};
   });
  };
  [window.WebGLRenderingContext?.prototype,window.WebGL2RenderingContext?.prototype].forEach(prototype=>watch(prototype,['drawArrays','drawElements']));
  watch(window.CanvasRenderingContext2D?.prototype,['putImageData','drawImage']);
   let currentDisplaySettings=null;
   const observedCanvasParents=new WeakSet();
   let canvasSizeObserver=null;
   const applyDisplaySettingsToCanvases=()=>{
    const settings=currentDisplaySettings||{};
    document.querySelectorAll('canvas').forEach(canvas=>{
     const parent=canvas.parentElement;
     const bounds=parent?.getBoundingClientRect();
     const availableWidth=bounds?.width||window.innerWidth;
     const availableHeight=bounds?.height||window.innerHeight;
     const sourceWidth=canvas.width||availableWidth;
     const sourceHeight=canvas.height||availableHeight;
     const pixelPerfect=settings.integerScaling||settings.displayScale==='integer';
     let width,height;
     if(pixelPerfect){
      const integerScale=Math.max(1,Math.floor(Math.min(availableWidth/sourceWidth,availableHeight/sourceHeight)));
      width=sourceWidth*integerScale;
      height=sourceHeight*integerScale;
     }else if(settings.aspectRatio==='stretch'){
      const scale=settings.displayScale==='150'?1.5:settings.displayScale==='200'?2:1;
      width=availableWidth*scale;
      height=availableHeight*scale;
     }else{
      const ratio=settings.aspectRatio==='4:3'?4/3:settings.aspectRatio==='16:9'?16/9:sourceWidth/sourceHeight;
      const fitWidth=Math.min(availableWidth,availableHeight*ratio);
      const fitHeight=fitWidth/ratio;
      const scale=settings.displayScale==='150'?1.5:settings.displayScale==='200'?2:1;
      width=fitWidth*scale;
      height=fitHeight*scale;
     }
     canvas.style.imageRendering=settings.upscaleFilter==='nearest'?'pixelated':'auto';
     canvas.style.width=Math.round(width)+'px';
     canvas.style.height=Math.round(height)+'px';
     canvas.style.display='block';
     canvas.style.margin='auto';
     if(parent&&canvasSizeObserver&&!observedCanvasParents.has(parent)){
      observedCanvasParents.add(parent);
      canvasSizeObserver.observe(parent);
     }
    });
   };
   if(typeof ResizeObserver==='function')canvasSizeObserver=new ResizeObserver(applyDisplaySettingsToCanvases);
   const applyDisplaySettings=event=>{
    if(event.source!==parent||event.data?.type!=='rt-display-settings')return;
    currentDisplaySettings=event.data.settings||{};
    applyDisplaySettingsToCanvases();
   };
   window.addEventListener('message',applyDisplaySettings);
   window.addEventListener('resize',applyDisplaySettingsToCanvases);
   new MutationObserver(applyDisplaySettingsToCanvases).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('error',event=>report(event.message||'The emulator reported a loading error.'));
  window.addEventListener('unhandledrejection',event=>report(event.reason?.message||event.reason||'The emulator failed while loading.'));
  const started=Date.now();
  const timer=setInterval(()=>{
   const error=document.querySelector('.ejs_error_text');
   if(error){clearInterval(timer);report(error.textContent||'The emulator reported a loading error.');return}
   if(Date.now()-started>10000&&frames===0){clearInterval(timer);report('No emulator frame was rendered within 10 seconds.')}
  },500);
  addEventListener('pagehide',()=>{clearInterval(timer);window.__rtCleanup()});
 };
 return HEAD+'<style>html,body{margin:0;height:100%;background:#000}#game{width:100%;height:100%}</style></head><body><div id="game"></div><script>\n('+bustFn.toString()+')('+JSON.stringify(EMULATORJS_VERSION)+');EJS_player="#game";EJS_core='+JSON.stringify(coreId)+';EJS_threads='+JSON.stringify(shared)+'&&window.crossOriginIsolated;EJS_gameName='+JSON.stringify(n)+';EJS_pathtodata='+JSON.stringify(root)+';EJS_startOnLoaded=true;EJS_defaultOptions='+JSON.stringify(emulatorOptions(system))+';EJS_gameUrl='+JSON.stringify(streamed?source:'data:application/octet-stream;base64,'+source)+';EJS_biosUrl='+JSON.stringify(biosPath?new URL(biosPath,location.href).href:'')+';EJS_ready=function(){parent.postMessage({type:"rt-emulator-ready",runId:'+loadSequence+'},"*")};('+monitorFn.toString()+')('+loadSequence+');\n<\/script><script src="'+runtimeAssetUrl(root+'loader.js')+'" crossorigin="anonymous" onerror=\'document.getElementById("game").textContent='+JSON.stringify(failure)+';parent.postMessage({type:"rt-emulator-failed",reason:'+JSON.stringify(failure)+',runId:'+loadSequence+'},"*")\'><\/script></body></html>';
}
async function prepareRom(source,system,title,streamed,loadId){
 const biosPath=await findRequiredBios(system),cores=await checkRuntimeAssets(system,systemCores(system));
 if(loadId!==loadSequence)return'';
 const selectedCore=cores[0];
 if(selectedCore!==systemCores(system)[0])msg('Retrying with alternate core…',false,'warn');
 activeRom={source,system,title,streamed,cores,coreId:selectedCore,biosPath,loadId};
 return romPage(source,system,title,streamed,selectedCore,biosPath);
}

const pyPage=code=>{const local=runtimeIsLocal(),runtime=local?'runtime/pyodide/pyodide.js':'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',failure=local?'Missing local Pyodide runtime at '+runtime:'Could not load Pyodide from the CDN.';return HEAD+'<style>html,body{margin:0;background:#111;color:#ddd;font:13px ui-monospace,monospace}canvas{display:block;margin:0 auto;max-width:100%;background:#000}pre{margin:8px;white-space:pre-wrap}</style><script src="'+runtime+'" crossorigin="anonymous" onerror=\'document.addEventListener("DOMContentLoaded",()=>{document.getElementById("o").textContent='+JSON.stringify(failure)+'})\'><\/script></head><body><canvas id="cv" width="800" height="600"></canvas><pre id="o">Loading Python…\n</pre><script>\nconst CODE='+JSON.stringify(code).replace(/</g,'\\u003c')+';\n(async()=>{const o=document.getElementById("o");const w=t=>o.textContent+=t+"\\n";try{const py=await loadPyodide({stdout:w,stderr:w});py.canvas.setCanvas2D(document.getElementById("cv"));await py.loadPackagesFromImports(CODE);o.textContent="";await py.runPythonAsync(CODE)}catch(e){w(String(e))}})();\n<\/script></body></html>'};

const norm=p=>{const o=[];p.replace(/\\/g,'/').split('/').forEach(s=>{if(s==='..')o.pop();else if(s&&s!=='.')o.push(s)});return o.join('/')};
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',webp:'image/webp',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm',wasm:'application/wasm',m4a:'audio/mp4',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',txt:'text/plain',xml:'application/xml',mjs:'text/javascript',js:'text/javascript',json:'application/json',css:'text/css',html:'text/html',cue:'text/plain',m3u:'text/plain',ccd:'text/plain'};
const mimeOf=n=>MIME[n.split('.').pop().toLowerCase()]||'application/octet-stream';

async function extractRarEntries(buf,loadId){
 let ex;const entries=[];
 try{
  ex=await window.__createRar({data:new Uint8Array(buf),wasmBinary:Uint8Array.from(atob(window.__RARW),c=>c.charCodeAt(0))});
  const extracted=ex.extract().files;
  for(let i=0;i<extracted.length;i++){
   if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
   const f=extracted[i];
   if(f.extraction&&f.fileHeader.name)entries.push({name:f.fileHeader.name.replace(/\\/g,'/'),get:async()=>new Blob([f.extraction])});
   if(i===extracted.length-1||i%25===0){
    msg('Extracting RAR files — '+(i+1)+' of '+extracted.length,true,'info',{done:i+1,total:extracted.length});
    await new Promise(resolve=>setTimeout(resolve,0));
   }}
 }catch(e){if(e.name==='AbortError')throw e;throw new Error(/password/i.test(String(e&&e.message||e))?'This RAR is password protected.':'Could not read this RAR file ('+(e&&e.message||e)+').')}
 return entries;
}
let zipScriptPromise;
async function ensureJSZip(){
 if(window.JSZip)return;
 if(!zipScriptPromise)zipScriptPromise=new Promise((resolve,reject)=>{
  const local=runtimeIsLocal(),script=document.createElement('script');
  const src=local?'jszip.min.js':'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const timer=setTimeout(()=>{zipScriptPromise=null;script.remove();reject(new Error('ZIP support did not load within 20 seconds. Check the Console tab for details.'))},20000);
  script.src=src;
  script.crossOrigin='anonymous';
  script.onload=()=>{clearTimeout(timer);if(window.JSZip)resolve();else{zipScriptPromise=null;reject(new Error('The ZIP helper loaded but JSZip was not defined.'))}};
  script.onerror=()=>{clearTimeout(timer);zipScriptPromise=null;reject(new Error(local?'Missing local ZIP runtime at jszip.min.js.':'Could not load JSZip from the CDN.'))};
  document.head.appendChild(script);
 });
 await zipScriptPromise;
}
async function fromZip(buf,loadId){await ensureJSZip();if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');return build(await JSZip.loadAsync(buf),loadId)}
function zipAssetPath(ref,base=''){
 if(!ref||/^(data:|https?:|\/\/|#|blob:)/i.test(ref))return null;
 let path=ref.split(/[?#]/)[0].replace(/\\/g,'/');
 try{path=decodeURIComponent(path)}catch(e){}
 return norm(path.startsWith('/')?path.slice(1):base+path);
}
async function build(z,loadId=loadSequence){const names=Object.keys(z.files).filter(n=>!z.files[n].dir&&!n.startsWith('__MACOSX'));
 const idx=names.filter(n=>/(^|\/)index\.html?$/i.test(n)).sort((a,b)=>a.split('/').length-b.split('/').length)[0];
 if(!idx)throw new Error('No start page was found in the ZIP archive.');
 const base=idx.includes('/')?idx.slice(0,idx.lastIndexOf('/')+1):'';
 const raw=await z.files[idx].async('string');
 if(names.some(n=>/\.loader\.js$/i.test(n))){ // Unity WebGL
  if(names.some(n=>/\.(br|gz)$/i.test(n)))throw new Error('This Unity build is compressed (.br/.gz). Re-export with Compression Format = Disabled, or host it on a server.');
  let out=raw;portable=false;
  const files=names.filter(n=>n.startsWith(base)&&n!==idx).sort((a,b)=>b.length-a.length);
  for(const n of files){const rel=n.slice(base.length);const blob=new Blob([await z.files[n].async('arraybuffer')],{type:mimeOf(n)});out=out.split(rel).join(createGameObjectURL(blob))}
  return out;
 }
 const exactFiles=new Map(names.map(path=>[norm(path),z.files[path]]));
 const foldedFiles=new Map(names.map(path=>[norm(path).toLowerCase(),z.files[path]]));
 const find=ref=>{const path=zipAssetPath(ref,base);return path===null?null:exactFiles.get(path)||foldedFiles.get(path.toLowerCase())||null};
 const doc=new DOMParser().parseFromString(raw,'text/html');
 if(doc.querySelector('script[type="module"],link[rel~="modulepreload"]'))throw new Error('This ZIP uses JavaScript modules and must be streamed. Open this page over HTTPS or localhost and keep Single-file ZIP off.');
 const resources=[...doc.querySelectorAll('link[rel~=stylesheet],script[src],img[src],audio[src],video[src],source[src]')];
 for(let i=0;i<resources.length;i++){
  if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
  const element=resources[i],tag=element.tagName.toLowerCase(),attribute=tag==='link'?'href':'src',ref=element.getAttribute(attribute),path=zipAssetPath(ref,base),file=find(ref);
  if(path&&!file&&['link','script'].includes(tag))throw new Error('Missing '+(tag==='link'?'stylesheet':'script')+' in ZIP: '+ref);
  if(file&&tag==='link'){const style=doc.createElement('style');style.textContent=await file.async('string');element.replaceWith(style)}
  else if(file&&tag==='script'){const script=doc.createElement('script');if(element.type)script.type=element.type;script.textContent=esc(await file.async('string'));element.replaceWith(script)}
  else if(file)element.setAttribute(attribute,'data:'+mimeOf(file.name)+';base64,'+await file.async('base64'));
  msg('Embedding ZIP assets — '+(i+1)+' of '+resources.length+' checked',true,'info',{done:i+1,total:resources.length});
 }
 return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
}

const CTRL_FN=function(scope,fallbackScope,configuredMap){
 if(window.__grcLoader)return;window.__grcLoader=1;
 function createControls(){
 if(window.__grc)return;window.__grc=1;
 var SP={ArrowUp:[38,'ArrowUp','ArrowUp'],ArrowDown:[40,'ArrowDown','ArrowDown'],ArrowLeft:[37,'ArrowLeft','ArrowLeft'],ArrowRight:[39,'ArrowRight','ArrowRight'],Space:[32,'Space',' '],Enter:[13,'Enter','Enter'],Shift:[16,'ShiftLeft','Shift'],Control:[17,'ControlLeft','Control'],Escape:[27,'Escape','Escape'],Tab:[9,'Tab','Tab']};
 var NAMES=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','W','A','S','D','Space','Enter','Shift','Control','Escape','Tab','Z','X','C','V','E','Q','F','R','1','2','3','4'];
 var ACT=[['up','Up'],['down','Down'],['left','Left'],['right','Right'],['a','A'],['b','B'],['x','X'],['y','Y'],['start','Start']];
 var DEF={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',a:'Space',b:'Z',x:'X',y:'C',start:'Enter'};
 var map={},k;for(k in DEF)map[k]=DEF[k];
 var scopeName=scope||'default',savedMaps={},sv=configuredMap||null;
 if(!sv){
  try{savedMaps=JSON.parse(localStorage.getItem('retrotitles-control-mappings')||'{}')||{}}catch(e){console.warn('Could not read control mappings:',e)}
  sv=savedMaps[scopeName]||savedMaps[fallbackScope||'']||savedMaps.default||null;
  if(!sv)try{sv=JSON.parse(localStorage.getItem('gr-keys'))}catch(e){console.warn('Could not read legacy control mappings:',e)}
 }
 if(sv)for(k in sv)if(map[k]&&NAMES.indexOf(sv[k])>-1)map[k]=sv[k];
 function save(){
  savedMaps[scopeName]=map;
  try{
   if(scopeName==='default')localStorage.setItem('gr-keys',JSON.stringify(map));
   localStorage.setItem('retrotitles-control-mappings',JSON.stringify(savedMaps));
  }catch(e){parent.postMessage({type:'rt-controls-save',scope:scopeName,mapping:map},'*')}
 }
 function spec(n){if(SP[n])return{keyCode:SP[n][0],code:SP[n][1],key:SP[n][2]};if(/^[0-9]$/.test(n))return{keyCode:n.charCodeAt(0),code:'Digit'+n,key:n};return{keyCode:n.charCodeAt(0),code:'Key'+n,key:n.toLowerCase()}}
 function target(){var a=document.activeElement;if(a&&a!==document.body&&a!==document.documentElement)return a;return document.querySelector('canvas,ruffle-player,ruffle-embed')||document}
 function fire(type,n){var s=spec(n);var e=new KeyboardEvent(type,{key:s.key,code:s.code,bubbles:true,cancelable:true});['keyCode','which'].forEach(function(p){try{Object.defineProperty(e,p,{get:function(){return s.keyCode}})}catch(x){}});target().dispatchEvent(e)}
 var down={};
 function press(a){if(down[a])return;down[a]=map[a];fire('keydown',map[a])}
 function release(a){if(down[a]){var n=down[a];delete down[a];fire('keyup',n)}}
 var st=document.createElement('style');
 st.textContent='#grc{position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:none;font:600 15px system-ui,sans-serif;user-select:none;-webkit-user-select:none}#grc *{box-sizing:border-box;touch-action:none}.grb{position:absolute;pointer-events:auto;border-radius:50%;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.55);color:#fff;display:flex;align-items:center;justify-content:center;text-shadow:0 1px 2px #000;box-shadow:0 0 0 1px rgba(0,0,0,.35)}.grb.on{background:rgba(255,255,255,.5)}#grp{position:absolute;pointer-events:auto;left:50%;top:50%;transform:translate(-50%,-50%);background:#222;color:#eee;border-radius:12px;padding:14px;width:min(320px,92vw);max-height:90%;overflow:auto;display:none}#grp,#grp *{touch-action:auto}#grp label{display:flex;justify-content:space-between;align-items:center;margin:6px 0}#grp select,#grp button{font:inherit;background:#444;color:#fff;border:1px solid #666;border-radius:6px;padding:4px 8px}';
 document.head.appendChild(st);
 var root=document.createElement('div');root.id='grc';
 function bot(n){return 'bottom:calc('+n+'px + env(safe-area-inset-bottom,0px));'}
 function box(css,txt){var d=document.createElement('div');d.className='grb';d.style.cssText=css;if(txt)d.textContent=txt;root.appendChild(d);return d}
 var base=box('left:20px;'+bot(24)+'width:130px;height:130px;');
 var knob=document.createElement('div');knob.style.cssText='position:absolute;left:40px;top:40px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.55);pointer-events:none';base.appendChild(knob);
 var R=65;
 function mv(ev){var r=base.getBoundingClientRect();var dx=ev.clientX-(r.left+R),dy=ev.clientY-(r.top+R);var d=Math.sqrt(dx*dx+dy*dy);if(d>R){dx*=R/d;dy*=R/d}knob.style.left=(40+dx*0.6)+'px';knob.style.top=(40+dy*0.6)+'px';var t=R*0.3;
  if(dx<-t)press('left');else release('left');if(dx>t)press('right');else release('right');if(dy<-t)press('up');else release('up');if(dy>t)press('down');else release('down')}
 function end(){['up','down','left','right'].forEach(release);knob.style.left='40px';knob.style.top='40px'}
 base.addEventListener('pointerdown',function(e){e.preventDefault();base.setPointerCapture(e.pointerId);mv(e)});
 base.addEventListener('pointermove',function(e){if(base.hasPointerCapture(e.pointerId))mv(e)});
 base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end);
 function btn(a,label,css){var b=box(css,label);
  b.addEventListener('pointerdown',function(e){e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('on');press(a)});
  var up=function(){b.classList.remove('on');release(a)};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)}
 var sz='width:54px;height:54px;';
 btn('a','A','right:20px;'+bot(74)+sz);
 btn('b','B','right:75px;'+bot(24)+sz);
 btn('x','X','right:75px;'+bot(124)+sz);
 btn('y','Y','right:130px;'+bot(74)+sz);
 btn('start','START','left:50%;margin-left:-32px;'+bot(24)+'width:64px;height:32px;border-radius:16px;font-size:11px;');
 var pn=document.createElement('div');pn.id='grp';root.appendChild(pn);
 function build(){pn.innerHTML='';var h=document.createElement('div');h.textContent='Key mapping';h.style.cssText='font-weight:700;margin-bottom:6px';pn.appendChild(h);
  ACT.forEach(function(p){var l=document.createElement('label');l.textContent=p[1];var s=document.createElement('select');NAMES.forEach(function(n){var o=document.createElement('option');o.value=o.textContent=n;if(map[p[0]]===n)o.selected=true;s.appendChild(o)});s.onchange=function(){release(p[0]);map[p[0]]=s.value;save()};l.appendChild(s);pn.appendChild(l)});
  var r=document.createElement('button');r.textContent='Reset';r.onclick=function(){for(var q in DEF)map[q]=DEF[q];save();build()};
  var c=document.createElement('button');c.textContent='Close';c.style.marginLeft='8px';c.onclick=function(){pn.style.display='none'};pn.appendChild(r);pn.appendChild(c)}
 var gear=box('right:10px;top:calc(10px + env(safe-area-inset-top,0px));width:38px;height:38px;opacity:.7','\u2699');
 gear.addEventListener('click',function(){build();pn.style.display='block'});
 document.body.appendChild(root);
 function vis(v){root.style.display=v?'block':'none';if(!v)end()}
 root.__grToggle=function(){vis(root.style.display==='none')};
 root.__grShow=function(){vis(true)};
 root.__grHide=function(){vis(false)};
 vis(true);
 }
 addEventListener('message',function(e){
  if(e.data!=='gr-toggle'&&e.data!=='gr-show'&&e.data!=='gr-hide')return;
  if(!window.__grc){createControls();if(e.data==='gr-hide')document.getElementById('grc')?.__grHide?.();return}
  var root=document.getElementById('grc');
  if(root&&e.data==='gr-show'&&root.__grShow)root.__grShow();
  else if(root&&e.data==='gr-hide'&&root.__grHide)root.__grHide();
  else if(root&&root.__grToggle)root.__grToggle();
 });
};
const PLAYER_LOG_FN=function(){
 const format=value=>{
  if(value instanceof Error)return value.stack||value.message||String(value);
  if(typeof value==='string')return value;
  try{const text=JSON.stringify(value);return text===undefined?String(value):text}catch(e){return String(value)}
 };
 const report=(level,message)=>{
  try{window.parent.postMessage({type:'rt-console',level,message:String(message||'').slice(0,2000)},'*')}catch(e){}
 };
 window.addEventListener('error',event=>{
  if(event.target&&event.target!==window){
   const target=event.target;let url=target.currentSrc||target.src||target.href||'';
   if(url)url=String(url).split('?')[0].split('#')[0];
   report('error',url?'Player resource failed: '+url:'Player resource failed to load');
   return;
  }
  const location=[event.filename,event.lineno?':'+event.lineno:'',event.colno?':'+event.colno:''].join('');
  report('error',(event.message||'Uncaught player error')+(location?' — '+location:''));
 },true);
 window.addEventListener('unhandledrejection',event=>report('error','Player promise rejected: '+format(event.reason)));
 ['error','warn'].forEach(level=>{
  const original=console[level];
  console[level]=function(){
   const args=Array.prototype.slice.call(arguments);
   report(level,args.map(format).join(' '));
   return original.apply(console,args);
  };
 });
};
const addCtl=(h,includeControls=true,controlScope='default',fallbackScope='default')=>{
 const diagnostics='<script>('+PLAYER_LOG_FN.toString()+')()<\/script>';
 const configuredMap={...(controlMappings.default||{}),...(controlMappings[fallbackScope]||{}),...(controlMappings[controlScope]||{})};
 const controls=includeControls?'<script>('+CTRL_FN.toString()+')('+JSON.stringify(controlScope)+','+JSON.stringify(fallbackScope)+','+JSON.stringify(configuredMap)+')<\/script>':'';
 let page=h,head=/<head[^>]*>/i.exec(page);
 if(head)page=page.slice(0,head.index+head[0].length)+diagnostics+page.slice(head.index+head[0].length);
 else page=diagnostics+page;
 let i=-1,m;const re=/<\/body>/gi;while((m=re.exec(page)))i=m.index;
 return i<0?page+controls:page.slice(0,i)+controls+page.slice(i);
};


let streamUrl=null,provider=null,providerId=null,loadSequence=0,activeReader=null,customControlsAvailable=true,activeRom=null,activeGameRecord=null,activeControlScope='default';
const hasTouchInput=()=>Boolean(navigator.maxTouchPoints>0||window.matchMedia?.('(pointer: coarse)').matches);
const canSW=()=>'serviceWorker' in navigator&&window.isSecureContext;
function withTimeout(promise,milliseconds,message){
 let timer;
 return Promise.race([Promise.resolve(promise),new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error(message)),milliseconds)})]).finally(()=>clearTimeout(timer));
}
const newProviderId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const STREAM_THRESHOLD=32*1024*1024;
const sizeLabel=n=>n>=1e9?(n/1e9).toFixed(1)+' GB':n>=1e6?(n/1e6).toFixed(0)+' MB':n>=1e3?Math.round(n/1e3)+' KB':n+' B';
async function readFileBuffer(file,loadId,stage){
 if(typeof file.stream!=='function'){
  msg(stage+' — reading '+sizeLabel(file.size),true);
  const buffer=await file.arrayBuffer();
  if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
  return buffer;
 }
 const reader=file.stream().getReader(),chunks=[];
 activeReader=reader;
 let loaded=0,lastReported=0;
 try{
  while(true){
   if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
   const {done,value}=await reader.read();
   if(done)break;
   chunks.push(value);loaded+=value.byteLength;
   if(loaded===file.size||loaded-lastReported>=Math.max(256*1024,file.size/100)){
    const percent=file.size?Math.round(loaded/file.size*100):100;
    msg(stage+' — '+sizeLabel(loaded)+' of '+sizeLabel(file.size)+' ('+percent+'%)',true,'info',{done:loaded,total:file.size});
    lastReported=loaded;
   }
  }
 }finally{
  if(activeReader===reader)activeReader=null;
 }
 if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
 const bytes=new Uint8Array(loaded);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return bytes.buffer;
}
const readFileText=async(file,loadId,stage)=>new TextDecoder().decode(await readFileBuffer(file,loadId,stage));
const gameObjectUrls=new Set();
function createGameObjectURL(blob){const url=URL.createObjectURL(blob);gameObjectUrls.add(url);return url}
function cleanupGame(){
 try{$('fr').contentWindow?.__rtCleanup?.()}catch(error){window.__retrotitlesLog?.('warn','Could not clean up the previous emulator: '+error.message,'runtime')}
 gameObjectUrls.forEach(url=>URL.revokeObjectURL(url));gameObjectUrls.clear();
 activeRom=null;activeGameRecord=null;streamUrl=null;provider=null;providerId=null;
 $('fr').removeAttribute('srcdoc');$('fr').src='about:blank';$('stage').style.display='none';$('save-manager').hidden=true;$('ctl').hidden=true;syncPlayEmpty();
}
function syncPlayEmpty(){$('play-empty').hidden=$('stage').style.display!=='none'}
function cancelCurrentLoad(){
 if($('load-cancel').hidden)return;
 loadSequence++;
 const reader=activeReader;activeReader=null;
 if(reader)reader.cancel().catch(error=>window.__retrotitlesLog?.('warn','Could not stop the file reader: '+error.message,'app'));
 msg('Load canceled. Choose the file again to retry.');
}
function setLoadedTitle(title,size=''){$('title-name').textContent=title||'Local title';$('title-size').textContent=size}
const controlActions=[['up','Up'],['down','Down'],['left','Left'],['right','Right'],['a','A'],['b','B'],['x','X'],['y','Y'],['start','Start']];
const controlKeyNames=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','W','A','S','D','Space','Enter','Shift','Control','Escape','Tab','Z','X','C','V','E','Q','F','R','1','2','3','4'];
let controlMappings=readStoredObject('retrotitles-control-mappings',{});
if(!controlMappings.default){
 const legacyMapping=readStoredObject('gr-keys',null);
 if(legacyMapping){controlMappings.default=legacyMapping;writeStoredValue('retrotitles-control-mappings',JSON.stringify(controlMappings))}
}
let controlsSystem='default',controlsRecord=null;
let touchControlsEnabled=readStoredValue('retrotitles-touch-controls','true')!=='false';
function setTouchControlsPreference(enabled,applyToCurrent=true){
 touchControlsEnabled=Boolean(enabled);
 $('touch-controls-toggle').checked=touchControlsEnabled;
 $('game-touch-controls').checked=touchControlsEnabled;
 writeStoredValue('retrotitles-touch-controls',String(touchControlsEnabled));
 if(!applyToCurrent||$('stage').style.display==='none')return;
 const emulator=activeEmulatorInstance();
 if(emulator){
  try{
   emulator.changeSettingOption('virtual-gamepad',touchControlsEnabled?'enabled':'disabled');
   emulator.saveSettings?.();
  }catch(error){msg('Could not update touch controls: '+error.message,false,'error')}
  return;
 }
 if(customControlsAvailable){
  setTouchControlsActive(touchControlsEnabled);
  $('fr').contentWindow.postMessage(touchControlsEnabled?'gr-show':'gr-hide','*');
 }
}
function controlScope(){return controlsRecord?'game:'+controlsRecord.id:controlsSystem}
function renderControllerStatus(){
 const status=$('controller-status'),gamepads=$('gamepad-mapping-list');
 try{
  const connected=navigator.getGamepads?Array.from(navigator.getGamepads()).filter(Boolean):[];
  status.textContent=connected.length
   ?connected.map(gamepad=>gamepad.id||'Connected controller').join(', ')+' connected'
   :'No controller detected. Connect a gamepad to use EmulatorJS input.';
  gamepads.textContent=controlsSystem==='default'
   ?'Browser titles use the connected controller’s native mapping.'
   :'For '+$('controls-system').selectedOptions[0].textContent+', EmulatorJS applies the core’s gamepad bindings. Remapping is available in its in-game settings.';
 }catch(error){
  status.textContent='Controller status is unavailable: '+error.message;
  gamepads.textContent='Gamepad mappings are managed by the active player.';
  window.__retrotitlesLog?.('warn','Could not inspect connected controllers: '+error.message,'controls');
 }
}
function renderKeyboardMappings(){
 const systemSelect=$('controls-system'),scope=controlScope(),systemMap=controlMappings[controlsSystem]||{},gameMap=controlsRecord?controlMappings[scope]||{}:{};
 const mappings={...(controlMappings.default||{}),...systemMap,...gameMap},container=$('keyboard-mapping-list');
 systemSelect.value=controlsSystem;systemSelect.disabled=Boolean(controlsRecord);
 $('controls-scope-note').textContent=controlsRecord
  ?'Per-game overrides for '+(controlsRecord.name||controlsRecord.path)+'; saved separately from system defaults.'+(controlsRecord.system?' EmulatorJS input bindings for this system remain in its in-game menu.':'')
  :'Mappings are saved per system and apply to supported browser titles.';
 container.replaceChildren(...controlActions.map(([action,label])=>{
  const row=document.createElement('label');row.className='lp-mapping-row';
  const title=document.createElement('span');title.textContent=label;
  const select=document.createElement('select');select.setAttribute('aria-label',label+' keyboard key');
  controlKeyNames.forEach(key=>select.add(new Option(key,key)));
  select.value=mappings[action]||({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',a:'Space',b:'Z',x:'X',y:'C',start:'Enter'})[action];
  select.disabled=Boolean(controlsRecord?.system);
  select.addEventListener('change',()=>{
   const current=controlMappings[scope]||{};
   controlMappings[scope]={...current,[action]:select.value};
   if(writeStoredValue('retrotitles-control-mappings',JSON.stringify(controlMappings)))msg('Saved '+label+' mapping for '+(controlsRecord?.name||controlsSystem)+'.');
  });
  row.append(title,select);return row;
 }));
 renderControllerStatus();
}
 $('controls-system').add(new Option('Browser titles (default)','default'));
Array.from($('core-select').options).filter(option=>option.value).forEach(option=>$('controls-system').add(new Option(option.textContent,option.value)));
$('controls-system').addEventListener('change',()=>{
 controlsSystem=$('controls-system').value||'default';controlsRecord=null;renderKeyboardMappings();
});
$('touch-controls-toggle').checked=touchControlsEnabled;
$('touch-controls-toggle').addEventListener('change',()=>{
 setTouchControlsPreference($('touch-controls-toggle').checked);
});
window.addEventListener('gamepadconnected',renderControllerStatus);
window.addEventListener('gamepaddisconnected',renderControllerStatus);
window.__retrotitlesOpenControls=record=>{
 controlsRecord=record;controlsSystem=record.system||'default';renderKeyboardMappings();activateTab('controls');
};
renderKeyboardMappings();
window.__retrotitlesSaveManager({$,msg,sizeLabel,getTitleName:()=>name});
window.__retrotitlesFileManager({
 $,msg,sizeLabel,openFile:(file,record,systemOverride)=>load(file,{ingested:true,source:'library',record,systemOverride}),
 openFolder:(files,paths)=>loadFolder(files,paths),
 extractArchive:async file=>{
  const extension=file.name.split('.').pop().toLowerCase();
  if(extension==='zip')return zipEntries(file);
  if(extension==='rar'){
   if(file.size>=STREAM_THRESHOLD&&!window.confirm('RAR extraction needs the whole archive in browser memory and may exhaust this device. Continue extracting it into the unified file view?'))return[];
   return extractRarEntries(await readFileBuffer(file,loadSequence,'Reading RAR archive'),loadSequence);
  }
  return[];
 }
});
async function clearAllLocalData(){
 if(!window.confirm('Delete indexed game files and file handles, browser and EmulatorJS saves, settings, and cached runtime data? This cannot be undone. Files on your computer will not be deleted. Close other RetroTitles tabs before continuing.'))return;
 const button=$('delete-all-data'),status=$('delete-all-status');
 button.disabled=true;status.textContent='Stopping the current title and clearing local data…';
 try{
  if(!$('load-cancel').hidden)cancelCurrentLoad();
  const frame=$('fr');
  const unloaded=new Promise(resolve=>{
   let timer;
   const finish=()=>{clearTimeout(timer);frame.removeEventListener('load',finish);resolve()};
   frame.addEventListener('load',finish,{once:true});timer=setTimeout(finish,1500);
  });
  cleanupGame();await unloaded;
  if(typeof window.__retrotitlesClearIndexedFiles!=='function')throw new Error('File storage cleanup is unavailable.');
  if(typeof window.__retrotitlesClearEmulatorStorage!=='function')throw new Error('Emulator storage cleanup is unavailable.');
  if(typeof window.__retrotitlesClearRuntimeCache!=='function')throw new Error('Runtime cache cleanup is unavailable.');
  await window.__retrotitlesClearIndexedFiles();
  await window.__retrotitlesClearEmulatorStorage();
  await window.__retrotitlesClearRuntimeCache();
  const preferenceKeys=[];
  for(let index=0;index<localStorage.length;index++){
   const key=localStorage.key(index);
   if(key&&(key.startsWith('retrotitles-')||key==='gr-keys'||key==='ejs-settings'||/^ejs-.+-settings$/.test(key)))preferenceKeys.push(key);
  }
  preferenceKeys.forEach(key=>localStorage.removeItem(key));
  status.textContent='Local RetroTitles data cleared. Reloading…';
  location.reload();
 }catch(error){
  status.textContent='Could not clear all local data: '+error.message+' Close other RetroTitles tabs and retry.';
  window.__retrotitlesLog?.('error','Could not clear all local data: '+error.message,'storage');
 }finally{
  button.disabled=false;
 }
}
async function streamLocalFile(file,loadId=loadSequence){
 if(!canSW())throw new Error('Streaming large local files needs this page opened over HTTPS or localhost.');
 msg('Starting local streaming service…',true);
 try{await navigator.serviceWorker.register('sw.js');await withTimeout(navigator.serviceWorker.ready,20000,'The local streaming service did not become ready within 20 seconds.')}
 catch(e){throw new Error('Could not start the local file streaming service. Open this page over HTTPS or localhost. '+(e.message||''))}
 if(loadId!==loadSequence)return false;
 providerId=newProviderId();
 provider=async path=>path===file.name?{blob:file,type:file.type||mimeOf(file.name)}:{};
 streamUrl=new URL('__game/'+providerId+'/'+encodeURIComponent(file.name),location.href).href;
 return true;
}
if('serviceWorker' in navigator)navigator.serviceWorker.onmessage=async e=>{
 if(!e.data||typeof e.data.path!=='string'||!e.ports[0])return;
 if(e.data.streamId!==providerId){e.ports[0].close();return}
 let r={};try{r=(provider&&await provider(e.data.path))||{}}catch(x){}
  e.ports[0].postMessage(r);e.ports[0].close();
};
async function zipEntries(file){
 msg('Inspecting ZIP directory…',true);
 const zr=new window.__zip.ZipReader(new window.__zip.BlobReader(file));
 return (await zr.getEntries()).filter(e=>!e.directory).map(e=>({name:e.filename,get:()=>e.getData(new window.__zip.BlobWriter())}));
}
async function streamFrom(entries,loadId=loadSequence,indexOverride=''){
 const names=entries.map(e=>e.name).filter(n=>!n.startsWith('__MACOSX'));
 const idx=indexOverride||findStreamIndex(names);
 if(!idx)throw new Error('No start page was found in this folder or archive.');
 const base=idx.includes('/')?idx.slice(0,idx.lastIndexOf('/')+1):'';
 const map=new Map(),low=new Map();
 const relevant=entries.filter(entry=>!norm(entry.name).startsWith('__MACOSX')&&norm(entry.name).slice(0,base.length).toLowerCase()===base.toLowerCase());
 for(let i=0;i<relevant.length;i++){
  if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
  const entry=relevant[i],normalizedName=norm(entry.name),key=norm(normalizedName.slice(base.length));
  map.set(key,entry);low.set(key.toLowerCase(),entry);
  if(i===relevant.length-1||i%100===0){
   msg('Preparing stream — '+(i+1)+' of '+relevant.length+' files',true,'info',{done:i+1,total:relevant.length});
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 const indexRel=norm(idx.slice(base.length));
 const cache=new Map();
 try{await navigator.serviceWorker.register('sw.js');await withTimeout(navigator.serviceWorker.ready,20000,'The local streaming service did not become ready within 20 seconds.')}
 catch(e){throw Object.assign(new Error('Service worker unavailable: '+(e.message||'unknown error')),{noSW:true})}
 if(loadId!==loadSequence)return false;
 providerId=newProviderId();
 provider=async path=>{
  path=norm(path)||indexRel;
  const e=map.get(path)||low.get(path.toLowerCase());if(!e)return{};
   let blob=cache.get(e);
   if(!blob){blob=await e.get();cache.set(e,blob);if(cache.size>2)cache.delete(cache.keys().next().value)}
  const enc=/\.br$/i.test(e.name)?'br':/\.gz$/i.test(e.name)?'gzip':'';
  let type=mimeOf(e.name.replace(/\.(br|gz)$/i,''));
  if(path===indexRel){blob=new Blob([addCtl(await blob.text(),true,activeControlScope,activeControlScope)],{type:'text/html'});type='text/html'}
  return{blob,type,encoding:enc};
 };
 streamUrl=new URL('__game/'+providerId+'/'+indexRel.split('/').map(encodeURIComponent).join('/'),location.href).href;
 return true;
}
function engineWebExport(entries){
 const names=entries.map(entry=>norm(entry.name));
 const indexes=names.filter(path=>/(^|\/)index\.html?$/i.test(path));
 if(!indexes.length)return null;
 const indexFor=asset=>indexes.filter(index=>{
  const dir=index.includes('/')?index.slice(0,index.lastIndexOf('/')+1):'';
  return asset.startsWith(dir);
 }).sort((a,b)=>b.lastIndexOf('/')-a.lastIndexOf('/'))[0]||findStreamIndex(names);
 const unityLoader=names.find(path=>/\.loader\.js$/i.test(path));
 if(unityLoader)return{name:'Unity',index:indexFor(unityLoader)};
 const wasm=names.find(path=>/\.wasm(?:\.(?:br|gz))?$/i.test(path));
 const hasPayload=names.some(path=>/\.(?:pak|data)(?:\.(?:br|gz))?$/i.test(path));
 return wasm&&hasPayload?{name:'Unreal Engine',index:indexFor(wasm)}:null;
}
async function zipRequiresStreaming(entries,index){
 const entry=entries.find(item=>norm(item.name).toLowerCase()===norm(index).toLowerCase());
 if(!entry)return false;
 const page=await entry.get();
 const doc=new DOMParser().parseFromString(await page.text(),'text/html');
 return Boolean(doc.querySelector('script[type="module"],link[rel~="modulepreload"]'));
}
async function tryStream(file,loadId=loadSequence,entries=null){
 if(!canSW())return false;
 try{return await streamFrom(entries||await zipEntries(file),loadId)}catch(e){if(e.noSW)return false;throw e}
}
async function streamRomArchive(entries,romEntry,loadId){
 if(!canSW())return false;
 try{await navigator.serviceWorker.register('sw.js');await withTimeout(navigator.serviceWorker.ready,20000,'The local streaming service did not become ready within 20 seconds.')}
 catch(error){throw new Error('Could not start local archive streaming. Open this page over HTTPS or localhost. '+(error.message||''))}
 if(loadId!==loadSequence)return false;
 const exact=new Map(),folded=new Map();
 entries.forEach(entry=>{
  const path=norm(entry.name);
  if(!path||path.startsWith('__MACOSX/'))return;
  exact.set(path,entry);folded.set(path.toLowerCase(),entry);
 });
 const cache=new Map();
 providerId=newProviderId();
 provider=async path=>{
  path=norm(path);
  const entry=exact.get(path)||folded.get(path.toLowerCase());
  if(!entry)return{};
  let blob=cache.get(entry);
  if(!blob){blob=await entry.get();cache.set(entry,blob);if(cache.size>2)cache.delete(cache.keys().next().value)}
  return{blob,type:mimeOf(entry.name)};
 };
 const romPath=norm(romEntry.name);
 streamUrl=new URL('__game/'+providerId+'/'+romPath.split('/').map(encodeURIComponent).join('/'),location.href).href;
 return true;
}
function showStream(controls=true,page=''){
 portable=false;html=page;
 $('code').value='/* Streaming mode: files are served from the selected local file, ZIP, or folder as the title requests them. No single-file export is available in this mode. Keep this page open while playing. */';
 customControlsAvailable=controls;
 $('dl').disabled=$('cp').disabled=true;$('ctl').hidden=!controls;
 $('fr').setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals');
 $('stage').style.display='block';syncPlayEmpty();activateTab('play');play();
}
async function loadFolder(files,paths=[],requestedLoadId=0){
 if(!files.length)return;if(activeReader)activeReader.cancel().catch(()=>{});const loadId=requestedLoadId||++loadSequence;if(loadId!==loadSequence)return;const folderName=(paths[0]||files[0].webkitRelativePath||files[0].name).split('/')[0]||'Local folder';cleanupGame();activeGameRecord=null;activeControlScope='default';customControlsAvailable=true;name=folderName;resetTouchControls();setLoadedTitle(name,files.length+' local files');msg('Checking '+files.length+' folder files…',true);
 try{
   const entries=files.map((f,index)=>({name:paths[index]||f.webkitRelativePath||f.name,get:async()=>f}));
   const names=entries.map(entry=>entry.name);
   if(isDesktopRpgMaker(names))throw new Error(desktopRpgMakerMessage);
   const rpgProject=inspectRpgMaker(names);
   if(rpgProject?.missing.length)throw new Error(rpgProject.name+' browser export is incomplete. Missing: '+rpgProject.missing.join(', ')+'. Re-export the project for Web browsers and include its complete data/ and js/ folders.');
   if(rpgProject){
    msg('Checking '+rpgProject.name+' scripts…',true);
    const missingScripts=await findMissingRpgMakerScripts(entries,rpgProject.index);
    if(loadId!==loadSequence)return;
    if(missingScripts.length)throw new Error(rpgProject.name+' export is missing scripts referenced by index.html: '+missingScripts.join(', ')+'. Re-export the complete browser project, including its js/ folder.');
    msg('Compatibility check passed — '+rpgProject.name+' browser export. Preparing to stream '+files.length+' files…',true);
   }
   if(!canSW())throw new Error('Folder mode needs this page to be opened over https or localhost (not a file:// page).');
   const streamed=await streamFrom(entries,loadId,rpgProject?.index||'');
  if(!streamed||loadId!==loadSequence)return;
  msg((rpgProject?'Compatible '+rpgProject.name+' export. ':'')+'Streaming folder ('+files.length+' files). Files are read on demand.');showStream();
 }catch(e){if(loadId===loadSequence)msg(e.message,false,'error')}
}
function show(open){
 $('code').value=html.length>1.5e6?'/* Code is large ('+Math.round(html.length/1e6)+' MB, mostly embedded title data). Use Download or Copy. */':html;
 $('dl').disabled=$('cp').disabled=!portable;
 $('ctl').hidden=!customControlsAvailable;
 $('fr').setAttribute('sandbox','allow-scripts allow-pointer-lock allow-forms allow-modals'+(open?' allow-same-origin':''));
 $('stage').style.display='block';syncPlayEmpty();activateTab('play');play();
}
let touchControlsOn=false;
function setTouchControlsActive(active){touchControlsOn=active;$('ctl').setAttribute('aria-pressed',String(active));$('ctl').classList.toggle('lp-touch-active',active);$('ctl-label').textContent=active?'Hide screen controls':'Show screen controls'}
function resetTouchControls(){setTouchControlsActive(false)}
function syncEmulatorDisplaySettings(){
 try{
  $('fr').contentWindow?.postMessage({type:'rt-display-settings',settings:displaySettings},'*');
 }catch(error){
  window.__retrotitlesLog?.('warn','Could not apply emulator display settings: '+error.message,'settings');
 }
}
document.addEventListener('visibilitychange',()=>{
 if(!activeRom)return;
 const emulator=activeEmulatorInstance();
 if(document.hidden){
  if(displaySettings.pauseOnHidden)emulator?.pause?.();
  if(displaySettings.muteOnHidden)applyGameAudioMuted(true);
 }else{
  if(displaySettings.pauseOnHidden)emulator?.resume?.();
  if(displaySettings.muteOnHidden)applyGameAudio();
 }
});
function activeEmulatorInstance(){
 if($('stage').style.display==='none')return null;
 try{
  const emulator=$('fr').contentWindow?.EJS_emulator;
  return emulator?.gameManager&&typeof emulator.changeSettingOption==='function'?emulator:null;
 }catch(error){
  window.__retrotitlesLog?.('warn','Could not access live emulator settings: '+error.message,'settings');
  return null;
 }
}
function gameMediaTargets(){
 try{return Array.from($('fr').contentDocument?.querySelectorAll('audio,video')||[])}
 catch(error){return[]}
}
function syncGameSettings(){
 const active=$('stage').style.display!=='none',emulator=activeEmulatorInstance(),media=gameMediaTargets(),ready=Boolean(emulator);
 $('game-settings-status').textContent=!active
  ?'Open a title to adjust live session settings.'
  :ready?'Shaders, VSync, FPS, and EmulatorJS volume apply live. Renderer changes require a restart.'
  :'EmulatorJS graphics settings are unavailable for this title. Audio works for standard media elements; some web titles manage their own sound.';
 $('game-shader').disabled=!ready||!emulator.config?.shaders;
 $('game-custom-shader').disabled=$('game-shader').disabled;
 $('game-renderer').disabled=!ready||!emulator.supportsWebgl2;
 $('game-vsync').disabled=!ready;$('game-fps').disabled=!ready;
 ['game-upscale-filter','game-display-scale','game-aspect-ratio','game-integer-scaling'].forEach(id=>$(id).disabled=!ready);
 $('game-vsync').checked=ready?emulator.getSettingValue?.('vsync')!=='disabled':displaySettings.vsync!==false;
 $('game-fps').checked=ready?emulator.getSettingValue?.('fps')==='show':Boolean(displaySettings.performanceOverlay);
 $('game-renderer').value=displaySettings.renderer;
 $('game-upscale-filter').value=displaySettings.upscaleFilter;
 $('game-display-scale').value=displaySettings.displayScale;
 $('game-aspect-ratio').value=displaySettings.aspectRatio;
 $('game-integer-scaling').checked=displaySettings.integerScaling;
 $('game-pause-on-hidden').checked=Boolean(displaySettings.pauseOnHidden);
 $('game-mute-on-hidden').checked=Boolean(displaySettings.muteOnHidden);
 if(activeRom){
  const system=activeRom.system,hasOverride=Object.prototype.hasOwnProperty.call(shaderOverrides,system);
  const shader=hasOverride?shaderOverrides[system]:'default';
  $('game-shader').value=Array.from($('game-shader').options).some(option=>option.value===shader)?shader:'custom';
  $('game-custom-shader').value=$('game-shader').value==='custom'&&shader!=='default'?shader:'';
 }else{
  $('game-shader').value='default';$('game-custom-shader').value='';
 }
 const mediaAudio=media.length>0,hasAudio=Boolean(ready&&typeof emulator.setVolume==='function')||mediaAudio;
 $('game-mute').disabled=!active||!hasAudio;$('game-volume').disabled=!active||!hasAudio;
 if(ready&&typeof emulator.setVolume==='function'){
  $('game-mute').checked=Boolean(emulator.muted);
  $('game-volume').value=String(Math.round((Number(emulator.volume)||0)*100));
 }else if(mediaAudio){
  $('game-mute').checked=media.every(element=>element.muted);
  $('game-volume').value=String(Math.round(media[0].volume*100));
 }else{$('game-mute').checked=false;$('game-volume').value='50'}
 $('game-audio-note').textContent=ready
  ?'Volume is applied to EmulatorJS audio and saved with its game settings.'
  :mediaAudio?'Volume controls apply to this title’s audio/video elements. Web Audio output may be controlled by the title itself.'
  :'This title does not expose host-adjustable audio controls.';
 $('game-touch-controls').disabled=!active||(!ready&&!customControlsAvailable);
 const virtualGamepad=ready?emulator.getSettingValue?.('virtual-gamepad'):null;
 $('game-touch-controls').checked=ready
  ?(virtualGamepad===null?touchControlsEnabled:virtualGamepad!=='disabled')
  :touchControlsOn;
 $('game-save-now').disabled=$('save-now').disabled;
 $('game-open-saves').disabled=$('save-manager').hidden;
}
function applyGameShader(value){
 const emulator=activeEmulatorInstance();
 if(!emulator||!activeRom)throw new Error('Live shaders are available only for a running EmulatorJS title.');
 const system=activeRom.system;
 if(value==='default')delete shaderOverrides[system];
 else shaderOverrides[system]=value;
 writeStoredValue('retrotitles-shader-overrides',JSON.stringify(shaderOverrides));
 document.querySelectorAll('[data-system-shader]').forEach(select=>{
  if(select.dataset.systemShader===system)select.value=shaderOverrides[system]||'';
 });
 emulator.changeSettingOption('shader',shaderOverrides[system]||emulatorShader);
 emulator.saveSettings?.();
}
function applyGameAudioMuted(muted){
 const emulator=activeEmulatorInstance();
 if(emulator&&typeof emulator.setVolume==='function'){
  emulator.muted=muted;
  emulator.setVolume(muted?0:(Number(emulator.volume)||0));
 }else{
  gameMediaTargets().forEach(element=>{element.muted=muted});
 }
}
function applyGameAudio(){
 const volume=Number($('game-volume').value)/100,muted=$('game-mute').checked||volume===0,emulator=activeEmulatorInstance();
 $('game-mute').checked=muted;
 try{
  if(emulator&&typeof emulator.setVolume==='function'){
   emulator.volume=volume;emulator.muted=muted;emulator.setVolume(muted?0:volume);emulator.saveSettings?.();return;
  }
  gameMediaTargets().forEach(element=>{element.volume=volume;element.muted=muted});
 }catch(error){msg('Could not update game audio: '+error.message,false,'error')}
}
function clearEmulatorRendererOverride(emulator){
 if(typeof emulator.getLocalStorageKey!=='function')return;
 const key=emulator.getLocalStorageKey();
 let saved={};
 try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}
 catch(error){throw new Error('Could not read the current EmulatorJS settings: '+error.message)}
 if(saved.settings&&typeof saved.settings==='object')delete saved.settings.webgl2Enabled;
 try{localStorage.setItem(key,JSON.stringify(saved))}
 catch(error){throw new Error('Could not clear the saved WebGL2 override: '+error.message)}
 if(emulator.settings)delete emulator.settings.webgl2Enabled;
 if(emulator.allSettings)delete emulator.allSettings.webgl2Enabled;
 emulator.saveSettings?.();
}
function updateGameRenderer(value){
 displaySettings.renderer=value;persistDisplaySettings();
 const emulator=activeEmulatorInstance();
 if(!emulator)return;
 if(value==='auto')clearEmulatorRendererOverride(emulator);
 else{
  emulator.changeSettingOption('webgl2Enabled',value==='webgl2'?'enabled':'disabled');
  emulator.saveSettings?.();
 }
 $('game-settings-status').textContent='Renderer preference saved. Restart the title to apply it.';
}
function restartCurrentGame(){
 if(!activeRom){play();return}
 const game=activeRom,loadId=++loadSequence;game.loadId=loadId;
 const page=romPage(game.source,game.system,game.title,game.streamed,game.coreId,game.biosPath);
 html=game.streamed?addCtl(page,false):page;
 play();
}
function play(){
 resetTouchControls();
 const f=$('fr');
 f.onload=()=>{
  if(customControlsAvailable){
   const showControls=touchControlsEnabled&&hasTouchInput();
   setTouchControlsActive(showControls);f.contentWindow.postMessage(showControls?'gr-show':'gr-hide','*');
  }
  syncEmulatorDisplaySettings();
  syncGameSettings();
 };
 if(streamUrl&&!html){f.removeAttribute('srcdoc');f.src='about:blank';setTimeout(()=>f.src=streamUrl,60)}else{f.removeAttribute('src');f.srcdoc=html}
}
$('game-settings-open').addEventListener('click',()=>{syncGameSettings();$('game-settings-dialog').showModal()});
$('game-shader').addEventListener('change',()=>{
 if($('game-shader').value==='custom'){$('game-custom-shader').focus();return}
 try{applyGameShader($('game-shader').value)}catch(error){msg('Could not apply the game shader: '+error.message,false,'error')}
});
$('game-custom-shader').addEventListener('change',()=>{
 const shader=$('game-custom-shader').value.trim();
 try{applyGameShader(shader||'default')}catch(error){msg('Could not apply the game shader: '+error.message,false,'error')}
});
$('game-vsync').addEventListener('change',()=>{
 displaySettings.vsync=$('game-vsync').checked;persistDisplaySettings();$('vsync-setting').checked=displaySettings.vsync;
 try{activeEmulatorInstance()?.changeSettingOption('vsync',displaySettings.vsync?'enabled':'disabled')}catch(error){msg('Could not update VSync: '+error.message,false,'error')}
});
$('game-fps').addEventListener('change',()=>{
 displaySettings.performanceOverlay=$('game-fps').checked;persistDisplaySettings();$('performance-overlay').checked=displaySettings.performanceOverlay;
 try{activeEmulatorInstance()?.changeSettingOption('fps',displaySettings.performanceOverlay?'show':'hide')}catch(error){msg('Could not update the FPS overlay: '+error.message,false,'error')}
});
$('game-upscale-filter').addEventListener('change',()=>{
 displaySettings.upscaleFilter=$('game-upscale-filter').value;$('upscale-filter').value=displaySettings.upscaleFilter;persistDisplaySettings();syncEmulatorDisplaySettings();
});
$('game-display-scale').addEventListener('change',()=>{
 displaySettings.displayScale=$('game-display-scale').value;$('display-scale').value=displaySettings.displayScale;displaySettings.integerScaling=displaySettings.displayScale==='integer';$('integer-scaling').checked=displaySettings.integerScaling;$('game-integer-scaling').checked=displaySettings.integerScaling;persistDisplaySettings();syncEmulatorDisplaySettings();
});
$('game-aspect-ratio').addEventListener('change',()=>{
 displaySettings.aspectRatio=$('game-aspect-ratio').value;$('aspect-ratio').value=displaySettings.aspectRatio;persistDisplaySettings();syncEmulatorDisplaySettings();
});
$('game-integer-scaling').addEventListener('change',()=>{
 displaySettings.integerScaling=$('game-integer-scaling').checked;$('integer-scaling').checked=displaySettings.integerScaling;if(displaySettings.integerScaling)displaySettings.displayScale='integer';else if(displaySettings.displayScale==='integer')displaySettings.displayScale='fit';$('display-scale').value=displaySettings.displayScale;$('game-display-scale').value=displaySettings.displayScale;persistDisplaySettings();syncEmulatorDisplaySettings();
});
$('game-pause-on-hidden').addEventListener('change',()=>{
 displaySettings.pauseOnHidden=$('game-pause-on-hidden').checked;$('pause-on-hidden').checked=displaySettings.pauseOnHidden;persistDisplaySettings();
});
$('game-mute-on-hidden').addEventListener('change',()=>{
 displaySettings.muteOnHidden=$('game-mute-on-hidden').checked;$('mute-on-hidden').checked=displaySettings.muteOnHidden;persistDisplaySettings();
});
$('game-renderer').addEventListener('change',()=>{
 try{updateGameRenderer($('game-renderer').value)}catch(error){msg('Could not update the renderer preference: '+error.message,false,'error')}
});
$('game-mute').addEventListener('change',()=>{
 if(!$('game-mute').checked&&Number($('game-volume').value)===0)$('game-volume').value='50';
 applyGameAudio();
});
$('game-volume').addEventListener('input',()=>{
 if(Number($('game-volume').value)>0)$('game-mute').checked=false;
 applyGameAudio();
});
$('game-touch-controls').addEventListener('change',()=>setTouchControlsPreference($('game-touch-controls').checked));
$('game-controls-link').addEventListener('click',()=>{
 $('game-settings-dialog').close();
 if(activeGameRecord)window.__retrotitlesOpenControls(activeGameRecord);
 else{controlsRecord=null;controlsSystem=activeRom?.system||'default';renderKeyboardMappings();activateTab('controls')}
});
$('game-save-now').addEventListener('click',()=>$('save-now').click());
$('game-open-saves').addEventListener('click',()=>{
 $('game-settings-dialog').close();$('save-manager').scrollIntoView({behavior:'smooth',block:'start'});
});
window.addEventListener('message',event=>{
 if(event.source===$('fr').contentWindow&&event.data?.type==='rt-emulator-ready')syncGameSettings();
});
$('fr').addEventListener('load',syncGameSettings);
let softFullscreen=false,fullscreenScrollY=0;
const hasNativeFullscreen=()=>Boolean(document.fullscreenElement||document.webkitFullscreenElement);
function syncFullscreenControls(){const active=softFullscreen||hasNativeFullscreen();$('fs').setAttribute('aria-pressed',String(active));$('fs-label').textContent=active?'Exit fullscreen':'Fullscreen'}
function setSoftFullscreen(active){
 softFullscreen=active;
 $('stage').classList.toggle('lp-fullscreen-active',active);
 $('player').classList.toggle('lp-soft-fullscreen',active);
 document.documentElement.classList.toggle('lp-fullscreen-lock',active);
 document.body.classList.toggle('lp-fullscreen-lock',active);
 if(!active)window.scrollTo(0,fullscreenScrollY);
 syncFullscreenControls();
}
async function exitFullscreen(){
 if(softFullscreen)setSoftFullscreen(false);
 try{
  if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();
  else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();
 }catch(e){}
 syncFullscreenControls();
 $('fs').focus();
}
async function enterFullscreen(){
 const player=$('player'),request=player.requestFullscreen||player.webkitRequestFullscreen;
 if(request){
  try{await request.call(player);if(hasNativeFullscreen()){syncFullscreenControls();return}}catch(e){}
 }
 fullscreenScrollY=window.scrollY||window.pageYOffset||0;
 setSoftFullscreen(true);
 $('fs-exit').focus();
}
async function toggleFullscreen(){if(softFullscreen||hasNativeFullscreen())await exitFullscreen();else await enterFullscreen()}
document.addEventListener('fullscreenchange',syncFullscreenControls);
document.addEventListener('webkitfullscreenchange',syncFullscreenControls);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&softFullscreen){e.preventDefault();exitFullscreen()}});

function showIsolationWarning(system){
 const button=$('copy-diagnostic');
 button.hidden=true;button.onclick=null;
 if(window.crossOriginIsolated||!requiresSharedArrayBuffer(system))return;
 const diagnostic='System: '+system+'\nURL: '+location.href+'\nHTTPS secure context: '+window.isSecureContext+'\ncrossOriginIsolated: '+Boolean(window.crossOriginIsolated)+'\nSharedArrayBuffer: '+(typeof SharedArrayBuffer==='function')+'\nRequired response headers: Cross-Origin-Opener-Policy: same-origin; Cross-Origin-Embedder-Policy: require-corp';
 msg('Warning: '+system+' needs SharedArrayBuffer. Use HTTPS with COOP/COEP headers; launch will continue, but the core may not start.',false,'warn');
 button.hidden=false;
 button.onclick=async()=>{
  try{await navigator.clipboard.writeText(diagnostic);msg('Copied the cross-origin isolation diagnostic.')}
  catch(error){window.__retrotitlesLog?.('warn','Could not copy the isolation diagnostic: '+error.message,'runtime');msg('Copy was blocked. Open Console for the diagnostic details.',false,'warn')}
 };
 window.__retrotitlesLog?.('warn',diagnostic,'runtime');
}
async function openArchiveGame(entries,selectedCore,loadId){
 let games=entries.filter(entry=>{
  const extension=entry.name.split('.').pop().toLowerCase();
  return selectedCore?CORES[extension]===selectedCore||(selectedCore==='dos'&&['exe','com','bat'].includes(extension))||['bin','cue','chd','iso'].includes(extension):Boolean(CORES[extension]);
 });
 if(selectedCore&&games.some(entry=>entry.name.toLowerCase().endsWith('.cue')))games=games.filter(entry=>entry.name.toLowerCase().endsWith('.cue'));
 if(!games.length)return false;
 if(games.length>1){
  msg('This archive contains multiple ROM candidates. Create a ZIP with only the game you want to open, or open a single ROM file directly.',false,'warn');
  return true;
 }
 if(loadId!==loadSequence)return true;
 const entry=games[0];
 if(selectedCore&&canSW()){
  if(!await streamRomArchive(entries,entry,loadId)||loadId!==loadSequence)return true;
  html=addCtl(await prepareRom(streamUrl,selectedCore,entry.name.split('/').pop(),true,loadId),false);
  if(loadId!==loadSequence)return true;
  portable=false;
  msg('Streaming '+entry.name+' from the archive. Related files load on demand.');
  showIsolationWarning(selectedCore);showStream(false,html);
  return true;
 }
 const blob=await entry.get(),gameFile=new File([blob],entry.name.split('/').pop(),{type:blob.type||'application/octet-stream'});
 await load(gameFile,{ingested:true});
 return true;
}
async function load(file,{ingested=false,source='picker',record=null,systemOverride=''}={}){
 if(!file)return;
 const ext=file.name.split('.').pop().toLowerCase(),selectedCore=systemOverride||$('core-select').value||CORES[ext];
 if(ext==='7z')throw new Error('7z archives are not supported. Extract this archive on your device, then open a supported file or folder.');
 if(!selectedCore&&ext==='exe')throw new Error('Native Windows .exe files cannot run in this browser. If this is a DOS program, use Try DOS in Files or Library; otherwise run the Windows version on a desktop.');
 if(!selectedCore&&['rgssad','rgss3a'].includes(ext))throw new Error(desktopRpgMakerMessage);
 activeControlScope=record?'game:'+record.id:selectedCore||'default';
 const titleName=file.name.replace(/\.[^.]+$/,'')||'Local title';
 const arcadeRomZip=ext==='zip'&&['arcade','mame'].includes(selectedCore);
 const archiveZip=ext==='zip'&&!selectedCore;
 if(activeReader)activeReader.cancel().catch(()=>{});
 const loadId=++loadSequence;
 if(!ingested)await window.__retrotitlesIngestFiles([file],{source,onProgress:reportIngestProgress});
 if(loadId!==loadSequence)return;
 customControlsAvailable=!selectedCore;
 const titleType=selectedCore?'EmulatorJS '+selectedCore+' title':({zip:'ZIP archive',rar:'RAR archive',html:'HTML title',htm:'HTML title',js:'JavaScript title',py:'Python title',swf:'Flash title',rpgmvp:'RPG Maker asset',rpgmvo:'RPG Maker asset',rpgmvm:'RPG Maker asset',rpgm:'RPG Maker asset',exe:'Desktop package',rgssad:'Desktop RPG Maker package',rgss3a:'Desktop RPG Maker package'})[ext]||'local file';
 const readStage=stage=>stage;
 cleanupGame();activeGameRecord=record;
 $('copy-diagnostic').hidden=true;
 $('runtime-help').hidden=!Boolean(selectedCore);$('save-manager').hidden=!Boolean(selectedCore&&window.indexedDB);
 $('stage').style.display='none';resetTouchControls();name=titleName;setLoadedTitle(name,sizeLabel(file.size));portable=true;streamUrl=null;msg('Compatibility check — '+titleType+': '+file.name,true);
 try{
  let open=false,ctl=true,entries=null,loadedHtml='';
   if(ext==='zip'&&!arcadeRomZip){
    msg('Inspecting ZIP contents…',true);
    entries=await zipEntries(file);
   if(loadId!==loadSequence)return;
    if(selectedCore){
     if(await openArchiveGame(entries,selectedCore,loadId))return;
     msg('No supported '+selectedCore+' ROM was found in this ZIP. Check the selected system and archive contents.',false,'warn');
     return;
    }
    const rpgProject=inspectRpgMaker(entries.map(entry=>entry.name));
    if(isDesktopRpgMaker(entries.map(entry=>entry.name)))throw new Error(desktopRpgMakerMessage);
    if(rpgProject?.missing.length)throw new Error(rpgProject.name+' browser export is incomplete. Missing: '+rpgProject.missing.join(', ')+'. Re-export the project for Web browsers and include its complete data/ and js/ folders.');
    if(rpgProject){
     msg('Checking '+rpgProject.name+' scripts…',true);
     const missingScripts=await findMissingRpgMakerScripts(entries,rpgProject.index);
     if(loadId!==loadSequence)return;
     if(missingScripts.length)throw new Error(rpgProject.name+' export is missing scripts referenced by index.html: '+missingScripts.join(', ')+'. Re-export the complete browser project, including its js/ folder.');
     if(!canSW())throw new Error('RPG Maker MV/MZ browser projects need folder streaming. Open this page over HTTPS or localhost and load the project folder or ZIP.');
     msg('Compatibility check passed — '+rpgProject.name+' browser export. Preparing to stream '+entries.length+' files…',true);
     const streamed=await streamFrom(entries,loadId,rpgProject.index);
     if(!streamed||loadId!==loadSequence)return;
     msg('Compatible '+rpgProject.name+' export. Streaming '+file.name+'; project files load on demand.');
     showStream();return;
    }
    if(!findStreamIndex(entries.map(entry=>entry.name))&&await openArchiveGame(entries,selectedCore,loadId))return;
   }
   if(archiveZip){
    if(!entries)entries=await zipEntries(file);
    if(loadId!==loadSequence)return;
   const engine=engineWebExport(entries);
   const streamIndex=engine?.index||findStreamIndex(entries.map(entry=>entry.name));
   if(!streamIndex){
    const ambiguous=entries.map(entry=>entry.name.split('.').pop().toLowerCase()).filter(extension=>['bin','cue','chd','iso','tap','dsk'].includes(extension));
    if(ambiguous.length)msg('Could not identify the ROM system in this ZIP. Set Default system in Settings, then load the ZIP again.',false,'warn');
    else msg('No browser start page was found in this ZIP. Select a system manually for a ROM archive, or choose a ZIP containing a browser game.',false,'warn');
    return;
   }
   const moduleBuild=await zipRequiresStreaming(entries,streamIndex);
   if(loadId!==loadSequence)return;
   if(engine||moduleBuild){
    const buildName=engine?.name||'JavaScript module';
    if(!canSW())throw new Error(buildName+' builds need streaming. Open this page over HTTPS or localhost.');
    const streamed=await streamFrom(entries,loadId,streamIndex);
    if(!streamed||loadId!==loadSequence)return;
    msg('Streaming '+buildName+' build from '+file.name+'. Keep this page open while playing.');showStream();return;
   }
  }
  if(selectedCore&&canSW()){
   if(!await streamLocalFile(file,loadId)||loadId!==loadSequence)return;
   html=addCtl(await prepareRom(streamUrl,selectedCore,titleName,true,loadId),false);if(loadId!==loadSequence)return;portable=false;
   msg('Local file ready ('+sizeLabel(file.size)+'). The browser serves it on demand; the emulator may still need to load the title into memory.');showIsolationWarning(selectedCore);showStream(false,html);return;
  }
  if(selectedCore&&file.size>=STREAM_THRESHOLD){
   throw new Error('Streaming large emulator files needs this page opened over HTTPS or localhost.');
  }
  if(ext==='swf'&&file.size>=STREAM_THRESHOLD){
   if(!await streamLocalFile(file,loadId)||loadId!==loadSequence)return;
   html=addCtl(swfPage(streamUrl,true),true,activeControlScope,record?.system||selectedCore||'default');portable=false;
   msg('Local file ready ('+sizeLabel(file.size)+'), served in chunks.');showStream(true,html);return;
  }
  if(archiveZip&&file.size>=STREAM_THRESHOLD){
   if(!canSW())throw new Error('This large ZIP needs streaming. Open this page over HTTPS or localhost; a single-file export would use too much memory.');
   const streamed=await tryStream(file,loadId,entries);
   if(loadId!==loadSequence)return;
   if(!streamed)throw new Error('Could not start streaming this ZIP. Open the page over HTTPS or localhost and try again.');
   msg('Streaming '+file.name+'. Files are unpacked only when the title asks for them.');showStream();return;
  }
  if(ext==='rar'&&file.size>=STREAM_THRESHOLD)throw new Error('Large RAR extraction needs the whole archive in memory. Extract it on your device and use Folder mode, or use a ZIP archive.');
  if(archiveZip&&!$('sf').checked){
   const streamed=await tryStream(file,loadId,entries);
   if(loadId!==loadSequence)return;
   if(streamed){msg('Streaming '+file.name+'. Files are unpacked only when the title asks for them.');showStream();return;}
  }
  if(archiveZip){loadedHtml=await fromZip(await readFileBuffer(file,loadId,readStage('Reading ZIP archive')),loadId);open=!portable;}
  else if(ext==='rar'){
   const archiveBuffer=await readFileBuffer(file,loadId,readStage('Reading RAR archive')),rarEntries=await extractRarEntries(archiveBuffer,loadId);
   if(await openArchiveGame(rarEntries,selectedCore,loadId))return;
   if(!findStreamIndex(rarEntries.map(entry=>entry.name))){msg('No supported ROM or browser project was found in this RAR archive.',false,'warn');return}
   const rarFiles={};
   for(const entry of rarEntries){const blob=await entry.get(),bytes=new Uint8Array(await blob.arrayBuffer());rarFiles[entry.name]={name:entry.name,async:type=>type==='string'?new TextDecoder().decode(bytes):type==='base64'?b64(bytes):bytes.slice().buffer}}
   loadedHtml=await build({files:rarFiles},loadId);open=!portable;
  }
  else if(ext==='js')loadedHtml=wrapJS(await readFileText(file,loadId,readStage('Reading JavaScript title')));
  else if(ext==='html'||ext==='htm')loadedHtml=await readFileText(file,loadId,readStage('Reading HTML title'));
  else if(ext==='swf')loadedHtml=swfPage(b64(await readFileBuffer(file,loadId,readStage('Reading SWF title'))));
  else if(ext==='py'){loadedHtml=pyPage(await readFileText(file,loadId,readStage('Reading Python title')));open=true;}
   else if(['rpgmvp','rpgmvo','rpgmvm','rpgm'].includes(ext))throw new Error('This is a single RPG Maker asset, not a complete project. Open the exported MV/MZ folder or ZIP containing index.html, data/System.json, and js/rpg_core.js or js/rmmz_core.js.');
  else if(selectedCore){loadedHtml=await prepareRom(b64(await readFileBuffer(file,loadId,readStage('Reading emulator title'))),selectedCore,titleName,false,loadId);open=true;}
  else if(['bin','cue','chd','iso','tap','dsk'].includes(ext))throw new Error('Could not identify the system from the .'+ext+' extension. Choose its system in Settings > Emulation and try again.');
  else throw new Error('Unsupported file type: .'+ext);
  if(loadId!==loadSequence)return;
  html=loadedHtml;
  if(ctl)html=addCtl(html,!selectedCore,activeControlScope,record?.system||selectedCore||'default');$('ctl').hidden=!customControlsAvailable;
  msg('Ready: '+titleType+' — '+file.name+(portable?'':' (This build can\u2019t be exported as a single file; host the original folder instead)'));
  if(selectedCore)showIsolationWarning(selectedCore);
  show(open);
 }catch(e){if(loadId===loadSequence)msg(e.message,false,'error')}
}
$('drop').onclick=e=>{if(e.target!==$('f'))$('f').click()};
async function ingestAndLoad(file,source){
 try{
  await load(file,{source});
 }catch(error){msg('Could not add or open '+file.name+': '+error.message,false,'error')}
}
$('f').onchange=e=>{const file=e.target.files[0];e.target.value='';if(file)ingestAndLoad(file,'picker')};
$('fb').onclick=()=>$('fd').click();
$('fd').onchange=e=>{
 const files=Array.from(e.target.files),paths=files.map(file=>file.webkitRelativePath||file.name);e.target.value='';
 if(!files.length)return;
 const loadId=++loadSequence;
 window.__retrotitlesIngestFiles(files,{source:'folder',onProgress:reportIngestProgress}).then(()=>{if(loadId===loadSequence)loadFolder(files,paths,loadId)}).catch(error=>msg('Could not add folder files: '+error.message,false,'error'));
};
$('drop').ondragover=e=>{e.preventDefault();$('drop').classList.add('is-over')};
$('drop').ondragleave=()=>$('drop').classList.remove('is-over');
$('drop').ondrop=async e=>{
 e.preventDefault();$('drop').classList.remove('is-over');
 try{
  msg('Scanning dropped files…',true,'info',{done:0,total:0},false);
  let lastScanUpdate=0;
  const items=await filesFromDrop(e.dataTransfer,count=>{
   const now=performance.now();
   if(now-lastScanUpdate<120)return;
   lastScanUpdate=now;
   msg('Scanning dropped files — '+count+' found…',true,'info',{done:count,total:0},false);
  }),files=items.map(item=>item.file),paths=items.map(item=>item.path);
  msg('Found '+files.length+' file'+(files.length===1?'':'s')+'. Preparing local files…',true,'info',{done:0,total:0},false);
  if(!files.length){msg('No files were found in that drop.');return}
  if(files.length>1){
   if(paths.some(path=>path.includes('/'))){
    const loadId=++loadSequence;
    await window.__retrotitlesIngestFiles(items,{source:'drag-drop',onProgress:reportIngestProgress});
    if(loadId===loadSequence)await loadFolder(files,paths,loadId);
   }else{
    await window.__retrotitlesIngestFiles(items,{source:'drag-drop',onProgress:reportIngestProgress});
    msg('Added '+files.length+' files to the unified file view.');
   }
   return;
  }
  const file=files[0];
  if(paths[0]&&paths[0].includes('/')){
   const loadId=++loadSequence;
   await window.__retrotitlesIngestFiles(items,{source:'drag-drop',onProgress:reportIngestProgress});
   if(loadId===loadSequence)await loadFolder(files,paths,loadId);
  }
  else await load(file,{source:'drag-drop'});
 }catch(error){msg('Could not add dropped files: '+error.message,false,'error')}
};
window.addEventListener('message',event=>{
 if(event.source===$('fr').contentWindow&&event.data?.type==='rt-controls-save'){
  const {scope,mapping}=event.data;
  if(scope!==activeControlScope||!mapping||typeof mapping!=='object'||Array.isArray(mapping))return;
  const safeMapping={};
  for(const [action,key] of controlActions){
   if(typeof mapping[action]==='string'&&controlKeyNames.includes(mapping[action]))safeMapping[action]=mapping[action];
  }
  controlMappings[scope]=safeMapping;
  if(writeStoredValue('retrotitles-control-mappings',JSON.stringify(controlMappings))){
   if(!controlsRecord)msg('Saved in-game keyboard mappings.');
   if($('tab-controls').getAttribute('aria-selected')==='true'&&controlScope()===scope)renderKeyboardMappings();
  }
  return;
 }
 if(event.source!==$('fr').contentWindow||event.data?.type!=='rt-emulator-failed'||!activeRom||event.data.runId!==activeRom.loadId)return;
 const current=activeRom.cores.indexOf(activeRom.coreId),alternate=activeRom.cores[current+1];
 if(alternate){
  msg('Retrying with alternate core…',false,'warn');
  activeRom.coreId=alternate;
  const page=romPage(activeRom.source,activeRom.system,activeRom.title,activeRom.streamed,alternate,activeRom.biosPath);
  html=activeRom.streamed?addCtl(page,false):page;
  if(activeRom.streamed)showStream(false,html);else show(true);
  return;
 }
 const failure='This file may be corrupted or for a different system. Try selecting the system manually. It may also be a bad dump, missing BIOS, or unsupported format.';
 window.__retrotitlesLog?.('error','All available cores failed for '+activeRom.system+': '+(event.data.reason||'Unknown emulator error'),'runtime');
 msg(failure,false,'error');$('core-select').focus();
});
$('run').onclick=restartCurrentGame;
$('delete-all-data').addEventListener('click',clearAllLocalData);
$('close-game').onclick=()=>{cleanupGame();resetTouchControls();$('title-name').textContent='Local title';$('title-size').textContent='';msg('Closed the current title.')};
$('load-cancel').onclick=cancelCurrentLoad;
$('ctl').onclick=()=>{setTouchControlsActive(!touchControlsOn);try{$('fr').contentWindow.postMessage('gr-toggle','*')}catch(e){}};
$('fs').onclick=toggleFullscreen;
$('fs-exit').onclick=exitFullscreen;
$('dl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=name+'-runnable.html';a.click()};
$('cp').onclick=async()=>{try{await navigator.clipboard.writeText(html);msg('Copied to clipboard.')}catch(e){msg('Copy blocked by the browser. Use Download instead.',false,'warn')}};
