(() => {
  const prompts={ko:'언어선택',en:'Select language',zh:'选择语言',ja:'言語選択',de:'Sprache wählen',fr:'Choisir la langue',es:'Seleccionar idioma',it:'Seleziona lingua',pt:'Selecionar idioma',ru:'Выбрать язык'};
  const names={ko:'한국어',en:'English',zh:'中文',ja:'日本語',de:'Deutsch',fr:'Français',es:'Español',it:'Italiano',pt:'Português',ru:'Русский'};
  const style=document.createElement('style');
  style.textContent=`
    .aranya-language-field{position:relative;display:inline-flex;align-items:center;gap:10px;box-sizing:border-box;min-height:46px;width:230px;max-width:100%;padding:11px 14px;border:1px solid #ded4c3;border-radius:12px;background:#fffdfa;color:#2f3e56;font:500 14px/1.5 system-ui,sans-serif;vertical-align:middle}
    .aranya-language-field.for-generator{display:flex;width:100%;min-height:50px;margin-top:6px}
    .aranya-language-field:focus-within{outline:2px solid #a65b45;outline-offset:3px}
    .aranya-language-field .language-globe{width:17px;height:17px;flex:none}
    .aranya-language-field .language-chevron{width:12px;height:8px;margin-left:auto;flex:none}
    .aranya-language-field .language-prompt{white-space:nowrap;font:inherit}
    .aranya-language-field select.aranya-language-native{position:absolute!important;inset:0!important;opacity:0!important;width:100%!important;height:100%!important;min-width:0!important;margin:0!important;padding:0!important;cursor:pointer;z-index:1;font-size:16px!important}
  `;
  document.head.append(style);
  function refresh(){
    const code=document.documentElement.lang?.slice(0,2)||'ko',prompt='- '+(prompts[code]||prompts.en)+' -';
    for(const select of document.querySelectorAll('#genLang,#hostBaseLang,#hostEarlyLangSelect,#expiredLangSelect')){
      if(!select.classList.contains('aranya-language-native')){
        const wrap=document.createElement('span');wrap.className='aranya-language-field'+(select.id==='genLang'?' for-generator':'');
        wrap.innerHTML='<svg class="language-globe" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/></svg><span class="language-prompt" aria-hidden="true" contenteditable="false"></span><svg class="language-chevron" aria-hidden="true" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m1 1 5 5 5-5"/></svg>';
        select.before(wrap);wrap.append(select);select.classList.add('aranya-language-native');
      }
      const label=select.parentElement.querySelector('.language-prompt'),display=select.id==='genLang'?(names[select.value]||prompt):prompt;if(label.textContent!==display)label.textContent=display;
      select.setAttribute('aria-label',prompt+' · '+(names[select.value]||''));
      for(const option of select.options)if(names[option.value]){if(option.textContent!==names[option.value])option.textContent=names[option.value];if(option.lang!==option.value)option.lang=option.value;option.translate=false;}
    }
    const label=document.getElementById('langBtnLabel');if(label&&label.textContent!==prompt)label.textContent=prompt;
    document.getElementById('langBtn')?.setAttribute('aria-label',prompt+' · '+(names[code]||''));
    for(const option of document.querySelectorAll('#langMenu [data-lang]')){option.setAttribute('aria-selected',String(option.dataset.lang===code));if(option.lang!==option.dataset.lang)option.lang=option.dataset.lang;option.translate=false;}
    const generator=document.getElementById('genLang'),heading=document.getElementById('genLangLabel');
    if(generator&&heading){const original=heading.textContent.split(' · ')[0],value=original+' · '+(names[generator.value]||'');if(heading.textContent!==value)heading.textContent=value;}
  }
  document.addEventListener('change',refresh);
  new MutationObserver(refresh).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['lang']});
  refresh();
})();
