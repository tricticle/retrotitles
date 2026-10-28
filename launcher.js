const $=id=>document.getElementById(id);let html='',name='Title',portable=true;
const {inspectRpgMaker,isDesktopRpgMaker,findStreamIndex,findMissingRpgMakerScripts}=window.__retrotitlesCompatibility;
let runtimePreference=null;
try{runtimePreference=localStorage.getItem('retrotitles-local-runtimes');if(runtimePreference!==null)$('local-runtime').checked=runtimePreference==='true'}catch(e){}
$('runtime-note').hidden=!$('local-runtime').checked;
$('local-runtime').onchange=()=>{$('runtime-note').hidden=!runtimeIsLocal();runtimePreference=String(runtimeIsLocal());try{localStorage.setItem('retrotitles-local-runtimes',runtimePreference)}catch(e){}};
let busyWarningTimer=null;
const msg=(text,busy=false,level='info',progress=null)=>{
 const output=$('msg'),textOutput=$('msg-text'),bar=$('load-progress');
 textOutput.textContent=text;output.setAttribute('aria-busy',String(busy));output.classList.toggle('is-visible',Boolean(text)||busy);
 bar.hidden=!busy;
 if(busy&&progress&&Number.isFinite(progress.total)&&progress.total>0)bar.value=Math.min(100,progress.done/progress.total*100);
 else bar.removeAttribute('value');
 $('load-cancel').hidden=!busy;
 if(!progress)window.__retrotitlesLog?.(level,text,'app');
 if(busyWarningTimer)clearTimeout(busyWarningTimer);
 if(busy)busyWarningTimer=setTimeout(()=>{
  if(output.getAttribute('aria-busy')!=='true')return;
  const warning='Still processing after 90 seconds. Large files can take time; open Console to inspect errors.';
  textOutput.textContent=warning;window.__retrotitlesLog?.('warn',warning,'app');
 },90000);
};
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
 d64:'c64',d71:'c64',d80:'c64',d81:'c64',d82:'c64',g64:'c64',g41:'c64',x64:'c64',nib:'c64',d2m:'c64',d4m:'c64',t64:'c64',tap:'c64',tcrt:'c64',prg:'c64',p00:'c64',crt:'c64',cmd:'c64',vfl:'c64',vsf:'c64',
 dsk:'cap32',sna:'cap32',cdt:'cap32',cpr:'cap32',voc:'cap32',kcr:'crocods',
 p:'81',z80:'fuse',rzx:'fuse',scl:'fuse',trd:'fuse',wad:'prboom',iwad:'prboom',pwad:'prboom',
 cso:'psp',prx:'psp',elf:'psp',conf:'dos'
};
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

const swfPage=(source,streamed=false)=>{const local=runtimeIsLocal(),runtime=local?'runtime/ruffle/ruffle.js':'https://unpkg.com/@ruffle-rs/ruffle',failure=local?'Missing local Ruffle runtime at '+runtime:'Could not load Ruffle from the CDN.';return HEAD+'<style>html,body{margin:0;height:100%;background:#000}#c{width:100%;height:100%}</style><script src="'+runtime+'" onerror=\'document.addEventListener("DOMContentLoaded",()=>{document.body.textContent='+JSON.stringify(failure)+'})\'><\/script></head><body><div id="c"></div><script>\naddEventListener("load",()=>{const p=RufflePlayer.newest().createPlayer();p.style.cssText="width:100%;height:100%";document.getElementById("c").appendChild(p);p.ruffle().load('+ (streamed?'{url:'+JSON.stringify(source)+'}':'{data:Uint8Array.from(atob('+JSON.stringify(source)+'),c=>c.charCodeAt(0))}') +')});\n<\/script></body></html>'};

const romPage=(source,core,n,streamed=false)=>{const local=runtimeIsLocal(),root=local?'runtime/emulatorjs/data/':'https://cdn.emulatorjs.net/stable/data/',failure=local?'Missing local EmulatorJS runtime at '+root+'loader.js':'Could not load EmulatorJS from the CDN.';return HEAD+'<style>html,body{margin:0;height:100%;background:#000}#game{width:100%;height:100%}</style></head><body><div id="game"></div><script>\nEJS_player="#game";EJS_core='+JSON.stringify(core)+';EJS_gameName='+JSON.stringify(n)+';EJS_pathtodata='+JSON.stringify(root)+';EJS_startOnLoaded=true;EJS_gameUrl='+JSON.stringify(streamed?source:'data:application/octet-stream;base64,'+source)+';EJS_ready=function(){parent.postMessage({type:"rt-emulator-ready"},"*")};\n<\/script><script src="'+root+'loader.js" onerror=\'document.getElementById("game").textContent='+JSON.stringify(failure)+'\'><\/script></body></html>'};

const pyPage=code=>{const local=runtimeIsLocal(),runtime=local?'runtime/pyodide/pyodide.js':'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',failure=local?'Missing local Pyodide runtime at '+runtime:'Could not load Pyodide from the CDN.';return HEAD+'<style>html,body{margin:0;background:#111;color:#ddd;font:13px ui-monospace,monospace}canvas{display:block;margin:0 auto;max-width:100%;background:#000}pre{margin:8px;white-space:pre-wrap}</style><script src="'+runtime+'" onerror=\'document.addEventListener("DOMContentLoaded",()=>{document.getElementById("o").textContent='+JSON.stringify(failure)+'})\'><\/script></head><body><canvas id="cv" width="800" height="600"></canvas><pre id="o">Loading Python…\n</pre><script>\nconst CODE='+JSON.stringify(code).replace(/</g,'\\u003c')+';\n(async()=>{const o=document.getElementById("o");const w=t=>o.textContent+=t+"\\n";try{const py=await loadPyodide({stdout:w,stderr:w});py.canvas.setCanvas2D(document.getElementById("cv"));await py.loadPackagesFromImports(CODE);o.textContent="";await py.runPythonAsync(CODE)}catch(e){w(String(e))}})();\n<\/script></body></html>'};

const norm=p=>{const o=[];p.split('/').forEach(s=>{if(s==='..')o.pop();else if(s&&s!=='.')o.push(s)});return o.join('/')};
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',webp:'image/webp',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm',wasm:'application/wasm',m4a:'audio/mp4',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',txt:'text/plain',xml:'application/xml',mjs:'text/javascript',js:'text/javascript',json:'application/json',css:'text/css',html:'text/html'};
const mimeOf=n=>MIME[n.split('.').pop().toLowerCase()]||'application/octet-stream';

async function fromRar(buf,loadId){
 let ex;const files={};
 try{
  ex=await window.__createRar({data:new Uint8Array(buf),wasmBinary:Uint8Array.from(atob(window.__RARW),c=>c.charCodeAt(0))});
  const extracted=ex.extract().files;
  for(let i=0;i<extracted.length;i++){
   if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
   const f=extracted[i];
   if(f.extraction){const u=f.extraction,n=f.fileHeader.name.replace(/\\/g,'/');files[n]={name:n,async:async t=>t==='string'?new TextDecoder().decode(u):t==='base64'?b64(u):u.slice().buffer}}
   if(i===extracted.length-1||i%25===0){
    msg('Extracting RAR files — '+(i+1)+' of '+extracted.length,true,'info',{done:i+1,total:extracted.length});
    await new Promise(resolve=>setTimeout(resolve,0));
   }}
 }catch(e){if(e.name==='AbortError')throw e;throw new Error(/password/i.test(String(e&&e.message||e))?'This RAR is password protected.':'Could not read this RAR file ('+(e&&e.message||e)+').')}
 return build({files},loadId);
}
let zipScriptPromise;
async function ensureJSZip(){
 if(window.JSZip)return;
 if(!zipScriptPromise)zipScriptPromise=new Promise((resolve,reject)=>{
  const local=runtimeIsLocal(),script=document.createElement('script');
  const src=local?'jszip.min.js':'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const timer=setTimeout(()=>{zipScriptPromise=null;script.remove();reject(new Error('ZIP support did not load within 20 seconds. Check the Console tab for details.'))},20000);
  script.src=src;
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
  for(const n of files){const rel=n.slice(base.length);const blob=new Blob([await z.files[n].async('arraybuffer')],{type:mimeOf(n)});out=out.split(rel).join(URL.createObjectURL(blob))}
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

const CTRL_FN=function(){
 if(window.__grcLoader)return;window.__grcLoader=1;
 function createControls(){
 if(window.__grc)return;window.__grc=1;
 var SP={ArrowUp:[38,'ArrowUp','ArrowUp'],ArrowDown:[40,'ArrowDown','ArrowDown'],ArrowLeft:[37,'ArrowLeft','ArrowLeft'],ArrowRight:[39,'ArrowRight','ArrowRight'],Space:[32,'Space',' '],Enter:[13,'Enter','Enter'],Shift:[16,'ShiftLeft','Shift'],Control:[17,'ControlLeft','Control'],Escape:[27,'Escape','Escape'],Tab:[9,'Tab','Tab']};
 var NAMES=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','W','A','S','D','Space','Enter','Shift','Control','Escape','Tab','Z','X','C','V','E','Q','F','R','1','2','3','4'];
 var ACT=[['up','Up'],['down','Down'],['left','Left'],['right','Right'],['a','A'],['b','B'],['x','X'],['y','Y'],['start','Start']];
 var DEF={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',a:'Space',b:'Z',x:'X',y:'C',start:'Enter'};
 var map={},k;for(k in DEF)map[k]=DEF[k];
 try{var sv=JSON.parse(localStorage.getItem('gr-keys'));if(sv)for(k in sv)if(map[k]&&NAMES.indexOf(sv[k])>-1)map[k]=sv[k]}catch(e){}
 function save(){try{localStorage.setItem('gr-keys',JSON.stringify(map))}catch(e){}}
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
 vis(true);
 }
 addEventListener('message',function(e){
  if(e.data!=='gr-toggle')return;
  if(!window.__grc){createControls();return}
  var root=document.getElementById('grc');if(root&&root.__grToggle)root.__grToggle();
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
const addCtl=h=>{
 const diagnostics='<script>('+PLAYER_LOG_FN.toString()+')()<\/script>';
 const controls='<script>('+CTRL_FN.toString()+')()<\/script>';
 let page=h,head=/<head[^>]*>/i.exec(page);
 if(head)page=page.slice(0,head.index+head[0].length)+diagnostics+page.slice(head.index+head[0].length);
 else page=diagnostics+page;
 let i=-1,m;const re=/<\/body>/gi;while((m=re.exec(page)))i=m.index;
 return i<0?page+controls:page.slice(0,i)+controls+page.slice(i);
};


let streamUrl=null,provider=null,providerId=null,loadSequence=0,activeReader=null;
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
function cancelCurrentLoad(){
 if($('load-cancel').hidden)return;
 loadSequence++;
 const reader=activeReader;activeReader=null;
 if(reader)reader.cancel().catch(error=>window.__retrotitlesLog?.('warn','Could not stop the file reader: '+error.message,'app'));
 msg('Load canceled. Choose the file again to retry.');
}
function setLoadedTitle(title,size=''){$('title-name').textContent=title||'Local title';$('title-size').textContent=size}
const LIBRARY_DB='retrotitles-library';
let libraryDbPromise;
const canUseLibrary=()=>Boolean(window.showOpenFilePicker&&window.indexedDB);
function openLibraryDb(){
 if(!libraryDbPromise)libraryDbPromise=new Promise((resolve,reject)=>{
  const request=window.indexedDB.open(LIBRARY_DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('titles',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
 return libraryDbPromise;
}
async function getLibraryEntries(){
 const db=await openLibraryDb();
 return new Promise((resolve,reject)=>{
  const request=db.transaction('titles','readonly').objectStore('titles').getAll();
  request.onsuccess=()=>resolve(request.result.sort((a,b)=>a.name.localeCompare(b.name)));
  request.onerror=()=>reject(request.error);
 });
}
async function storeLibraryHandle(handle){
 const entries=await getLibraryEntries();
 let existing;
 for(const entry of entries){if(await entry.handle.isSameEntry(handle)){existing=entry;break}}
 const record={id:existing?.id||crypto.randomUUID(),name:handle.name,handle,addedAt:existing?.addedAt||Date.now()};
 const db=await openLibraryDb();
 await new Promise((resolve,reject)=>{
  const request=db.transaction('titles','readwrite').objectStore('titles').put(record);
  request.onsuccess=resolve;request.onerror=()=>reject(request.error);
 });
 try{await navigator.storage?.persist?.()}catch(e){}
}
async function deleteLibraryEntry(id){
 const db=await openLibraryDb();
 await new Promise((resolve,reject)=>{
  const request=db.transaction('titles','readwrite').objectStore('titles').delete(id);
  request.onsuccess=resolve;request.onerror=()=>reject(request.error);
 });
 await renderLibrary();
}
async function openLibraryEntry(entry){
 try{
  let permission=await entry.handle.queryPermission({mode:'read'});
  if(permission!=='granted')permission=await entry.handle.requestPermission({mode:'read'});
  if(permission!=='granted')throw new Error('Read access was not granted.');
  const file=await entry.handle.getFile();
  msg('Opening '+entry.name+'…');
  await load(file);
  }catch(error){msg('Could not reopen '+entry.name+': '+error.message,false,'error')}
}
async function renderLibrary(){
 if(!canUseLibrary())return;
 const list=$('library-list');list.replaceChildren();
 const entries=await getLibraryEntries();
 $('library-empty').hidden=entries.length>0;
 for(const entry of entries){
  const row=document.createElement('li');row.className='lp-library-row';
  const title=document.createElement('span');title.className='lp-library-name';title.textContent=entry.name;
  const actions=document.createElement('span');actions.className='lp-library-actions';
  const open=document.createElement('button');open.type='button';open.className='lp-button';open.textContent='Open';open.onclick=()=>openLibraryEntry(entry);
  const remove=document.createElement('button');remove.type='button';remove.className='lp-button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+entry.name+' from library');remove.onclick=()=>deleteLibraryEntry(entry.id).catch(error=>msg(error.message,false,'error'));
  actions.append(open,remove);row.append(title,actions);list.append(row);
 }
}
async function addLibraryTitle(){
 try{
  const [handle]=await window.showOpenFilePicker({multiple:false});
  const file=await handle.getFile();
  await storeLibraryHandle(handle);
  await renderLibrary();
  msg('Added '+handle.name+' to your library.');
  await load(file);
  }catch(error){if(error.name!=='AbortError')msg('Could not add title: '+error.message,false,'error')}
}
if(canUseLibrary()){
 $('library').hidden=false;
 $('library-add').onclick=addLibraryTitle;
 renderLibrary().catch(error=>msg('Could not load title library: '+error.message,false,'error'));
}
window.__retrotitlesSaveManager({$,msg,sizeLabel,getTitleName:()=>name});
async function streamLocalFile(file,loadId=loadSequence){
 if(!canSW())throw new Error('Streaming large local files needs this page opened over HTTPS or localhost.');
 msg('Starting local streaming service…',true);
 try{await navigator.serviceWorker.register('sw.js');await withTimeout(navigator.serviceWorker.ready,20000,'The local streaming service did not become ready within 20 seconds.')}
 catch(e){throw new Error('Could not start the local file streaming service. Open this page over HTTPS or localhost. '+(e.message||''))}
 if(loadId!==loadSequence)return false;
 providerId=newProviderId();
 provider=async path=>path==='game.bin'?{blob:file,type:file.type||mimeOf(file.name)}:{};
 streamUrl=new URL('__game/'+providerId+'/game.bin',location.href).href;
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
 const relevant=entries.filter(entry=>!entry.name.startsWith('__MACOSX')&&entry.name.startsWith(base));
 for(let i=0;i<relevant.length;i++){
  if(loadId!==loadSequence)throw new DOMException('Load canceled','AbortError');
  const entry=relevant[i],key=norm(entry.name.slice(base.length));
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
  if(path===indexRel){blob=new Blob([addCtl(await blob.text())],{type:'text/html'});type='text/html'}
  return{blob,type,encoding:enc};
 };
 streamUrl=new URL('__game/'+providerId+'/'+indexRel.split('/').map(encodeURIComponent).join('/'),location.href).href;
 return true;
}
function engineWebExport(entries){
 const names=entries.map(entry=>entry.name);
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
 const entry=entries.find(item=>item.name===index);
 if(!entry)return false;
 const page=await entry.get();
 const doc=new DOMParser().parseFromString(await page.text(),'text/html');
 return Boolean(doc.querySelector('script[type="module"],link[rel~="modulepreload"]'));
}
async function tryStream(file,loadId=loadSequence,entries=null){
 if(!canSW())return false;
 try{return await streamFrom(entries||await zipEntries(file),loadId)}catch(e){if(e.noSW)return false;throw e}
}
function showStream(controls=true,page=''){
 portable=false;html=page;
 $('code').value='/* Streaming mode: files are served from the selected local file, ZIP, or folder as the title requests them. No single-file export is available in this mode. Keep this page open while playing. */';
 $('dl').disabled=$('cp').disabled=true;$('ctl').disabled=!controls;
 $('fr').setAttribute('sandbox','allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals');
 $('stage').style.display='block';play();
}
async function loadFolder(files){
 if(!files.length)return;if(activeReader)activeReader.cancel().catch(()=>{});const loadId=++loadSequence,folderName=(files[0].webkitRelativePath||files[0].name).split('/')[0]||'Local folder';streamUrl=null;name=folderName;$('stage').style.display='none';resetTouchControls();setLoadedTitle(name,files.length+' local files');$('save-manager').hidden=true;msg('Checking '+files.length+' folder files…',true);
 try{
   const entries=files.map(f=>({name:f.webkitRelativePath||f.name,get:async()=>f}));
   const names=entries.map(entry=>entry.name);
   if(isDesktopRpgMaker(names))throw new Error('This is a desktop RPG Maker folder. Load an MV/MZ browser export containing index.html, data/System.json, and its js core files instead.');
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
 $('fr').setAttribute('sandbox','allow-scripts allow-pointer-lock allow-forms allow-modals'+(open?' allow-same-origin':''));
 $('stage').style.display='block';play();
}
let touchControlsOn=false;
function resetTouchControls(){touchControlsOn=false;const b=$('ctl');b.setAttribute('aria-pressed','false');b.classList.remove('lp-touch-active');$('ctl-label').textContent='Add touch controls'}
function play(){resetTouchControls();const f=$('fr');if(streamUrl&&!html){f.removeAttribute('srcdoc');f.src='about:blank';setTimeout(()=>f.src=streamUrl,60)}else{f.removeAttribute('src');f.srcdoc=html}}
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

async function load(file){
 if(!file)return;
 if(activeReader)activeReader.cancel().catch(()=>{});
 const loadId=++loadSequence,ext=file.name.split('.').pop().toLowerCase();
 const titleName=file.name.replace(/\.[^.]+$/,'')||'Local title';
 const selectedCore=$('core-select').value||CORES[ext],archiveZip=ext==='zip'&&!selectedCore;
 const titleType=selectedCore?'EmulatorJS '+selectedCore+' title':({zip:'ZIP archive',rar:'RAR archive',html:'HTML title',htm:'HTML title',js:'JavaScript title',py:'Python title',swf:'Flash title',rpgmvp:'RPG Maker asset',rpgmvo:'RPG Maker asset',rpgmvm:'RPG Maker asset',rpgm:'RPG Maker asset',exe:'Desktop package',rgssad:'Desktop RPG Maker package',rgss3a:'Desktop RPG Maker package'})[ext]||'local file';
 const memoryLimit=(navigator.deviceMemory||4)*128*1024*1024,memoryWarning=file.size>Math.min(512*1024*1024,memoryLimit);
 const readStage=stage=>memoryWarning?stage+' (large file; browser memory may be limited)':stage;
 if(memoryWarning)window.__retrotitlesLog?.('warn','Large local file ('+sizeLabel(file.size)+'). Browser memory may be limited; streaming is preferable where supported.','app');
 $('runtime-help').hidden=!Boolean(selectedCore);$('save-manager').hidden=!Boolean(selectedCore&&window.indexedDB);
 $('stage').style.display='none';resetTouchControls();name=titleName;setLoadedTitle(name,sizeLabel(file.size));portable=true;streamUrl=null;msg('Compatibility check — '+titleType+': '+file.name,true);
 try{
  let open=false,ctl=true,entries=null,loadedHtml='';
   if(ext==='zip'){
    msg('Inspecting ZIP contents…',true);
    entries=await zipEntries(file);
   if(loadId!==loadSequence)return;
    const rpgProject=inspectRpgMaker(entries.map(entry=>entry.name));
    if(isDesktopRpgMaker(entries.map(entry=>entry.name)))throw new Error('This ZIP contains a desktop RPG Maker build. Load an MV/MZ browser export containing index.html, data/System.json, and its js core files instead.');
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
   }
   if(archiveZip){
    if(!entries)entries=await zipEntries(file);
    if(loadId!==loadSequence)return;
   const engine=engineWebExport(entries);
   const streamIndex=engine?.index||findStreamIndex(entries.map(entry=>entry.name));
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
  if(selectedCore&&file.size>=STREAM_THRESHOLD){
   if(!await streamLocalFile(file,loadId)||loadId!==loadSequence)return;
   html=addCtl(romPage(streamUrl,selectedCore,titleName,true));portable=false;
   msg('Local file ready ('+sizeLabel(file.size)+'). The browser serves it in chunks; the emulator may still need to load the title into memory.');showStream(true,html);return;
  }
  if(ext==='swf'&&file.size>=STREAM_THRESHOLD){
   if(!await streamLocalFile(file,loadId)||loadId!==loadSequence)return;
   html=addCtl(swfPage(streamUrl,true));portable=false;
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
  else if(ext==='rar'){loadedHtml=await fromRar(await readFileBuffer(file,loadId,readStage('Reading RAR archive')),loadId);open=!portable;}
  else if(ext==='js')loadedHtml=wrapJS(await readFileText(file,loadId,readStage('Reading JavaScript title')));
  else if(ext==='html'||ext==='htm')loadedHtml=await readFileText(file,loadId,readStage('Reading HTML title'));
  else if(ext==='swf')loadedHtml=swfPage(b64(await readFileBuffer(file,loadId,readStage('Reading SWF title'))));
  else if(ext==='py'){loadedHtml=pyPage(await readFileText(file,loadId,readStage('Reading Python title')));open=true;}
   else if(['rpgmvp','rpgmvo','rpgmvm','rpgm'].includes(ext))throw new Error('This is a single RPG Maker asset, not a complete project. Open the exported MV/MZ folder or ZIP containing index.html, data/System.json, and js/rpg_core.js or js/rmmz_core.js.');
   else if(['exe','rgss3a','rgssad'].includes(ext))throw new Error('This is a desktop RPG Maker package. Desktop .exe and RGSS builds cannot run in this browser launcher; use an RPG Maker MV/MZ browser export folder or ZIP instead.');
  else if(selectedCore){loadedHtml=romPage(b64(await readFileBuffer(file,loadId,readStage('Reading emulator title'))),selectedCore,titleName);open=true;}
  else throw new Error('Unsupported file type: .'+ext);
  if(loadId!==loadSequence)return;
  html=loadedHtml;
  if(ctl)html=addCtl(html);$('ctl').disabled=!ctl;
  msg('Ready: '+titleType+' — '+file.name+(portable?'':' (This build can\u2019t be exported as a single file; host the original folder instead)'));
  show(open);
 }catch(e){if(loadId===loadSequence)msg(e.message,false,'error')}
}
$('drop').onclick=e=>{if(e.target!==$('f'))$('f').click()};
$('f').onchange=e=>{const file=e.target.files[0];e.target.value='';load(file)};
$('fb').onclick=()=>$('fd').click();
$('fd').onchange=e=>{const files=[...e.target.files];e.target.value='';loadFolder(files)};
$('drop').ondragover=e=>{e.preventDefault();$('drop').classList.add('is-over')};
$('drop').ondragleave=()=>$('drop').classList.remove('is-over');
$('drop').ondrop=e=>{e.preventDefault();$('drop').classList.remove('is-over');const files=e.dataTransfer.files;if(files.length!==1){msg(files.length?'Drop one title file at a time.':'No file was found in that drop.');return}load(files[0])};
$('run').onclick=play;
$('load-cancel').onclick=cancelCurrentLoad;
$('ctl').onclick=()=>{touchControlsOn=!touchControlsOn;$('ctl').setAttribute('aria-pressed',String(touchControlsOn));$('ctl').classList.toggle('lp-touch-active',touchControlsOn);$('ctl-label').textContent=touchControlsOn?'Hide touch controls':'Add touch controls';try{$('fr').contentWindow.postMessage('gr-toggle','*')}catch(e){}};
$('fs').onclick=toggleFullscreen;
$('fs-exit').onclick=exitFullscreen;
$('dl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=name+'-runnable.html';a.click()};
$('cp').onclick=async()=>{try{await navigator.clipboard.writeText(html);msg('Copied to clipboard.')}catch(e){msg('Copy blocked by the browser. Use Download instead.',false,'warn')}};
