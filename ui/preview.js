// Loaded only in authenticated previews. Keep nodes and their interaction state alive.
(() => {
 const key=node=>node.nodeType===1&&(node.dataset.cmsItem||node.id)||'';
 const compatible=(a,b)=>a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&key(a)===key(b);
 function morph(root,next){
  const keyed=new Map([...root.querySelectorAll('[data-cms-item],[id]')].map(n=>[key(n),n]).filter(([k])=>k));
  function children(old,fresh){
   let cursor=old.firstChild;
   for(const desired of [...fresh.childNodes]){
    const id=key(desired);let current=id?keyed.get(id):cursor;
    if(!current||!compatible(current,desired))current=desired.cloneNode(true);
    if(current!==cursor)old.insertBefore(current,cursor);
    if(current.nodeType===1){
     const open=current.tagName==='DETAILS'?current.open:null;
     const editing=[...current.classList].filter(c=>c.startsWith('aranya-edit'));
     for(const attr of [...current.attributes])if(!desired.hasAttribute(attr.name)&&attr.name!=='open')current.removeAttribute(attr.name);
     for(const attr of [...desired.attributes])if(attr.name!=='open'&&current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
     if(editing.length)current.classList.add(...editing);
     if(current.id!=='stationMaps'||desired.childNodes.length)children(current,desired);
     if(open!==null)current.open=open;
    }else if(current.nodeValue!==desired.nodeValue)current.nodeValue=desired.nodeValue;
    cursor=current.nextSibling;
   }
   while(cursor){const next=cursor.nextSibling;cursor.remove();cursor=next;}
  }
  children(root,next);
 }
 window.aranyaPreviewMorph=(root,html)=>{const next=document.createElement('template');next.innerHTML=html;morph(root,next.content);};
 window.aranyaPreviewInstall=()=>{
  for(const root of document.querySelectorAll('#aroundList,#foodList,#houseNotes,#manualGrid,#aranyaEssentialsGroups,#stationMaps,#foodChips')){
   if(root.aranyaPatched)continue;root.aranyaPatched=true;
   let previous;
   Object.defineProperty(root,'innerHTML',{configurable:true,get(){return Element.prototype.__lookupGetter__('innerHTML').call(this);},set(html){if(html===previous)return;previous=html;window.aranyaPreviewMorph(this,html);}});
  }
 };
 window.aranyaApplyPreview=payload=>{
  const x=scrollX,y=scrollY,cat=document.querySelector('#foodChips .active')?.dataset.cat;
  const incoming=new DOMParser().parseFromString(payload.html,'text/html');
  incoming.querySelectorAll('[data-i18n]').forEach(el=>{const value=payload.blocks.I18N[document.documentElement.lang]?.[el.dataset.i18n];if(value!==undefined)el.textContent=value;});
  for(const selector of ['.steps','.amen-grid','#travelTipsContent']){
   const targets=document.querySelectorAll(selector);incoming.querySelectorAll(selector).forEach((fresh,i)=>{if(targets[i])window.aranyaPreviewMorph(targets[i],fresh.innerHTML);});
  }
  const visual=document.querySelector('.masthead-visual');
  if(visual){let img=visual.querySelector('img');if(payload.hero){if(!img){img=document.createElement('img');img.alt='Aranya hanok window';visual.prepend(img);}if(img.getAttribute('src')!==payload.hero)img.src=payload.hero;}else img?.remove();visual.style.setProperty('display',payload.hero?'block':'none','important');document.querySelector('.home-masthead')?.style.setProperty('grid-template-columns',payload.hero?'':'1fr','important');}
  window.aranyaPreviewInstall();window.aranyaPreviewData(payload.blocks);
  if(cat){document.querySelectorAll('#foodChips .chip').forEach(c=>c.classList.toggle('active',c.dataset.cat===cat));document.querySelectorAll('#foodList .place-card').forEach(c=>c.style.display=cat==='all'||c.dataset.cat===cat?'grid':'none');}
  document.querySelectorAll('.manual-accordion details').forEach(d=>{const label=d.querySelector('.manual-detail-text');if(d.open&&label)d.dispatchEvent(new Event('toggle'));});
  scrollTo({left:x,top:y,behavior:'instant'});
 };
})();
