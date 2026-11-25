(()=>{
 const icons={
  'layout-grid':[['rect',{x:3,y:3,width:7,height:7,rx:1}],['rect',{x:14,y:3,width:7,height:7,rx:1}],['rect',{x:3,y:14,width:7,height:7,rx:1}],['rect',{x:14,y:14,width:7,height:7,rx:1}]],
  folder:[['path',{d:'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z'}]],
  'gamepad-2':[['path',{d:'M6 11h4'}],['path',{d:'M8 9v4'}],['path',{d:'M15 12h.01'}],['path',{d:'M18 10h.01'}],['path',{d:'M6 7h12a4 4 0 0 1 3.8 5.2l-1.1 3.4a2 2 0 0 1-3.2 1l-2.1-1.6h-4.8l-2.1 1.6a2 2 0 0 1-3.2-1l-1.1-3.4A4 4 0 0 1 6 7z'}]],
  'sliders-horizontal':[['line',{x1:21,y1:4,x2:14,y2:4}],['line',{x1:10,y1:4,x2:3,y2:4}],['line',{x1:21,y1:12,x2:12,y2:12}],['line',{x1:8,y1:12,x2:3,y2:12}],['line',{x1:21,y1:20,x2:16,y2:20}],['line',{x1:12,y1:20,x2:3,y2:20}],['line',{x1:14,y1:2,x2:14,y2:6}],['line',{x1:8,y1:10,x2:8,y2:14}],['line',{x1:16,y1:18,x2:16,y2:22}]],
  'settings-2':[['path',{d:'M20 7h-9'}],['path',{d:'M14 17H5'}],['circle',{cx:17,cy:17,r:3}],['circle',{cx:7,cy:7,r:3}]],
  'code-2':[['path',{d:'m18 16 4-4-4-4'}],['path',{d:'m6 8-4 4 4 4'}],['path',{d:'m14.5 4-5 16'}]],
  'shield-check':[['path',{d:'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11'}],['path',{d:'m9 12 2 2 4-4'}]],
  plus:[['path',{d:'M12 5v14'}],['path',{d:'M5 12h14'}]],
  'file-plus-2':[['path',{d:'M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4'}],['path',{d:'M14 2v6h6'}],['path',{d:'M3 15h6'}],['path',{d:'M6 12v6'}]],
  'folder-open':[['path',{d:'m6 14 1.5-2h9l1.5 2'}],['path',{d:'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z'}]],
  play:[['path',{d:'m7 4 13 8-13 8z'}]],
  star:[['path',{d:'m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'}]],
  pencil:[['path',{d:'M12 20h9'}],['path',{d:'M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z'}]],
  replace:[['path',{d:'M20 7v5h-5'}],['path',{d:'M4 17v-5h5'}],['path',{d:'M5 12a7 7 0 0 1 12-5l3 5'}],['path',{d:'M19 12a7 7 0 0 1-12 5l-3-5'}]],
  archive:[['rect',{x:3,y:4,width:18,height:4,rx:1}],['path',{d:'M5 8v12h14V8'}],['path',{d:'M10 12h4'}]],
  download:[['path',{d:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'}],['path',{d:'m7 10 5 5 5-5'}],['path',{d:'M12 15V3'}]],
  upload:[['path',{d:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'}],['path',{d:'m17 8-5-5-5 5'}],['path',{d:'M12 3v12'}]],
  keyboard:[['rect',{x:2,y:5,width:20,height:14,rx:2}],['path',{d:'M6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 13h.01M12 13h.01M16 13h.01M7 16h10'}]],
  save:[['path',{d:'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'}],['path',{d:'M17 21v-8H7v8'}],['path',{d:'M7 3v5h8'}]],
  image:[['rect',{x:3,y:3,width:18,height:18,rx:2}],['circle',{cx:9,cy:9,r:2}],['path',{d:'m21 15-4-4L5 21'}]],
  'chevron-right':[['path',{d:'m9 18 6-6-6-6'}]],
  x:[['path',{d:'m18 6-12 12'}],['path',{d:'m6 6 12 12'}]],
  'trash-2':[['path',{d:'M3 6h18'}],['path',{d:'M8 6V4h8v2'}],['path',{d:'m19 6-1 14H6L5 6'}],['path',{d:'M10 11v5M14 11v5'}]],
  tag:[['path',{d:'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.828 8.828a2 2 0 0 0 2.828 0l6.344-6.344a2 2 0 0 0 0-2.828z'}],['circle',{cx:7.5,cy:7.5,r:.5}]]
 };
 const svgNamespace='http://www.w3.org/2000/svg';
 function create(name){
  const svg=document.createElementNS(svgNamespace,'svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.dataset.lucide=name;
  for(const [tag,attributes] of icons[name]||[]){
   const element=document.createElementNS(svgNamespace,tag);
   Object.entries(attributes).forEach(([key,value])=>element.setAttribute(key,String(value)));
   svg.append(element);
  }
  return svg;
 }
 function hydrate(root=document){
  root.querySelectorAll('svg[data-lucide]').forEach(svg=>{
   const name=svg.dataset.lucide;
   if(!icons[name])return;
   const rendered=create(name);
   for(const attribute of ['class','width','height','role','aria-hidden','focusable','title']){
    if(svg.hasAttribute(attribute))rendered.setAttribute(attribute,svg.getAttribute(attribute));
   }
   rendered.dataset.lucide=name;svg.replaceWith(rendered);
  });
 }
 window.RetrotitlesIcons={create,hydrate};
 document.addEventListener('DOMContentLoaded',()=>hydrate());
})();
