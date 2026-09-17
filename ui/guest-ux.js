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
  const close=box.querySelector('button'),img=box.querySelector('img'),status=document.createElement('p');let opener=null,wasOpen=false,previousInert=[];
  status.setAttribute('role','status');status.hidden=true;box.append(status);box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  const refresh=()=>{close.setAttribute('aria-label',text()[0]);box.setAttribute('aria-label',text()[1]);if(!status.hidden)status.textContent=text()[2];};refresh();
  img.addEventListener('error',()=>{if(!img.getAttribute('src'))return;status.textContent=text()[2];status.hidden=false;});img.addEventListener('load',()=>{status.hidden=true;});
  document.addEventListener('click',e=>{if(e.target.closest('[data-guide-photo],.manual-media img'))opener=e.target.closest('button')||e.target;},true);
  new MutationObserver(()=>{const open=box.classList.contains('open');if(open===wasOpen)return;wasOpen=open;
   if(open){refresh();status.hidden=false;status.textContent='';previousInert=[...document.body.children].filter(el=>el!==box).map(el=>[el,el.inert]);for(const [el]of previousInert)el.inert=true;close.focus();}
   else{for(const [el,value]of previousInert)el.inert=value;status.hidden=true;opener?.focus();}
  }).observe(box,{attributes:true,attributeFilter:['class']});
  box.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();close.focus();}});
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }
 function enhance(){
  for(const image of document.querySelectorAll('.manual-media img')){image.tabIndex=0;image.setAttribute('role','button');if(!image.dataset.keyboardPhoto){image.dataset.keyboardPhoto='1';image.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();image.click();}});}image.loading='lazy';image.decoding='async';}
  const maps=document.getElementById('stationMaps');if(!maps)return;
  let copy=maps.querySelector('[data-copy-address]');if(!copy){copy=document.createElement('button');copy.type='button';copy.className='maplink';copy.dataset.copyAddress='1';maps.append(copy);
   copy.addEventListener('click',async()=>{const address=typeof I18N!=='undefined'?I18N.ko.greet_tag:'';if(!address)return;try{await navigator.clipboard.writeText(address);copy.textContent=text()[4];setTimeout(()=>{copy.textContent=text()[3];},1500);}catch{window.prompt(text()[3],address);}});
  }if(copy.textContent!==text()[3]&&copy.textContent!==text()[4])copy.textContent=text()[3];
 }
 enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});
 new MutationObserver(()=>{const copy=document.querySelector('[data-copy-address]');if(copy)copy.textContent=text()[3];}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
