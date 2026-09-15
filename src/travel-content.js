// Render through the existing translated CMS field and gallery helpers.
export function renderTravelExtras(copy,model,text,photos,escape,icons){
 const field=(block,item,key)=>model.catalog.find(f=>item?f.itemKey===item._cmsKey&&f.path.at(-1)===key:f.block===block&&f.path.join('.')===key);
 const tag=(name,block,item,key)=>{const f=field(block,item,key),value=item?item[key]:copy[block][key];return '<'+name+' '+text(value,f.id)+'>'+escape(value.ko)+'</'+name+'>';};
 const icon=item=>'<span class="travel-extra-icon" aria-hidden="true">'+(icons[item.icon]||'')+'</span>';
 const link=(block,item)=>{if(!item.linkUrl)return '';const f=field(block,item,'linkUrl');return '<div class="links"><a href="'+escape(item.linkUrl)+'" data-cms-field="'+escape(f.id)+'" target="_blank" rel="noopener noreferrer"><span '+text(item.linkLabel,field(block,item,'linkLabel').id)+'>'+escape(item.linkLabel.ko)+'</span></a></div>';};
 const step=(block,item)=>'<div class="travel-extra-step" data-cms-item="'+escape(item._cmsKey)+'">'+icon(item)+tag('h4',block,item,'title')+tag('p',block,item,'body')+photos(item)+link(block,item)+'</div>';
 const poster=item=>item.posters&&Object.values(item.posters).some(Boolean)?'<button type="button" class="place-photo-button" data-localized-posters="'+escape(JSON.stringify(item.posters))+'" data-guide-photo="'+escape(item.posters.ko||item.posters.en||Object.values(item.posters).find(Boolean))+'">PHOTO</button>':'';
 const a=copy.AIRPORT;
 const airport='<div class="links" id="airportGuide"><button type="button" class="place-photo-button" data-airport-poster data-guide-photo="/assets/airport-posters/ko.png"><span aria-hidden="true">✈ </span>'+tag('span','AIRPORT',null,'button')+'</button></div>';
 const tips=copy.TRAVEL_TIPS.map(item=>'<article class="travel-extra-card" data-cms-item="'+escape(item._cmsKey)+'">'+icon(item)+tag('h3','TRAVEL_TIPS',item,'title')+tag('p','TRAVEL_TIPS',item,'description')+poster(item)+photos(item)+link('TRAVEL_TIPS',item)+item.steps.map(s=>step('TRAVEL_TIPS',s)).join('')+'</article>').join('');
 return {airport,tips};
}
