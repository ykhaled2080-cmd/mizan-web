/* MIZAN brand identity: one persistent switch between the restored original
   buildings-only mark and the previous wordmark logo. */
(function(){
  'use strict';
  const KEY='mizan.logoVariant';
  const defs={
    buildings:{
      dark:'assets/logo-approved.png',
      light:'assets/logo-original-light.png',
      svg:'assets/logo-approved.png',
      png:'assets/logo-approved.png',
      mark:'assets/logo-approved-mark.png',
      alt:'Mizan'
    },
    current:{
      dark:'assets/logo-approved.png',
      light:'assets/logo-original-light.png',
      svg:'assets/logo-approved.png',
      png:'assets/logo-approved.png',
      mark:'assets/logo-approved.png',
      alt:'MIZAN'
    }
  };
  function normalize(value){return value==='current'?'current':'buildings'}
  function read(){
    try{return normalize(localStorage.getItem(KEY))}catch{return 'buildings'}
  }
  let active=read();

  function get(){return active}
  function src(kind){
    const variant=defs[active]||defs.buildings;
    const key=String(kind||'dark').toLowerCase();
    return variant[key]||variant.dark||variant.png;
  }
  function apply(){
    document.documentElement.setAttribute('data-brand',active);
    document.querySelectorAll('img[data-brand-logo]').forEach(img=>{
      const kind=img.getAttribute('data-brand-logo')||'dark';
      const next=src(kind);
      if(img.getAttribute('src')!==next)img.setAttribute('src',next);
      const wrap=img.closest('.adaptive-brand-wrap');
      if(wrap)wrap.style.setProperty('--brand-mask','url("'+next+'")');
      const alt=(defs[active]||defs.buildings).alt;
      if(img.getAttribute('alt')!==alt)img.setAttribute('alt',alt);
      img.classList.toggle('brand-logo-original',active==='buildings');
      img.classList.toggle('brand-logo-current',active==='current');
    });
    document.querySelectorAll('[data-brand-switch]').forEach(btn=>{
      const label=active==='buildings'
        ? 'Switch to current logo · التبديل إلى الشعار السابق'
        : 'Switch to original logo · التبديل إلى الشعار الأصلي';
      btn.setAttribute('aria-label',label);
      btn.setAttribute('title',label);
      btn.setAttribute('data-brand-variant',active);
    });
  }
  function set(value){
    const next=normalize(value);
    if(next===active){apply();return active}
    active=next;
    try{localStorage.setItem(KEY,active)}catch{}
    apply();
    try{window.dispatchEvent(new CustomEvent('mizan:brandchange',{detail:{variant:active}}))}catch{}
    return active;
  }
  function toggle(){return set(active==='buildings'?'current':'buildings')}

  window.MizanBrand={get,id:get,set,toggle,src,apply,defs};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  apply();

  document.addEventListener('click',event=>{
    const btn=event.target&&event.target.closest?event.target.closest('[data-brand-switch]'):null;
    if(!btn)return;
    event.preventDefault();
    event.stopPropagation();
    toggle();
  },true);
})();
