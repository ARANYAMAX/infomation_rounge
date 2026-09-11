(() => {
 const dialog=document.createElement('dialog');
 dialog.setAttribute('aria-label','편의시설 사진');
 dialog.style.cssText='border:0;border-radius:16px;padding:16px;max-width:min(90vw,900px);max-height:90vh;background:#fff';
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close');close.style.cssText='display:block;margin:0 0 10px auto;font-size:28px;cursor:pointer';
 const image=document.createElement('img');image.style.cssText='display:block;max-width:100%;max-height:75vh;object-fit:contain';
 dialog.append(close,image);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 for(const photo of document.querySelectorAll('.amen > img[data-amenity-photo]')){
  const item=photo.parentElement;item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-haspopup','dialog');item.style.cursor='pointer';
  const open=()=>{image.src=photo.getAttribute('src');image.alt=item.querySelector('span')?.textContent||'';dialog.showModal();};
  item.addEventListener('click',open);item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
 }
})();
