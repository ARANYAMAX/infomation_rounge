(() => {
 // Only verified guest responses contain this value; never write it to shared CMS data.
 const guest=window.ARANYA_GUEST,pin=guest?.pin,note=guest?.doorNote;
 if(pin||note){const entry=document.querySelector('[data-cms-field="I18N:step_lock_p"]');if(entry){
  entry.removeAttribute('data-i18n');entry.replaceChildren();
  if(pin){const code=document.createElement('strong');code.textContent=pin;code.style.cssText='display:block;font-size:1.5rem;letter-spacing:.12em';entry.append(code);}
  if(note){const description=document.createElement('span');description.style.cssText='display:block;white-space:pre-wrap;overflow-wrap:anywhere';entry.append(description);
   const update=()=>{description.textContent=note[document.documentElement.lang]||note[guest.l]||note.ko||'';};update();new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  }
 }}
 const labels={ko:['닫기','사진 안내','사진을 불러오지 못했습니다. 닫고 다시 시도해주세요.','주소 복사','복사됨'],en:['Close','Photo guide','Unable to load the photo. Close and try again.','Copy address','Copied'],zh:['关闭','图片指南','无法加载图片。请关闭后重试。','复制地址','已复制'],ja:['閉じる','写真ガイド','写真を読み込めません。閉じて再試行してください。','住所をコピー','コピーしました'],de:['Schließen','Fotoguide','Foto konnte nicht geladen werden. Bitte erneut versuchen.','Adresse kopieren','Kopiert'],fr:['Fermer','Guide photo','Impossible de charger la photo. Veuillez réessayer.','Copier l’adresse','Copié'],es:['Cerrar','Guía fotográfica','No se pudo cargar la foto. Inténtalo de nuevo.','Copiar dirección','Copiado'],it:['Chiudi','Guida fotografica','Impossibile caricare la foto. Riprova.','Copia indirizzo','Copiato'],pt:['Fechar','Guia de fotos','Não foi possível carregar a foto. Tente novamente.','Copiar endereço','Copiado'],ru:['Закрыть','Фотогид','Не удалось загрузить фото. Попробуйте снова.','Копировать адрес','Скопировано']};
 const text=()=>labels[document.documentElement.lang]||labels.en;
 const style=document.createElement('style');style.textContent=':focus-visible{outline:2px solid #a65b45;outline-offset:3px}.guide-lightbox [role=status]{color:white;max-width:80vw}.place-photo-button{min-height:44px}.links{flex-wrap:wrap}';document.head.append(style);
 const box=document.querySelector('.guide-lightbox');
 if(box){
  const viewportStyle=document.createElement('style');viewportStyle.textContent=`
   html.aranya-photo-open{overflow:hidden!important;overscroll-behavior:none}
   .guide-lightbox{box-sizing:border-box;inset:auto;top:var(--photo-top,0px);left:var(--photo-left,0px);width:var(--photo-width,100vw);height:var(--photo-height,100dvh);padding:calc(64px + env(safe-area-inset-top,0px)) calc(16px + env(safe-area-inset-right,0px)) calc(20px + env(safe-area-inset-bottom,0px)) calc(16px + env(safe-area-inset-left,0px));overflow:hidden;overscroll-behavior:none}
   dialog.guide-lightbox{margin:0;border:0;max-width:none;max-height:none;background:transparent;backdrop-filter:none}
   dialog.guide-lightbox::backdrop{background:rgba(17,24,34,.78);backdrop-filter:blur(8px)}
   .guide-lightbox img{display:block;flex:0 1 auto;min-width:0;min-height:0;max-width:min(100%,980px);max-height:var(--photo-image-height,100%);width:auto;height:auto;object-fit:contain}
   .guide-lightbox button{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));right:calc(16px + env(safe-area-inset-right,0px));width:44px;height:44px;z-index:1}
   .guide-lightbox [role=status]{position:absolute;bottom:4px;margin:0;text-align:center}
   .photo-stage{width:100%;height:100%;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}
   .photo-stage img{flex:none;transform-origin:center;pointer-events:none;-webkit-touch-callout:none;will-change:transform}
  `;document.head.append(viewportStyle);
  let savedScroll=null,bodyStyles=[];
  const fitViewport=()=>{const v=window.visualViewport,height=v?.height||innerHeight;for(const [key,value]of Object.entries({top:v?.offsetTop||0,left:v?.offsetLeft||0,width:v?.width||innerWidth,height}))box.style.setProperty('--photo-'+key,value+'px');const css=getComputedStyle(box);box.style.setProperty('--photo-image-height',Math.max(1,height-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom))+'px');};
  const lockScroll=()=>{savedScroll=[scrollX,scrollY];bodyStyles=['position','top','left','width','overflow'].map(key=>[key,document.body.style.getPropertyValue(key),document.body.style.getPropertyPriority(key)]);document.documentElement.classList.add('aranya-photo-open');Object.entries({position:'fixed',top:-savedScroll[1]+'px',left:-savedScroll[0]+'px',width:'100%',overflow:'hidden'}).forEach(([key,value])=>document.body.style.setProperty(key,value));fitViewport();};
  const unlockScroll=()=>{for(const [key,value,priority]of bodyStyles){if(value)document.body.style.setProperty(key,value,priority);else document.body.style.removeProperty(key);}document.documentElement.classList.remove('aranya-photo-open');if(savedScroll)window.scrollTo({left:savedScroll[0],top:savedScroll[1],behavior:'instant'});savedScroll=null;};
  window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('scroll',fitViewport);
  const close=box.querySelector('button'),img=box.querySelector('img'),status=document.createElement('p');let opener=null,wasOpen=false,previousInert=[];
  // Handle poster gestures inside the image area, not by zooming the browser viewport.
  const stage=document.createElement('div');stage.className='photo-stage';img.before(stage);stage.append(img);img.draggable=false;
  const points=new Map();let scale=1,panX=0,panY=0,gesture=null,lastTap=0;
  const draw=()=>{const limitX=Math.max(0,(img.offsetWidth*scale-stage.clientWidth)/2),limitY=Math.max(0,(img.offsetHeight*scale-stage.clientHeight)/2);panX=Math.max(-limitX,Math.min(limitX,panX));panY=Math.max(-limitY,Math.min(limitY,panY));img.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;};
  const resetZoom=()=>{points.clear();gesture=null;lastTap=0;scale=1;panX=panY=0;draw();};
  const point=e=>{const r=stage.getBoundingClientRect();return {x:e.clientX-r.left-r.width/2,y:e.clientY-r.top-r.height/2};};
  const begin=()=>{const p=[...points.values()];if(p.length>=2){const a=p[0],b=p[1];gesture={pinch:true,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,scale,x:panX,y:panY};lastTap=0;}else if(p.length)gesture={pinch:false,cx:p[0].x,cy:p[0].y,x:panX,y:panY,time:Date.now(),tap:scale===1};else gesture=null;};
  stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();points.set(e.pointerId,point(e));if(e.isTrusted)stage.setPointerCapture(e.pointerId);begin();});
  stage.addEventListener('pointermove',e=>{if(!points.has(e.pointerId)||!gesture)return;e.preventDefault();points.set(e.pointerId,point(e));const p=[...points.values()],g=gesture;if(g.pinch&&p.length>=2){scale=Math.max(1,Math.min(5,g.scale*Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)/g.distance));const ratio=scale/g.scale;panX=(p[0].x+p[1].x)/2-(g.cx-g.x)*ratio;panY=(p[0].y+p[1].y)/2-(g.cy-g.y)*ratio;}else{panX=g.x+p[0].x-g.cx;panY=g.y+p[0].y-g.cy;if(Math.hypot(p[0].x-g.cx,p[0].y-g.cy)>8)g.tap=false;}draw();});
  const finish=e=>{if(!points.has(e.pointerId))return;const g=gesture,p=point(e);if(e.type==='pointerup'&&points.size===1&&g&&!g.pinch&&g.tap&&Date.now()-g.time<300){if(lastTap&&Date.now()-lastTap<350){scale=2.5;panX=-p.x*(scale-1);panY=-p.y*(scale-1);draw();lastTap=0;}else lastTap=Date.now();}else lastTap=0;const pinching=g?.pinch;points.delete(e.pointerId);begin();if(pinching&&gesture)gesture.tap=false;};
  stage.addEventListener('pointerup',finish);stage.addEventListener('pointercancel',finish);stage.addEventListener('lostpointercapture',finish);
  img.addEventListener('load',resetZoom);new ResizeObserver(()=>{if(box.classList.contains('open'))draw();}).observe(stage);
  status.setAttribute('role','status');status.hidden=true;box.append(status);box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  const refresh=()=>{close.setAttribute('aria-label',text()[0]);box.setAttribute('aria-label',text()[1]);if(!status.hidden)status.textContent=text()[2];};refresh();
  img.addEventListener('error',()=>{if(!img.getAttribute('src'))return;status.textContent=text()[2];status.hidden=false;});img.addEventListener('load',()=>{status.hidden=true;});
  document.addEventListener('click',e=>{if(e.target.closest('[data-guide-photo],.manual-media img'))opener=e.target.closest('button')||e.target;},true);
  new MutationObserver(()=>{const open=box.classList.contains('open');if(open===wasOpen)return;wasOpen=open;
   if(open){lockScroll();if(typeof box.showModal==='function'&&!box.open)box.showModal();fitViewport();refresh();status.hidden=false;status.textContent='';previousInert=[...document.body.children].filter(el=>el!==box).map(el=>[el,el.inert]);for(const [el]of previousInert)el.inert=true;close.focus({preventScroll:true});}
   else{resetZoom();if(typeof box.close==='function'&&box.open)box.close();for(const [el,value]of previousInert)el.inert=value;status.hidden=true;unlockScroll();opener?.focus({preventScroll:true});}
  }).observe(box,{attributes:true,attributeFilter:['class']});
  box.addEventListener('cancel',e=>{e.preventDefault();close.click();});
  box.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();close.focus();}});
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }
 function enhance(){
  const maps=document.getElementById('stationMaps');if(!maps)return;
  let copy=maps.querySelector('[data-copy-address]');if(!copy){copy=document.createElement('button');copy.type='button';copy.className='maplink';copy.dataset.copyAddress='1';maps.append(copy);
   copy.addEventListener('click',async()=>{const address=typeof I18N!=='undefined'?I18N.ko.greet_tag:'';if(!address)return;try{await navigator.clipboard.writeText(address);copy.textContent=text()[4];setTimeout(()=>{copy.textContent=text()[3];},1500);}catch{window.prompt(text()[3],address);}});
  }if(copy.textContent!==text()[3]&&copy.textContent!==text()[4])copy.textContent=text()[3];
 }
 enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
 new MutationObserver(()=>{const copy=document.querySelector('[data-copy-address]');if(copy)copy.textContent=text()[3];}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
