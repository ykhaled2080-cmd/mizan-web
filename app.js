'use strict';
const $=s=>document.querySelector(s), A=$('#app');
const read=(k,def)=>{try{return JSON.parse(localStorage.getItem('mizan.'+k))??def}catch{return def}};
const write=(k,v)=>localStorage.setItem('mizan.'+k,JSON.stringify(v));
function mainPresets(type){try{const list=JSON.parse(localStorage.getItem('mizan.presets')||'[]');return Array.isArray(list)?list.filter(x=>x&&x.type===type):[]}catch{return[]}}
function allMainPresets(){try{const list=JSON.parse(localStorage.getItem('mizan.presets')||'[]');return Array.isArray(list)?list:[]}catch{return[]}}
const logoSkins=[
 {id:'gradient',ar:'التدرج الحالي',en:'Current gradient'},
 {id:'letters',ar:'الحروف الأخيرة فاتحة',en:'Light letters'},
 {id:'letters-left',ar:'الحروف + الأطراف الشمالية',en:'Letters + left edges'},
 {id:'muted',ar:'كله مطفي',en:'All muted'},
 {id:'i-corner',ar:'حرف i والزاوية المجاورة',en:'i + adjacent corner'},
 {id:'outline',ar:'كله فاتح عدا داخل المباني',en:'Light except interiors'},
 {id:'i-z',ar:'حرف i بلون z',en:'i in z color'},
 {id:'i-corner-z',ar:'i + زاوية المبني بلون z',en:'i + building corner in z color'},
 {id:'letters-corner',ar:'i + z/a/n + الزاوية بلون z',en:'i + z/a/n + corner in z color'},
 {id:'roof-edges',ar:'حواف بلون الأسطح',en:'Roof-tone edges'},
 {id:'roof-edges-soft',ar:'حواف بلون الأسطح · هادئ',en:'Roof-tone edges · soft'},
 {id:'quiet-details',ar:'تفاصيل داخلية خافتة',en:'Subtle interiors'},
 {id:'short-columns',ar:'أعمدة مختصرة',en:'Shortened columns'},
 {id:'short-tone',ar:'أعمدة مختصرة · لون موحّد',en:'Shortened columns · single tone'}
];
let logoSkin='roof-edges-soft';
let logoPickerHidden=true;
const UI_FONTS=[
 ['IBM Plex Sans Arabic','"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif','IBM Plex Sans Arabic'],
 ['Segoe UI','"Segoe UI",Tahoma,Arial,sans-serif','Segoe UI'],
 ['Tahoma','Tahoma,Arial,sans-serif','Tahoma'],
 ['Calibri','Calibri,"Segoe UI",Tahoma,sans-serif','Calibri'],
 ['Arial','Arial,Helvetica,sans-serif','Arial'],
 ['Times New Roman','"Times New Roman",Times,serif','Times New Roman']
];
const UI_FONT_DEFAULT={body:'"Segoe UI",Tahoma,Arial,sans-serif',heading:'"Segoe UI",Tahoma,Arial,sans-serif',table:'"Segoe UI",Tahoma,Arial,sans-serif',size:14};
let uiFonts=read('uiFonts',{});
const uiFontCss=name=>{const f=UI_FONTS.find(x=>x[0]===name);return f?f[1]:UI_FONT_DEFAULT.body};
function applyUiFonts(){
 const root=document.documentElement;
 const body=uiFonts.body||'';
 const heading=uiFonts.heading||body;
 const table=uiFonts.table||body;
 root.style.setProperty('--ui-font',body?uiFontCss(body):UI_FONT_DEFAULT.body);
 root.style.setProperty('--ui-heading-font',heading?uiFontCss(heading):UI_FONT_DEFAULT.heading);
 root.style.setProperty('--ui-table-font',table?uiFontCss(table):UI_FONT_DEFAULT.table);
 root.style.setProperty('--ui-base-size',(uiFonts.size||UI_FONT_DEFAULT.size)+'px');
 root.toggleAttribute('data-font-custom',!!(uiFonts.body||uiFonts.heading||uiFonts.table||uiFonts.size));
}
function fontPickerHtml(){
 const options=(selected)=>UI_FONTS.map(([name,,label])=>'<option value="'+name+'" '+(selected===name?'selected':'')+'>'+label+'</option>').join('');
 const size=uiFonts.size||UI_FONT_DEFAULT.size;
 return '<div class="font-picker" id="fontPicker" hidden>'+
  '<div class="font-picker-head"><b>تخصيص خطوط البرنامج</b><small>تُثبت حتى تعيدها للافتراضي</small></div>'+
  '<div class="font-picker-quick"><span>خطوط المستندات الرسمية</span><div>'+UI_FONTS.map(([name,,label])=>'<button type="button" data-ui-font-all="'+name+'">'+label+'</button>').join('')+'</div></div>'+
  '<div class="font-picker-grid">'+
   '<label><span>خط العناوين</span><select data-ui-font-key="heading">'+options(uiFonts.heading)+'</select></label>'+
   '<label><span>خط النصوص والأزرار</span><select data-ui-font-key="body">'+options(uiFonts.body)+'</select></label>'+
   '<label><span>خط الجداول</span><select data-ui-font-key="table">'+options(uiFonts.table)+'</select></label>'+
   '<label><span>حجم النص الأساسي · '+size+'px</span><input type="range" min="12" max="18" step="1" value="'+size+'" data-ui-font-size="1"></label>'+
  '</div>'+
  '<div class="font-picker-actions"><button type="button" class="btn" data-act="font-reset">استعادة الافتراضي</button></div>'+
 '</div>';
}
let lang=read('lang','ar'), theme=read('theme','system'), page='calc';
let includeIntro=read('includeIntro',true), includeOutro=read('includeOutro',true);
const t=(ar,en)=>lang==='ar'?ar:en;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateNow=new Date(), start=dateNow.getFullYear()+'-'+String(dateNow.getMonth()+1).padStart(2,'0');
const defaults={unit:'',client:'',phone:'',price:5000000,mode:'rate',down:10,delivery:10,maintenance:8,maintenanceState:'extra',split:false,start,startDay:'',handover:monthAfter(start,36),handoverDay:'',deliveryDateMode:'handover',deliveryDate:'',deliveryDay:'',maintenanceDateMode:'handover',maintenanceDate:'',maintenanceDay:'',fee:0,feeMode:'rate',payer:'buyer',years:7,period:3,termMonths:84,termMonthsMigrated:true,hidden:[],intro:'',outro:'',offerType:'installments',items:emptyItems(),legal:{noDues:false,poa:false,contract:false},showTotal:true,types:{},customRows:[],allocations:[],edits:{}};
let defaultIntro=read('defaultIntro',''), defaultOutro=read('defaultOutro','');
const newOffer=()=>{const o=structuredClone(defaults);o.intro=defaultIntro;o.outro=defaultOutro;return normalizeOffer(o)};
let p=normalizeOffer(read('draft',newOffer())), saved=read('saved',[]).map(normalizeOffer), selected=new Set(),beforeDelete=null;
let editing=null;
let itemFocusAfterRender=null;
let allocYear='',allocAmount='',allocMonths=new Set(['0']);
const defaultOpenSections=()=>new Set();
let sectionOpen=defaultOpenSections();
let coreOpen=true;
const readPlans=()=>{
 const raw=read('plans',[{years:7,down:10},{years:5,down:15},{years:8,down:10}]);
 return (Array.isArray(raw)?raw:[]).map(plan=>{
  const source=plan&&typeof plan==='object'?plan:{};
  const months=Number.isFinite(+source.months)&&+source.months>0?Math.round(+source.months):Math.round((+source.years||0)*12);
  return {...source,months:months>0?months:0,down:Number.isFinite(+source.down)?+source.down:10};
 }).filter(plan=>plan.months>0);
};
let plans=readPlans(), search='', savedSel=new Set();
const paths={logo:'M3 20V9l7-5v16M10 20V8l6-4v16M16 20v-9l5-3v12M2 21h20',calc:'M4 4h16v16H4zM8 8h8M8 12h2m4 0h2m-8 4h2m4 0h2',compare:'M4 20V9h4v11m2 0V4h4v16m2 0v-8h4v8',saved:'M4 5h6l2 2h8v12H4z',save:'M4 4h13l3 3v13H4zM8 4v6h8V4M8 20v-6h8v6',share:'M8 12h9m-4-4 4 4-4 4M6 5H3v14h3',check:'M20 6 9 17l-5-5',sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',moon:'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',plus:'M12 5v14M5 12h14',trash:'M3 6h18M9 6V3h6v3M6 6l1 14h10l1-14M10 9v8m4-8v8',list:'M8 6h13M8 12h13M8 18h13M3 6h1m-1 6h1m-1 6h1',undo:'M8 4 3 9l5 5M4 9h9a6 6 0 0 1 0 12',palette:'M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.4-3 1.8 1.8 0 0 1 1.4-3H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9ZM7.5 10.5h.01M9.5 7h.01M13 6.5h.01M16 8h.01',up:'M6 15l6-6 6 6',down:'M6 9l6 6 6-6',note:'M5 3h10l4 4v14H5zM15 3v5h5M8 12h8M8 16h6',pen:'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13 7l4 4'};
const icon=(k,size=18)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" viewBox="0 0 24 24"><path d="'+paths[k]+'"/></svg>';
const brandMark=()=>'<svg class="brand-mark" aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 38V24l8-6v20M14 38V15l11-6v29M25 38V26l9-5v17M4 40h40"/><path d="M9 27l5-3.5M9 32l5-3.5M17 21l8-4.5M17 27l8-4.5M28 30l6-3.5M28 35l6-3.5" opacity=".5" stroke-width="1.3"/><circle cx="39" cy="9" r="2.4" fill="#d6b778" stroke="none"/></svg>';
const names={down:()=>t('مقدم التعاقد','Down payment'),delivery:()=>t('دفعة الاستلام','Handover payment'),installment:()=>t('قسط','Installment'),payment:()=>t('دفعة','Payment'),maintenance:()=>t('وديعة الصيانة','Maintenance deposit'),fee:()=>t('عمولة الوساطة','Brokerage commission'),garage:()=>t('الجراج','Garage'),storage:()=>t('المخزن','Storage room'),utilities:()=>t('المرافق','Utilities')};
const itemName=k=>t(ITEM_META[k]?.ar||k,ITEM_META[k]?.en||k);
const offerTitle=o=>(o&&o.offerType==='cash')?t('عرض كاش','Cash offer'):t('عرض سداد تقديري','Estimated payment offer');
const dateNum=v=>{if(!v)return '';const s=String(v);return s.length>=10?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):s.slice(5,7)+'/'+s.slice(0,4)};
const parseDateInput=value=>{
 const raw=String(value||'').trim();
 if(isMonth(raw))return {month:raw,day:''};
 const nums=raw.replace(/[^\d\/.\-]/g,'').split(/[\/.\-]/).filter(Boolean).map(Number);
 if(nums.length===2){
  const [month,year]=nums;
  if(month>=1&&month<=12&&year>=1900&&year<=2200)return {month:year+'-'+String(month).padStart(2,'0'),day:''};
 }
 if(nums.length===3){
  const [day,month,year]=nums;
  const max=new Date(year,month,0).getDate();
  if(year>=1900&&year<=2200&&month>=1&&month<=12&&day>=1&&day<=max)return {month:year+'-'+String(month).padStart(2,'0'),day};
 }
 return null;
};
const dateText=(m,day)=>dateNum(fullDate(m,day));
const curr=()=>t('ج.م','EGP');
const fmtMoney=n=>new Intl.NumberFormat(lang==='ar'?'ar-EG-u-nu-latn':'en-GB',{maximumFractionDigits:0}).format(n);
const fmtPct=n=>new Intl.NumberFormat(lang==='ar'?'ar-EG-u-nu-latn':'en-GB',{maximumFractionDigits:2}).format(n);
const fmt=fmtMoney;
const money=c=>'<bdi class="money" dir="ltr">'+fmt(c/100)+'</bdi>';
const dateLabel=m=>dateNum(m);
function maintenanceDueText(src,due){
 if(!src)return '';
 if(src.maintenanceDateMode==='none')return '';
 if(src.maintenanceDateMode==='split')return t('خلال أول سنتين','over first two years');
 const handover=fullDate(src.handover,src.handoverDay);
 const shown=src.maintenanceDateMode==='date'&&due?due:handover;
 if(!shown)return '';
 return String(shown).slice(0,7)===String(handover).slice(0,7)
  ? t('عند الاستلام بتاريخ','at handover on')+' '+dateNum(shown)
  : t('بتاريخ','on')+' '+dateNum(shown);
}
const B=(act,label,ic='',cls='')=>'<button type="button" class="btn '+cls+'" data-act="'+act+'">'+(ic?icon(ic):'')+label+'</button>';
const textField=(key,label,value=p[key],type='text',wide=false)=>'<label class="field '+(wide?'wide':'')+'"><span>'+label+'</span><input data-key="'+key+'" type="'+type+'" '+(type==='text'?'':'dir="ltr"')+' value="'+esc(value)+'"></label>';
const numberField=(key,label,value=p[key],wide=false)=>textField(key,label,value,'text',wide).replace('class="field ','class="field has-grip ').replace('type="text"','type="text" dir="ltr" inputmode="decimal"').replace('</label>','<span class="grip" data-grip="'+key+'" aria-hidden="true">↔</span></label>');
const monthParts=value=>{const m=/^(\d{4})-(\d{2})$/.exec(String(value||''));return m?{year:m[1],month:m[2]}:{year:'',month:''}};
const dateSeg=(attrs,month,day,label)=>{const mp=monthParts(month);return '<span class="date-seg" dir="ltr" data-date-seg="1" '+attrs+'><input class="date-part date-day" data-date-part="day" type="text" inputmode="numeric" maxlength="2" value="'+esc(day||'')+'" placeholder="DD" aria-label="'+esc(label)+' · '+t('اليوم','Day')+'"><span class="date-sep" aria-hidden="true">/</span><input class="date-part date-month" data-date-part="month" type="text" inputmode="numeric" maxlength="2" value="'+esc(mp.month)+'" placeholder="MM" aria-label="'+esc(label)+' · '+t('الشهر','Month')+'"><span class="date-sep" aria-hidden="true">/</span><input class="date-part date-year" data-date-part="year" type="text" inputmode="numeric" maxlength="4" value="'+esc(mp.year)+'" placeholder="YYYY" aria-label="'+esc(label)+' · '+t('السنة','Year')+'"></span>';};
const monthDayField=(key,label,month=p[key],day=p[key+'Day'],dayKey=key+'Day')=>'<label class="field"><span>'+label+'</span>'+dateSeg('data-date-key="'+key+'" data-date-day-key="'+dayKey+'"',month,day,label)+'</label>';
const options=(key,label,items,val=p[key])=>'<label class="field"><span>'+label+'</span><select data-key="'+key+'">'+items.map(([v,l])=>'<option value="'+v+'" '+(String(val)===String(v)?'selected':'')+'>'+l+'</option>').join('')+'</select></label>';
const noteField=(key,label)=>{
 const value=p[key]||'';
 const list=mainPresets(key);
 return '<div class="field wide note-field"><span class="note-label"><b>'+label+'</b></span><textarea data-key="'+key+'" dir="auto" maxlength="800" rows="3" aria-label="'+esc(label)+'">'+esc(value)+'</textarea>'+
  '<div class="note-presets"><select data-main-preset="'+key+'" aria-label="'+t('استدعاء Preset','Load preset')+'"><option value="">'+t('Preset محفوظ','Saved preset')+'</option>'+list.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('')+'</select>'+
  '<input data-main-preset-name="'+key+'" maxlength="40" placeholder="'+t('اسم Preset جديد','New preset name')+'" aria-label="'+t('اسم Preset جديد','New preset name')+'">'+
  '<button type="button" class="mini-btn" data-act="save-main-preset" data-note-type="'+key+'">'+t('حفظ Preset','Save preset')+'</button></div></div>';
};
const frequency=()=>({1:t('شهري','Monthly'),3:t('ربع سنوي','Quarterly'),6:t('نصف سنوي','Semiannual'),12:t('سنوي','Annual')});
const titles=()=>({calc:t('خطة السداد','Payment plan'),compare:t('مقارنة العروض','Compare offers'),saved:t('العروض المحفوظة','Saved offers')});
function drawHeader(){
 applyUiFonts();
 const dark=theme==='dark'||(theme==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
 document.documentElement.toggleAttribute('data-native',!!window.chrome?.webview);
 document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 document.documentElement.toggleAttribute('data-dark',dark);
 document.title=t('ميزان | إعداد العروض العقارية','Mizan | Real Estate Offer Builder');
 try{if(window.chrome&&window.chrome.webview)window.chrome.webview.postMessage({type:'mizan-ui',dark,lang})}catch{}
 const themeLabel=dark?t('الوضع الفاتح','Light mode'):t('الوضع الداكن','Dark mode');
 $('#header').innerHTML='<div class="top"><nav class="desktop-nav">'+Object.entries(titles()).map(([k,v])=>'<button class="nav '+(k===page?'on':'')+'" data-act="'+k+'">'+icon(k)+v+'</button>').join('')+'</nav><div class="tools">'+B('lang',t('EN','عربي'),'','tools-btn')+'<button type="button" class="btn iconbtn tools-btn" data-act="theme-toggle" aria-label="'+themeLabel+'" title="'+themeLabel+'">'+icon(dark?'sun':'moon')+'</button>'+(logoPickerHidden?'':'<span class="tools-sep" aria-hidden="true"></span><button type="button" class="btn iconbtn tools-btn" data-act="logo-picker" aria-label="'+t('تخصيص شكل الشعار','Customize logo')+'" title="'+t('تخصيص شكل الشعار','Customize logo')+'" aria-expanded="false">'+icon('palette')+'</button>')+'</div></div>'+(logoPickerHidden?'':logoPickerHtml());
 const mobile=[['calc',t('الخطة','Plan'),'calc'],['terms',t('الشروط','Terms'),'list'],['compare',t('المقارنة','Compare'),'compare'],['saved',t('المحفوظة','Saved'),'saved'],['wa-share',t('مشاركة','Share'),'share']];
 $('#mobilenav').innerHTML='<nav class="mobile-nav" aria-label="'+t('التنقل','Navigation')+'">'+mobile.map(([k,label,ic])=>'<button type="button" class="mobile-tab '+(k===page?'on':'')+(k==='wa-share'?' accent':'')+'" data-act="'+k+'" '+(k===page?'aria-current="page"':'')+'>'+icon(ic,20)+'<span>'+label+'</span></button>').join('')+'</nav>';
}
function logoPickerHtml(){
 return '<div class="logo-picker" id="logoPicker" hidden>'+
  '<div class="logo-picker-head"><span>'+t('شكل الشعار','Logo style')+'</span><small>'+t('اختر الشكل ثم ثبّته','Pick a style, then pin it')+'</small></div>'+
  '<div class="logo-picker-grid">'+logoSkins.map(x=>'<button type="button" class="logo-choice '+(x.id===logoSkin?'on':'')+'" data-logo-skin="'+x.id+'">'+logoMarkup(x.id,'skin-preview')+'<span>'+t(x.ar,x.en)+'</span></button>').join('')+'</div>'+
  '<button type="button" class="logo-pin" data-act="logo-pin">'+icon('check',16)+t('تثبيت وإخفاء زر التخصيص','Pin and hide customize button')+'</button>'+
 '</div>';
}
function selectLogoSkin(id){
 if(!logoSkins.some(x=>x.id===id))return;
 logoSkin=id;write('logoSkin',id);
 document.querySelectorAll('.hero-brand[data-skin]:not(.skin-preview)').forEach(el=>{el.dataset.skin=id});
 document.querySelectorAll('[data-logo-skin]').forEach(b=>b.classList.toggle('on',b.dataset.logoSkin===id));
}
function pinLogoPicker(){
 logoPickerHidden=true;write('logoPickerHidden',true);
 drawHeader();
 note(t('تم تثبيت شكل الشعار','Logo style pinned'));
}
const logoMarkup=(skin=logoSkin,cls='')=>'<div class="hero-brand '+cls+'" data-skin="'+skin+'" role="img" aria-label="Mizan"><i class="hb-layer hb-base" aria-hidden="true"></i><i class="hb-layer hb-outline" aria-hidden="true"></i><i class="hb-layer hb-letters" aria-hidden="true"></i><i class="hb-layer hb-left" aria-hidden="true"></i><i class="hb-layer hb-i" aria-hidden="true"></i><i class="hb-layer hb-z" aria-hidden="true"></i><i class="hb-layer hb-corner" aria-hidden="true"></i><i class="hb-layer hb-interiors" aria-hidden="true"></i></div>';
function hero(s){
 if(s.cash){
  const label=p.showTotal===false?t('سعر الوحدة','Unit price'):t('إجمالي العرض','Offer total');
  return '<section class="cash-total"><div class="cash-total-title">'+label+'</div><div class="cash-total-value">'+money(s.price)+' <small>'+curr()+'</small></div></section>';
 }
 const k=t('قيمة القسط','Installment amount'),vk=t('قيمة الأقساط','Installment values');
 const instRows=s.rows.filter(r=>r.type==='installment'&&r.value>0);
 const instVals=[...new Set(instRows.map(r=>r.value))];
 const baseVals=instRows.slice(0,-1).map(r=>r.value);
 const baseEqual=baseVals.length>0&&baseVals.every(v=>v===baseVals[0]);
 const lastVal=instRows.length?instRows[instRows.length-1].value:0;
 const roundingAdjusted=baseEqual&&lastVal!==baseVals[0]&&baseVals[0]-lastVal>0&&baseVals[0]-lastVal<=instRows.length*100;
 const fixed=instRows.length>0&&(instVals.length===1||roundingAdjusted);
 const fixedVal=instVals.length===1?instVals[0]:(baseVals[0]||lastVal);
 const instBig=(s.valid&&s.count)?(fixed?money(fixedVal)+' <small>'+curr()+'</small>':t('متغيرة','Variable')):'—';
 const termMonths=s.termMonths||Math.round((+p.years||0)*12);
 const termText=termMonths>0?(termMonths%12===0?(termMonths/12===1?t('سنة واحدة','one year'):termMonths/12===2?t('سنتان','two years'):(termMonths/12)+' '+t('سنوات','years')):termMonths+' '+t('شهرًا','months')):'';
 return '<section class="hero"><div class="herogrid"><div><div class="kicker">'+(fixed?k:vk)+' · '+frequency()[p.period]+'</div><div class="big">'+instBig+'</div><div class="kicker">'+[termText,s.count+' '+t('قسطًا','installments')].filter(Boolean).join(' · ')+'</div></div><div class="metrics">'+[[t('سعر الوحدة','Unit price'),s.price],[names.down(),s.down],[t('الموزّع على الأقساط','Financed amount'),s.financed]].map(([k,v])=>'<div><span>'+k+'</span>'+money(v)+'</div>').join('')+'</div>'+logoMarkup()+'</div></section>';
}
function showTotalValue(s){return s.total}
function details(id,name,body){return '<details class="line" data-section="'+id+'" '+(sectionOpen.has(id)?'open':'')+'><summary>'+name+'</summary><div class="fields">'+body+'</div></details>'}
function increaseBlock(s){
 return '<details class="increase-inline" data-section="increase"><summary>'+t('زيادة المقدم بمبلغ','Increase down payment by amount')+'</summary><div class="increase-row"><label class="field"><span>'+t('المبلغ الإضافي','Additional amount')+'</span><input dir="ltr" id="extra" inputmode="decimal"></label>'+B('increase',t('إضافة','Add'),'plus')+'</div></details>';
}
function typeSwitch(){
 const cash=p.offerType==='cash';
 return '<div class="offer-type" role="group" aria-label="'+t('نوع العرض','Offer type')+'">'+
  '<button type="button" data-act="type-cash" class="'+(cash?'on':'')+'" aria-pressed="'+cash+'" title="'+t('عرض كاش','Cash offer')+'">'+t('كاش','Cash')+'</button>'+
  '<button type="button" data-act="type-installments" class="'+(!cash?'on':'')+'" aria-pressed="'+(!cash)+'" title="'+t('عرض تقسيط','Installment offer')+'">'+t('تقسيط','Installments')+'</button>'+
 '</div>';
}
function checkline(attrs,label,checked){
 return '<label class="checkline"><input type="checkbox" '+attrs+' '+(checked?'checked':'')+'><span>'+label+'</span></label>';
}
function itemEditor(){
 return '<div class="item-grid">'+ITEM_KEYS.map(key=>{
  const item=p.items[key]||{state:'unspecified',amount:0,due:'',day:''};
  const extra=item.state==='extra';
  const included=item.state==='included';
  const excluded=item.state==='excluded';
  const reveal=itemFocusAfterRender&&itemFocusAfterRender.key===key&&itemFocusAfterRender.prop==='amount';
  return '<div class="item-row'+(extra?' is-extra':'')+(included?' is-included':'')+(excluded?' is-excluded':'')+(reveal?' just-opened':'')+'" data-item-row="'+key+'">'+
   '<div class="item-head"><b class="item-name"><span class="item-dash">-</span>'+itemName(key)+'</b><label class="mini-field item-state-field"><span>'+t('الحالة','Status')+'</span><select class="item-state" data-item="'+key+'" data-item-prop="state" aria-label="'+itemName(key)+' · '+t('الحالة','Status')+'">'+
    [['unspecified',t('غير محدد','Not specified')],['included',t('شامل السعر','Included in price')],['excluded',t('غير شامل السعر','Excluded from price')],['extra',t('تكلفة إضافية','Additional charge')]].map(([v,l])=>'<option value="'+v+'" '+(item.state===v?'selected':'')+'>'+l+'</option>').join('')+
   '</select></label>'+
   ((extra||included||excluded)?'<label class="mini-field item-amount-field"><span>'+t('المبلغ','Amount')+'</span><input type="text" inputmode="decimal" dir="ltr" data-item="'+key+'" data-item-prop="amount" value="'+esc(item.amount||'')+'" aria-label="'+t('المبلغ','Amount')+' · '+itemName(key)+'" aria-required="'+(extra?'true':'false')+'"></label>'+(extra?'<label class="mini-field item-date-field"><span>'+t('تاريخ الاستحقاق','Due date')+'</span>'+dateSeg('data-date-item="'+key+'"',item.due,item.day,t('تاريخ الاستحقاق','Due date')+' · '+itemName(key))+'</label>':'')+'':'')+
  '</div></div>';
 }).join('')+'</div>';
}
function missingExtraItem(){
 return ITEM_KEYS.find(key=>{
  const item=p.items[key];
  return item&&item.state==='extra'&&!(Number.isFinite(+item.amount)&&+item.amount>0);
 })||'';
}
function legalEditor(){
 const extra=schedule(p).extrasTotal>0;
 return checkline('data-legal="noDues"',t('لا توجد أي مستحقات أخرى على الوحدة','No other outstanding dues on the unit'),p.legal.noDues)+
  checkline('data-legal="poa"',t('يوجد توكيل','Power of attorney exists'),p.legal.poa)+
  checkline('data-legal="contract"',t('يوجد عقد نهائي','Final contract exists'),p.legal.contract)+
  (extra?'<p class="hint">'+t('مع وجود مستحقات إضافية سيظهر البيان بصيغة: لا توجد مستحقات أخرى بخلاف المبالغ الموضحة في العرض.','With additional charges, the statement appears as: no other dues beyond the amounts shown in the offer.')+'</p>':'');
}
function allocationEditor(s){
 const years=[...new Set(s.rows.filter(r=>r.type==='installment').map(r=>r.date.slice(0,4)) )];
 if(!years.length)years.push(String(new Date().getFullYear()));
 if(!allocYear||!years.includes(allocYear))allocYear=years[0];
 const monthItems=[['0',t('كل الشهور','All months')],...Array.from({length:12},(_,i)=>[String(i+1),String(i+1).padStart(2,'0')])];
 const groups={};
 for(const a of p.allocations||[]){
  const amount=+a.amount||0,key=a.year+'|'+amount;
  if(!groups[key])groups[key]={year:a.year,amount,months:new Set()};
  groups[key].months.add(+a.month||0);
 }
 const list=Object.values(groups).map(g=>{
  const months=g.months.has(0)?t('كل الشهور','All months'):[...g.months].sort((a,b)=>a-b).map(m=>String(m).padStart(2,'0')).join('، ');
  return '<span class="alloc-chip"><b>'+g.year+' · '+months+'</b><span>'+fmtMoney(g.amount)+' '+curr()+'</span><button type="button" class="alloc-x" data-act="remove-alloc-group" data-alloc-year="'+g.year+'" data-alloc-amount="'+g.amount+'" aria-label="'+t('حذف التوزيع','Remove allocation')+'">×</button></span>';
 }).join('');
 return '<div class="alloc-editor"><div class="alloc-form">'+
  '<label class="mini-field"><span>'+t('السنة','Year')+'</span><select data-alloc="year">'+years.map(y=>'<option value="'+y+'" '+(y===allocYear?'selected':'')+'>'+y+'</option>').join('')+'</select></label>'+
  '<label class="mini-field"><span>'+t('قيمة القسط','Installment amount')+' · '+curr()+'</span><input inputmode="decimal" dir="ltr" data-alloc="amount" value="'+esc(allocAmount)+'" placeholder="0"></label>'+
  '<button type="button" class="btn assign-btn" data-act="apply-alloc">'+icon('check')+t('تطبيق التوزيع','Apply allocation')+'</button>'+
  '<div class="alloc-months" role="group" aria-label="'+t('الشهور','Months')+'">'+monthItems.map(([v,l])=>'<button type="button" class="alloc-month '+(allocMonths.has(v)?'on':'')+'" data-alloc-month="'+v+'" aria-pressed="'+allocMonths.has(v)+'">'+l+'</button>').join('')+'</div>'+
 '</div>'+
  (list?'<div class="alloc-list">'+list+'</div>':'')+
 '</div>';
}
function editor(s){
 const cash=s.cash;
 const coreFields='<div class="fields core-grid">'+
  textField('client',t('اسم العميل','Client name'))+
  textField('phone',t('رقم واتساب','WhatsApp number'))+
  textField('unit',t('الوحدة','Unit'),p.unit,'text')+
  numberField('price',t('سعر الوحدة','Unit price')+' · '+curr(),p.price)+
  (cash?'':numberField('rate',t('نسبة مقدم التعاقد','Down payment')+' %',p.mode==='rate'?p.down:+(s.down/s.price*100||0).toFixed(5))+
   numberField('amount',t('مبلغ مقدم التعاقد','Down payment amount'),Math.round(s.down/100)))+
  '</div>';
 const coreToggle='<button type="button" class="terms-chevron" data-act="toggle-core" aria-expanded="'+(coreOpen?'true':'false')+'" aria-controls="termsCore" aria-label="'+t(coreOpen?'طي شروط العرض':'فتح شروط العرض',coreOpen?'Collapse offer terms':'Expand offer terms')+'" title="'+t(coreOpen?'طي شروط العرض':'فتح شروط العرض',coreOpen?'Collapse offer terms':'Expand offer terms')+'">'+icon('down',15)+'</button>';
 return '<aside class="editor" id="terms"><div class="sectionhead terms-head"><div class="terms-title-wrap"><h2>'+t('شروط العرض','Offer terms')+'</h2>'+coreToggle+'</div><div class="terms-center">'+typeSwitch()+'</div><div class="terms-new">'+B('reset',t('عرض جديد','New offer'))+'</div></div>'+
  '<p class="mobile-hint">'+t('اسحب أي حقل رقمي أفقيًا بالصباع لزيادة القيمة أو تقليلها.','Drag any numeric field horizontally to change its value.')+'</p>'+
  '<div class="terms-core" id="termsCore"'+(coreOpen?'':' hidden')+'>'+coreFields+
  (cash?'':increaseBlock(s))+'</div>'+
  (cash?'':details('plan',t('خطة التقسيط','Payment plan'),'<div class="fields">'+numberField('termMonths',t('مدة التقسيط بالشهور','Term in months'),p.termMonths||Math.round((+p.years||0)*12))+options('period',t('دورية القسط','Frequency'),Object.entries(frequency()))+'</div>'))+
   details('fees',names.fee()+(s.commission?' · '+fmt(s.commission/100)+' '+curr():''),options('feeMode',t('طريقة الحساب','Calculation'),[['rate',t('نسبة من السعر','Percentage')],['amount',t('مبلغ ثابت','Fixed amount')]])+numberField('fee',names.fee()+' · '+(p.feeMode==='rate'?'%':curr()),p.feeMode==='amount'?Math.round(p.fee):p.fee)+options('payer',t('يتحملها','Paid by'),[['buyer',t('المشتري','Buyer')],['seller',t('البائع','Seller')]]))+
  details('handover',t('الاستلام والصيانة والتواريخ','Handover, maintenance & dates'),
   (cash?'':numberField('delivery',names.delivery()+' %')+options('deliveryDateMode',t('موعد دفعة الاستلام','Handover payment date'),[['handover',t('عند الاستلام','At handover')],['date',t('تاريخ محدد','Specific date')],['none',t('بدون ذكر','No timing')]])+(p.deliveryDateMode==='date'?monthDayField('deliveryDate',t('تاريخ دفعة الاستلام','Handover payment date'),p.deliveryDate||p.handover,p.deliveryDay,'deliveryDay'):''))+
   options('maintenanceState',names.maintenance(),[['unspecified',t('غير محدد','Not specified')],['included',t('شامل السعر','Included in price')],['extra',t('بتكلفة إضافية','Additional charge')]])+
   (p.maintenanceState==='extra'?numberField('maintenance',names.maintenance()+' %')+options('maintenanceDateMode',t('موعد وديعة الصيانة','Maintenance due'),[['handover',t('عند الاستلام','At handover')],['date',t('تاريخ محدد','Specific date')],['split',t('خلال أول سنتين','Over first two years')],['none',t('بدون ذكر','No timing')]])+(p.maintenanceDateMode==='date'?monthDayField('maintenanceDate',t('تاريخ وديعة الصيانة','Maintenance date'),p.maintenanceDate||p.handover,p.maintenanceDay,'maintenanceDay'):''):'')+
   monthDayField('start',t('تاريخ التعاقد','Contract date'),p.start,p.startDay)+
   monthDayField('handover',t('تاريخ الاستلام','Handover date'),p.handover,p.handoverDay))+
  details('items',t('الجراج والمخزن والمرافق','Garage, storage & utilities'),'<div class="wide">'+itemEditor()+'</div>')+
  details('legal',t('الحالة المالية والقانونية','Financial & legal status'),'<div class="wide">'+legalEditor()+'</div>')+
  details('notes',t('المقدمة والخاتمة','Intro & closing'),noteField('intro',t('مقدمة','Introduction'))+noteField('outro',t('خاتمة','Closing'))+checkline('data-show-total',t('إظهار الإجمالي في العرض','Show the overall total'),p.showTotal!==false))+'</aside>';
}
function rowEditorPanel(s){
 if(!editing)return '';
 const r=s.rows.find(row=>row.id===editing);
 if(!r)return '';
 const type='<select id="rowType" aria-label="'+t('نوع الدفعة','Payment type')+'"><option value="installment" '+(r.type==='installment'?'selected':'')+'>'+names.installment()+'</option><option value="payment" '+(r.type==='payment'?'selected':'')+'>'+names.payment()+'</option></select>';
 return '<div class="row-editor"><label class="mini-field"><span>'+t('نوع الدفعة','Payment type')+'</span>'+type+'</label><label class="mini-field"><span>'+t('التاريخ','Date')+'</span><input type="text" inputmode="numeric" id="rowDate" dir="ltr" data-date-text="1" value="'+esc(dateNum(r.date))+'" placeholder="'+t('MM/YYYY أو DD/MM/YYYY','MM/YYYY or DD/MM/YYYY')+'"></label><label class="mini-field"><span>'+t('القيمة','Value')+' · '+curr()+'</span><input id="rowValue" inputmode="decimal" dir="ltr" value="'+Math.round(r.value/100)+'"></label>'+B('applyRow',t('حفظ','Save'))+B('cancelRow',t('إلغاء','Cancel'))+'</div>';
}
function rowTypeCell(r){
 return '<span class="type">'+names[r.type]()+(r.type==='installment'&&r.number?' '+r.number:'')+'</span>';
}
function rowSource(r){
 if(!r)return null;
 if(r.id==='down')return {kind:'down'};
 if(r.id==='delivery')return {kind:'delivery'};
 if(r.id==='fee')return {kind:'fee'};
 if(r.maintenanceSplit)return {kind:'maintenanceSplit'};
 if(r.type==='maintenance')return {kind:'maintenance'};
 if(ITEM_KEYS.includes(r.id))return {kind:'item',key:r.id};
 if(r.custom)return {kind:'custom'};
 if(r.generated)return {kind:'installment'};
 return {kind:'custom'};
}
function rowTypeChoices(r,src){
 const base=[['down',names.down()],['installment',names.installment()],['payment',names.payment()],['delivery',names.delivery()],['maintenance',names.maintenance()],['garage',names.garage()],['storage',names.storage()],['utilities',names.utilities()]];
 if(src.kind==='installment')return [['installment',names.installment()],['payment',names.payment()],['delivery',names.delivery()]];
 if(src.kind==='maintenanceSplit')return [['maintenance',names.maintenance()]];
 if(src.kind==='fee')base.unshift(['fee',names.fee()]);
 if(src.kind==='item')base.unshift([src.key,itemName(src.key)]);
 return base;
}
function rowEditHtml(r){
 const src=rowSource(r);
 if(!src)return '';
 const current=src.kind==='item'?src.key:(src.kind==='maintenanceSplit'?'maintenance':r.type);
 const choices=rowTypeChoices(r,src);
 return '<tr class="row-edit-line"><td colspan="5"><div class="row-edit-inline">'+
  '<label class="mini-field"><span>'+t('نوع الدفعة','Payment type')+'</span><select id="rowType">'+choices.map(([v,l])=>'<option value="'+v+'" '+(v===current?'selected':'')+'>'+l+'</option>').join('')+'</select></label>'+
  '<label class="mini-field"><span>'+t('التاريخ','Date')+'</span>'+dateSeg('data-row-date="1"',String(r.date||'').slice(0,7),(String(r.date||'').length>=10?String(r.date).slice(8,10):''),t('التاريخ','Date'))+'</label>'+
  '<label class="mini-field"><span>'+t('القيمة','Value')+' · '+curr()+'</span><input id="rowValue" inputmode="decimal" dir="ltr" value="'+Math.round(r.value/100)+'"></label>'+
  '<div class="row-edit-actions">'+B('applyRow',t('حفظ','Save'),'check')+B('cancelRow',t('إلغاء','Cancel'))+'</div>'+
  '</div>'+(src.kind==='maintenanceSplit'?'<p class="row-edit-note">'+t('دفعة صيانة موزعة على أول سنتين؛ تعديل القيمة يعدّل إجمالي وديعة الصيانة.','A maintenance payment split over the first two years; changing the value adjusts the total maintenance deposit.')+'</p>':'')+'</td></tr>';
}
const SCHEDULE_PAYMENT_TYPES=new Set(['down','delivery','installment','payment']);
const schedulePaymentRows=s=>(s&&Array.isArray(s.rows)?s.rows:[]).filter(r=>SCHEDULE_PAYMENT_TYPES.has(r.type));
function table(s,printed=false){
 const rows=printed?s.rows:schedulePaymentRows(s);
 const headCols=[[t('نوع الدفعة','Payment type'),'type'],[t('تاريخ الدفعة','Payment date'),'date'],[t('القيمة','Amount'),'value'],[t('رصيد الوحدة','Property balance'),'balance']];
 const cols=printed?'':'<colgroup><col class="col-check" style="width:42px"><col class="col-type" style="width:23%"><col class="col-date" style="width:23%"><col class="col-value" style="width:22%"><col class="col-balance" style="width:27%"></colgroup>';
 const headTh=(h,c)=>'<th class="cell-'+c+'">'+h+'</th>';
 const allChecked=rows.length&&rows.every(r=>selected.has(r.id));
 const checkHead=!printed?'<th class="cell-check"><input type="checkbox" data-all aria-label="'+t('تحديد الكل','Select all')+'" '+(allChecked?'checked':'')+'></th>':'';
 const editHead=!printed?'<th class="cell-edit" aria-label="'+t('إجراءات الدفعة','Payment actions')+'"></th>':'';
 const head=printed
  ?headCols.map(([h,c])=>headTh(h,c)).join('')
  :checkHead+headCols.map(([h,c])=>headTh(h,c)).join('')+editHead;
 const body=rows.map(r=>{
  const check=!printed?'<td class="cell-check"><input type="checkbox" data-id="'+r.id+'" aria-label="'+esc(names[r.type]()+' '+dateNum(r.date))+'" '+(selected.has(r.id)?'checked':'')+'></td>':'';
  const actions=!printed?'<td class="cell-edit"><span class="row-actions"><button type="button" class="row-add-btn" data-add-row="'+r.id+'" aria-label="'+t('إضافة دفعة جديدة','Add a new payment')+'" title="'+t('إضافة دفعة جديدة','Add a new payment')+'">'+icon('plus',11)+'</button><button type="button" class="row-edit-btn" data-edit-row="'+r.id+'" aria-label="'+t('تعديل الدفعة','Edit payment')+'" title="'+t('تعديل الدفعة','Edit payment')+'">'+icon('pen',10)+'</button></span></td>':'';
  const type='<td class="cell-type" data-label="'+t('النوع','Type')+'">'+rowTypeCell(r)+'</td>';
  const date='<td class="cell-date" data-label="'+t('التاريخ','Date')+'"><bdi dir="ltr">'+dateNum(r.date)+'</bdi></td>';
  const value='<td class="cell-value" data-label="'+t('القيمة','Amount')+'">'+money(r.value)+'</td>';
  const balance='<td class="cell-balance" data-label="'+t('الرصيد','Balance')+'">'+money(r.balance)+'</td>';
  const cells=printed?(type+date+value+balance):(check+type+date+value+balance+actions);
  return '<tr>'+cells+'</tr>'+(!printed&&editing===r.id?rowEditHtml(r):'');
 }).join('');
 return '<table class="'+(printed?'':'schedule-grid')+'">'+cols+'<thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table>';
}
const shareButton=()=>B('wa-share',t('مشاركة','Share'),'share');
function legalLines(src,language=lang){
 const t=(ar,en)=>language==='ar'?ar:en;
 const out=[];
 if(!src.legal)return out;
 const extra=schedule(src).extrasTotal>0;
 if(src.legal.noDues)out.push(extra?t('لا توجد مستحقات مالية أخرى بخلاف المبالغ الموضحة أعلاه','No other financial dues beyond the amounts shown above'):t('لا توجد مستحقات مالية أخرى على الوحدة','No other financial dues on the unit'));
 if(src.legal.poa)out.push(t('ويوجد توكيل','A power of attorney exists'));
 if(src.legal.contract)out.push(t('ويوجد عقد نهائي','A final contract exists'));
 return out;
}
const installmentCountText=n=>lang==='ar'?(n===1?'قسط واحد':n===2?'قسطان':n>=3&&n<=10?n+' أقساط':n+' قسطًا'):n+' '+(n===1?'installment':'installments');
const paymentCountText=n=>lang==='ar'?(n===1?'دفعة واحدة':n===2?'دفعتان':n>=3&&n<=10?n+' دفعات':n+' دفعة'):n+' '+(n===1?'payment':'payments');
function extraMeta(src,e){
 if(e.label==='maintenance')return maintenanceDueText(src,e.due);
 const date=e.dueMode==='date'&&e.due?dateNum(e.due):'';
 return date?t('بتاريخ','on')+' '+date:'';
}
function cashPanel(s){
 const src=normalizeOffer(p);
 const charges=[];
 for(const e of (Array.isArray(s.extras)?s.extras:[])){
  const pctMeta=e.label==='maintenance'&&p.maintenance>0?' ('+fmtPct(p.maintenance)+'%)':'';
  const due=e.label==='maintenance'?maintenanceDueText(src,e.due):extraMeta(src,e);
  charges.push({name:itemName(e.label)+pctMeta,due,amount:e.amount});
 }
 const feeRate=p.feeMode==='rate'?fmtPct(p.fee)+'%':'';
 const feePayer=p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller');
 const dueHtml=due=>esc(due).replace(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{4})/g,'<bdi dir="ltr">$1</bdi>');
 if(s.commission)charges.push({name:names.fee()+' - '+[feePayer,feeRate?'('+feeRate+')':''].filter(Boolean).join(' '),due:'',amount:s.commission,commission:true});
 const included=s.includes.length?'<section class="cash-section cash-included"><h3>'+t('السعر يشمل','Price includes')+'</h3><div class="cash-included-list">'+s.includedItems.map(x=>'<div class="cash-included-row"><span class="cash-included-name">'+esc(itemName(x.key))+'</span>'+(x.amount>0?'<b class="cash-included-amount">'+fmtMoney(x.amount/100)+' <small>'+curr()+'</small></b>':'')+'</div>').join('')+'</div></section>':'';
 const excludedCash=(s.excludedItems||[]).length?'<section class="cash-section cash-excluded"><h3>'+t('السعر لا يشمل','Price does not include')+'</h3><div class="cash-included-list">'+s.excludedItems.map(x=>'<div class="cash-included-row"><span class="cash-included-name">'+esc(itemName(x.key))+'</span>'+(x.amount>0?'<b class="cash-included-amount">'+fmtMoney(x.amount/100)+' <small>'+curr()+'</small></b>':'')+'</div>').join('')+'</div></section>':'';
 const chargesHtml=charges.length?'<section class="cash-section cash-charges"><h3>'+t('مستحقات إضافية','Additional charges')+'</h3><div class="cash-charge-list">'+charges.map(c=>'<div class="cash-charge-row'+(c.commission?' is-commission':'')+'"><div class="cash-charge-desc"><span class="cash-charge-name">'+esc(c.name)+'</span>'+(c.due?'<span class="cash-charge-due">'+dueHtml(c.due)+'</span>':'')+'</div><b class="cash-charge-amount">'+fmtMoney(c.amount/100)+' <small>'+curr()+'</small></b></div>').join('')+'</div></section>':'';
 const financial=src.legal.noDues?((charges.length>0||s.commission)?t('لا توجد مستحقات مالية أخرى بخلاف المبالغ الموضحة أعلاه.','No other financial dues beyond the amounts shown above.'):t('لا توجد مستحقات مالية أخرى على الوحدة.','No other financial dues on the unit.')):'';
 const legalStatus=[src.legal.poa?t('يوجد توكيل.','A power of attorney exists.'):'',src.legal.contract?t('يوجد عقد نهائي.','A final contract exists.'):''].filter(Boolean).join(' ');
 const legalHtml=(financial||legalStatus)?'<section class="cash-section cash-legal"><h3>'+t('الحالة المالية والقانونية','Financial & legal status')+'</h3>'+
  (financial?'<div class="cash-legal-line"><b>'+t('الحالة المالية:','Financial status:')+'</b> '+esc(financial)+'</div>':'')+
  (legalStatus?'<div class="cash-legal-line"><b>'+t('الحالة القانونية:','Legal status:')+'</b> '+esc(legalStatus)+'</div>':'')+'</section>':'';
 return '<div class="cash-panel">'+included+excludedCash+chargesHtml+legalHtml+'</div>';
}
function tableSummary(s){
 const src=normalizeOffer(p);
 const rows=[];
 const includedItems=s.includedItems||[];
 if(includedItems.length)rows.push([t('السعر يشمل','Included in price'),includedItems.map(e=>itemName(e.key)+(e.amount>0?' '+fmtMoney(e.amount/100)+' '+curr():'')).join(' · ')]);
 const excludedItems=s.excludedItems||[];
 if(excludedItems.length)rows.push([t('السعر لا يشمل','Price does not include'),excludedItems.map(e=>itemName(e.key)+(e.amount>0?' '+fmtMoney(e.amount/100)+' '+curr():'')).join(' · ')]);
 const extraItems=s.extras||[];
 const feeRate=p.feeMode==='rate'?fmtPct(p.fee)+'%':'';
 const feePayer=p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller');
 const extraParts=extraItems.map(e=>itemName(e.label)+' '+fmtMoney(e.amount/100)+' '+curr()+(extraMeta(src,e)?' · '+extraMeta(src,e):''));
 if(s.commission)extraParts.push(names.fee()+' '+fmtMoney(s.commission/100)+' '+curr()+' · '+[feePayer,feeRate?'('+feeRate+')':''].filter(Boolean).join(' '));
 if(extraParts.length)rows.push([t('مستحقات إضافية','Additional charges'),extraParts.join(' · ')]);
 if(s.gap)rows.push([t('غير مجدول','Unscheduled'),fmtMoney(s.gap/100)+' '+curr()]);
 const totalRow='<div class="ts-row ts-total"><span class="ts-label">'+t('إجمالي سداد الوحدة','Unit payment total')+'</span><b class="ts-val">'+money(s.total)+' '+curr()+'</b></div>';
 return '<div class="table-summary">'+totalRow+rows.map(([label,value])=>'<div class="ts-row"><span class="ts-label">'+label+'</span><span class="ts-val">'+esc(value)+'</span></div>').join('')+'</div>';
}
function calculator(){
 const s=schedule(p), good=s.valid;
 const paymentRows=schedulePaymentRows(s);
 const title='<div class="titleline"><h1 class="plan-title">'+(s.cash?t('عرض الكاش','Cash offer'):t('خطة السداد','Payment plan'))+'</h1><div class="actions">'+B('terms',t('الشروط','Terms'),'list','mobile-only')+shareButton()+B('save',t('حفظ العرض','Save offer'),'save','primary')+'</div></div>';
 if(s.cash){
  return title+'<div class="workspace cash-workspace">'+editor(s)+'<section class="cash-summary">'+hero(s)+(!good?'<p class="error">'+t('أدخل سعر الوحدة.','Enter the unit price.')+'</p>':cashPanel(s))+'</section></div>';
 }
 const selRows=selected.size?paymentRows.filter(r=>selected.has(r.id)):[];
 const selValue=selRows.reduce((sum,r)=>sum+r.value,0);
 const infoLines=[];
 if(s.gap)infoLines.push('<p class="summary-note">'+t('غير مجدول','Unscheduled')+' · <b>'+money(s.gap)+' '+curr()+'</b></p>');
 const railHead=title=>'<div class="rail-head"><h3>'+title+'</h3><span class="rail-dash">-</span><span class="rail-accent"></span></div>';
 const metaText=meta=>{
  let text=String(meta||'').trim();
  if(!text)return '';
  text=text.replace(/^عند الاستلام بتاريخ /,'عند\u00A0الاستلام بتاريخ\u00A0')
   .replace(/^عند التعاقد/,'عند\u00A0التعاقد')
   .replace(/^عند التسليم/,'عند\u00A0التسليم')
   .replace(/^بتاريخ /,'بتاريخ\u00A0')
   .replace(/^خلال أول سنتين/,'خلال\u00A0أول\u00A0سنتين')
   .replace(/^at handover on /,'at\u00A0handover on\u00A0')
   .replace(/^over first two years/,'over\u00A0first\u00A0two\u00A0years')
   .replace(/^on /,'on\u00A0');
  const phrase=/^(عند|خلال|بدون)/.test(text)||/^(at|over|no)\b/i.test(text);
  if(phrase)return '<span class="extra-due">'+esc(text)+'</span>';
  return '<span class="extra-meta"><span class="extra-dash">–</span> <span class="extra-due">'+esc(text)+'</span></span>';
 };
 const itemLine=(name,amount,meta)=>{
  const value=Number(amount)>0?'<b class="extra-amount">'+fmtMoney(amount/100)+' '+curr()+'</b>':'';
  const after=meta?metaText(meta):'';
  return '<div class="extra-line"><b class="extra-name">'+name+':</b> '+(value?value:'')+(after?' '+after:'')+'</div>';
 };
 const includedRows=(s.includedItems||[]).map(x=>({name:itemName(x.key),amount:x.amount,due:''}));
 const includedBlock=includedRows.length?'<div class="side-block rail-group">'+railHead(t('السعر يشمل','Included in price'))+'<div class="'+(includedRows.length>=2?'side-lines summary-lines-grid':'side-lines')+'">'+includedRows.map(x=>itemLine(x.name,x.amount,x.due)).join('')+'</div></div>':'';
 const excludedRows=(s.excludedItems||[]).map(x=>({name:itemName(x.key),amount:x.amount,due:extraMeta(normalizeOffer(p),x)}));
 const excludedBlock=excludedRows.length?'<div class="side-block rail-group">'+railHead(t('السعر لا يشمل','Price does not include'))+'<div class="'+(excludedRows.length>=2?'side-lines summary-lines-grid':'side-lines')+'">'+excludedRows.map(x=>itemLine(x.name,x.amount,x.due)).join('')+'</div></div>':'';
 const feeRate=p.feeMode==='rate'?fmtPct(p.fee)+'%':'';
 const feePayer=p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller');
 const commissionMeta=[feePayer,feeRate?'('+feeRate+')':''].filter(Boolean).join(' ');
 const extraRows=(s.extras||[]).map(e=>({name:itemName(e.label),amount:e.amount,meta:extraMeta(normalizeOffer(p),e)}));
 const commissionLine=s.commission?'<div class="extra-line extra-commission"><b class="extra-name">'+t('عمولة الوساطة','Brokerage commission')+' - '+commissionMeta+':</b> <b class="extra-amount">'+fmtMoney(s.commission/100)+' '+curr()+'</b></div>':'';
 const extraCount=extraRows.length;
 const extrasWide=extraRows.some(x=>x.meta);
 const extrasBlock=(extraCount||s.commission)?'<div class="side-block rail-group">'+railHead(t('مستحقات إضافية','Additional charges'))+'<div class="'+(extraCount>=2?'side-lines summary-lines-grid':'side-lines')+'">'+extraRows.map(x=>itemLine(x.name,x.amount,x.meta)).join('')+commissionLine+'</div></div>':'';
 const summaryNote=infoLines.length?'<div class="summary-info">'+infoLines.join('')+'</div>':'';
 const summaryGroups=[];
 if(includedRows.length)summaryGroups.push({count:includedRows.length,html:includedBlock});
 if(excludedRows.length)summaryGroups.push({count:excludedRows.length,html:excludedBlock});
 if(extraCount||s.commission)summaryGroups.push({count:extraCount+(s.commission?1:0)+(extrasWide?1:0),html:extrasBlock});
 const summaryWeight=count=>Math.min(3.2,1+Math.max(0,count-1)*0.55);
 const summaryStyle=summaryGroups.length>1?' style="grid-template-columns:'+summaryGroups.map(g=>'minmax(0,'+summaryWeight(g.count).toFixed(2)+'fr)').join(' ')+'"':'';
 const classificationClass=summaryGroups.length===4?' summary-four':summaryGroups.length===3?' summary-full':summaryGroups.length===2?' summary-two':' summary-one';
 const classificationHtml=summaryGroups.length?'<div class="summary-classification'+classificationClass+'"'+summaryStyle+'>'+summaryGroups.map(g=>g.html).join('')+'</div>':'';
 const deleteLabel=t('حذف المحدد','Delete selected')+(selected.size?' ('+selected.size+')':'');
 const scheduleActions=(selected.size?'<button type="button" class="schedule-icon-btn" data-act="delete" aria-label="'+deleteLabel+'" title="'+deleteLabel+'">'+icon('trash',15)+'</button>':'')+(beforeDelete?'<button type="button" class="schedule-icon-btn" data-act="undo" aria-label="'+t('تراجع','Undo')+'" title="'+t('تراجع','Undo')+'">'+icon('undo',15)+'</button>':'');
 const workspaceHead='<div class="schedule-workspace-head"><h2>'+t('جدول الدفعات','Payment schedule')+'</h2><div class="schedule-head-meta">'+scheduleActions+'<span class="schedule-count">'+paymentCountText(paymentRows.length)+'</span></div></div>';
 const summaryHtml='<div class="schedule-summary" role="group" aria-label="'+t('ملخص خطة السداد','Payment plan summary')+'">'+classificationHtml+summaryNote+'</div>';
 const error=s.overAllocated?t('المبلغ المخصص للأقساط يتجاوز المتبقي من سعر الوحدة. راجع التوزيع أو الصفوف المضافة.','Custom installment amounts exceed the remaining unit price. Check the allocation or added rows.'):t('راجع سعر الوحدة ومقدم التعاقد ودفعة الاستلام وترتيب التواريخ.','Check price, down payment, handover payment and dates.');
 const tableCol='<div class="schedule-table-col"><div class="tablewrap" tabindex="0" role="region" aria-label="'+t('جدول الدفعات','Payment schedule')+'">'+table(s)+(paymentRows.length?'':'<div class="empty">'+t('الجدول فارغ','Empty schedule')+'</div>')+'</div><div class="schedule-vscroll" id="scheduleVScroll" aria-hidden="true"><div class="schedule-vscroll-thumb"></div></div><div class="schedule-row-tools" id="scheduleRowTools" aria-hidden="true"><button type="button" class="schedule-float-btn" data-float-add aria-label="'+t('إضافة دفعة جديدة','Add a new payment')+'" title="'+t('إضافة دفعة جديدة','Add a new payment')+'">'+icon('plus',12)+'</button><button type="button" class="schedule-float-btn" data-float-edit aria-label="'+t('تعديل الدفعة','Edit payment')+'" title="'+t('تعديل الدفعة','Edit payment')+'">'+icon('pen',11)+'</button></div></div>';
 const moduleHtml='<div class="schedule-module">'+summaryHtml+tableCol+'</div>';
 const selectionHtml=selRows.length?'<div class="schedule-selection"><span class="sel-item"><span class="sel-label">'+t('الدفعات المحددة','Selected payments')+':</span><b>'+paymentCountText(selRows.length)+'</b></span><span class="sel-item"><span class="sel-label">'+t('إجمالي المحدد','Selected total')+':</span><b>'+money(selValue)+' '+curr()+'</b></span></div>':'';
 return title+hero(s)+'<div class="workspace">'+editor(s)+'<section>'+workspaceHead+(good?moduleHtml+selectionHtml:'<p class="error">'+error+'</p>')+'</section></div>';
}
function feeLabel(s){const meta=[p.feeMode==='rate'?fmtPct(p.fee)+'%':'',p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller')].filter(Boolean).join(' · ');return names.fee()+(meta?' ('+meta+')':'')+' · '+fmtMoney(s.commission/100)+' '+curr()}
function compare(){
 const headers=[t('الخطة','Plan'),t('مقدم التعاقد %','Down %'),t('مدة التقسيط بالشهور','Term in months'),names.down(),t('قيمة القسط','Installment'),t('الإجراءات','Actions')];
 return '<div class="titleline"><h1>'+titles().compare+'</h1><div class="actions">'+B('saveAllPlans',t('حفظ كل الخطط','Save all plans'),'save','primary')+B('addPlan',t('إضافة خطة','Add plan'),'plus')+'</div></div><p class="muted">'+t('سعر الوحدة','Property price')+' · '+fmt(p.price)+' '+curr()+' · '+frequency()[p.period]+'</p><div class="tablewrap compare"><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+plans.map((obj,i)=>{
 const s=schedule({...p,...obj,mode:'rate',termMonths:+obj.months||0,hidden:[],offerType:'installments'});
 const input=(key,kind)=>'<input aria-label="'+headers[{name:0,down:1,months:2}[key]]+'" data-plan="'+i+'" data-prop="'+key+'" type="'+kind+'" value="'+esc(obj[key]??(t('خطة','Plan')+' '+(i+1)))+'">';
 return '<tr><td>'+input('name','text')+'</td><td>'+input('down','number')+'</td><td>'+input('months','number')+'</td><td>'+money(s.down)+'</td><td>'+(s.valid&&s.count?money(Math.round(s.financed/s.count)):t('راجع الشروط','Invalid terms'))+'</td><td><div class="actions">'+B('use-'+i,t('تطبيق','Apply'))+B('remove-'+i,t('حذف','Delete'))+'</div></td></tr>';
 }).join('')+'</tbody></table></div>';
}
function filteredSaved(){
 return saved.filter(o=>(o.unit+' '+o.client).toLowerCase().includes(search.toLowerCase()));
}
function savedTableHtml(){
 const matches=filteredSaved();
 if(!matches.length)return '<div class="empty">'+t('لا توجد عروض مطابقة','No matching offers')+'</div>';
 const all=matches.every(o=>savedSel.has(o.id));
 const headers=[t('الوحدة','Property'),t('العميل','Client'),t('السعر','Price'),t('آخر حفظ','Last saved'),t('الإجراءات','Actions')];
 return '<div class="tablewrap"><table class="saved-grid"><thead><tr><th class="cell-check"><input type="checkbox" data-saved-all aria-label="'+t('تحديد الكل','Select all')+'" '+(all?'checked':'')+'></th>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+matches.map(o=>'<tr><td class="cell-check"><input type="checkbox" data-saved-id="'+o.id+'" aria-label="'+esc(o.unit||t('عرض عقاري','Property offer'))+'" '+(savedSel.has(o.id)?'checked':'')+'></td><td>'+esc(o.unit||t('عرض عقاري','Property offer'))+'</td><td>'+esc(o.client||'—')+'</td><td>'+fmt(o.price)+'</td><td>'+new Date(o.updated).toLocaleDateString(lang)+'</td><td><div class="actions">'+B('open-'+o.id,t('فتح','Open'))+B('clone-'+o.id,t('نسخة','Duplicate'))+B('drop-'+o.id,t('حذف','Delete'))+'</div></td></tr>').join('')+'</tbody></table></div>';
}
function savedRows(){
 for(const id of [...savedSel])if(!saved.some(o=>o.id===id))savedSel.delete(id);
 const count=savedSel.size;
 const bar='<div class="saved-bar"><input id="search" class="search" placeholder="'+t('بحث باسم العميل أو الوحدة','Search property or client')+'" value="'+esc(search)+'"><div class="saved-actions"><span class="selected-count">'+count+' '+t('محدد','selected')+'</span>'+
  '<button type="button" class="btn" data-act="saved-share" '+(count?'':'disabled')+'>'+icon('share')+t('مشاركة','Share')+'</button></div></div>';
 return bar+'<div id="savedTable">'+savedTableHtml()+'</div>';
}
function shareSavedOffers(){
 const offers=saved.filter(o=>savedSel.has(o.id));
 if(!offers.length){note(t('حدد عرضًا واحدًا على الأقل.','Select at least one offer.'));return}
 if(!window.MizanShare||!window.MizanShare.shareOffers){note(t('المشاركة غير متاحة الآن.','Sharing is unavailable right now.'));return}
 window.MizanShare.shareOffers(offers);
}
function offerKey(o){
 return JSON.stringify([o.unit,o.client,o.price,o.mode,o.down,o.delivery,o.maintenance,o.maintenanceState,o.offerType,o.showTotal,o.items,o.legal,o.period,o.years,o.termMonths,o.feeMode,o.fee,o.payer,o.start,o.startDay,o.handover,o.handoverDay,o.deliveryDateMode,o.deliveryDate,o.deliveryDay,o.maintenanceDateMode,o.maintenanceDate,o.maintenanceDay,o.allocations,o.customRows,o.types,o.edits]);
}
function render(){
 if(page==='calc'){
  const sections=[...document.querySelectorAll('[data-section]')];
  if(sections.length)sectionOpen=new Set(sections.filter(e=>e.open).map(e=>e.dataset.section));
 }
 const scroll=$('.tablewrap')?.scrollTop||0;
 hideScheduleRowTools();
 drawHeader(); A.innerHTML=page==='calc'?calculator():page==='compare'?compare():'<div class="titleline"><h1>'+titles().saved+'</h1></div><div id="records">'+savedRows()+'</div>';
 if($('.tablewrap'))$('.tablewrap').scrollTop=scroll;
 const all=$('[data-all]');
 if(all){
  const s=schedule(p),rows=schedulePaymentRows(s);
  const every=rows.length>0&&rows.every(r=>selected.has(r.id));
  const some=rows.some(r=>selected.has(r.id));
  all.checked=every;
  all.indeterminate=!every&&some;
  const th=all.closest('th');if(th)th.classList.toggle('has-selection',some);
 }
 const savedAll=$('[data-saved-all]');
 if(savedAll){
  const matches=filteredSaved();
  const every=matches.length>0&&matches.every(o=>savedSel.has(o.id));
  savedAll.checked=every;
  savedAll.indeterminate=!every&&matches.some(o=>savedSel.has(o.id));
  const th=savedAll.closest('th');if(th)th.classList.toggle('has-selection',savedSel.size>0);
 }
 if(itemFocusAfterRender){
  const target=itemFocusAfterRender;itemFocusAfterRender=null;
  const field=document.querySelector('[data-item="'+target.key+'"][data-item-prop="'+target.prop+'"]');
  if(field)field.focus();
 }
 requestAnimationFrame(()=>{updateScheduleScrollButtons();updateScheduleVScroll()});
}
function scheduleTableWrap(){return document.querySelector('.schedule-table-col .tablewrap')}
function scheduleVScroll(){return document.getElementById('scheduleVScroll')}
function updateScheduleVScroll(){
 const wrap=scheduleTableWrap(),track=scheduleVScroll(),thumb=track&&track.querySelector('.schedule-vscroll-thumb');
 if(!wrap||!track||!thumb)return;
 const col=wrap.closest('.schedule-table-col');
 const setOverflowing=on=>{wrap.classList.toggle('has-vscroll',on);if(col)col.classList.toggle('has-vscroll',on)};
 if(matchMedia('(max-width:760px)').matches){track.hidden=true;setOverflowing(false);return}
 const head=wrap.querySelector('.schedule-grid thead th');
 track.style.top=(wrap.offsetTop+(head?head.getBoundingClientRect().height:36))+'px';
 const max=wrap.scrollHeight-wrap.clientHeight;
 if(max<=1){track.hidden=true;setOverflowing(false);return}
 track.hidden=false;
 const th=track.clientHeight;
 if(th<=0){track.hidden=true;setOverflowing(false);return}
 setOverflowing(true);
 if(col&&head)col.style.setProperty('--schedule-head-h',Math.round(head.getBoundingClientRect().height)+'px');
 const h=Math.max(26,Math.min(th,th*wrap.clientHeight/wrap.scrollHeight));
 thumb.style.height=h+'px';
 const travel=Math.max(0,th-h);
 thumb.style.top=(wrap.scrollTop/max*travel)+'px';
}
function updateScheduleScrollButtons(){
 const wrap=scheduleTableWrap();if(!wrap)return;
 const max=Math.max(0,wrap.scrollHeight-wrap.clientHeight);
 document.querySelectorAll('[data-scroll-schedule]').forEach(btn=>{
  const up=btn.dataset.scrollSchedule==='up';
  btn.disabled=up?wrap.scrollTop<=1:max<=1||wrap.scrollTop>=max-1;
 });
}
function scrollSchedule(dir){
 const wrap=scheduleTableWrap();if(!wrap)return;
 const step=Math.max(120,Math.round(wrap.clientHeight*.72));
 wrap.scrollTop=Math.max(0,Math.min(wrap.scrollHeight-wrap.clientHeight,wrap.scrollTop+(dir==='up'?-step:step)));
 updateScheduleScrollButtons();
 hideScheduleRowTools();
}
let tableDrag=null,suppressTableClick=false;
document.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.pointerType!=='mouse')return;
 const wrap=e.target.closest('.schedule-table-col .tablewrap');
 if(!wrap)return;
 if(e.target.closest('button,input,select,textarea,a,label,.row-edit-line,.date-seg,#scheduleVScroll'))return;
 tableDrag={wrap,id:e.pointerId,x:e.clientX,y:e.clientY,top:wrap.scrollTop,moved:false};
},true);
document.addEventListener('pointermove',e=>{
 if(!tableDrag||e.pointerId!==tableDrag.id)return;
 if(!(e.buttons&1)){endTableDrag();return}
 const dy=e.clientY-tableDrag.y,dx=e.clientX-tableDrag.x;
 if(!tableDrag.moved){
  if(Math.abs(dy)<5)return;
  if(Math.abs(dy)<Math.abs(dx)){tableDrag=null;return}
  tableDrag.moved=true;
  tableDrag.wrap.classList.add('drag-scroll');
  try{tableDrag.wrap.setPointerCapture(e.pointerId)}catch{}
 }
 e.preventDefault();
 tableDrag.wrap.scrollTop=tableDrag.top-dy;
 updateScheduleVScroll();
},{passive:false});
function endTableDrag(){
 if(!tableDrag)return;
 const drag=tableDrag;tableDrag=null;
 drag.wrap.classList.remove('drag-scroll');
 if(drag.moved){suppressTableClick=true;setTimeout(()=>{suppressTableClick=false},260)}
}
document.addEventListener('pointerup',e=>{if(tableDrag&&e.pointerId===tableDrag.id)endTableDrag()});
document.addEventListener('pointercancel',()=>endTableDrag());
document.addEventListener('click',e=>{
 if(!suppressTableClick)return;
 suppressTableClick=false;
 e.preventDefault();
 e.stopPropagation();
},true);
let vScrollDrag=null;
document.addEventListener('pointerdown',e=>{
 const track=e.target.closest('#scheduleVScroll');
 if(!track||e.button!==0)return;
 const wrap=scheduleTableWrap();if(!wrap)return;
 const thumb=track.querySelector('.schedule-vscroll-thumb');if(!thumb)return;
 const tr=track.getBoundingClientRect();
 if(e.target.closest('.schedule-vscroll-thumb')){
  vScrollDrag={track,wrap,id:e.pointerId,startY:e.clientY,startTop:wrap.scrollTop,thumbH:thumb.offsetHeight};
  track.classList.add('dragging');
  try{track.setPointerCapture(e.pointerId)}catch{}
  e.preventDefault();
  return;
 }
 const travel=Math.max(1,tr.height-thumb.offsetHeight);
 const y=Math.max(0,Math.min(travel,e.clientY-tr.top-thumb.offsetHeight/2));
 const max=Math.max(0,wrap.scrollHeight-wrap.clientHeight);
 wrap.scrollTop=(y/travel)*max;
 updateScheduleVScroll();
 e.preventDefault();
},true);
document.addEventListener('pointermove',e=>{
 if(!vScrollDrag||e.pointerId!==vScrollDrag.id)return;
 const {track,wrap,startY,startTop,thumbH}=vScrollDrag;
 const tr=track.getBoundingClientRect();
 const travel=Math.max(1,tr.height-thumbH);
 const max=Math.max(0,wrap.scrollHeight-wrap.clientHeight);
 wrap.scrollTop=startTop+((e.clientY-startY)/travel)*max;
 updateScheduleVScroll();
 e.preventDefault();
},{passive:false});
function endVScrollDrag(){
 if(!vScrollDrag)return;
 const track=vScrollDrag.track;vScrollDrag=null;track.classList.remove('dragging');
}
document.addEventListener('pointerup',e=>{if(vScrollDrag&&e.pointerId===vScrollDrag.id)endVScrollDrag()});
document.addEventListener('pointercancel',()=>endVScrollDrag());
document.addEventListener('wheel',e=>{
 const track=e.target.closest('#scheduleVScroll');
 if(!track)return;
 const wrap=scheduleTableWrap();if(!wrap)return;
 e.preventDefault();
 const max=Math.max(0,wrap.scrollHeight-wrap.clientHeight);
 const factor=Math.max(1,wrap.scrollHeight/track.clientHeight);
 wrap.scrollTop=Math.min(max,Math.max(0,wrap.scrollTop+e.deltaY*factor));
 updateScheduleVScroll();
},{passive:false});
let rowToolsRow=null,rowToolsTimer=null;
function scheduleRowTools(){return document.getElementById('scheduleRowTools')}
function hideScheduleRowTools(){
 clearTimeout(rowToolsTimer);
 const tools=scheduleRowTools();
 if(tools){tools.classList.remove('on');tools.setAttribute('aria-hidden','true')}
 rowToolsRow=null;
}
function showScheduleRowTools(row){
 if(!row||row.classList.contains('row-edit-line')||matchMedia('(max-width:760px)').matches)return;
 const tools=scheduleRowTools(),wrap=scheduleTableWrap(),col=document.querySelector('.schedule-table-col');
 if(!tools||!wrap||!col)return;
 const id=row.querySelector('input[data-id]')?.dataset.id;
 if(!id)return;
 clearTimeout(rowToolsTimer);
 rowToolsRow=row;
 const add=tools.querySelector('[data-float-add]'),edit=tools.querySelector('[data-float-edit]');
 if(add)add.dataset.addRow=id;
 if(edit)edit.dataset.editRow=id;
 const wr=wrap.getBoundingClientRect(),rr=row.getBoundingClientRect(),cr=col.getBoundingClientRect();
 if(rr.bottom<wr.top+36||rr.top>wr.bottom){hideScheduleRowTools();return}
 const top=rr.top-cr.top+(rr.height-tools.offsetHeight)/2;
 tools.style.top=Math.max(36,Math.min(cr.height-tools.offsetHeight,top))+'px';
 tools.classList.add('on');tools.setAttribute('aria-hidden','false');
}
function refreshScheduleRowTools(){
 if(!rowToolsRow)return;
 if(!rowToolsRow.isConnected){hideScheduleRowTools();return}
 const wrap=scheduleTableWrap(),rr=rowToolsRow.getBoundingClientRect(),wr=wrap&&wrap.getBoundingClientRect();
 if(!wrap||!wr||rr.bottom<wr.top+36||rr.top>wr.bottom){hideScheduleRowTools();return}
 showScheduleRowTools(rowToolsRow);
}
function refreshTerms(){
 // Keep the active form controls mounted when tabbing or clicking another field.
 const wrap=$('.workspace .tablewrap');
 const top=wrap?.scrollTop||0,left=wrap?.scrollLeft||0;
 const doc=document.createElement('template');doc.innerHTML=calculator();
 for(const selector of ['.hero','.workspace > section']){const old=$(selector),fresh=doc.content.querySelector(selector);if(old&&fresh)old.replaceWith(fresh)}
 const nextWrap=$('.workspace .tablewrap');if(nextWrap){nextWrap.scrollTop=top;nextWrap.scrollLeft=left}
 for(const key of ['amount','rate','fee']){const old=$('[data-key="'+key+'"]'),fresh=doc.content.querySelector('[data-key="'+key+'"]');if(old&&fresh)old.value=fresh.value}
 const fees=$('[data-section="fees"]');if(fees){fees.querySelector('summary').textContent=doc.content.querySelector('[data-section="fees"] summary').textContent;const label=fees.querySelector('[data-key="fee"]').parentNode;label.querySelector("span").textContent=names.fee()+' · '+(p.feeMode==='rate'?'%':curr())}
 requestAnimationFrame(()=>{updateScheduleScrollButtons();updateScheduleVScroll()});
}
function note(msg){const n=$('#notice');n.textContent=msg;n.style.display='block';clearTimeout(note.timer);note.timer=setTimeout(()=>n.style.display='none',2800)}
function animate(){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)A.animate([{opacity:.65,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:150})}
function persist(){write('draft',p)}
function num(v){return Number(String(v).trim().replace(/[٠-٩]/g,c=>c.charCodeAt(0)-1632).replace(/[۰-۹]/g,c=>c.charCodeAt(0)-1776).replace(/[,٬\s]/g,'').replace('٫','.'))}
const invalid=()=>note(t('تحقق من القيمة المدخلة','Check the entered value'));
function directedText(text,language){
 const mark=language==='ar'?'\u200f':'\u200e';
 return text.split('\n').map(line=>line&&!line.startsWith(mark)?mark+line:line).join('\n');
}
function fillOfferText(text,src){
 return String(text||'')
  .replace(/\(\s*اسم\s+العميل\s*\)/g,src&&src.client?src.client:'')
  .replace(/\(\s*الوحدة\s*\)/g,src&&src.unit?src.unit:'')
  .replace(/\(\s*الوحده\s*\)/g,src&&src.unit?src.unit:'')
  .replace(/\(\s*client\s+name\s*\)/gi,src&&src.client?src.client:'')
  .replace(/\(\s*unit\s*\)/gi,src&&src.unit?src.unit:'');
}
function paymentColumns(rows,language){
 const balanceLabel=language==='ar'?'الرصيد':'Balance';
 return rows.map(([date,type,amount,balance])=>[
  [date,type].filter(Boolean).join(' · '),
  amount,
  balance&&balanceLabel+' '+balance
 ].filter(Boolean).join(' _ ')).join('\n');
}
function clientText(s,withRows=false,language=lang,layout='vertical',showIntro=includeIntro,showOutro=includeOutro,offer=null){
 const t=(ar,en)=>language==='ar'?ar:en;
 const sep=language==='ar'?'، ':' · ';
 const locale=language==='ar'?'ar-EG-u-nu-latn':'en-GB';
 const moneyFormat=new Intl.NumberFormat(locale,{maximumFractionDigits:0});
 const pctFormat=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
 const fmt=n=>moneyFormat.format(n), fmtPct=n=>pctFormat.format(n), curr=()=>t('ج.م','EGP');
 const num=v=>dateNum(v);
 const pct=n=>n>0?' ('+fmtPct(n)+'%)':'';
 const value=cents=>fmt(cents/100)+' '+curr();
 const names={down:()=>t('مقدم التعاقد','Down payment'),delivery:()=>t('دفعة الاستلام','Handover payment'),installment:()=>t('قسط','Installment'),payment:()=>t('دفعة','Payment'),maintenance:()=>t('وديعة الصيانة','Maintenance deposit'),fee:()=>t('عمولة الوساطة','Brokerage commission'),garage:()=>t('الجراج','Garage'),storage:()=>t('المخزن','Storage room'),utilities:()=>t('المرافق','Utilities')};
 const label=r=>names[r.type]?names[r.type]()+(r.type==='installment'&&r.number?' '+r.number:''):String(r.type||'');
 const frequencyLabel=()=>({1:t('شهري','Monthly'),3:t('ربع سنوي','Quarterly'),6:t('نصف سنوي','Semiannual'),12:t('سنوي','Annual')}[src.period]||'');
 const src=offer||p;
 const handoverDate=fullDate(src.handover,src.handoverDay);
 const deliveryDue=()=>{
  if(src.deliveryDateMode==='none')return '';
  const handover=fullDate(src.handover,src.handoverDay);
  const shown=src.deliveryDateMode==='date'&&src.deliveryDate?fullDate(src.deliveryDate,src.deliveryDay):handover;
  if(!shown)return '';
  return t('عند الاستلام بتاريخ','at handover on')+' '+num(shown);
 };
 const maintenanceDue=()=>{
  if(src.maintenanceDateMode==='none')return '';
  if(src.maintenanceDateMode==='split')return t('خلال أول سنتين','over first two years');
  const handover=fullDate(src.handover,src.handoverDay);
  const shown=src.maintenanceDateMode==='date'&&src.maintenanceDate?fullDate(src.maintenanceDate,src.maintenanceDay):handover;
  if(!shown)return '';
  return String(shown).slice(0,7)===String(handover).slice(0,7)
   ? t('عند الاستلام بتاريخ','at handover on')+' '+num(shown)
   : t('بتاريخ','on')+' '+num(shown);
 };
 const countText=(n,one,two,many,plural)=>language==='ar'?(n===1?one:n===2?two:n>=3&&n<=10?n+' '+plural:n+' '+many):n+' '+plural;
 const monthGap=(a,b)=>(Number(String(b).slice(0,4))-Number(String(a).slice(0,4)))*12+(Number(String(b).slice(5,7))-Number(String(a).slice(5,7)));
 const inst=s.rows.filter(r=>r.type==='installment'&&r.value>0);
 const instValues=[...new Set(inst.map(r=>r.value))].sort((a,b)=>a-b);
 const termRaw=inst.length?monthGap(src.start,inst[inst.length-1].date):0;
 const termMonths=s.termMonths||(Number.isFinite(termRaw)&&termRaw>0?termRaw:Math.round((+src.years||0)*12));
 const termText=termMonths>0?(termMonths%12===0?(termMonths/12===1?t('سنة واحدة','one year'):termMonths/12===2?t('سنتان','two years'):(termMonths/12)+' '+t('سنوات','years')):termMonths+' '+t('شهرًا','months')):'';
 const scheduleFrequency=()=>{
  if(inst.length<2)return frequencyLabel();
  const gaps=[];
  for(let i=1;i<inst.length;i++)gaps.push(monthGap(inst[i-1].date,inst[i].date));
  const first=gaps[0];
  if(!first||gaps.some(g=>g!==first))return t('مواعيد متغيرة','Variable dates');
  return {1:t('شهري','Monthly'),3:t('ربع سنوي','Quarterly'),6:t('نصف سنوي','Semiannual'),12:t('سنوي','Annual')}[first]||(t('كل','every')+' '+first+' '+t('أشهر','months'));
 };
 const instCountText=countText(inst.length,t('قسط واحد','one installment'),t('قسطان','two installments'),t('قسطًا','installments'),t('أقساط','installments'));
 const planText=[termText,scheduleFrequency(),instCountText].filter(Boolean).join(' · ');
 const baseValues=inst.slice(0,-1).map(r=>r.value);
 const baseEqual=baseValues.length>0&&baseValues.every(v=>v===baseValues[0]);
 const lastValue=inst.length?inst[inst.length-1].value:0;
 const lastDiff=baseEqual?baseValues[0]-lastValue:0;
 const roundingAdjusted=baseEqual&&lastValue!==baseValues[0]&&lastDiff>0&&lastDiff<=inst.length*100;
 const fixedPlan=inst.length>0&&(instValues.length===1||roundingAdjusted);
 const fixedValue=fixedPlan?(instValues.length===1?inst[0].value:baseValues[0]):lastValue;
 const minValue=instValues.length?instValues[0]:0,maxValue=instValues.length?instValues[instValues.length-1]:0;
 const summary=[];
 const dueJoin=(base,due)=>due?base+(/^بتاريخ/.test(due)||/^on\b/i.test(due)?' – ':' ')+due:base;
 const includes=Array.isArray(s.includes)?s.includes:[];
 if(s.cash){
  const totalLabel=src.showTotal===false?t('سعر الوحدة','Unit price'):t('إجمالي العرض','Offer total');
  summary.push(totalLabel+': '+value(s.price));
  const cashCharges=[];
  for(const e of (Array.isArray(s.extras)?s.extras:[])){
   const pctMeta=e.label==='maintenance'&&src.maintenance>0?pct(s.maintenancePct):'';
   const due=e.label==='maintenance'?maintenanceDue():(e.dueMode==='date'&&e.due?t('بتاريخ','on')+' '+num(e.due):'');
   cashCharges.push({name:(names[e.label]?names[e.label]():e.label)+pctMeta,amount:e.amount,due});
  }
  if(s.commission){
   const feeMeta=[src.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller'),src.feeMode==='rate'?fmtPct(s.commissionPct)+'%':''].filter(Boolean).join(' ');
   cashCharges.push({name:names.fee()+' - '+feeMeta,amount:s.commission,due:''});
  }
  const includedValues=(s.includedItems||includes.map(k=>({key:k,amount:0}))).map(x=>(names[x.key]?names[x.key]():x.key)+(x.amount>0?' '+value(x.amount):''));
  const excludedCash=Array.isArray(s.excludedItems)?s.excludedItems:[];
  if(includedValues.length){
   summary.push('');
   summary.push(t('السعر يشمل','Price includes'));
   summary.push(includedValues.join(sep));
  }
  if(excludedCash.length){
   summary.push('');
   summary.push(t('السعر لا يشمل','Price does not include'));
   summary.push(excludedCash.map(e=>(names[e.key]?names[e.key]():e.key)+(e.amount>0?' '+value(e.amount):'')).join(sep));
  }
  if(cashCharges.length){
   summary.push('');
   summary.push(t('مستحقات إضافية','Additional charges'));
   for(const c of cashCharges)summary.push(dueJoin('- '+c.name+': '+value(c.amount),c.due));
  }
 }else{
  summary.push(t('سعر الوحدة','Unit price')+': '+value(s.price));
  if(s.down)summary.push(names.down()+(src.mode==='rate'?pct(s.downPct):'')+': '+value(s.down));
  if(inst.length){
   summary.push('');
   summary.push(t('خطة التقسيط','Payment plan')+': '+planText);
   if(fixedPlan){
    let line=t('قيمة القسط','Installment amount')+': '+value(fixedValue);
    const customPlan=Array.isArray(src.allocations)&&src.allocations.length>0;
    if(roundingAdjusted&&customPlan)line+=' · '+t('الأخير','Final')+' '+value(lastValue);
    summary.push(line);
   }else{
    summary.push(t('قيمة الأقساط','Installment values')+': '+t('متغيرة حسب الفترة','Variable by period'));
    if(minValue!==maxValue)summary.push(t('نطاق القسط','Installment range')+': '+value(minValue)+' – '+value(maxValue));
   }
  }
  if(s.delivery){
   summary.push('');
   summary.push(dueJoin(names.delivery()+(src.delivery>0?pct(s.deliveryPct):'')+': '+value(s.delivery),deliveryDue()));
  }
  const extras=Array.isArray(s.extras)?s.extras:[];
  const includedItems=Array.isArray(s.includedItems)?s.includedItems:[];
  const excluded=Array.isArray(s.excludedItems)?s.excludedItems:[];
  const extraLines=extras.map(e=>{
   const due=e.label==='maintenance'?maintenanceDue():(e.dueMode==='date'&&e.due?t('بتاريخ','on')+' '+num(e.due):'');
   return dueJoin((names[e.label]?names[e.label]():e.label)+' '+value(e.amount),due);
  });
  let commissionLineText='';
  if(s.commission){
   const feeMeta=[src.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller'),src.feeMode==='rate'?fmtPct(s.commissionPct)+'%':''].filter(Boolean).join(' ');
   commissionLineText=t('عمولة الوساطة','Brokerage commission')+' - '+feeMeta+': '+value(s.commission);
  }
  if(commissionLineText)extraLines.push(commissionLineText);
  if(includedItems.length||excluded.length||extraLines.length){
   summary.push('');
   if(includedItems.length)summary.push(t('السعر يشمل','Price includes')+': '+includedItems.map(e=>(names[e.key]?names[e.key]():e.key)+(e.amount>0?' '+value(e.amount):'')).join(sep));
   if(excluded.length)summary.push(t('السعر لا يشمل','Price does not include')+': '+excluded.map(e=>(names[e.key]?names[e.key]():e.key)+(e.amount>0?' '+value(e.amount):'')).join(sep));
   if(extraLines.length)summary.push(t('مستحقات إضافية','Additional charges')+': '+extraLines.join(sep));
  }
  summary.push('',(s.selectedOnly?t('إجمالي الدفعات المحددة','Selected payments total'):t('إجمالي العرض','Offer total'))+': '+value(s.selectedOnly?s.selectedTotal:s.total));
 }
 const legal=legalLines(src,language);
 if(legal.length){summary.push('');summary.push(t('الحالة المالية والقانونية','Financial & legal status'));summary.push(legal.join(sep));}
 const intro=fillOfferText(src.intro,src).trim();
 const outro=fillOfferText(src.outro,src).trim();
 const parts=[];
 if(intro&&showIntro)parts.push(intro);
 parts.push(summary.join('\n'));
 if(s.gap&&src.showTotal!==false)parts.push(t('غير مجدول','Unscheduled')+': '+value(s.gap));
 if(withRows&&!s.cash&&s.rows.length){
  const allInstallments=s.rows.every(r=>r.type==='installment');
  const movementCount=s.rows.length;
  const movementText=language==='ar'
   ? countText(movementCount,t('حركة مالية واحدة','one financial transaction'),t('حركتان ماليتان','two financial transactions'),t('حركة مالية','financial transaction'),t('حركات مالية','financial transactions'))
   : movementCount+' '+(movementCount===1?'financial transaction':'financial transactions');
  const verticalHeading=t('جدول الدفعات','Payment schedule')+' · '+(allInstallments?instCountText:movementText);
  let lines;
  if(layout==='horizontal')lines=[t('جدول الدفعات','Payment schedule')+' ('+countText(s.rows.length,t('دفعة واحدة','one payment'),t('دفعتان','two payments'),t('دفعة','payments'),t('دفعات','payments'))+')'];
  else lines=[verticalHeading,t('جميع المبالغ بالجنيه المصري','All amounts in Egyptian pounds')];
  let lastYear='';
  const yearLine=y=>{if(y!==lastYear){if(lastYear)lines.push('');lines.push(y);lastYear=y}};
  if(layout==='horizontal'){
   let i=0;
   while(i<s.rows.length){
    const first=s.rows[i];
    yearLine(first.date.slice(0,4));
    if(first.type==='installment'&&first.number){
     let j=i+1;
     while(j<s.rows.length){
      const prev=s.rows[j-1],next=s.rows[j];
      if(next.type!=='installment'||!next.number||next.value!==first.value||next.date.slice(0,4)!==first.date.slice(0,4)||next.number!==prev.number+1||monthGap(prev.date,next.date)!==(+src.period||1))break;
      j++;
     }
     if(j-i>=2){
      const last=s.rows[j-1],n=j-i;
      lines.push(num(first.date)+' – '+num(last.date)+' · '+(language==='ar'?'الأقساط ':'Installments ')+first.number+'–'+last.number+' ('+countText(n,t('قسط واحد','one installment'),t('قسطان','two installments'),t('قسطًا','installments'),t('أقساط','installments'))+sep+frequencyLabel()+')');
      lines.push(value(first.value)+' '+t('لكل قسط','per installment')+' · '+t('المتبقي بعد آخر قسط','Remaining after last installment')+': '+value(last.balance));
     }else{
      lines.push(num(first.date)+' · '+label(first)+': '+value(first.value)+' · '+t('المتبقي','Remaining')+': '+value(first.balance));
     }
     i=j;
    }else{
     const extra=first.extra||first.type==='maintenance'||first.type==='fee';
     const principal=['down','delivery','installment','payment'].includes(first.type);
     lines.push(num(first.date)+' · '+label(first)+': '+value(first.value)+(extra?' ('+t('مستحق إضافي','additional charge')+')':'')+(principal?' · '+t('رصيد الوحدة','Property balance')+': '+value(first.balance):''));
     i++;
    }
   }
  }else{
   for(const r of s.rows){
    yearLine(r.date.slice(0,4));
    const extra=r.extra||r.type==='maintenance'||r.type==='fee';
    const principal=['down','delivery','installment','payment'].includes(r.type);
    let line=num(r.date)+' · '+label(r)+': '+fmt(r.value/100);
    if(extra)line+=' ('+t('مستحق إضافي','additional charge')+')';
    else if(principal)line+=' · '+t('المتبقي','Remaining')+' '+fmt(r.balance/100);
    lines.push(line);
   }
  }
  parts.push(lines.join('\n'));
 }
 if(outro&&showOutro)parts.push(outro);
 return directedText(parts.join('\n\n'),language);
}
function clearRowSource(r,src){
 if(!r||!src)return;
 if(src.kind==='down'){p.down=0;p.mode='amount'}
 else if(src.kind==='delivery')p.delivery=0;
 else if(src.kind==='maintenance'){p.maintenance=0;p.maintenanceState='unspecified';p.maintenanceDateMode='handover'}
 else if(src.kind==='fee')p.fee=0;
 else if(src.kind==='item'&&p.items[src.key])p.items[src.key]={state:'unspecified',amount:0,due:'',day:''};
 else if(src.kind==='custom')p.customRows=(p.customRows||[]).filter(x=>x.id!==r.id);
 if(p.edits)delete p.edits[r.id];
 if(p.types)delete p.types[r.id];
}
function addCustomPayment(date,type,valueCents){
 const id='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 p.customRows=[...(p.customRows||[]),{id,date,type:type==='payment'?'payment':'installment',value:valueCents/100}];
 return id;
}
function applyRowEdit(r,type,parsed,valueCents){
 const s=schedule(p),src=rowSource(r);
 if(!r||!src||!parsed)return false;
 const date=fullDate(parsed.month,parsed.day);
 if(date<p.start){invalid();return false}
 const price=s.price||0;
 const pctOf=v=>price?v/price*100:0;
 const hasDown=s.rows.some(x=>x.id==='down'&&x.id!==r.id);
 const hasDelivery=s.rows.some(x=>x.id==='delivery'&&x.id!==r.id);
 const hasMaintenance=s.rows.some(x=>x.type==='maintenance'&&!x.maintenanceSplit&&x.id!==r.id);
 const same=type===(src.kind==='item'?src.key:r.type);
 if(src.kind==='maintenanceSplit'){
  if(type!=='maintenance'){note(t('لا يمكن تحويل دفعة صيانة موزعة إلى نوع آخر.','A split maintenance payment cannot be converted to another type.'));return false}
  const total=Math.max(0,s.maintenance+valueCents-r.value);
  p.maintenance=pctOf(total);
  p.maintenanceState='extra';p.maintenanceDateMode='split';p.split=true;
  p.edits={...p.edits,[r.id]:{value:valueCents,date}};
  return true;
 }
 if(src.kind==='installment'){
  if(!['installment','payment','delivery'].includes(type)){note(t('قسط الخطة يمكن تحويله إلى قسط أو دفعة أو دفعة استلام.','A plan installment can become an installment, payment or handover payment.'));return false}
  p.edits={...p.edits,[r.id]:{value:valueCents,date}};
  if(type==='installment')delete p.types[r.id];else p.types={...p.types,[r.id]:type};
  return true;
 }
 if(src.kind==='custom'){
  const custom=(p.customRows||[]).find(x=>x.id===r.id);
  if(!custom)return false;
  if(type==='down'){
   p.down=(hasDown?s.down:0)/100+valueCents/100;p.mode='amount';p.start=parsed.month;p.startDay=parsed.day;
  }else if(type==='delivery'){
   p.delivery=pctOf((hasDelivery?s.delivery:0)+valueCents);p.deliveryDateMode='date';p.deliveryDate=parsed.month;p.deliveryDay=parsed.day;
  }else if(type==='maintenance'){
   p.maintenance=pctOf((hasMaintenance?s.maintenance:0)+valueCents);p.maintenanceState='extra';p.maintenanceDateMode='date';p.maintenanceDate=parsed.month;p.maintenanceDay=parsed.day;p.split=false;
  }else if(ITEM_KEYS.includes(type)){
   const key=type,old=p.items[key]||{},base=old.state==='extra'?(+old.amount||0)*100:0;
   p.items[key]={state:'extra',amount:(base+valueCents)/100,due:parsed.month,day:parsed.day};
  }else if(type==='installment'||type==='payment'){
   custom.value=valueCents/100;custom.date=date;custom.type=type;
   return true;
  }else return false;
  p.customRows=(p.customRows||[]).filter(x=>x.id!==r.id);
  return true;
 }
 if(same){
  if(src.kind==='down'){p.down=valueCents/100;p.mode='amount';p.start=parsed.month;p.startDay=parsed.day}
  else if(src.kind==='delivery'){p.delivery=pctOf(valueCents);p.deliveryDateMode='date';p.deliveryDate=parsed.month;p.deliveryDay=parsed.day}
  else if(src.kind==='maintenance'){p.maintenance=pctOf(valueCents);p.maintenanceState='extra';p.maintenanceDateMode='date';p.maintenanceDate=parsed.month;p.maintenanceDay=parsed.day;p.split=false}
  else if(src.kind==='fee'){p.feeMode='amount';p.fee=valueCents/100;p.edits={...p.edits,[r.id]:{date}}}
  else if(src.kind==='item'){p.items[src.key]={state:'extra',amount:valueCents/100,due:parsed.month,day:parsed.day}}
  return true;
 }
 if(src.kind==='installment')return false;
 if(type==='fee'){note(t('لا يمكن تحويل صف إلى عمولة وساطة.','A row cannot be converted to brokerage commission.'));return false}
 clearRowSource(r,src);
 if(type==='down'){
  p.down=((hasDown?s.down:0)+valueCents)/100;p.mode='amount';p.start=parsed.month;p.startDay=parsed.day;
 }else if(type==='delivery'){
  p.delivery=pctOf((hasDelivery?s.delivery:0)+valueCents);p.deliveryDateMode='date';p.deliveryDate=parsed.month;p.deliveryDay=parsed.day;
 }else if(type==='maintenance'){
  p.maintenance=pctOf((hasMaintenance?s.maintenance:0)+valueCents);p.maintenanceState='extra';p.maintenanceDateMode='date';p.maintenanceDate=parsed.month;p.maintenanceDay=parsed.day;p.split=false;
 }else if(ITEM_KEYS.includes(type)){
  const key=type,old=p.items[key]||{},base=old.state==='extra'?(+old.amount||0)*100:0;
  p.items[key]={state:'extra',amount:(base+valueCents)/100,due:parsed.month,day:parsed.day};
 }else if(type==='installment'||type==='payment'){
  addCustomPayment(date,type,valueCents);
 }else return false;
 return true;
}
function cancelRowEditing(){
 if(!editing)return;
 const custom=(p.customRows||[]).find(row=>row.id===editing);
 if(custom&&!custom.value)p.customRows=p.customRows.filter(row=>row.id!==editing);
 editing=null;beforeDelete=null;persist();render();
}
function insertPaymentRow(afterId){
 const s=schedule(p), rows=s.rows;
 let index=-1;
 if(afterId)index=rows.findIndex(row=>String(row.id)===String(afterId));
 if(index<0&&selected.size){
  const first=[...selected][0];
  index=rows.findIndex(row=>row.id===first);
 }
 if(index<0)index=rows.length-1;
 const current=rows[index], prev=rows[index-1], period=+p.period||1;
 let date;
 if(prev&&current){
  const a=prev.date.slice(0,7), b=current.date.slice(0,7);
  const [ay,am]=a.split('-').map(Number), [by,bm]=b.split('-').map(Number);
  const gap=(by-ay)*12+(bm-am);
  date=gap>1?monthAfter(a,Math.floor(gap/2)):current.date;
 }else if(current){
  date=current.date;
 }else{
  date=monthAfter(p.start,period);
 }
 const value=current&&current.type==='installment'?Math.round(current.value/100):0;
 if(date<p.start)date=p.start;
 const id='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 p.customRows=[...(p.customRows||[]),{id,date,type:'installment',value,before:true}];
 editing=id;selected.clear();beforeDelete=null;persist();render();
 requestAnimationFrame(()=>{const f=$('#rowValue');if(f){f.focus();f.select()}});
}
document.addEventListener('change',e=>{
 const el=e.target,k=el.dataset.key;
 const mainPreset=el.closest('[data-main-preset]');
 if(mainPreset){
  const type=mainPreset.dataset.mainPreset;
  const preset=mainPresets(type).find(x=>x.id===mainPreset.value);
  if(preset){p[type]=preset.text;persist();const area=document.querySelector('textarea[data-key="'+type+'"]');if(area)area.value=preset.text;note(t('تم استدعاء الـ Preset','Preset loaded'))}
  return;
 }
 const allocYearEl=el.closest('[data-alloc="year"]');
 if(allocYearEl){allocYear=allocYearEl.value;return}
 const savedAll=el.closest('[data-saved-all]');
 if(savedAll){const matches=filteredSaved();matches.forEach(o=>savedAll.checked?savedSel.add(o.id):savedSel.delete(o.id));render();return}
 const savedId=el.closest('[data-saved-id]');
 if(savedId){const id=savedId.dataset.savedId;savedId.checked?savedSel.add(id):savedSel.delete(id);render();return}
 const rowTypeEl=el.closest('[data-row-type]');
 if(rowTypeEl){
  const id=rowTypeEl.dataset.rowType, made=rowTypeEl.value==='payment'?'payment':'installment';
  const custom=(p.customRows||[]).find(row=>row.id===id);
  if(custom)custom.type=made;
  else if(made==='payment')p.types[id]='payment';
  else delete p.types[id];
  persist();render();return;
 }
 const itemEl=el.closest('[data-item]');
 if(itemEl){const key=itemEl.dataset.item,prop=itemEl.dataset.itemProp;if(!p.items[key])return;
  if(prop==='state'&&['unspecified','included','excluded','extra'].includes(itemEl.value)){
   p.items[key].state=itemEl.value;
   itemFocusAfterRender={key,prop:(itemEl.value==='extra'||itemEl.value==='included')?'amount':'state'};
  }
  else if(prop==='amount'){const v=num(itemEl.value);if(!Number.isFinite(v)||v<0){invalid();render();return}p.items[key].amount=Math.round(v)}
  else if(prop==='date'){if(itemEl.value.trim()){const parsed=parseDateInput(itemEl.value);if(!parsed){invalid();render();return}p.items[key].due=parsed.month;p.items[key].day=parsed.day}else{p.items[key].due='';p.items[key].day=''}}
  else if(prop==='due'){if(itemEl.value&&!isMonth(itemEl.value)){invalid();render();return}p.items[key].due=itemEl.value}
  else if(prop==='day'){const v=itemEl.value===''?'':num(itemEl.value);if(v!==''&&(!Number.isInteger(v)||v<1||v>31)){invalid();render();return}p.items[key].day=v}
  persist();if(prop==='state')render();else refreshTerms();return;
 }
 if(el.dataset.legal){p.legal[el.dataset.legal]=el.checked;persist();refreshTerms();return}
 if(el.dataset.showTotal!==undefined){p.showTotal=el.checked;persist();refreshTerms();return}
 if(el.dataset.id){el.checked?selected.add(el.dataset.id):selected.delete(el.dataset.id);render();return}
 if(el.dataset.plan!==undefined){const obj=plans[+el.dataset.plan],key=el.dataset.prop;const v=key==='name'?el.value:num(el.value);if(key!=='name'&&(!Number.isFinite(v)||v<0||(key==='months'&&(!Number.isInteger(v)||v<1||v>600))||(key==='down'&&v>100))){invalid();render();return}obj[key]=v;write('plans',plans);render();return}
 if(el.dataset.datePart){applyDateSeg(el.closest('[data-date-seg]'));return}
 if(!k)return;
 if(el.dataset.dayKey){
  const parsed=parseDateInput(el.value);
  if(!parsed){invalid();render();return}
  p[k]=parsed.month;p[el.dataset.dayKey]=parsed.day;
  beforeDelete=null;selected.clear();persist();render();return;
 }
 if(k==='intro'||k==='outro'){p[k]=el.value;persist();return}
 if(k==='maintenanceState'){p.maintenanceState=el.value;persist();render();return}
 if(k==='deliveryDateMode'||k==='maintenanceDateMode'){
  p[k]=el.value;
  if(k==='maintenanceDateMode')p.split=el.value==='split';
  if(el.value==='date'){
   if(k==='deliveryDateMode'){if(!p.deliveryDate)p.deliveryDate=p.handover;if(!p.deliveryDay)p.deliveryDay=p.handoverDay}
   else{if(!p.maintenanceDate)p.maintenanceDate=p.handover;if(!p.maintenanceDay)p.maintenanceDay=p.handoverDay}
  }
  persist();render();return;
 }
 const dayKeys=['startDay','handoverDay','deliveryDay','maintenanceDay'];
 if(k==='termMonths'&&el.value.trim()===''){p.termMonths=0;p.edits={};persist();render();return}
 const numeric=['price','rate','amount','fee','delivery','maintenance','period','termMonths'].includes(k)||dayKeys.includes(k);
 let v=numeric?num(el.value):el.value;
 if(dayKeys.includes(k)){
  if(el.value==='')v='';
  else if(!Number.isInteger(v)||v<1||v>31){invalid();render();return}
 }else if(numeric&&(!Number.isFinite(v)||v<0||v>1e12||(['rate','delivery','maintenance'].includes(k)&&v>100)||(k==='termMonths'&&(!Number.isInteger(v)||v<1||v>600)))){invalid();render();return}
 if(['start','handover'].includes(k)&&!isMonth(v)){invalid();render();return}
 if(['deliveryDate','maintenanceDate'].includes(k)&&v!==''&&!isMonth(v)){invalid();render();return}
 if(numeric&&(k==='price'||k==='amount'||(k==='fee'&&p.feeMode==='amount')))v=Math.round(v);
 if(k==='rate'||k==='amount'){p.mode=k==='rate'?'rate':'amount';p.down=v}
 else if(k==='feeMode'){const s=schedule(p);p.fee=v==='amount'?s.commission/100:(s.price?+(100*s.commission/s.price).toFixed(6):0);p.feeMode=v}
 else p[k]=v;
 if(k==='termMonths'&&Number.isInteger(v))p.years=Math.round(v/12*1000)/1000;
 if(!['unit','phone','client','fee','payer','feeMode','maintenance','split','deliveryDateMode','deliveryDate','deliveryDay','maintenanceDateMode','maintenanceDate','maintenanceDay','startDay','handoverDay'].includes(k)){p.edits={};editing=null}
 beforeDelete=null;selected.clear();persist();refreshTerms();
});
document.addEventListener('input',e=>{const field=e.target, key=field.dataset.key;
 if(field.dataset.datePart){field.value=field.value.replace(/\D/g,'').slice(0,field.maxLength);const inputs=[...field.parentElement.querySelectorAll('input')];const i=inputs.indexOf(field);if(field.value.length>=field.maxLength&&i>=0&&inputs[i+1])inputs[i+1].focus();return}
 const allocAmountEl=e.target.closest('[data-alloc="amount"]');
 if(allocAmountEl){allocAmount=allocAmountEl.value;return}
 if(field.matches('textarea[data-key="intro"],textarea[data-key="outro"]')){
  p[key]=field.value;
  write(key==='intro'?'defaultIntro':'defaultOutro',field.value);
  persist();
  return;
 }
 if(field.type==='text' && key && (['unit','phone','client'].includes(key) || field.value.trim()!=='' && Number.isFinite(num(field.value)) && num(field.value)>=0 && num(field.value)<=1e12 && (!['rate','delivery','maintenance'].includes(key)||num(field.value)<=100) && (key!=='termMonths'||Number.isInteger(num(field.value))&&num(field.value)>=1&&num(field.value)<=600))){
 const original=field.value;field.dispatchEvent(new Event('change',{bubbles:true}));if(field.isConnected)field.value=original;
 }
 if(e.target.id==='search'){
  search=e.target.value;const table=$('#savedTable');if(table)table.innerHTML=savedTableHtml();
  const sa=$('[data-saved-all]');
  if(sa){const matches=filteredSaved(),every=matches.length>0&&matches.every(o=>savedSel.has(o.id));sa.checked=every;sa.indeterminate=!every&&matches.some(o=>savedSel.has(o.id))}
 }});
function readDateSegParts(group){
 if(!group)return null;
 const part=name=>{const input=group.querySelector('[data-date-part="'+name+'"]');return input?input.value.trim():''};
 const monthRaw=part('month'),yearRaw=part('year'),dayRaw=part('day');
 if(monthRaw===''||yearRaw==='')return null;
 const month=num(monthRaw),year=num(yearRaw),day=dayRaw===''?null:num(dayRaw);
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<1900||year>2200||(day!==null&&(!Number.isInteger(day)||day<1||day>31)))return null;
 return {month:year+'-'+String(month).padStart(2,'0'),day};
}
function applyDateSeg(group){
 if(!group)return;
 if(group.hasAttribute('data-row-date'))return;
 const part=name=>{const input=group.querySelector('[data-date-part="'+name+'"]');return input?input.value.trim():''};
 const dayRaw=part('day'),monthRaw=part('month'),yearRaw=part('year');
 if(monthRaw===''||yearRaw==='')return;
 const day=dayRaw===''?null:num(dayRaw),month=num(monthRaw),year=num(yearRaw);
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<1900||year>2200||(day!==null&&(!Number.isInteger(day)||day<1||day>31))){note(t('أكمل الشهر والسنة بقيمة صحيحة.','Enter a valid month and year.'));return}
 const due=year+'-'+String(month).padStart(2,'0');
 if(group.dataset.dateKey){
  p[group.dataset.dateKey]=due;
  p[group.dataset.dateDayKey]=day===null?'':day;
  if(['start','handover'].includes(group.dataset.dateKey)){p.edits={};editing=null}
 }else if(group.dataset.dateItem){
  const item=p.items[group.dataset.dateItem];
  if(!item)return;
  item.due=due;item.day=day===null?'':day;
 }
 beforeDelete=null;selected.clear();persist();refreshTerms();
}
function stepDateInput(input,delta,commit=true){
 const part=input.dataset.datePart;
 if(part==='year'){
  let year=parseInt(input.value,10);
  if(!Number.isFinite(year))year=new Date().getFullYear();
  year=Math.max(1900,Math.min(2200,year+delta));
  input.value=String(year);
 }else{
  const max=part==='month'?12:31;
  let value=parseInt(input.value,10);
  if(!Number.isFinite(value))value=1;else value+=delta;
  value=Math.max(1,Math.min(max,value));
  input.value=String(value).padStart(2,'0');
 }
 if(commit)input.dispatchEvent(new Event('change',{bubbles:true}));
 return true;
}
document.addEventListener('wheel',e=>{
 const input=e.target.closest('.date-seg input');
 if(!input)return;
 if(document.activeElement!==input)return;
 e.preventDefault();
 stepDateInput(input,e.deltaY<0?1:-1);
},{passive:false});
let wheelGestureAt=0,wheelGestureInside=false;
document.addEventListener('wheel',e=>{
 if(e.defaultPrevented)return;
 if(matchMedia('(max-width:760px)').matches)return;
 const wrap=e.target.closest&&e.target.closest('.schedule-table-col .tablewrap');
 const bar=e.target.closest&&e.target.closest('#scheduleVScroll');
 const now=Date.now();
 if(now-wheelGestureAt>180)wheelGestureInside=!!(wrap||bar);
 wheelGestureAt=now;
 if(bar)return;
 if(wrap){
  if(wheelGestureInside)return;
  e.preventDefault();
  window.scrollBy(0,e.deltaY);
 }
},{passive:false});
document.addEventListener('scroll',e=>{
 const target=e.target;
 if(target&&target.classList&&target.classList.contains('tablewrap')){updateScheduleScrollButtons();refreshScheduleRowTools();updateScheduleVScroll()}
},true);
window.addEventListener('resize',()=>requestAnimationFrame(()=>{updateScheduleScrollButtons();refreshScheduleRowTools();updateScheduleVScroll()}));
document.addEventListener('pointerover',e=>{
 if(e.target.closest('#scheduleRowTools')){clearTimeout(rowToolsTimer);return}
 const row=e.target.closest('.schedule-grid tbody tr');
 if(row)showScheduleRowTools(row);
});
document.addEventListener('pointerout',e=>{
 const tools=e.target.closest('#scheduleRowTools');
 if(tools){
  const to=e.relatedTarget;
  if(!to||!to.closest||!to.closest('.schedule-grid tbody tr'))rowToolsTimer=setTimeout(hideScheduleRowTools,120);
  return;
 }
 const row=e.target.closest('.schedule-grid tbody tr');
 if(!row)return;
 const to=e.relatedTarget;
 if(to&&to.closest&&to.closest('#scheduleRowTools')){clearTimeout(rowToolsTimer);return}
 rowToolsTimer=setTimeout(hideScheduleRowTools,120);
});
document.addEventListener('focusin',e=>{const row=e.target.closest('.schedule-grid tbody tr');if(row)showScheduleRowTools(row)});
document.addEventListener('focusout',e=>{if(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest('#scheduleRowTools'))rowToolsTimer=setTimeout(hideScheduleRowTools,120)});
let dateDrag=null;
document.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const input=e.target.closest('.date-seg input');
 if(!input)return;
 dateDrag={input,id:e.pointerId,x:e.clientX,y:e.clientY,steps:0,active:false};
},true);
document.addEventListener('pointermove',e=>{
 if(!dateDrag||e.pointerId!==dateDrag.id)return;
 if(!(e.buttons&1)){finishDateDrag();return}
 const dx=e.clientX-dateDrag.x,dy=e.clientY-dateDrag.y;
 if(!dateDrag.active){
  if(Math.abs(dx)<5)return;
  if(Math.abs(dy)>Math.abs(dx)){dateDrag=null;return}
  dateDrag.active=true;
  try{dateDrag.input.setPointerCapture(dateDrag.id)}catch{}
  dateDrag.input.blur();
  try{getSelection().removeAllRanges()}catch{}
 }
 e.preventDefault();
 const steps=Math.sign(dx)*Math.floor((Math.abs(dx)+6)/12);
 if(steps===dateDrag.steps)return;
 const delta=steps-dateDrag.steps;
 dateDrag.steps=steps;
 stepDateInput(dateDrag.input,delta,false);
});
function finishDateDrag(){
 if(!dateDrag)return;
 const d=dateDrag;dateDrag=null;
 if(!d.active)return;
 try{if(d.input.hasPointerCapture(d.id))d.input.releasePointerCapture(d.id)}catch{}
 d.input.dispatchEvent(new Event('change',{bubbles:true}));
}
for(const evt of ['pointerup','pointercancel','lostpointercapture'])
 document.addEventListener(evt,e=>{if(dateDrag&&dateDrag.id===e.pointerId)finishDateDrag()});
document.addEventListener('selectstart',e=>{
 if(dateDrag&&dateDrag.input===e.target)e.preventDefault();
});
document.addEventListener('keydown',e=>{
 const input=e.target.closest('.date-seg input');
 if(!input||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;
 e.preventDefault();
 stepDateInput(input,e.key==='ArrowUp'?1:-1);
});
document.addEventListener('focusin',e=>{
 const input=e.target.closest('.date-seg input');
 if(input)input.select();
});
document.addEventListener('click',async e=>{
 const skinBtn=e.target.closest('[data-logo-skin]');
 if(skinBtn){selectLogoSkin(skinBtn.dataset.logoSkin);return}
 if(editing && !e.target.closest('.schedule-grid') && !e.target.closest('button,input,select,textarea,a,summary,label')){
  cancelRowEditing();return;
 }
 const picker=$('#logoPicker');
 if(picker&&!e.target.closest('#logoPicker')&&!e.target.closest('[data-act="logo-picker"]'))picker.hidden=true;
 const row=e.target.closest('.schedule-grid tbody tr');
 if(row&&!e.target.closest('button,input,select,a,label,textarea')){row.querySelector('input[data-id]')?.click();return}
 const savedRow=e.target.closest('.saved-grid tbody tr');
 if(savedRow&&!e.target.closest('button,input,select,a,label,textarea')){savedRow.querySelector('input[data-saved-id]')?.click();return}
 const scheduleScrollBtn=e.target.closest('[data-scroll-schedule]');
 if(scheduleScrollBtn){scrollSchedule(scheduleScrollBtn.dataset.scrollSchedule);return}
 const addRowBtn=e.target.closest('[data-add-row]');
 if(addRowBtn){insertPaymentRow(addRowBtn.dataset.addRow);return}
 const editRow=e.target.closest('[data-edit-row]');
 if(editRow){editing=editRow.dataset.editRow;render();requestAnimationFrame(()=>{const f=$('#rowValue');if(f){f.focus();f.select()}});return}
 const allocMonthBtn=e.target.closest('[data-alloc-month]');
 if(allocMonthBtn){
  const m=allocMonthBtn.dataset.allocMonth;
  if(m==='0')allocMonths=new Set(['0']);
  else{
   allocMonths.delete('0');
   if(allocMonths.has(m))allocMonths.delete(m);else allocMonths.add(m);
  }
  document.querySelectorAll('[data-alloc-month]').forEach(b=>{
   const on=allocMonths.has(b.dataset.allocMonth);
   b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));
  });
  return;
 }
 const btn=e.target.closest('[data-act]');if(!btn)return;
 const a=btn.dataset.act,s=schedule(p);
 if(a==='save-main-preset'){
  const type=btn.dataset.noteType;
  if(type!=='intro'&&type!=='outro')return;
  const nameEl=document.querySelector('[data-main-preset-name="'+type+'"]');
  const areaEl=document.querySelector('textarea[data-key="'+type+'"]');
  const name=(nameEl?nameEl.value:'').trim();
  const text=(areaEl?areaEl.value:'').trim();
  if(!name||!text){note(t('اكتب اسمًا ونصًا للـ Preset.','Enter a preset name and text.'));return}
  const list=allMainPresets();
  list.push({id:(crypto.randomUUID?crypto.randomUUID():'p'+Date.now()),type,name,text});
  try{localStorage.setItem('mizan.presets',JSON.stringify(list))}catch{}
  note(t('تم حفظ الـ Preset','Preset saved'));
  render();
  return;
 }
 if(a==='logo-picker'){const p=$('#logoPicker');if(p){p.hidden=!p.hidden;btn.setAttribute('aria-expanded',String(!p.hidden))}return}
 if(a==='logo-pin'){pinLogoPicker();return}
 if(a==='saved-share'){shareSavedOffers();return}
 if(a==='type-cash'||a==='type-installments'){p.offerType=a==='type-cash'?'cash':'installments';selected.clear();editing=null;beforeDelete=null;persist();render();return}
 if(a==='saved-all'){const matches=filteredSaved();const all=matches.length&&matches.every(o=>savedSel.has(o.id));matches.forEach(o=>all?savedSel.delete(o.id):savedSel.add(o.id));render();return}
 if(a==='saved-clear'){savedSel.clear();render();return}
 if(a==='saveAllPlans'){
  const existing=new Set(saved.map(offerKey));let added=0;
  for(const plan of plans){
   const offer={...structuredClone(p),...plan,mode:'rate',termMonths:+plan.months||p.termMonths,edits:{},hidden:[],offerType:'installments',id:crypto.randomUUID(),updated:Date.now()};
   if(!schedule(offer).valid)continue;
   const key=offerKey(offer);if(existing.has(key))continue;
   existing.add(key);saved=[offer,...saved];added++;
  }
  if(added){write('saved',saved);note(t('تم حفظ ','Saved ')+added+' '+t('خطة','plan'))}
  else note(t('كل الخطط محفوظة بالفعل','All plans are already saved'));
  return;
 }
 if(['save','print','copy','whatsapp','wa-share'].includes(a)){
  const missing=missingExtraItem();
  if(missing){
   note(t('أدخل مبلغًا أكبر من صفر للبند الإضافي','Enter a positive amount for the additional item'));
   const section=$('[data-section="items"]');if(section)section.open=true;
   const field=$('[data-item="'+missing+'"][data-item-prop="amount"]');
   if(field){field.setAttribute('aria-invalid','true');field.focus();field.scrollIntoView({block:'center',behavior:'smooth'})}
   return;
  }
  if(!s.valid){invalid();return}
 }
 if(['calc','compare','saved'].includes(a)){page=a;render();animate();if(matchMedia('(max-width:760px)').matches)window.scrollTo({top:0,behavior:'smooth'});return}
 if(a==='terms'){
  const box=$('#terms');
  if(box){box.scrollIntoView({behavior:'smooth',block:'start'});box.classList.remove('flash');void box.offsetWidth;box.classList.add('flash');setTimeout(()=>box.classList.remove('flash'),1400)}
  return
 }
 if(a==='wa-share'){window.MizanShare.open('pdf',{rows:[...selected]});return}
 if(a==='editSelected'){
  if(selected.size!==1){note(t('حدد صفًا واحدًا للتعديل.','Select one row to edit.'));return}
  const id=[...selected][0],row=s.rows.find(r=>r.id===id);
  if(!row||!['installment','payment'].includes(row.type)){note(t('هذا الصف غير قابل للتعديل.','This row cannot be edited.'));return}
  editing=id;render();return;
 }
 if(a==='addRow'){insertPaymentRow();return}
 if(a==='apply-alloc'){
  const year=+allocYear,amount=num(allocAmount),months=[...allocMonths];
  if(!Number.isInteger(year)||year<2000||year>2200||!Number.isFinite(amount)||amount<0||!months.length){invalid();return}
  let list=[...(p.allocations||[])];
  if(months.includes('0'))list=list.filter(item=>item.year!==year);
  else for(const m of months)list=list.filter(item=>!(item.year===year&&(+item.month||0)===+m));
  for(const m of months)list.push({year,month:+m,amount});
  p.allocations=list;p.edits={};editing=null;allocAmount='';persist();render();return;
 }
 if(a==='remove-alloc-group'){
  const year=+btn.dataset.allocYear,amount=+btn.dataset.allocAmount;
  p.allocations=(p.allocations||[]).filter(item=>!(item.year===year&&(+item.amount||0)===amount));
  p.edits={};editing=null;persist();render();return;
 }
 if(a.startsWith('remove-alloc-')){const index=+a.slice(13);p.allocations=(p.allocations||[]).filter((_,i)=>i!==index);p.edits={};editing=null;persist();render();return}
 if(a.startsWith('edit-')){editing=a.slice(5)}
 else if(a==='cancelRow'){
  const custom=(p.customRows||[]).find(row=>row.id===editing);
  if(custom&&!custom.value)p.customRows=p.customRows.filter(row=>row.id!==editing);
  editing=null
 }
 else if(a==='applyRow'){
  const r=s.rows.find(row=>String(row.id)===String(editing));
  const parsed=readDateSegParts(document.querySelector('.row-edit-line .date-seg'));
  const value=Math.round(num($('#rowValue')?$('#rowValue').value:0)*100);
  const type=$('#rowType')?$('#rowType').value:(r?r.type:'');
  if(!r||!Number.isSafeInteger(value)||value<=0||!parsed){invalid();return}
  const ok=applyRowEdit(r,type,parsed,value);
  if(!ok)return;
  editing=null;beforeDelete=null;persist();render();return;
 }
 else if(a==='redistribute'){
 const rest=s.rows.filter(r=>r.type==='installment'),balance=s.rows.at(-1)?.balance??s.price;
 if(!rest.length||!balance){note(t('يتطلب التوزيع رصيدًا وأقساطًا متبقية','A balance and remaining installments are required'));return}
 p.edits={...p.edits};rest.forEach((r,i)=>{p.edits[r.id]={value:r.value+Math.round(balance*(i+1)/rest.length)-Math.round(balance*i/rest.length),date:r.date}});beforeDelete=null;editing=null
 }
 else if(a==='lang'){lang=lang==='ar'?'en':'ar';write('lang',lang)}
 else if(a==='theme-toggle'){theme=document.documentElement.hasAttribute('data-dark')?'light':'dark';write('theme',theme)}
 else if(a==='increase'){const v=num($('#extra').value);if(!Number.isFinite(v)||v<=0||s.down/100+v>p.price){invalid();return}p.mode='amount';p.down=(s.down+Math.round(v)*100)/100;p.edits={};editing=null;beforeDelete=null}
 else if(a==='save'){p.id=p.id||crypto.randomUUID();p.updated=Date.now();saved=[normalizeOffer(structuredClone(p)),...saved.filter(o=>o.id!==p.id)];write('saved',saved);note(t('تم حفظ العرض','Offer saved'))}
 else if(a==='toggle-core'){coreOpen=!coreOpen}
 else if(a==='reset'){if(!confirm(t('بدء عرض جديد؟','Start a new offer?')))return;p=newOffer();sectionOpen=defaultOpenSections();coreOpen=true;selected.clear();beforeDelete=null}
 else if(a==='selectInst'){selected=new Set(s.rows.filter(r=>r.type==='installment').map(r=>r.id))}
 else if(['delete','clear','restore'].includes(a)){beforeDelete=[...p.hidden];p.hidden=a==='restore'?[]:[...new Set([...p.hidden,...(a==='clear'?s.rows.map(r=>r.id):selected)])];selected.clear()}
 else if(a==='undo'){p.hidden=beforeDelete||[];beforeDelete=null;selected.clear()}
 else if(a==='addPlan'){plans.push({down:Math.round(100*s.down/(s.price||1)),months:p.termMonths||84});write('plans',plans)}
 else if(a.startsWith('remove-')){plans.splice(+a.slice(7),1);write('plans',plans)}
 else if(a.startsWith('use-')){const o=plans[+a.slice(4)];if(!schedule({...p,...o,mode:'rate',termMonths:+o.months||0}).valid){invalid();return}Object.assign(p,{edits:{},down:o.down,mode:'rate',years:Math.round((+o.months||0)/12*1000)/1000,termMonths:+o.months||0,hidden:[],offerType:'installments'});sectionOpen=defaultOpenSections();coreOpen=true;selected.clear();beforeDelete=null;page='calc'}
 else if(/^(open|clone|drop)-/.test(a)){const cut=a.indexOf('-'),op=a.slice(0,cut),id=a.slice(cut+1);const offer=saved.find(o=>o.id===id);if(!offer)return;
 if(op==='drop'){if(!confirm(t('حذف العرض المحفوظ؟','Delete saved offer?')))return;saved=saved.filter(o=>o.id!==id);write('saved',saved);if(p.id===id)delete p.id}
 else{p=normalizeOffer(structuredClone(offer));if(op==='clone'){delete p.id;p.unit=(p.unit||t('عرض','Offer'))+' · '+t('نسخة','Copy')}sectionOpen=defaultOpenSections();coreOpen=true;selected.clear();beforeDelete=null;page='calc'}}
 else if(a==='print'){window.MizanShare.open('pdf');return}
 else if(a==='copy'){try{await navigator.clipboard.writeText(clientText(s,true));note(t('تم النسخ','Copied'))}catch{note(t('تعذر النسخ','Copy unavailable'))}return}
 else if(a==='whatsapp'){window.MizanShare.open('pdf');return}
 persist();render();if(['delete','clear','undo','restore','increase'].includes(a))animate();
});
document.addEventListener('pointerdown',e=>{
 document.querySelectorAll('details.pop[open]').forEach(d=>{if(!d.contains(e.target))d.open=false});
},true);
document.addEventListener('click',e=>{
 const all=e.target.closest('[data-all]');
 if(!all)return;
 e.preventDefault();
 if(selected.size)selected.clear();
 else selected=new Set(schedule(p).rows.map(r=>r.id));
 render();
},true);
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if(document.querySelector('.share-sheet')||document.querySelector('.pv-layer'))return;
 if(editing){cancelRowEditing();return}
 if(selected.size){selected.clear();render()}
});
if(window.chrome&&window.chrome.webview){
 window.chrome.webview.addEventListener('message',e=>{
  const d=e.data;
  if(!d||d.type!=='mizan-command')return;
  if(d.command==='lang'){lang=lang==='ar'?'en':'ar';write('lang',lang);render();}
  else if(d.command==='theme'){theme=document.documentElement.hasAttribute('data-dark')?'light':'dark';write('theme',theme);render();}
 });
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(theme==='system')drawHeader()});
window.MizanApp={
 get p(){return p}, get lang(){return lang}, get theme(){return theme}, get selected(){return selected},
 get includeIntro(){return includeIntro}, get includeOutro(){return includeOutro},
 setNoteVisibility:(intro,outro)=>{includeIntro=!!intro;includeOutro=!!outro;write('includeIntro',includeIntro);write('includeOutro',includeOutro)},
 setNoteDefault:(type,text)=>{if(type!=='intro'&&type!=='outro')return;p[type]=String(text||'');write(type==='intro'?'defaultIntro':'defaultOutro',p[type]);write('draft',p);const area=document.querySelector('textarea[data-key="'+type+'"]');if(area)area.value=p[type]},
 schedule, normalizeOffer, names, frequency, dateLabel, dateNum, offerTitle, itemName, fmt, curr, money, feeLabel, legalLines, clientText, directedText, fillOfferText, paymentColumns, note, esc, t, icon, brandMark,
 isMobile:()=>matchMedia('(max-width:760px)').matches
};
window.MizanNativeBack=()=>{
 const shareSheet=document.querySelector('.share-sheet');
 if(shareSheet&&window.MizanShare&&typeof window.MizanShare.close==='function'){window.MizanShare.close();return true}
 const openPop=document.querySelector('details.pop[open]');
 if(openPop){openPop.open=false;return true}
 const openDetails=[...document.querySelectorAll('details[open]:not(.pop)')];
 if(openDetails.length){openDetails[openDetails.length-1].open=false;return true}
 if(page!=='calc'){page='calc';render();return true}
 return false;
};
render();
