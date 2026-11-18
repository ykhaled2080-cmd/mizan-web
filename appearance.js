/* MIZAN appearance studio: semantic themes and reversible presentation variants. */
(function(){
  'use strict';
  const KEY='mizan.appearance';
  const mobileDefault=!!(window.Capacitor?.getPlatform?.()==='android'
    ||matchMedia('(max-width: 767px)').matches
    ||matchMedia('(min-width:768px) and (orientation:portrait) and (any-pointer:coarse)').matches);
  const DEFAULT_THEME=mobileDefault?'compare-teal-light':'classic';
  const DEFAULTS={version:1,theme:DEFAULT_THEME,offer:'A',details:'D',switchStyle:'A',navStyle:'A'};
  const THEMES=[
    {id:'classic',ar:'أخضر ميزان الكلاسيكي',en:'Classic Green',mode:'light',canvas:'#F5F6F2',surface:'#FFFFFF',text:'#192D29',primary:'#16483D',accent:'#7E9B86'},
    {id:'compare-teal-light',ar:'فيروزي المقارنة — فاتح',en:'Compare Teal Light',mode:'light',canvas:'#EDF4F2',surface:'#FFFFFF',text:'#12332E',primary:'#146B60',accent:'#3B8F85'},
    {id:'stone-opal',ar:'حجر وأوبال',en:'Stone & Opal',mode:'light',canvas:'#F5F3EE',surface:'#FFFEFA',text:'#27313A',primary:'#2D6571',accent:'#B99C74'},
    {id:'ash-copper',ar:'رماد ونحاس',en:'Ash & Copper',mode:'light',canvas:'#F3F0E9',surface:'#FFFCF7',text:'#2B2E30',primary:'#64594F',accent:'#AC744F'},
    {id:'archive-blue',ar:'أزرق أرشيفي',en:'Archival Blue',mode:'light',canvas:'#F0F3F5',surface:'#FFFFFF',text:'#26343E',primary:'#345C81',accent:'#B79A72'},
    {id:'olive-print',ar:'زيتوني طباعي',en:'Print Olive',mode:'light',canvas:'#F6F5EC',surface:'#FFFDF5',text:'#2C352A',primary:'#536B50',accent:'#C39B71'},
    {id:'clay-plum',ar:'طين وبرقوق',en:'Clay & Plum',mode:'light',canvas:'#F8F2F2',surface:'#FFFDFC',text:'#392D35',primary:'#744B64',accent:'#B98377'},
    {id:'petrol-night',ar:'بترول منتصف الليل',en:'Midnight Petrol',mode:'dark',canvas:'#101F25',surface:'#192C32',text:'#EFF5F1',primary:'#78B6B0',accent:'#C6A67A'},
    {id:'compare-teal',ar:'فيروزي المقارنة',en:'Compare Teal',mode:'dark',canvas:'#101F25',surface:'#192C32',text:'#EFF5F1',primary:'#78B6B0',accent:'#82B8BC'},
    {id:'jade-obsidian',ar:'يشم وسبج',en:'Jade & Obsidian',mode:'dark',canvas:'#101D1B',surface:'#1C2E29',text:'#F1F4E9',primary:'#98BC9F',accent:'#D1B785'},
    {id:'violet-bronze',ar:'بنفسجي وبرونز',en:'Violet & Bronze',mode:'dark',canvas:'#211D2A',surface:'#302A39',text:'#F5F0F0',primary:'#B7A5D5',accent:'#C8A77F'},
    {id:'smoked-indigo',ar:'نيلي مدخن',en:'Smoked Indigo',mode:'dark',canvas:'#191D2F',surface:'#262C41',text:'#F0F2F9',primary:'#A4B5E8',accent:'#D5A38F'},
    {id:'basalt-copper',ar:'بازلت ونحاس',en:'Basalt & Copper',mode:'dark',canvas:'#1C2222',surface:'#2B3130',text:'#F0F2EB',primary:'#A9BEB8',accent:'#D09B75'},
    {id:'graphite-pistachio',ar:'جرافيت وفستق',en:'Graphite & Pistachio',mode:'dark',canvas:'#1B2320',surface:'#28332D',text:'#F4F5E8',primary:'#B6CE8D',accent:'#A9AFC3'}
  ];
  const OFFER=[['A','Editorial Flow','تحريري'],['B','Unified Surface','سطح موحّد'],['C','Architectural Rail','محور معماري'],['D','Compact Ledger','دفتر مختصر'],['E','Adaptive Focus','تركيز تكيفي']];
  const DETAILS=[['A','Clean Accordion','أكورديون نظيف'],['B','Compact Rows','صفوف مختصرة'],['C','Section Navigator','ملاح الأقسام'],['D','Progressive Disclosure','إظهار تدريجي'],['E','Clause Composer','محرر البنود']];
  const SWITCHES=[['A','Centered Underline','تسطير مركزي'],['B','Quiet Dock','شريط هادئ'],['C','Twin Labels','نصان متجاوران']];
  const NAVS=[['A','Fine Line','خط رفيع'],['B','Soft Tone','تظليل ناعم'],['C','Typographic','نصي']];
  const byId=id=>THEMES.find(t=>t.id===id)||THEMES[0];
  const valid=(v,list,fallback)=>list.some(x=>x[0]===v)?v:fallback;
  function hex(v){const s=String(v).replace('#','');return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]}
  function rgb(v){return '#'+v.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('')}
  function mix(a,b,t){const A=hex(a),B=hex(b);return rgb(A.map((v,i)=>v+(B[i]-v)*t))}
  function lum(v){const c=hex(v).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
  function onColor(bg){return lum(bg)>.48?'#172A23':'#F7FAF5'}
  function read(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(!raw)return null;return {version:1,theme:byId(raw.theme).id,offer:valid(raw.offer,OFFER,'A'),details:valid(raw.details,DETAILS,'D'),switchStyle:valid(raw.switchStyle,SWITCHES,'A'),navStyle:valid(raw.navStyle,NAVS,'A')}}catch{return null}}
  let stored=read();
  let committed=stored||{...DEFAULTS};
  let previewState=stored?{...stored}:null;
  let lastLight=stored&&byId(stored.theme).mode==='light'?stored.theme:DEFAULT_THEME;
  let lastDark=stored&&byId(stored.theme).mode==='dark'?stored.theme:(byId(DEFAULTS.theme).mode==='dark'?DEFAULTS.theme:(mobileDefault?'compare-teal':'petrol-night'));
  let sheet=null;
  function tokens(t){
    const dark=t.mode==='dark';
    const canvas=t.canvas,surface=t.surface,text=t.text,primary=t.primary,accent=t.accent;
    const surfaceRaised=mix(surface,dark?'#ffffff':primary,dark?.06:.035);
    const textSecondary=mix(text,canvas,.38);
    const border=mix(surface,text,dark?.24:.15);
    const inputFill=mix(surface,canvas,dark?.15:.55);
    const tint=mix(surface,primary,dark?.18:.08);
    const banner=t.id==='classic'?'#123E35':mix(primary,'#000000',.45);
    const onBanner=onColor(banner),onPrimary=onColor(primary),primaryHover=mix(primary,dark?'#ffffff':'#000000',dark?.14:.16);
    return {canvas,surface,surfaceRaised,text,textSecondary,primary,accent,border,inputFill,tint,banner,onBanner,onPrimary,primaryHover,
      onBannerMuted:mix(onBanner,banner,.32),warning:dark?'#F0B37B':'#A76A2D',negative:dark?'#F0A28C':'#A84630',positive:dark?'#9ED4BC':'#2E7D5B',focus:accent,
      shadow:dark?'rgba(0,0,0,.32)':'rgba(18,45,37,.10)',shadowStrong:dark?'rgba(0,0,0,.48)':'rgba(18,45,37,.18)'};
  }
  const VARNAMES=['--bg','--surface','--surface-raised','--text','--sub','--rule','--green','--money','--banner','--tint','--field','--gold','--focus','--warning','--danger','--positive','--mobile-bg','--mobile-surface','--mobile-surface-muted','--mobile-surface-sunken','--mobile-border','--mobile-text','--mobile-sub','--mobile-muted','--mobile-primary','--mobile-primary-hover','--mobile-primary-border','--mobile-on-primary','--mobile-accent','--mobile-on-banner','--mobile-on-banner-muted','--mobile-segment-track','--mobile-segment-active','--mobile-warning','--mobile-danger','--mobile-shadow','--mobile-shadow-strong'];
  function apply(state){
    const s=state||committed,t=byId(s.theme),k=tokens(t),root=document.documentElement;
    root.setAttribute('data-offer-layout',s.offer);root.setAttribute('data-details-layout',s.details);root.setAttribute('data-switch-style',s.switchStyle);root.setAttribute('data-nav-style',s.navStyle);root.setAttribute('data-theme-id',t.id);
    try{const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',k.surface)}catch{}
    if(!stored&&!previewState&&!mobileDefault)return;
    root.toggleAttribute('data-dark',t.mode==='dark');root.style.colorScheme=t.mode;
    const set=(n,v)=>root.style.setProperty(n,v);
    set('--bg',k.canvas);set('--surface',k.surface);set('--surface-raised',k.surfaceRaised);set('--text',k.text);set('--sub',k.textSecondary);set('--rule',k.border);set('--green',k.primary);set('--money',k.text);set('--banner',k.banner);set('--tint',k.tint);set('--field',k.inputFill);set('--gold',k.accent);set('--focus',k.focus);set('--warning',k.warning);set('--danger',k.negative);set('--positive',k.positive);
    set('--mobile-bg',k.canvas);set('--mobile-surface',k.surface);set('--mobile-surface-muted',k.tint);set('--mobile-surface-sunken',k.inputFill);set('--mobile-border',k.border);set('--mobile-text',k.text);set('--mobile-sub',k.textSecondary);set('--mobile-muted',k.textSecondary);set('--mobile-primary',k.primary);set('--mobile-primary-hover',k.primaryHover);set('--mobile-primary-border',mix(k.primary,k.surface,.28));set('--mobile-on-primary',k.onPrimary);set('--mobile-accent',k.accent);set('--mobile-on-banner',k.onBanner);set('--mobile-on-banner-muted',k.onBannerMuted);set('--mobile-segment-track',k.inputFill);set('--mobile-segment-active',k.surface);set('--mobile-warning',k.warning);set('--mobile-danger',k.negative);set('--mobile-shadow',k.shadow);set('--mobile-shadow-strong',k.shadowStrong);
  }
  function write(state){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}try{localStorage.setItem('mizan.theme',JSON.stringify(byId(state.theme).mode))}catch{}}
  function notify(preview){try{window.dispatchEvent(new CustomEvent('mizan:appearance',{detail:{state:{...committed,...(previewState||{})},preview:!!preview}}))}catch{}}
  function get(){return {...committed,...(previewState||{})}}
  function preview(partial){previewState={...(previewState||committed),...partial};apply(previewState);notify(true);if(sheet)refresh();return {...previewState}}
  function rememberFamily(s){const t=byId(s.theme);if(t.mode==='dark')lastDark=t.id;else lastLight=t.id}
  function commit(){committed={...(previewState||committed)};stored={...committed};previewState={...committed};rememberFamily(committed);write(committed);apply(committed);notify(false);close();return {...committed}}
  function cancel(){const had=!!stored;previewState=stored?{...committed}:null;if(!had){const root=document.documentElement;VARNAMES.forEach(v=>root.style.removeProperty(v));root.removeAttribute('data-dark');root.style.colorScheme=''}apply(committed);notify(false);close()}
  function reset(){committed={...DEFAULTS};stored={...committed};previewState={...committed};lastLight=DEFAULT_THEME;lastDark=mobileDefault?'compare-teal':'petrol-night';write(committed);apply(committed);notify(false);refresh();return {...committed}}
  function toggleMode(){
    const s=get();
    const target=byId(s.theme).mode==='dark'?lastLight:lastDark;
    committed={...s,theme:target};stored={...committed};previewState={...committed};rememberFamily(committed);
    write(committed);apply(committed);notify(false);if(sheet)refresh();
    return {...committed};
  }
  function mode(){const s=previewState||(stored?committed:null);return s?byId(s.theme).mode:(mobileDefault?byId(DEFAULTS.theme).mode:null)}
  function previewData(){try{const app=window.MizanApp,p=app.p,s=app.schedule(p);const rows=s.rows.filter(r=>r.type==='installment'&&r.value>0);const vals=[...new Set(rows.map(r=>r.value))];const amount=s.cash?app.money(s.price):(vals.length===1?app.money(vals[0]):app.t('حسب الجدول','Per schedule'));return {amount,label:s.cash?app.t('إجمالي العرض','Offer total'):app.t('قيمة القسط','Installment amount'),price:app.money(s.price)}}catch{return {amount:'—',label:'—',price:'—'}}}
  const v=()=>({...committed,...(previewState||{})});
  const themeSwatch=t=>{const k=tokens(t);return '<button type="button" class="ap-theme'+(v().theme===t.id?' on':'')+'" data-ap-theme="'+t.id+'"><span class="ap-swatch" style="--sw-canvas:'+k.canvas+';--sw-surface:'+k.surface+';--sw-primary:'+k.primary+';--sw-accent:'+k.accent+'"><i></i><i></i><i></i></span><b>'+t.ar+'</b><small>'+t.en+'</small></button>'};
  const offerPreview=(id,name,ar)=>{const pv=previewData();return '<button type="button" class="ap-option'+(v().offer===id?' on':'')+'" data-ap-offer="'+id+'"><span class="ap-mini mini-offer mini-'+id.toLowerCase()+'"><small>'+pv.label+'</small><b>'+pv.amount+'</b><i>'+pv.price+'</i><em></em></span><span>'+ar+'</span><small>'+name+'</small></button>'};
  const detailsPreview=(id,name,ar)=>'<button type="button" class="ap-option'+(v().details===id?' on':'')+'" data-ap-details="'+id+'"><span class="ap-mini mini-details mini-d-'+id.toLowerCase()+'"><b>'+ar+'</b><i></i><i></i><i></i></span><span>'+ar+'</span><small>'+name+'</small></button>';
  const switchPreview=(id,name,ar)=>'<button type="button" class="ap-option'+(v().switchStyle===id?' on':'')+'" data-ap-switch="'+id+'"><span class="ap-mini mini-switch mini-sw-'+id.toLowerCase()+'"><b>كاش</b><b>تقسيط</b></span><span>'+ar+'</span><small>'+name+'</small></button>';
  const navPreview=(id,name,ar)=>'<button type="button" class="ap-option'+(v().navStyle===id?' on':'')+'" data-ap-nav="'+id+'"><span class="ap-mini mini-nav mini-n-'+id.toLowerCase()+'"><i></i><i></i><i></i><i></i><i></i></span><span>'+ar+'</span><small>'+name+'</small></button>';
  function html(){return '<div class="ap-backdrop" data-ap-close></div><section class="ap-sheet" role="dialog" aria-modal="true"><header><div><h2>المظهر</h2><p>معاينة فورية، ثم تطبيق أو إلغاء.</p></div><button type="button" class="ap-x" data-ap-close aria-label="إغلاق">×</button></header><div class="ap-scroll">'+
    '<section><h3>الثيمات والألوان</h3><p class="ap-hint">لا تؤثر الثيمات على ملفات PDF أو الصور المصدّرة.</p><div class="ap-theme-grid">'+THEMES.map(themeSwatch).join('')+'</div></section>'+
    '<section><h3>تصميم العرض</h3><div class="ap-grid">'+OFFER.map(x=>offerPreview(...x)).join('')+'</div></section>'+
    '<section><h3>تصميم التفاصيل</h3><div class="ap-grid">'+DETAILS.map(x=>detailsPreview(...x)).join('')+'</div></section>'+
    '<section><h3>شكل كاش / تقسيط</h3><div class="ap-grid">'+SWITCHES.map(x=>switchPreview(...x)).join('')+'</div></section>'+
    '<section><h3>شكل الشريط السفلي</h3><div class="ap-grid">'+NAVS.map(x=>navPreview(...x)).join('')+'</div></section></div>'+
    '<footer><button type="button" class="ap-btn" data-ap-cancel>إلغاء</button><button type="button" class="ap-btn" data-ap-reset>استعادة الافتراضي</button><button type="button" class="ap-btn primary" data-ap-apply>تطبيق</button></footer></section>'}
  function refresh(){if(sheet)sheet.innerHTML=html()}
  function open(){if(!sheet){sheet=document.createElement('div');sheet.id='appearanceSheet';sheet.className='ap-host';document.body.appendChild(sheet);sheet.addEventListener('click',e=>{if(e.target.closest('[data-ap-close]')||e.target.closest('[data-ap-cancel]')){cancel();return}if(e.target.closest('[data-ap-apply]')){commit();return}if(e.target.closest('[data-ap-reset]')){reset();return}const t=e.target.closest('[data-ap-theme]');if(t){preview({theme:t.dataset.apTheme});return}const o=e.target.closest('[data-ap-offer]');if(o){preview({offer:o.dataset.apOffer});return}const d=e.target.closest('[data-ap-details]');if(d){preview({details:d.dataset.apDetails});return}const sw=e.target.closest('[data-ap-switch]');if(sw){preview({switchStyle:sw.dataset.apSwitch});return}const n=e.target.closest('[data-ap-nav]');if(n)preview({navStyle:n.dataset.apNav})})}refresh();requestAnimationFrame(()=>sheet.classList.add('on'))}
  function close(){if(!sheet)return;sheet.classList.remove('on');const n=sheet;sheet=null;setTimeout(()=>n.remove(),180)}
  window.MizanAppearance={get,preview,commit,cancel,reset,toggleMode,mode,open,close,themes:THEMES,offerLayouts:OFFER,detailsLayouts:DETAILS,switchStyles:SWITCHES,navStyles:NAVS};
  apply(committed);
})();
