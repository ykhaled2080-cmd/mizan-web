/* ============================================================
   Mizan — WhatsApp / PDF / images share flow
   - generates a clean A4 PDF (no browser header, footer, date or URL)
   - lets the user send the PDF, selected pages as images, or text
   - supports free selection of any part of a page, many parts at once
   - Windows host bridge for native save / share / WhatsApp
   ============================================================ */
(() => {
  'use strict';
  const A=window.MizanApp;
  const $=s=>document.querySelector(s);
  const esc=A.esc;
  const isWindowsNative=()=>!!(window.chrome&&window.chrome.webview&&window.chrome.webview.postMessage);
  const isAndroidNative=()=>!!(window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform()&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform()==='android');
  const isNative=()=>isWindowsNative()||isAndroidNative();
  const isMobile=()=>matchMedia('(max-width:760px)').matches;
  const icon=(name,size=18)=>{
    const paths={
      globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
      file:'M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h5',
      image:'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
      text:'M5 4h14M5 8h14M5 12h9M5 16h11M5 20h7',
      crop:'M7 3v14a2 2 0 0 0 2 2h12M3 7h14a2 2 0 0 1 2 2v12',
      close:'M6 6l12 12M18 6 6 18',
      check:'M4.5 12.5 9.2 17 19.5 6.8',
      download:'M12 4v11m0 0 4-4m-4 4-4-4M4 18v2h16v-2',
      open:'M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5',
      whatsapp:'M20 11.5a8.5 8.5 0 0 1-12.6 7.5L4 20l1-3.4A8.5 8.5 0 1 1 20 11.5ZM8.5 8.2c.2 3 2.4 5.2 5.3 5.4.8 0 1.2-.5 1.2-1.1 0-.2-.3-.5-.8-.7l-1-.4c-.3-.1-.5 0-.7.2l-.4.5c-1-.4-1.8-1.2-2.2-2.2l.5-.4c.2-.2.3-.4.2-.7l-.4-1c-.2-.5-.5-.8-.8-.7-.6 0-1 .4-1 1.1Z',
      copy:'M8 8h12v12H8zM16 8V4H4v12h4',
      folder:'M3 6h7l2 2h9v12H3z',
      pen:'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13 7l4 4',
      highlight:'m13 4 7 7-8 8-5-5zM7 14l-3 5 4 1 4-2M3 22h16',
      eraser:'m4 13 9-9a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-9 9H8l-4-4a2 2 0 0 1 0-3ZM8 10l7 7M11 20h10',
      cursor:'M5 3l14 9-6 1.5L10 20z',
      tools:'M4 7h16M4 12h16M4 17h16M8 4v6M16 10v6M10 14v6',
      fit:'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
      undo:'M8 4 3 9l5 5M4 9h9a6 6 0 0 1 0 12',
      note:'M5 3h10l4 4v14H5zM15 3v5h5M8 12h8M8 16h6',
      share:'M8 12h9m-4-4 4 4-4 4M6 5H3v14h3',
      arrow:'M15 18l-6-6 6-6',
      refresh:'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
      upload:'M12 4v11m0-11 4 4m-4-4-4 4M4 18v2h16v-2',
      windows:'M3 5l8-1v8H3zM13 3.8 21 2v10h-8zM3 13h8v8l-8-1zM13 13h8v9l-8-1.2z'
    };
    return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="'+(paths[name]||paths.file)+'"/></svg>';
  };
  const S={
    open:false,tab:'pdf',built:null,buildPromise:null,buildToken:0,
    signature:'',lastSignature:'',progress:0,progressLabel:'',error:null,
    selectedPages:new Set(),crops:[],cropIndex:null,cropRect:null,cropFull:null,pdfOffers:new Set(),
    text:'',busy:false,result:null,lastFiles:null,lastText:null,lastKind:'',
    cropBusy:false,rowFilter:null,pv:null,docLang:null,textMode:'horizontal',textScope:'full',fileScope:'full',pdfLayout:'horizontal',
    offers:null,includeIntro:!!A.includeIntro,includeOutro:!!A.includeOutro,showTotalOverride:null,
    zoom:1,zoomMode:'actual',activeOffer:0,introText:'',outroText:'',introDirty:false,outroDirty:false,introPreset:'',outroPreset:'',notesOpen:false,scopePrompt:null,dividerSelected:'',dividerEditing:false,textSelected:'',docStyleOpen:false,docPresetSel:'',docPresetEditId:'',docRoleSel:'main',docDividerSel:'price',docPresetName:'',docHistory:[],docRedo:[],lastPageInputAt:0
  };
  const FIXED_PDF_STYLE={title:'Arial',sub:'Arial',body:'Arial',brandScale:100,headingScale:100};
const DOC_STYLE_KEY='mizan.docStyle';
const DOC_PRESETS_KEY='mizan.docPresets';
const DOC_FONT_MAIN='"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif';
const DOC_FONT_CLASSIC='Arial,Helvetica,sans-serif';
const DOC_ROLE_DEFS={
 title:{label:'عنوان المستند',size:26,weight:700,color:'#17483B'},
 main:{label:'العناوين الرئيسية',size:13,weight:700,color:'#215646'},
 sub:{label:'العناوين الفرعية',size:13,weight:700,color:'#19483B'},
 label:{label:'عناوين الحقول',size:13,weight:700,color:'#293B33'},
 value:{label:'القيم والنصوص',size:13,weight:700,color:'#173F33'},
 unit:{label:'قيمة سعر الوحدة',size:20,weight:400,color:'#21362E'},
 secondary:{label:'المعلومات الثانوية',size:11.5,weight:400,color:'#52665C'},
 total:{label:'الإجماليات',size:17,weight:700,color:'#173F33'}
};
const DOC_DIVIDER_DEFS={
 brand:{label:'فاصل رأس المستند',visible:true,offset:0,thickness:1,color:'#194B3D',length:100},
 identity:{label:'فاصل بيانات العميل والوحدة',visible:true,offset:0,thickness:1,color:'#D8E2DB',length:100},
 price:{label:'فاصل سعر الوحدة',visible:true,offset:2,thickness:1,color:'#D8E2DB',length:100},
 down:{label:'فاصل مقدم التعاقد',visible:true,offset:2,thickness:1,color:'#D8E2DB',length:100},
 plan:{label:'فاصل خطة التقسيط',visible:true,offset:2,thickness:1,color:'#D8E2DB',length:100},
 delivery:{label:'فاصل دفعة الاستلام',visible:false,offset:0,thickness:1,color:'#D8E2DB',length:100},
 installment:{label:'فاصل قيمة القسط',visible:false,offset:0,thickness:1,color:'#D8E2DB',length:100},
 included:{label:'فاصل «السعر يشمل»',visible:true,offset:0,thickness:1,color:'#D8E2DB',length:100},
 excluded:{label:'فاصل «السعر لا يشمل»',visible:true,offset:0,thickness:1,color:'#D8E2DB',length:100},
 extras:{label:'فاصل المستحقات الإضافية',visible:true,offset:0,thickness:1,color:'#D8E2DB',length:100},
 legal:{label:'فاصل الحالة المالية والقانونية',visible:true,offset:0,thickness:1,color:'#D8E2DB',length:100},
 commission:{label:'فاصل عمولة الوساطة',visible:true,offset:0,thickness:1,color:'#D8E2DB',length:100},
 folio:{label:'فاصل تذييل الصفحة',visible:true,offset:0,thickness:1,color:'#D8E2DB',length:100}
};
const DOC_DIVIDER_ANCHORS={
 brand:{selector:'.pdf-brandline',side:'bottom',union:'.pdf-brandline>*'},
 identity:{selector:'.pdf-identity',side:'bottom',union:'.pdf-identity>div'},
 price:{selector:'[data-divider-host="price"],.pdf-price-block:not(.pdf-cash-total)',side:'bottom',shift:-11,union:'.pdf-price-block:not(.pdf-cash-total) .lbl,.pdf-price-block:not(.pdf-cash-total) .amt'},
 down:{selector:'[data-divider-host="down"],.pdf-pay-down',side:'bottom',shift:-11},
 plan:{selector:'[data-divider-host="plan"],.pdf-pay-plan',side:'bottom',shift:-11},
 delivery:{selector:'[data-divider-host="delivery"],.pdf-pay-delivery',side:'bottom',shift:-11},
 installment:{selector:'[data-divider-host="installment"],.pdf-pay-installment',side:'bottom',shift:-11},
 included:{selector:'.pdf-section-title.pdf-included-title .rule,.pdf-section-title.pdf-cash-included-title .rule',side:'center'},
 excluded:{selector:'.pdf-section-title.pdf-excluded-title .rule,.pdf-section-title.pdf-cash-excluded-title .rule',side:'center'},
 extras:{selector:'.pdf-section-title.pdf-extras-title .rule,.pdf-section-title.pdf-cash-charges-title .rule',side:'center'},
 legal:{selector:'.pdf-section-title.pdf-legal-head .rule',side:'center'},
 commission:{selector:'.pdf-charge-commission.has-rule .lbl',side:'top'},
 folio:{selector:'.pdf-folio',side:'top'}
};
const SECTION_DIVIDER_MAP={
 included:{headingKey:'section-included-title',cashHeadingKey:'section-cash-included-title',selector:'.pdf-section-title.pdf-included-title h3,.pdf-section-title.pdf-cash-included-title h3'},
 excluded:{headingKey:'section-excluded-title',cashHeadingKey:'section-cash-excluded-title',selector:'.pdf-section-title.pdf-excluded-title h3,.pdf-section-title.pdf-cash-excluded-title h3'},
 extras:{headingKey:'section-extras-title',cashHeadingKey:'section-cash-extras-title',selector:'.pdf-section-title.pdf-extras-title h3,.pdf-section-title.pdf-cash-charges-title h3'},
 legal:{headingKey:'section-legal-title',cashHeadingKey:'',selector:'.pdf-section-title.pdf-legal-head h3'}
};
function sectionDividerMap(id){return SECTION_DIVIDER_MAP[id]||null}
function sectionHeadingFor(page,id){const m=sectionDividerMap(id);return m&&page?page.querySelector(m.selector):null}
function sectionAnchorKey(id){
 const m=sectionDividerMap(id);if(!m)return '';
 return m.cashHeadingKey&&DOC_STYLE.textOffsets&&DOC_STYLE.textOffsets[m.cashHeadingKey]!==undefined?m.cashHeadingKey:m.headingKey;
}
function activeSectionAnchorKey(id){
 const pages=[...document.querySelectorAll('.pdf-page')];
 const page=pages.find(p=>sectionHeadingFor(p,id))||pages[0];
 const h=sectionHeadingFor(page,id);
 return h?String(h.dataset.textAnchor||h.dataset.textId||sectionAnchorKey(id)):sectionAnchorKey(id);
}
function setSectionAnchorOffset(key,value){
 if(!key)return false;
 const next=Math.round(Math.max(-1123,Math.min(1123,+value||0))*10)/10;
 DOC_STYLE.textOffsets=DOC_STYLE.textOffsets||{};
 if(Math.abs(next)>=0.1)DOC_STYLE.textOffsets[key]=next;
 else delete DOC_STYLE.textOffsets[key];
 return true;
}
function clampSectionOffset(id,value){
 const pages=[...document.querySelectorAll('.pdf-page')];
 const page=pages.find(p=>sectionHeadingFor(p,id))||pages[0];
 const h=sectionHeadingFor(page,id);
 if(!h)return value;
 const target=pdfTextOffsetTarget(h);
 const scale=pdfPageScale(h)||1;
 const pr=page.getBoundingClientRect(),r=target.getBoundingClientRect();
 const key=activeSectionAnchorKey(id),current=+DOC_STYLE.textOffsets[key]||0;
 const top=(r.top-current*scale-pr.top)/scale;
 const bottom=(r.bottom-current*scale-pr.top)/scale;
 const pageH=pr.height/scale;
 return Math.max(-top+0.5,Math.min(pageH-bottom-0.5,value));
}
function docRoles(font){return Object.fromEntries(Object.entries(DOC_ROLE_DEFS).map(([key,def])=>[key,{font:font||DOC_FONT_CLASSIC,size:def.size,weight:def.weight,color:def.color}]));}
function docDividers(){return Object.fromEntries(Object.entries(DOC_DIVIDER_DEFS).map(([key,def])=>[key,{...def,opacity:def.opacity??1}]));}
const LEGACY_DIVIDER_COLORS=new Set(['#d2dcd5','#e4ebe1','#dfe7e1','#194b3d']);
/* Old releases used several near-identical greens and a 1.5px brand rule.
   The brand rule keeps its stronger green; other standard dividers normalize
   to one quiet tone. Any other explicit color is the user's own override. */
function normalizeDividerConfig(cfg,key){
 if(!cfg||typeof cfg!=='object')return cfg;
 const color=String(cfg.color||'').toLowerCase();
 if(key==='brand'){
  if(color==='#d8e2db'||LEGACY_DIVIDER_COLORS.has(color))cfg.color='#194B3D';
 }else if(LEGACY_DIVIDER_COLORS.has(color)){
  cfg.color='#D8E2DB';
 }
 if(key==='brand'&&Math.abs(+cfg.thickness-1.5)<0.001)cfg.thickness=1;
 if(!Number.isFinite(+cfg.opacity))cfg.opacity=1;
 return cfg;
}
const MAIN_PRESET_ID='mizan';
const MAIN_PRESET_NAME='MIZAN';
const LEGACY_BUILTIN_IDS=new Set(['main','classic','balanced','minimal','contrast','soft']);
const DOC_STYLE_MIGRATION_KEY='mizan.docStyleMigration';
const DOC_STYLE_ARCHIVE_KEY='mizan.docStyleArchive';
const DOC_PRESETS_ARCHIVE_KEY='mizan.docPresetsArchive';
const DOC_COMPARE_KEY='mizan.docPresetCompare';
function docCompareMode(){try{return localStorage.getItem(DOC_COMPARE_KEY)!=='0'}catch{return true}}
function setDocCompareMode(on){try{localStorage.setItem(DOC_COMPARE_KEY,on?'1':'0')}catch{}}
/* Bump only when the canonical Main design or its migration rules change. */
const DOC_STYLE_MIGRATION_VERSION=4;

function mainDocStyleSource(){
 const raw=typeof window!=='undefined'?window.MIZAN_MAIN_DOC_STYLE:null;
 return raw&&typeof raw==='object'?raw:null;
}
function applyDocStyleSource(base,saved,opts){
 const includeOffsets=!!(opts&&opts.includeOffsets);
 const style={activePreset:typeof saved.activePreset==='string'?saved.activePreset:base.activePreset,roles:{},dividers:{},extraDividers:[],textOffsets:includeOffsets?{...base.textOffsets}:{}};
 for(const key of Object.keys(DOC_ROLE_DEFS)){
  style.roles[key]={...base.roles[key]};
  const src=saved.roles&&saved.roles[key];
  if(src&&typeof src==='object'){
   if(typeof src.font==='string'&&src.font)style.roles[key].font=src.font;
   if(Number.isFinite(+src.size))style.roles[key].size=Math.max(7,Math.min(48,+src.size));
   if([400,500,600,700].includes(+src.weight))style.roles[key].weight=+src.weight;
   if(/^#[0-9a-f]{6}$/i.test(src.color||''))style.roles[key].color=src.color;
  }
 }
 for(const key of Object.keys(DOC_DIVIDER_DEFS)){
  style.dividers[key]={...base.dividers[key]};
  const src=saved.dividers&&saved.dividers[key];
  if(src&&typeof src==='object'){
   style.dividers[key].visible=!!src.visible;
   if(Number.isFinite(+src.offset))style.dividers[key].offset=+src.offset;
   if(Number.isFinite(+src.thickness))style.dividers[key].thickness=Math.max(.5,Math.min(4,+src.thickness));
   if(/^#[0-9a-f]{6}$/i.test(src.color||''))style.dividers[key].color=src.color;
   if(Number.isFinite(+src.length))style.dividers[key].length=Math.max(0,Math.min(100,+src.length));
   style.dividers[key].opacity=Number.isFinite(+src.opacity)?Math.max(0,Math.min(1,+src.opacity)):1;
   normalizeDividerConfig(style.dividers[key],key);
  }
 }
 const seen=new Set();
 if(Array.isArray(saved.extraDividers))style.extraDividers=saved.extraDividers.slice(0,200).filter(x=>x&&x.id&&DOC_DIVIDER_DEFS[x.host]).map(x=>({
  id:String(x.id),host:String(x.host),visible:x.visible!==false,
  offset:Number.isFinite(+x.offset)?+x.offset:2,
  thickness:Number.isFinite(+x.thickness)?Math.max(.5,Math.min(4,+x.thickness)):1,
  color:/^#[0-9a-f]{6}$/i.test(x.color||'')?x.color:'#D8E2DB',
  length:Number.isFinite(+x.length)?Math.max(0,Math.min(100,+x.length)):100,
  opacity:Number.isFinite(+x.opacity)?Math.max(0,Math.min(1,+x.opacity)):1
 })).filter(x=>{if(seen.has(x.id))return false;seen.add(x.id);return true}).map(x=>normalizeDividerConfig(x,''));
 if(saved.textOffsets&&typeof saved.textOffsets==='object'&&!Array.isArray(saved.textOffsets)){
  const ids=Object.keys(saved.textOffsets).slice(0,500);
  for(const id of ids){
   const v=+saved.textOffsets[id];
   if(!id||id.length>120||!Number.isFinite(v))continue;
   const offset=Math.max(-1123,Math.min(1123,Math.round(v*10)/10));
   if(Math.abs(offset)>=0.1)style.textOffsets[id]=offset;
  }
 }
 return style;
}
function docDefaultStyle(){
 const base={activePreset:MAIN_PRESET_ID,roles:docRoles(DOC_FONT_CLASSIC),dividers:docDividers(),extraDividers:[],textOffsets:{}};
 const raw=mainDocStyleSource();
 const style=raw?applyDocStyleSource(base,raw,{includeOffsets:true}):base;
 style.activePreset=MAIN_PRESET_ID;
 return style;
}
function mergeDocStyle(saved){
 const base=docDefaultStyle();
 if(!saved||typeof saved!=='object')return base;
 return applyDocStyleSource(base,saved,{includeOffsets:false});
}
function docBuiltinPresets(){
 return [{id:MAIN_PRESET_ID,name:MAIN_PRESET_NAME,builtin:true,style:mergeDocStyle(docDefaultStyle())}];
}
function docStyleMigrationVersion(){
 try{return +localStorage.getItem(DOC_STYLE_MIGRATION_KEY)||0}catch{return 0}
}
function archiveDocStyle(raw,version,withPresets){
 try{
  const list=JSON.parse(localStorage.getItem(DOC_STYLE_ARCHIVE_KEY)||'[]');
  list.push({at:new Date().toISOString(),migrationVersion:version,activePreset:raw&&typeof raw.activePreset==='string'?raw.activePreset:'',style:raw||null});
  while(list.length>5)list.shift();
  localStorage.setItem(DOC_STYLE_ARCHIVE_KEY,JSON.stringify(list));
 }catch{}
 if(withPresets){
  try{
   const presets=JSON.parse(localStorage.getItem(DOC_PRESETS_KEY)||'[]');
   const list=JSON.parse(localStorage.getItem(DOC_PRESETS_ARCHIVE_KEY)||'[]');
   list.push({at:new Date().toISOString(),migrationVersion:version,presets:Array.isArray(presets)?presets:[]});
   while(list.length>3)list.shift();
   localStorage.setItem(DOC_PRESETS_ARCHIVE_KEY,JSON.stringify(list));
  }catch{}
 }
}
function writeRawDocStyle(style){
 try{localStorage.setItem(DOC_STYLE_KEY,JSON.stringify(style));return true}catch{return false}
}
function readDocStyle(){
 let raw=null;
 try{raw=JSON.parse(localStorage.getItem(DOC_STYLE_KEY)||'null')}catch{raw=null}
 const version=docStyleMigrationVersion();
 if(version<DOC_STYLE_MIGRATION_VERSION){
  if(raw)archiveDocStyle(raw,version,true);
  /* v4: MIZAN is the only shipped template. Retire every saved shipped or
     personal preset from the active selector after archiving it above. */
  try{localStorage.setItem(DOC_PRESETS_KEY,'[]')}catch{}
  try{localStorage.setItem(DOC_COMPARE_KEY,'1')}catch{}
  const main=docDefaultStyle();main.activePreset=MAIN_PRESET_ID;
  const saved=writeRawDocStyle(main);
  if(saved){try{localStorage.setItem(DOC_STYLE_MIGRATION_KEY,String(DOC_STYLE_MIGRATION_VERSION))}catch{}}
  return main;
 }
 if(!raw){
  const main=docDefaultStyle();main.activePreset=MAIN_PRESET_ID;
  writeRawDocStyle(main);
  return main;
 }
 /* A stale write from an old cache revision must not resurrect a retired
    shipped preset after migration. */
 if(raw.activePreset&&LEGACY_BUILTIN_IDS.has(raw.activePreset)){
  archiveDocStyle(raw,version);
  const main=docDefaultStyle();main.activePreset=MAIN_PRESET_ID;
  writeRawDocStyle(main);
  return main;
 }
 return mergeDocStyle(raw);
}
function writeDocStyle(style,opts){try{localStorage.setItem(DOC_STYLE_KEY,JSON.stringify(mergeDocStyle(style)));if(!opts||opts.bump!==false)DOC_STYLE_VERSION++;return true}catch{return false}}
function sanitizeCustomDocPresets(list){
 const seen=new Set();
 return (Array.isArray(list)?list:[]).filter(p=>p&&p.id&&p.name&&p.style).map(p=>{
  const id=String(p.id).slice(0,120);
  const name=String(p.name).trim().slice(0,60);
  return {id,name,builtin:false,style:mergeDocStyle(p.style)};
 }).filter(p=>{
  if(!p.name||seen.has(p.id))return false;
  seen.add(p.id);return true;
 });
}
function readCustomDocPresets(){try{return sanitizeCustomDocPresets(JSON.parse(localStorage.getItem(DOC_PRESETS_KEY)||'[]'))}catch{return[]}}
function writeCustomDocPresets(list){try{localStorage.setItem(DOC_PRESETS_KEY,JSON.stringify(sanitizeCustomDocPresets(list)))}catch{}}
function newDocPresetId(){return 'custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function docStyleSnapshot(){const style=mergeDocStyle(DOC_STYLE);style.activePreset='';return style}
let DOC_STYLE=readDocStyle();
let DOC_STYLE_COMMITTED=JSON.stringify(mergeDocStyle(DOC_STYLE));
let DOC_STYLE_VERSION=0;

  function tt(ar,en){return A.lang==='ar'?ar:en}
  function docLang(){return S.docLang||A.lang}
  function dt(ar,en){return docLang()==='ar'?ar:en}
  function offerTitleFor(o){return o&&o.offerType==='cash'?dt('عرض كاش','Cash offer'):dt('عرض سداد تقديري','Estimated payment offer')}
  function money(cents){return dt('ج.م','EGP')+' '+localFormat(docLang()).intl.format(cents/100)}
  function normalizedPhone(){
    let v=String(A.p.phone||'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/\D/g,'');
    if(/^01\d{9}$/.test(v))v='2'+v;
    return v;
  }
  function activeSchedule(){
    const s=schedule(A.p);
    if(S.rowFilter&&S.rowFilter.size){
      s.selectedOnly=true;
      s.allCount=s.rows.length;
      s.rows=s.rows.filter(r=>S.rowFilter.has(r.id));
      s.selectedTotal=s.rows.reduce((sum,r)=>sum+r.value,0);
    }
    return s;
  }
  function filePart(value){
    return String(value||'').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').replace(/\s+/g,' ').slice(0,64);
  }
  function fileBase(){
    const title=offerTitleFor(A.p);
    const parts=[filePart(A.p.unit),filePart(title)];
    if(S.fileScope==='summary')parts.push(filePart(dt('ملخص','summary')));
    const clean=parts.filter(Boolean);
    return clean.join(' - ').replace(/[. ]+$/,'')||title;
  }
  function pdfFileName(){return shareBase()+'.pdf'}
  function offersMode(){return !!(S.offers&&S.offers.length)}
  function shareBase(){
    if(offersMode())return dt('عروض محفوظة','Saved offers')+' - '+S.offers.length;
    return fileBase();
  }
  function offersCaption(){
    if(!offersMode())return caption();
    const lines=[dt('عروض محفوظة','Saved offers')+' · '+S.offers.length];
    S.offers.forEach((o,i)=>{
      const s=A.schedule(o);
      const hidden=S.showTotalOverride!==null?!S.showTotalOverride:o.showTotal===false;
      const shown=hidden?(+o.price||0)*100:(s.cash?s.price:s.total);
      lines.push((i+1)+'. '+(o.unit||dt('عرض عقاري','Property offer'))+(o.client?' · '+o.client:'')+' · '+dt('ج.م','EGP')+' '+A.fmt(shown/100));
    });
    return lines.join('\n');
  }
  function readPresets(){
    try{const v=JSON.parse(localStorage.getItem('mizan.presets')||'[]');return Array.isArray(v)?v.filter(p=>p&&p.id&&p.type&&typeof p.text==='string'):[]}catch{return []}
  }
  function writePresets(list){try{localStorage.setItem('mizan.presets',JSON.stringify(list))}catch{}}
  function presetsOf(type){return readPresets().filter(p=>p.type===type)}
  function effectiveOffer(o){
    const copy=JSON.parse(JSON.stringify(o||{}));
    if(S.introDirty)copy.intro=S.introText;
    if(S.outroDirty)copy.outro=S.outroText;
    if(S.showTotalOverride!==null)copy.showTotal=S.showTotalOverride;
    return copy;
  }
  function offersText(){
    const lang=docLang();
    return S.offers.map(o=>{
      const body=A.clientText(A.schedule(o),true,lang,S.textMode,S.includeIntro,S.includeOutro,effectiveOffer(o));
      const heading=[offerTitleFor(o),o.unit||'',o.client||''].filter(Boolean).join(' · ');
      return (heading?heading+'\n':'')+body;
    }).join('\n\n————————————————\n\n');
  }
  function offersSummary(){
    const lang=docLang();
    return S.offers.map(o=>{
      const body=A.clientText(A.schedule(o),false,lang,S.textMode,S.includeIntro,S.includeOutro,effectiveOffer(o));
      const heading=[offerTitleFor(o),o.unit||'',o.client||''].filter(Boolean).join(' · ');
      return (heading?heading+'\n':'')+body;
    }).join('\n\n————————————————\n\n');
  }
  function summaryText(){
    if(offersMode())return offersSummary();
    return A.clientText(activeSchedule(),false,docLang(),S.textMode,S.includeIntro,S.includeOutro,effectiveOffer(A.p));
  }
  function buildShareText(){
    if(S.textScope==='summary')return summaryText();
    if(offersMode())return offersText();
    return A.clientText(activeSchedule(),true,docLang(),S.textMode,S.includeIntro,S.includeOutro,effectiveOffer(A.p));
  }
  function noteSource(){return offersMode()?S.offers[0]:A.p}
  function showTotalValue(){
    if(S.showTotalOverride!==null)return S.showTotalOverride;
    const src=offersMode()?S.offers[S.activeOffer]:A.p;
    return !src||src.showTotal!==false;
  }
  function activeOfferCaption(){
    if(!offersMode())return caption();
    const o=S.offers[S.activeOffer]||S.offers[0]||{};
    const s=A.schedule(o);
    const hidden=S.showTotalOverride!==null?!S.showTotalOverride:o.showTotal===false;
    const shown=hidden?(+o.price||0)*100:(s.cash?s.price:s.total);
    const label=hidden?dt('سعر الوحدة','Unit price'):dt('إجمالي العرض','Offer total');
    return [offerTitleFor(o),o.unit||'',label+' · '+money(shown)].filter(Boolean).join('\n');
  }
  function caption(){
    const s=activeSchedule();
    const src=A.p;
    const hidden=S.showTotalOverride!==null?!S.showTotalOverride:A.p.showTotal===false;
    const total=s.selectedOnly?s.selectedTotal:(s.cash?s.price:s.total);
    const label=hidden?dt('سعر الوحدة','Unit price'):(s.selectedOnly?dt('إجمالي الدفعات المحددة','Selected payments total'):dt('إجمالي العرض','Offer total'));
    return [offerTitleFor(src),src.unit||'',label+' · '+money(hidden?s.price:total)].filter(Boolean).join('\n');
  }
  function waUrl(text){
    const phone=normalizedPhone();
    const base=phone?('https://wa.me/'+phone):'https://wa.me/';
    return base+'?text='+encodeURIComponent(text||'');
  }
  function waOpenUrl(text){
    const phone=normalizedPhone();
    const base=phone?('https://wa.me/'+phone):'https://wa.me/';
    return text?base+'?text='+encodeURIComponent(text):base;
  }

  /* ---------- native bridge ---------- */
  async function postNative(payload){
    if(window.MizanAndroidBridge)return window.MizanAndroidBridge.handle(payload);
    const res=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},cache:'no-store',body:JSON.stringify(payload)});
    const raw=await res.text();
    let data={};
    try{data=raw?JSON.parse(raw):{}}catch{data={message:raw}}
    if(!res.ok||data.ok===false)throw new Error(data.message||raw||tt('تعذر تنفيذ الطلب','Request failed'));
    return data;
  }
  function blobToBase64(blob){
    return new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(String(r.result).split(',')[1]||'');
      r.onerror=()=>reject(r.error||new Error('read failed'));
      r.readAsDataURL(blob);
    });
  }
  async function filesPayload(files){
    const out=[];
    for(const f of files)out.push({name:f.name,mime:f.type||'application/octet-stream',base64:await blobToBase64(f)});
    return out;
  }
  function dataUrlBlob(dataUrl){
    return fetch(dataUrl).then(r=>r.blob());
  }
  function canvasBlob(canvas,type,quality){
    return new Promise((resolve,reject)=>{
      canvas.toBlob(b=>b?resolve(b):reject(new Error('canvas blob failed')),type||'image/jpeg',quality==null?.92:quality);
    });
  }

  /* ---------- libraries / font ---------- */
  const loaded={};
  function loadScript(src){
    if(loaded[src])return loaded[src];
    loaded[src]=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;s.async=true;
      s.onload=resolve;s.onerror=()=>reject(new Error('تعذر تحميل '+src));
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  async function ensureLibs(){
    if(!window.html2canvas)await loadScript('vendor/html2canvas.min.js');
    if(!(window.jspdf&&window.jspdf.jsPDF))await loadScript('vendor/jspdf.umd.min.js');
    if(document.fonts&&document.fonts.load){
      try{
        const families=['IBM Plex Sans Arabic'];
        await Promise.all(families.flatMap(f=>[400,600,700].map(w=>document.fonts.load(w+' 11px "'+f+'"'))));
      }catch{}
      try{await document.fonts.ready}catch{}
    }
    if(!window.html2canvas||!(window.jspdf&&window.jspdf.jsPDF))throw new Error(tt('تعذر تجهيز محرك PDF','PDF engine failed to load'));
    return {html2canvas:window.html2canvas,jsPDF:window.jspdf.jsPDF};
  }

  /* ---------- PDF builder ---------- */
  const PAGE_W=794,PAGE_H=1123;
  function buildSignature(){
    if(offersMode())return JSON.stringify({offers:S.offers,lang:docLang(),fileScope:S.fileScope,pdfLayout:S.pdfLayout,showTotal:S.showTotalOverride});
    return JSON.stringify({lang:docLang(),fileScope:S.fileScope,pdfLayout:S.pdfLayout,p:A.p,rows:S.rowFilter?[...S.rowFilter].sort():null,showTotal:S.showTotalOverride});
  }
  function fontStack(name){
    return '"'+name+'","Helvetica Neue",Arial,Helvetica,sans-serif';
  }
  function pdfSectionKey(el){
    const box=el&&el.closest?el.closest('.pdf-section-title'):null;
    if(!box)return '';
    if(box.classList.contains('pdf-legal-head'))return 'legal';
    for(const cls of box.classList){
      const m=/^pdf-(cash-)?(included|excluded|extras|charges)-title$/.exec(cls);
      if(m)return (m[1]?'cash-':'')+(m[2]==='charges'?'extras':m[2]);
    }
    return '';
  }
  function pdfPayItemKey(el){
    const item=el&&el.closest?el.closest('.pdf-pay-item'):null;
    if(!item)return '';
    const map=[['pdf-pay-down','down'],['pdf-pay-plan','plan'],['pdf-pay-delivery','delivery'],['pdf-pay-installment','installment']];
    for(const [cls,key] of map)if(item.classList.contains(cls))return key;
    return '';
  }
  function pdfChargeKey(el){
    const row=el&&el.closest?el.closest('.pdf-charge'):null;
    if(!row)return '';
    if(row.dataset.chargeKey)return row.dataset.chargeKey;
    if(row.classList.contains('pdf-charge-commission'))return 'commission';
    const text=(row.querySelector('.lbl')?.textContent||'').toLowerCase();
    if(/صيانة|maintenance/.test(text))return 'maintenance';
    if(/جراج|garage/.test(text))return 'garage';
    if(/مخزن|storage/.test(text))return 'storage';
    if(/مرافق|utilities/.test(text))return 'utilities';
    return '';
  }
  function semanticPdfTextId(el){
    if(!el||!el.classList)return '';
    if(el.matches('.pdf-title'))return 'title';
    if(el.matches('.pdf-sectionhead h2'))return 'schedule-heading';
    if(el.matches('.pdf-sectionhead span'))return 'schedule-count';
    if(el.matches('.pdf-section-title h3')){
      const key=pdfSectionKey(el);
      return key?'section-'+key+'-title':'';
    }
    if(el.matches('.pdf-price-block .lbl'))return 'price-label';
    if(el.matches('.pdf-price-block .amt'))return 'price-value';
    if(el.matches('.pdf-pay-item')){
      const key=pdfPayItemKey(el);
      return key?'pay-item-'+key:'';
    }
    if(el.matches('.pdf-charge')){
      const key=pdfChargeKey(el);
      return key?'charge-'+key:'';
    }
    if(el.matches('.pdf-identity>div')){
      if(el.dataset.identity)return 'identity-'+el.dataset.identity;
      const items=[...el.parentElement.children].filter(x=>x.tagName==='DIV');
      return 'identity-'+(items.indexOf(el)===0?'client':'unit');
    }
    if(el.matches('.pdf-legal-line')){
      if(el.dataset.legalKind)return 'legal-'+el.dataset.legalKind;
      const lines=[...el.parentElement.children].filter(x=>x.classList.contains('pdf-legal-line'));
      return 'legal-line-'+lines.indexOf(el);
    }
    if(el.matches('.pdf-support-line'))return el.dataset.support?'support-'+el.dataset.support:'support-line';
    if(el.matches('.pdf-cash-total'))return 'cash-total';
    if(el.matches('.pdf-cash-included-list'))return 'cash-included';
    if(el.matches('.pdf-pay-head')||el.matches('.pdf-pay-line')){
      const card=el.closest('[data-pay-row]')||el.closest('.pdf-pay');
      const row=card?(card.dataset.payRow||card.dataset.rowId||''):'';
      const part=el.dataset.payPart||(el.classList.contains('pdf-pay-head')?'head':'line-'+(card?[...card.querySelectorAll('.pdf-pay-line')].indexOf(el):0));
      return 'pay-card-'+(row||'x')+'-'+part;
    }
    if(el.matches('.pdf-folio'))return 'folio';
    /* Table IDs are already based on the row id and column index. */
    if(el.closest('.pdf-table'))return el.dataset.textId||'';
    return '';
  }
  function assignLegacyPdfIds(page){
    const set=(el,id)=>{if(el&&!el.dataset.legacyId)el.dataset.legacyId=id};
    const groups=[
      ['.pdf-title','title'],
      ['.pdf-sectionhead h2','schedule-heading'],
      ['.pdf-sectionhead span','schedule-count'],
      ['.pdf-section-title h3','section-heading'],
      ['.pdf-price-block .lbl','price-label'],
      ['.pdf-price-block .amt','price-value'],
      ['.pdf-pay-item','pay-item'],
      ['.pdf-charge','charge'],
      ['.pdf-identity>div','identity'],
      ['.pdf-legal-line','legal-line'],
      ['.pdf-support-line','support-line'],
      ['.pdf-cash-total','cash-total'],
      ['.pdf-cash-included-list','cash-included'],
      ['.pdf-pay-head','pay-card-head'],
      ['.pdf-pay-line','pay-card-line'],
      ['.pdf-folio','folio']
    ];
    groups.forEach(([sel,base])=>page.querySelectorAll(sel).forEach((el,i)=>set(el,base+'-'+i)));
    page.querySelectorAll('.pdf-table thead th').forEach((el,i)=>set(el,'table-heading-'+i));
    page.querySelectorAll('.pdf-table tbody tr').forEach((tr,ri)=>{
      const row=String(tr.dataset.rowId||('row'+ri)).replace(/[^a-zA-Z0-9_-]/g,'');
      [...tr.children].forEach((td,ci)=>set(td,'table-cell-'+row+'-'+ci));
    });
    page.querySelectorAll('.pdf-table tfoot tr').forEach((tr,ri)=>{
      [...tr.children].forEach((td,ci)=>set(td,'table-total-'+ri+'-'+ci));
    });
  }
  function uniquePdfTextId(used,id){
    if(!id)return '';
    let next=id,n=1;
    while(used.has(next)){n++;next=id+'-'+n}
    used.add(next);return next;
  }
  function assignPdfTextIds(page){
    /* Preserve the legacy id carried by stored page HTML before replacing it
       with the semantic anchor. New pages get legacy ids from the old order
       algorithm, which is also the fallback migration mapping. */
    page.querySelectorAll('[data-text-id]').forEach(el=>{
      if(!el.dataset.legacyId)el.dataset.legacyId=el.dataset.textId;
    });
    page.querySelectorAll('[data-text-id]').forEach(el=>el.removeAttribute('data-text-id'));
    page.querySelectorAll('[data-text-anchor]').forEach(el=>el.removeAttribute('data-text-anchor'));
    assignLegacyPdfIds(page);
    const used=new Set();
    const set=(el,id)=>{
      if(!el)return;
      id=uniquePdfTextId(used,id);
      if(!id)return;
      el.setAttribute('data-text-id',id);
      el.setAttribute('data-text-anchor',id);
    };
    page.querySelectorAll('.pdf-title').forEach(el=>set(el,'title'));
    page.querySelectorAll('.pdf-sectionhead h2').forEach(el=>set(el,'schedule-heading'));
    page.querySelectorAll('.pdf-sectionhead span').forEach(el=>set(el,'schedule-count'));
    page.querySelectorAll('.pdf-section-title h3').forEach((el,i)=>set(el,pdfSectionKey(el)?'section-'+pdfSectionKey(el)+'-title':'section-title-'+i));
    page.querySelectorAll('.pdf-price-block .lbl').forEach(el=>set(el,'price-label'));
    page.querySelectorAll('.pdf-price-block .amt').forEach(el=>set(el,'price-value'));
    page.querySelectorAll('.pdf-pay-item').forEach((el,i)=>set(el,'pay-item-'+(pdfPayItemKey(el)||i)));
    page.querySelectorAll('.pdf-charge').forEach((el,i)=>set(el,'charge-'+(pdfChargeKey(el)||i)));
    page.querySelectorAll('.pdf-identity>div').forEach((el,i)=>set(el,'identity-'+(el.dataset.identity||(i===0?'client':'unit'))));
    page.querySelectorAll('.pdf-legal-line').forEach((el,i)=>set(el,'legal-'+(el.dataset.legalKind||i)));
    page.querySelectorAll('.pdf-support-line').forEach((el,i)=>set(el,el.dataset.support?'support-'+el.dataset.support:'support-line-'+i));
    page.querySelectorAll('.pdf-cash-total').forEach(el=>set(el,'cash-total'));
    page.querySelectorAll('.pdf-cash-included-list').forEach(el=>set(el,'cash-included'));
    page.querySelectorAll('.pdf-pay-head').forEach((el,i)=>{
      const card=el.closest('[data-pay-row]')||el.closest('.pdf-pay');
      set(el,'pay-card-'+(card?.dataset.payRow||card?.dataset.rowId||i)+'-head');
    });
    page.querySelectorAll('.pdf-pay-line').forEach((el,i)=>{
      const card=el.closest('[data-pay-row]')||el.closest('.pdf-pay');
      const part=el.dataset.payPart||('line-'+(card?[...card.querySelectorAll('.pdf-pay-line')].indexOf(el):0));
      set(el,'pay-card-'+(card?.dataset.payRow||card?.dataset.rowId||i)+'-'+part);
    });
    page.querySelectorAll('.pdf-folio').forEach(el=>set(el,'folio'));
    page.querySelectorAll('.pdf-table thead th').forEach((el,i)=>set(el,'table-heading-'+i));
    page.querySelectorAll('.pdf-table tbody tr').forEach((tr,ri)=>{
      const row=String(tr.dataset.rowId||('row'+ri)).replace(/[^a-zA-Z0-9_-]/g,'');
      [...tr.children].forEach((td,ci)=>set(td,'table-cell-'+row+'-'+ci));
    });
    page.querySelectorAll('.pdf-table tfoot tr').forEach((tr,ri)=>{
      [...tr.children].forEach((td,ci)=>set(td,'table-total-'+ri+'-'+ci));
    });
  }
  /* A section heading is a row: accent + title + remaining rule. The saved
     offset belongs to that unit so its divider and marker can never stay
     behind while only the glyphs move. */
  function pdfTextOffsetTarget(el){
    if(el&&el.matches&&el.matches('.pdf-section-title h3'))return el.closest('.pdf-section-title')||el;
    return el;
  }
  function applyPdfTextOffsets(page){
    const offsets=DOC_STYLE.textOffsets||{};
    page.querySelectorAll('.pdf-has-moved-text').forEach(el=>el.classList.remove('pdf-has-moved-text'));
    page.querySelectorAll('[data-text-id]').forEach(el=>{
      const id=el.dataset.textAnchor||el.dataset.textId;
      const target=pdfTextOffsetTarget(el);
      if(target!==el)el.style.removeProperty('translate');
      const v=+offsets[id];
      const moved=Number.isFinite(v)&&Math.abs(v)>=0.1;
      if(moved)target.style.translate='0 '+v+'px';
      else target.style.removeProperty('translate');
      el.classList.toggle('pdf-text-moved',moved);
      if(target!==el)target.classList.toggle('pdf-text-moved',moved);
      if(moved){
        const cell=el.closest('td,th');
        if(cell)cell.classList.add('pdf-has-moved-text');
      }
    });
  }
  let PDF_LEGACY_HINTS=null;
  function storedLegacyTextHints(){
    if(PDF_LEGACY_HINTS)return PDF_LEGACY_HINTS;
    const hints={};
    try{
      const all=readPageEdits();
      for(const key of Object.keys(all)){
        const pages=all[key];
        if(!Array.isArray(pages))continue;
        for(const html of pages.slice(0,8)){
          if(typeof html!=='string')continue;
          const wrap=document.createElement('div');
          wrap.innerHTML=html;
          wrap.querySelectorAll('[data-text-id]').forEach(el=>{
            const legacy=el.dataset.textId,semantic=semanticPdfTextId(el);
            if(legacy&&semantic&&semantic!==legacy&&!hints[legacy])hints[legacy]=semantic;
          });
        }
      }
    }catch{}
    PDF_LEGACY_HINTS=hints;
    return hints;
  }
  function migratePdfTextOffsets(pages){
    const offsets=DOC_STYLE.textOffsets||{};
    const hints=storedLegacyTextHints();
    /* Fall back to the current page's old-order ids when no stored page HTML
       carries a better semantic descriptor. */
    pages.forEach(page=>page.querySelectorAll('[data-legacy-id][data-text-id]').forEach(el=>{
      const legacy=el.dataset.legacyId,id=el.dataset.textAnchor||el.dataset.textId;
      if(legacy&&id&&legacy!==id&&!hints[legacy])hints[legacy]=id;
    }));
    let changed=false;
    for(const legacy of Object.keys(offsets)){
      const semantic=hints[legacy];
      if(!semantic||semantic===legacy)continue;
      if(offsets[semantic]===undefined)offsets[semantic]=offsets[legacy];
      delete offsets[legacy];
      changed=true;
    }
    if(changed)writeDocStyle(DOC_STYLE,{bump:false});
    return changed;
  }
  const REFLOW_KEY='mizan.pdfReflow';
  const PDF_LAYOUT_VERSION=3;
  function reflowHash(text){
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(36);
  }
  function pdfReflowSignature(){return reflowHash(S.signature||buildSignature())}
  function readReflowState(){try{return JSON.parse(localStorage.getItem(REFLOW_KEY)||'null')||null}catch{return null}}
  function writeReflowState(state){try{localStorage.setItem(REFLOW_KEY,JSON.stringify(state))}catch{}}
  function pdfLayoutScale(page){
    const r=page&&page.getBoundingClientRect();
    return r&&r.width>0?r.width/794:1;
  }
  function pdfRectUnion(elements){
    const rects=(elements||[]).map(el=>el&&el.getBoundingClientRect()).filter(r=>r&&r.width&&r.height);
    if(!rects.length)return null;
    return {
      top:Math.min(...rects.map(r=>r.top)),
      bottom:Math.max(...rects.map(r=>r.bottom)),
      left:Math.min(...rects.map(r=>r.left)),
      right:Math.max(...rects.map(r=>r.right))
    };
  }
  function pdfSectionItems(title){
    const group=title&&title.closest?title.closest('.pdf-group'):null;
    if(group){
      const charges=[...group.querySelectorAll('.pdf-charge')];
      if(charges.length)return charges;
      const list=group.querySelector('.pdf-cash-included-list');
      return list?[list]:[];
    }
    const items=[];
    let node=title?title.nextElementSibling:null;
    while(node){
      if(node.classList&&node.classList.contains('pdf-section-title'))break;
      if(node.matches&&node.matches('.pdf-legal-line,.pdf-support-line,.pdf-cash-included-list'))items.push(node);
      node=node.nextElementSibling;
    }
    return items;
  }
  function pdfSetTextOffset(el,value,offsets){
    const id=el&&(el.dataset.textAnchor||el.dataset.textId);
    if(!id)return false;
    const next=Math.max(-1123,Math.min(1123,Math.round((+value||0)*10)/10));
    if(Math.abs(next)>=0.1)offsets[id]=next;
    else delete offsets[id];
    const target=pdfTextOffsetTarget(el);
    const moved=Math.abs(next)>=0.1;
    if(moved)target.style.translate='0 '+next+'px';
    else target.style.removeProperty('translate');
    el.classList.toggle('pdf-text-moved',moved);
    if(target!==el)target.classList.toggle('pdf-text-moved',moved);
    return true;
  }
  /* Keep a heading, its marker/rule and its first entry in a readable order.
     The outlier offset is the one corrected; the other manual positions stay. */
  function normalizeSectionGaps(page){
    const offsets=DOC_STYLE.textOffsets||(DOC_STYLE.textOffsets={});
    const scale=pdfLayoutScale(page);
    let changed=false;
    page.querySelectorAll('.pdf-section-title').forEach(title=>{
      const h3=title.querySelector('h3');
      const id=h3&&(h3.dataset.textAnchor||h3.dataset.textId);
      if(!id)return;
      const items=pdfSectionItems(title);
      if(!items.length)return;
      const itemRects=items.map(el=>({el,rect:el.getBoundingClientRect()})).filter(x=>x.rect.width&&x.rect.height);
      if(!itemRects.length)return;
      const titleRect=title.getBoundingClientRect();
      let topItem=itemRects[0];
      for(const item of itemRects)if(item.rect.top<topItem.rect.top)topItem=item;
      const gap=(topItem.rect.top-titleRect.bottom)/scale;
      if(gap>=3&&gap<=20)return;
      const desired=gap<3?4:16;
      const delta=desired-gap;
      const titleOffset=+offsets[id]||0;
      const topItems=itemRects.filter(x=>Math.abs(x.rect.top-topItem.rect.top)<2).map(x=>x.el);
      const topOffsets=topItems.map(el=>+offsets[el.dataset.textAnchor||el.dataset.textId]||0);
      const itemOffset=topOffsets.length?Math.min(...topOffsets):0;
      if(Math.abs(titleOffset)>=Math.abs(itemOffset)){
        if(pdfSetTextOffset(h3,titleOffset-delta,offsets))changed=true;
      }else{
        topItems.forEach((el,i)=>{
          if(pdfSetTextOffset(el,topOffsets[i]+delta,offsets))changed=true;
        });
      }
    });
    return changed;
  }
  function pdfBlockContent(block){
    if(!block)return[];
    if(block.matches('.pdf-identity'))return[...block.children].filter(el=>el.tagName==='DIV');
    if(block.matches('.pdf-price-block'))return[...block.querySelectorAll('.lbl,.amt')];
    if(block.matches('.pdf-pay-grid'))return[...block.querySelectorAll('.pdf-pay-item')];
    if(block.matches('.pdf-group')){
      const out=[];
      const title=block.querySelector('.pdf-section-title');
      if(title)out.push(title);
      out.push(...block.querySelectorAll('.pdf-charge,.pdf-cash-included-list'));
      return out;
    }
    if(block.matches('.pdf-support')){
      const out=[];
      const title=block.querySelector('.pdf-section-title');
      if(title)out.push(title);
      out.push(...block.querySelectorAll('.pdf-legal-line,.pdf-support-line'));
      return out;
    }
    return[...block.querySelectorAll('[data-text-id]')];
  }
  function pdfResetFlowPads(block){
    if(!block)return;
    const cs=getComputedStyle(block);
    if(block.dataset.pdfBasePadTop===undefined)block.dataset.pdfBasePadTop=String(parseFloat(cs.paddingTop)||0);
    if(block.dataset.pdfBasePadBottom===undefined)block.dataset.pdfBasePadBottom=String(parseFloat(cs.paddingBottom)||0);
    block.style.paddingTop=(+block.dataset.pdfBasePadTop||0)+'px';
    block.style.paddingBottom=(+block.dataset.pdfBasePadBottom||0)+'px';
  }
  /* Transforms do not grow a section's layout box. Add the missing space to the
     section itself so moved text can never sit on the next heading or table. */
  function compensatePdfFlow(page){
    const blocks=[...page.querySelectorAll('.pdf-identity,.pdf-price-block,.pdf-pay-grid,.pdf-group,.pdf-support')];
    if(!blocks.length)return false;
    const scale=pdfLayoutScale(page);
    let changed=false;
    blocks.forEach(pdfResetFlowPads);
    blocks.forEach(block=>{
      const content=pdfBlockContent(block);
      const union=pdfRectUnion(content);
      if(!union)return;
      const rect=block.getBoundingClientRect();
      const baseTop=+block.dataset.pdfBasePadTop||0;
      const extra=(rect.top+baseTop*scale-union.top)/scale;
      if(extra>0.5){
        block.style.paddingTop=(baseTop+Math.ceil(extra*10)/10)+'px';
        changed=true;
      }
    });
    blocks.forEach(block=>{
      const content=pdfBlockContent(block);
      const union=pdfRectUnion(content);
      if(!union)return;
      const rect=block.getBoundingClientRect();
      const baseBottom=+block.dataset.pdfBasePadBottom||0;
      const extra=(union.bottom-(rect.bottom-baseBottom*scale))/scale;
      if(extra>0.5){
        block.style.paddingBottom=(baseBottom+Math.ceil(extra*10)/10)+'px';
        changed=true;
      }
    });
    return changed;
  }
  function normalizePdfGeometry(pages,opts){
    const list=(pages||[]).filter(page=>page&&page.isConnected);
    let changed=false;
    list.forEach(page=>{if(normalizeSectionGaps(page))changed=true});
    list.forEach(page=>{if(compensatePdfFlow(page))changed=true});
    if(resolvePdfTextCollisions(list))changed=true;
    if(changed){
      list.forEach(page=>normalizeSectionGaps(page));
      list.forEach(page=>compensatePdfFlow(page));
      writeDocStyle(DOC_STYLE,{bump:false});
    }
    return changed;
  }
  function resolvePdfTextCollisions(pages){
    const offsets=DOC_STYLE.textOffsets||{};
    let changed=false;
    for(const page of pages){
      if(!page||!page.isConnected)continue;
      const pageRect=page.getBoundingClientRect();
      if(!pageRect.width||!pageRect.height)continue;
      const scale=pageRect.width/794||1;
      const items=[...page.querySelectorAll('[data-text-id]')].map(el=>{const target=pdfTextOffsetTarget(el);return{el,target,id:el.dataset.textAnchor||el.dataset.textId}});
      const moved=items.filter(x=>{
        const v=+offsets[x.id];
        return Number.isFinite(v)&&Math.abs(v)>=0.1;
      });
      if(!moved.length)continue;
      for(let pass=0;pass<5;pass++){
        let shifted=false;
        for(const m of moved){
          let mr=m.target.getBoundingClientRect();
          if(!mr.width||!mr.height)continue;
          for(const o of items){
            if(o===m||m.el.contains(o.el)||o.el.contains(m.el))continue;
            const or=o.target.getBoundingClientRect();
            if(!or.width||!or.height)continue;
            const xOverlap=Math.min(mr.right,or.right)-Math.max(mr.left,or.left);
            const yOverlap=Math.min(mr.bottom,or.bottom)-Math.max(mr.top,or.top);
            if(xOverlap<Math.min(mr.width,or.width)*0.25||yOverlap<=1.5)continue;
            const current=+offsets[m.id]||0;
            const mCenter=mr.top+mr.height/2,oCenter=or.top+or.height/2;
            const down=(or.bottom-mr.top+2)/scale;
            const up=(or.top-mr.bottom-2)/scale;
            const choices=mCenter>=oCenter?[down,up]:[up,down];
            let applied=false;
            for(const delta of choices){
              const next=Math.round((current+delta)*10)/10;
              if(Math.abs(next)>1123||Math.abs(next-current)>160)continue;
              const predictedTop=mr.top+(next-current)*scale;
              const predictedBottom=mr.bottom+(next-current)*scale;
              if(predictedTop<pageRect.top+1||predictedBottom>pageRect.bottom-1)continue;
              offsets[m.id]=next;
              m.target.style.translate='0 '+next+'px';
              m.el.classList.add('pdf-text-moved');
              if(m.target!==m.el)m.target.classList.add('pdf-text-moved');
              const cell=m.el.closest('td,th');
              if(cell)cell.classList.add('pdf-has-moved-text');
              changed=true;shifted=true;applied=true;
              break;
            }
            if(applied){
              mr=m.target.getBoundingClientRect();
              break;
            }
          }
        }
        if(!shifted)break;
      }
    }
    if(changed)writeDocStyle(DOC_STYLE,{bump:false});
    return changed;
  }
  function maybeReflowPdf(pages,migrated,prepared){
    if(offersMode())return;
    const signature=pdfReflowSignature();
    const state=readReflowState();
    const needs=!state||!state.signature||state.layoutVersion!==PDF_LAYOUT_VERSION||state.signature!==signature||migrated;
    if(!needs)return;
    /* When each sheet was normalized before its payment rows were added,
       running the geometry solver again after pagination could move the table
       into the footer. Only refresh styles in that case. */
    if(prepared){
      pages.forEach(applyPdfStyle);
    }else{
      const changed=normalizePdfGeometry(pages,{force:true});
      if(changed)pages.forEach(applyPdfStyle);
    }
    writeReflowState({signature,layoutVersion:PDF_LAYOUT_VERSION,updated:Date.now()});
  }
  function waitForImages(root){
    return Promise.all([...root.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(res=>{img.onload=img.onerror=res})));
  }
  function positionWatermark(page,isFirst){
    const wm=page&&page.querySelector('.pdf-watermark');
    if(!wm)return;
    if(wm.parentElement!==page)page.insertBefore(wm,page.firstChild);
    if(isFirst&&(page.querySelector('.pdf-table')||page.querySelector('.pdf-list')))wm.classList.add('wm-first');
    else wm.classList.remove('wm-first');
    wm.style.left='50%';wm.style.top='50%';wm.style.transform='translate(-50%,-50%)';
    wm.style.right='';wm.style.bottom='';
    if(page.dataset)page.dataset.wmFirst=isFirst?'1':'0';
    if(!isFirst)return;
    const table=page.querySelector('.pdf-table');
    const head=table&&table.querySelector('thead');
    if(!table||!head)return;
    const pageRect=page.getBoundingClientRect(),wmRect=wm.getBoundingClientRect(),headRect=head.getBoundingClientRect();
    if(!wmRect.width||!wmRect.height)return;
    const margin=12;
    const collision=!(wmRect.right+margin<headRect.left||wmRect.left-margin>headRect.right||wmRect.bottom+margin<headRect.top||wmRect.top-margin>headRect.bottom);
    if(!collision)return;
    const tableRect=table.getBoundingClientRect();
    const top=Math.max(tableRect.top,pageRect.top),bottom=Math.min(tableRect.bottom,pageRect.bottom);
    const scale=pageRect.width>0?pageRect.width/794:1;
    wm.style.left=(((tableRect.left+tableRect.width/2)-pageRect.left)/scale)+'px';
    wm.style.top=(((top+bottom)/2)-pageRect.top)/scale+'px';
  }
  function positionWatermarks(pages){
    pages.forEach((page,i)=>positionWatermark(page,i===0));
  }
  function applyPdfStyle(page){
    assignPdfTextIds(page);
    page.style.setProperty('--pdf-font-title',fontStack(FIXED_PDF_STYLE.title));
    page.style.setProperty('--pdf-font-sub',fontStack(FIXED_PDF_STYLE.sub));
    page.style.setProperty('--pdf-font-body',fontStack(FIXED_PDF_STYLE.body));
    page.style.setProperty('--pdf-brand-scale',(FIXED_PDF_STYLE.brandScale/100).toFixed(3));
    page.style.setProperty('--pdf-heading-scale',(FIXED_PDF_STYLE.headingScale/100).toFixed(3));
    for(const key of Object.keys(DOC_ROLE_DEFS)){
      const def=DOC_ROLE_DEFS[key],role=(DOC_STYLE.roles&&DOC_STYLE.roles[key])||def;
      page.style.setProperty('--doc-'+key+'-font',role.font||DOC_FONT_MAIN);
      page.style.setProperty('--doc-'+key+'-size',(+role.size||def.size)+'px');
      page.style.setProperty('--doc-'+key+'-weight',String(+role.weight||def.weight));
      page.style.setProperty('--doc-'+key+'-color',role.color||def.color);
    }
    applyPdfTextOffsets(page);
    applyDividerStyles(page);
  }
  function dividerAnchorFor(page,host){
    const spec=DOC_DIVIDER_ANCHORS[host];
    if(!spec||!page)return null;
    const el=page.querySelector(spec.selector);
    if(!el)return null;
    const pageRect=page.getBoundingClientRect(),rect=el.getBoundingClientRect();
    if(!pageRect.width||!rect.width)return null;
    const scale=pageRect.width/794||1;
    let top=rect.top,bottom=rect.bottom;
    if(spec.union){
      const parts=[...page.querySelectorAll(spec.union)].map(x=>x.getBoundingClientRect()).filter(x=>x.width&&x.height);
      if(parts.length){
        top=Math.min(...parts.map(x=>x.top));
        bottom=Math.max(...parts.map(x=>x.bottom));
      }
    }
    let lineY=top;
    if(spec.side==='bottom')lineY=bottom;
    else if(spec.side==='center')lineY=top+(bottom-top)/2;
    lineY+=+spec.shift||0;
    return {x:(rect.left-pageRect.left)/scale,width:rect.width/scale,y:(lineY-pageRect.top)/scale};
  }
  function dividerHandle(layer,id,extra){
    if(!layer)return null;
    return [...layer.children].find(el=>{
      if(!el.classList||!el.classList.contains('pdf-divider'))return false;
      return extra?el.dataset.dividerExtra===id&&!el.dataset.divider:el.dataset.divider===id&&!el.dataset.dividerExtra;
    })||null;
  }
  function placeDividerHandle(el,cfg,id,anchor){
    const length=Math.max(0,Math.min(100,+cfg.length||100));
    const width=Math.max(0,anchor.width*length/100);
    const left=anchor.x+(anchor.width-width)/2;
    el.style.left=left.toFixed(2)+'px';
    el.style.width=width.toFixed(2)+'px';
    el.style.top=(anchor.y+(+cfg.offset||0)).toFixed(2)+'px';
    el.style.setProperty('--div-thickness',Math.max(.5,+cfg.thickness||1)+'px');
    el.style.setProperty('--div-color',cfg.color||'#D8E2DB');
    el.style.setProperty('--div-opacity',String(cfg.opacity===undefined?1:cfg.opacity));
    el.classList.toggle('selected',S.dividerSelected===id);
  }
  function refreshPageDividers(page){
    if(!page||!page.isConnected)return;
    const layers=[...page.children].filter(el=>el.classList&&el.classList.contains('pdf-edit-layer'));
    let layer=layers[0]||null;
    layers.slice(1).forEach(el=>el.remove());
    const entries=[];
    for(const [key,cfg] of Object.entries(DOC_STYLE.dividers||{})){
      if(!DOC_DIVIDER_DEFS[key]||!cfg||cfg.visible===false)continue;
      const anchor=dividerAnchorFor(page,key);
      if(anchor)entries.push({id:key,extra:false,cfg,anchor});
    }
    for(const cfg of (DOC_STYLE.extraDividers||[])){
      if(!cfg||cfg.visible===false)continue;
      const anchor=dividerAnchorFor(page,cfg.host);
      if(anchor)entries.push({id:cfg.id,extra:true,cfg,anchor});
    }
    if(!entries.length){
      layers.forEach(el=>el.remove());
      // Keep the page in divider mode so deleting a line cannot reveal the
      // original CSS border underneath it.
      page.classList.add('pdf-dividers-ready');
      return;
    }
    if(!layer){
      layer=document.createElement('div');
      layer.className='pdf-edit-layer';
      layer.setAttribute('contenteditable','false');
      layer.setAttribute('aria-hidden','true');
      page.appendChild(layer);
    }
    const wanted=new Set(entries.map(x=>(x.extra?'x:':'b:')+x.id));
    [...layer.children].forEach(el=>{
      if(!el.classList.contains('pdf-divider'))return;
      const key=(el.dataset.dividerExtra?'x:':'b:')+(el.dataset.dividerExtra||el.dataset.divider||'');
      if(!wanted.has(key))el.remove();
    });
    entries.forEach(entry=>{
      let el=dividerHandle(layer,entry.id,entry.extra);
      if(!el){
        el=document.createElement('span');
        el.className='pdf-divider';
        if(entry.extra)el.dataset.dividerExtra=entry.id;else el.dataset.divider=entry.id;
        el.setAttribute('contenteditable','false');
        el.setAttribute('aria-hidden','true');
        layer.appendChild(el);
      }
      placeDividerHandle(el,entry.cfg,entry.id,entry.anchor);
    });
    page.classList.add('pdf-dividers-ready');
  }
  function pdfPageScale(el){
    const page=el&&el.closest?el.closest('.pdf-page'):null;
    if(!page)return 1;
    const rect=page.getBoundingClientRect();
    return rect.width>0?rect.width/794:1;
  }
  function applyDividerStyles(root){
    const scope=root&&root.querySelectorAll?root:document;
    const pages=scope.matches&&scope.matches('.pdf-page')?[scope]:[...scope.querySelectorAll('.pdf-page')];
    pages.forEach(refreshPageDividers);
  }
  function syncDividerEditingState(){
    document.body.classList.toggle('divider-editing',!!S.dividerEditing);
    if(!S.dividerEditing){
      S.dividerSelected='';
      setDividerSelectedClass('');
    }
  }
  function resetBuilt(){
    S.buildToken++;
    if(S.built&&S.built.pdfUrl)try{URL.revokeObjectURL(S.built.pdfUrl)}catch{}
    S.built=null;S.buildPromise=null;S.error=null;S.progress=0;
    S.selectedPages.clear();S.crops=[];S.cropFull=null;S.pdfOffers.clear();
  }
  function localFormat(lang){
    const intl=new Intl.NumberFormat(lang==='ar'?'ar-EG-u-nu-latn':'en-GB',{maximumFractionDigits:0});
    const pct=new Intl.NumberFormat(lang==='ar'?'ar-EG-u-nu-latn':'en-GB',{maximumFractionDigits:2});
    const date=m=>A.dateNum(m);
    return {intl,pct,date};
  }
  function pdfHeader(lang,data,cont,summaryOnly){
    const t=(ar,en)=>lang==='ar'?ar:en;
    const title=data.s.cash?t('عرض كاش','Cash offer'):t('عرض سداد تقديري','Estimated payment offer');
    const heading='<div class="pdf-brandline"><h1 class="pdf-title">'+title+'</h1><img src="assets/logo-approved.png" alt="Mizan"></div>';
    const paymentCount=(data.s&&Array.isArray(data.s.rows)?data.s.rows.filter(r=>['down','delivery','installment','payment'].includes(r.type)).length:0);
    const paymentCountText=paymentCount===1?t('دفعة واحدة','one payment'):paymentCount===2?t('دفعتان','two payments'):paymentCount>=3&&paymentCount<=10?paymentCount+' '+t('دفعات','payments'):paymentCount+' '+t('دفعة','payments');
    const scheduleHeading=(data.s.cash||summaryOnly)?'':'<div class="pdf-sectionhead"><h2>'+t('جدول الدفعات','Payment schedule')+'</h2><span>'+paymentCountText+'</span></div>';
    if(cont)return heading+scheduleHeading;
    const {s,p,names}=data;
    const cash=cents=>data.f.intl.format(cents/100);
    const pct=n=>n>0?' ('+data.f.pct.format(n)+'%)':'';
    const non=t('غير محدد','Not specified');
    const amount=cents=>'<span class="pdf-amount" dir="ltr">'+data.curr+' <bdi>'+cash(cents)+'</bdi></span>';
    const dateBdi=month=>'<bdi dir="ltr">'+data.f.date(month)+'</bdi>';
    const dueJoin=(base,due)=>{
      if(!due)return base;
      const plain=String(due).replace(/<[^>]+>/g,'').trim();
      const phrase=/^(عند|خلال|بتاريخ)/.test(plain)||/^(at|over|on)(\b|\s)/i.test(plain);
      return base+(phrase?' ':' – ')+'<span class="pdf-due">'+due+'</span>';
    };
    const handoverDate=p.handover?fullDate(p.handover,p.handoverDay):'';
    const deliveryShown=p.deliveryDateMode==='date'&&p.deliveryDate?fullDate(p.deliveryDate,p.deliveryDay):handoverDate;
    const deliveryLabel=p.deliveryDateMode==='none'?'':(deliveryShown?'<span class="pdf-date-phrase">'+(p.deliveryDateMode==='date'&&p.deliveryDate?t('بتاريخ','on'):t('عند الاستلام بتاريخ','at handover on'))+' '+dateBdi(deliveryShown)+'</span>':'');
    const maintenanceDate=p.maintenanceDate?fullDate(p.maintenanceDate,p.maintenanceDay):'';
    const maintenanceIndependent=p.maintenanceDateMode==='date'&&!!p.maintenanceDate;
    const maintenanceShown=maintenanceIndependent?maintenanceDate:handoverDate;
    const maintenanceLabel=p.maintenanceDateMode==='none'?'':(p.maintenanceDateMode==='split'?'<span class="pdf-date-phrase">'+t('خلال أول سنتين','Over first two years')+'</span>':(maintenanceShown?'<span class="pdf-date-phrase">'+(maintenanceIndependent?t('بتاريخ','on'):t('عند الاستلام بتاريخ','at handover on'))+' '+dateBdi(maintenanceShown)+'</span>':''));
    const extraDateCond=e=>e.dueMode==='date'&&e.due?'<span class="pdf-date-phrase">'+t('بتاريخ','on')+' '+dateBdi(e.due)+'</span>':'';
    const inst=s.rows.filter(r=>r.type==='installment'&&r.value>0);
    const values=[...new Set(inst.map(r=>r.value))];
    let termMonths=s.termMonths||0;
    if(!s.cash&&!termMonths&&inst.length){
      const last=inst[inst.length-1].date;
      const term=(Number(String(last).slice(0,4))-Number(String(p.start||'').slice(0,4)))*12+(Number(String(last).slice(5,7))-Number(String(p.start||'').slice(5,7)));
      termMonths=Number.isFinite(term)&&term>0?term:Math.round((+p.years||0)*12);
    }
    const countWord=inst.length===1?t('قسط واحد','one installment'):(inst.length===2?t('قسطان','two installments'):(inst.length>=3&&inst.length<=10?inst.length+' '+t('أقساط','installments'):inst.length+' '+t('قسطًا','installments')));
    const freqMap={1:t('شهري','Monthly'),3:t('ربع سنوي','Quarterly'),6:t('نصف سنوي','Semiannual'),12:t('سنوي','Annual')};
    const gaps=inst.slice(1).map((r,k)=>(Number(String(r.date).slice(0,4))-Number(String(inst[k].date).slice(0,4)))*12+(Number(String(r.date).slice(5,7))-Number(String(inst[k].date).slice(5,7))));
    const uniformGap=gaps.length&&gaps.every(g=>g===gaps[0])?gaps[0]:0;
    const freqText=uniformGap?(freqMap[uniformGap]||(t('كل','every')+' '+uniformGap+' '+t('أشهر','months'))):'';
    const years=termMonths&&termMonths%12===0?termMonths/12:0;
    const termText=years?(years===1?t('سنة واحدة','one year'):years===2?t('سنتان','two years'):years+' '+t('سنوات','years')):termMonths+' '+t('شهرًا','months');
    const planParts=[termText];
    if(freqText)planParts.push(freqText);else if(inst.length>1)planParts.push(t('مواعيد متغيرة','Variable dates'));
    planParts.push(countWord);
    const planText=planParts.join(' · ');
    const baseValues=inst.slice(0,-1).map(r=>r.value);
    const baseEqual=baseValues.length>0&&baseValues.every(v=>v===baseValues[0]);
    const lastInstValue=inst.length?inst[inst.length-1].value:0;
    const lastDiff=baseEqual?baseValues[0]-lastInstValue:0;
    const roundingAdjusted=baseEqual&&lastInstValue!==baseValues[0]&&lastDiff>0&&lastDiff<=inst.length*100;
    const fixedPlan=inst.length>0&&(values.length===1||roundingAdjusted);
    const fixedValue=values.length===1?values[0]:(baseValues.length?baseValues[0]:lastInstValue);
    const priceBlock='<div class="pdf-price-block" data-divider-host="price"><span class="lbl">'+t('سعر الوحدة','Unit price')+'</span><b class="amt"><span class="pdf-amount" dir="ltr"><small class="pdf-curr">'+data.curr+'</small> <bdi>'+cash(s.price)+'</bdi></span></b></div>';
    const payItems=[];
    if(!s.cash&&s.down)payItems.push('<div class="pdf-pay-item pdf-pay-down" data-divider-host="down"><span class="lbl">'+names.down()+(p.mode==='rate'?pct(s.downPct):'')+'</span><b class="val">'+amount(s.down)+'</b></div>');
    if(!s.cash&&inst.length)payItems.push('<div class="pdf-pay-item pdf-pay-plan" data-divider-host="plan"><span class="lbl">'+t('خطة التقسيط','Payment plan')+'</span><b class="val">'+esc(planText)+'</b></div>');
    if(!s.cash&&s.delivery){
      payItems.push('<div class="pdf-pay-item pdf-pay-delivery" data-divider-host="delivery"><span class="lbl">'+dueJoin(names.delivery()+(p.delivery>0?pct(s.deliveryPct):''),deliveryLabel)+'</span><b class="val">'+amount(s.delivery)+'</b></div>');
    }
    if(!s.cash&&inst.length){
      const instValue=fixedPlan?amount(fixedValue):t('متغيرة حسب الفترة','Variable by period');
      payItems.push('<div class="pdf-pay-item pdf-pay-installment" data-divider-host="installment"><span class="lbl">'+t('قيمة القسط','Installment amount')+'</span><b class="val">'+instValue+'</b></div>');
    }
    const payGrid=payItems.length?'<div class="pdf-pay-grid">'+payItems.join('')+'</div>':'';
    const extraCharges=[];
    for(const e of s.extras){
      const label=(names[e.label]?names[e.label]():e.label)+(e.label==='maintenance'&&p.maintenance>0?pct(s.maintenancePct):'');
      const due=e.label==='maintenance'?maintenanceLabel:extraDateCond(e);
      extraCharges.push('<div class="pdf-charge" data-charge-key="'+e.label+'"><span class="lbl">'+dueJoin(label,due)+'</span><b class="val">'+amount(e.amount)+'</b></div>');
    }
    const feeRate=p.feeMode==='rate'?data.f.pct.format(s.commissionPct)+'%':'';
    const feePayer=p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller');
    const feeMeta=[feePayer,feeRate?'('+feeRate+')':''].filter(Boolean).join(' ');
    const feeTitle=t('عمولة الوساطة','Brokerage commission')+(feeMeta?' - '+feeMeta:'');
    if(s.commission)extraCharges.push('<div class="pdf-charge pdf-charge-commission'+(extraCharges.length?' has-rule':'')+'" data-charge-key="commission"><span class="lbl">'+feeTitle+'</span><b class="val">'+amount(s.commission)+'</b></div>');
    const sectionTitle=(title,cls)=>'<div class="pdf-section-title '+(cls||'')+'"><span class="accent" aria-hidden="true"></span><h3>'+title+'</h3><span class="rule"></span></div>';
    const pdfGroup=(title,items,cls)=>items.length?'<section class="pdf-group '+(cls||'')+'">'+sectionTitle(title,cls)+'<div class="pdf-charges">'+items.join('')+'</div></section>':'';
    const includedRows=(s.includedItems||[]).map(x=>({key:x.key,name:(names[x.key]?names[x.key]():x.key),amount:x.amount}));
    /* Excluded rows deliberately have no due date. The stored date on the item
       remains available if it returns to additional-charge state. */
    const excludedRows=(s.excludedItems||[]).map(x=>({key:x.key,name:(names[x.key]?names[x.key]():x.key),amount:x.amount}));
    const includedGroup=pdfGroup(t('السعر يشمل','Included in price'),includedRows.map(x=>'<div class="pdf-charge" data-charge-key="'+x.key+'"><span class="lbl">'+esc(x.name)+'</span><b class="val">'+(x.amount>0?amount(x.amount):'')+'</b></div>'),'pdf-included-title');
    const excludedGroup=pdfGroup(t('السعر لا يشمل','Price does not include'),excludedRows.map(x=>'<div class="pdf-charge" data-charge-key="'+x.key+'"><span class="lbl">'+esc(x.name)+'</span><b class="val">'+(x.amount>0?amount(x.amount):'')+'</b></div>'),'pdf-excluded-title');
    const extrasGroup=pdfGroup(t('مستحقات إضافية','Additional charges'),extraCharges,'pdf-extras-title');
    const pdfGroups=[includedGroup,excludedGroup,extrasGroup].filter(Boolean);
    const groupsHtml=pdfGroups.length?'<div class="pdf-groups pdf-groups-'+pdfGroups.length+'">'+pdfGroups.join('')+'</div>':'';
    const identity='<div class="pdf-identity"><div data-identity="client"><span>'+t('اسم العميل','Client')+'</span><b>'+esc(p.client||non)+'</b></div><div data-identity="unit"><span>'+t('الوحدة','Unit')+'</span><b>'+esc(p.unit||non)+'</b></div></div>';
    const includedText=(s.includedItems||[]).map(x=>esc(names[x.key]?names[x.key]():x.key)+(x.amount>0?' '+amount(x.amount):'')).join(' · ');
    const legalFinancial=p.legal&&p.legal.noDues?(s.cash&&!(s.extras.length||(s.commission&&p.payer==='buyer'))?t('لا توجد مستحقات مالية أخرى على الوحدة.','No other financial dues on the unit.'):t('لا توجد مستحقات مالية أخرى بخلاف المبالغ الموضحة أعلاه.','No other financial dues beyond the amounts shown above.')):'';
    const legalItems=[];
    if(p.legal&&p.legal.poa)legalItems.push(t('يوجد توكيل.','A power of attorney exists.'));
    if(p.legal&&p.legal.contract)legalItems.push(t('يوجد عقد نهائي.','A final contract exists.'));
    let legalHtml='';
    if(legalFinancial||legalItems.length){
      legalHtml=sectionTitle(t('الحالة المالية والقانونية','Financial & legal status'),'pdf-legal-head');
      if(legalFinancial)legalHtml+='<div class="pdf-legal-line" data-legal-kind="financial"><span>'+t('الحالة المالية:','Financial status:')+'</span> '+esc(legalFinancial)+'</div>';
      if(legalItems.length)legalHtml+='<div class="pdf-legal-line" data-legal-kind="items"><span>'+t('الحالة القانونية:','Legal status:')+'</span> '+esc(legalItems.join(' '))+'</div>';
    }
    if(s.cash){
      const cashTotalLabel=p.showTotal===false?t('سعر الوحدة','Unit price'):t('إجمالي العرض','Offer total');
      const cashCharges=[];
      for(const e of s.extras){
        const label=(names[e.label]?names[e.label]():e.label)+(e.label==='maintenance'&&p.maintenance>0?pct(s.maintenancePct):'');
        const due=e.label==='maintenance'?maintenanceLabel:extraDateCond(e);
        cashCharges.push({key:e.label,label,due,amount:e.amount});
      }
      const cashFeeRate=p.feeMode==='rate'?data.f.pct.format(s.commissionPct)+'%':'';
      const cashFeePayer=p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller');
      const cashFeeMeta=[cashFeePayer,cashFeeRate?'('+cashFeeRate+')':''].filter(Boolean).join(' ');
      if(s.commission)cashCharges.push({key:'commission',label:t('عمولة الوساطة','Brokerage commission')+(cashFeeMeta?' - '+cashFeeMeta:''),due:'',amount:s.commission,commission:true,hasRule:cashCharges.length>0});
      const cashExtrasItems=cashCharges.map(c=>'<div class="pdf-charge'+(c.commission?' pdf-charge-commission':'')+(c.hasRule?' has-rule':'')+'" data-charge-key="'+c.key+'"><span class="lbl">'+dueJoin(c.label,c.due)+'</span><b class="val">'+amount(c.amount)+'</b></div>');
      const cashIncluded=pdfGroup(t('السعر يشمل','Price includes'),['<div class="pdf-cash-included-list">'+includedText+'</div>'],'pdf-cash-included-title');
      const cashExcluded=pdfGroup(t('السعر لا يشمل','Price does not include'),(s.excludedItems||[]).map(x=>'<div class="pdf-charge" data-charge-key="'+x.key+'"><span class="lbl">'+esc(names[x.key]?names[x.key]():x.key)+'</span><b class="val">'+(x.amount>0?amount(x.amount):'')+'</b></div>'),'pdf-cash-excluded-title');
      const cashExtras=pdfGroup(t('مستحقات إضافية','Additional charges'),cashExtrasItems,'pdf-cash-charges-title');
      const cashGroups=[cashIncluded,cashExcluded,cashExtras].filter(Boolean);
      const cashGroupsHtml=cashGroups.length?'<div class="pdf-groups pdf-groups-'+cashGroups.length+'">'+cashGroups.join('')+'</div>':'';
      const cashTotal='<div class="pdf-price-block pdf-cash-total"><span class="lbl">'+cashTotalLabel+'</span><b class="amt">'+amount(s.price)+'</b></div>';
      return heading+identity+cashTotal+cashGroupsHtml+legalHtml+scheduleHeading;
    }
    const support=[];
    if(legalHtml)support.push(legalHtml);
    if(s.gap&&!s.selectedOnly)support.push('<div class="pdf-support-line" data-support="unscheduled"><b>'+t('غير مجدول:','Unscheduled:')+'</b> '+amount(s.gap)+'</div>');
    return heading+identity+priceBlock+payGrid+groupsHtml+(support.length?'<div class="pdf-support">'+support.join('')+'</div>':'')+scheduleHeading;
  }
  function pdfTableShell(lang,layout){
    const t=(ar,en)=>lang==='ar'?ar:en;
    if(layout==='vertical')return '<div class="pdf-list" data-pdf-body></div>';
    const arrow=lang==='ar'?'rtl':'ltr';
    return '<table class="pdf-table" dir="'+arrow+'"><colgroup><col style="width:24%"><col style="width:24%"><col style="width:23%"><col style="width:29%"></colgroup><thead><tr><th>'+t('نوع الدفعة','Payment type')+'</th><th>'+t('تاريخ الدفعة','Payment date')+'</th><th>'+t('القيمة','Amount')+'</th><th>'+t('رصيد الوحدة','Property balance')+'</th></tr></thead><tbody data-pdf-body></tbody></table>';
  }
  function pdfRow(lang,r,data,layout){
    const t=(ar,en)=>lang==='ar'?ar:en;
    const extra=r.extra||r.type==='maintenance';
    const nm=(data.names[r.type]?data.names[r.type]():r.type)+(r.type==='installment'&&r.number?' '+r.number:'')+(extra?' · '+t('مستحق إضافي','Additional charge'):'');
    if(layout==='vertical'){
      const card=document.createElement('div');
      card.className='pdf-pay';card.dataset.rowId=r.id;card.dataset.payRow=r.id;
      card.innerHTML='<div class="pdf-pay-head" data-pay-part="head"><span class="type">'+nm+'</span><span class="date">'+data.f.date(r.date)+'</span></div><div class="pdf-pay-line" data-pay-part="amount"><span class="lbl">'+t('القيمة','Amount')+'</span><b class="val">'+data.curr+' '+data.f.intl.format(r.value/100)+'</b></div><div class="pdf-pay-line" data-pay-part="balance"><span class="lbl">'+t('الرصيد','Balance')+'</span><b class="val">'+data.curr+' '+data.f.intl.format(r.balance/100)+'</b></div>';
      return card;
    }
    const tr=document.createElement('tr');
    tr.dataset.rowId=r.id;
    tr.innerHTML='<td class="type-cell '+r.type+'"><span class="type">'+nm+'</span></td><td class="date"><bdi dir="ltr">'+data.f.date(r.date)+'</bdi></td><td class="num value-cell">'+data.f.intl.format(r.value/100)+'</td><td class="num balance-cell">'+data.f.intl.format(r.balance/100)+'</td>';
    return tr;
  }
  function makePage(lang,data,cont,layout,summaryOnly){
    const page=document.createElement('section');
    page.className='pdf-page'+(lang==='en'?' ltr':'')+(layout==='vertical'?' pdf-vertical':'');
    const watermark='<img class="pdf-watermark" src="assets/logo-watermark.png" alt="" aria-hidden="true" contenteditable="false">';
    const watermarkFirst='<img class="pdf-watermark wm-first" src="assets/logo-watermark.png" alt="" aria-hidden="true" contenteditable="false">';
    if(data.s.cash||summaryOnly){
      page.innerHTML=watermark+pdfHeader(lang,data,cont,summaryOnly)+'<div class="pdf-folio"></div>';
    }else if(cont){
      page.innerHTML=watermark+pdfHeader(lang,data,cont,summaryOnly)+'<div class="pdf-schedule">'+pdfTableShell(lang,layout)+'</div><div class="pdf-folio"></div>';
    }else{
      page.innerHTML=watermarkFirst+pdfHeader(lang,data,cont,summaryOnly)+'<div class="pdf-schedule"><div class="pdf-table-wrap">'+pdfTableShell(lang,layout)+'</div></div><div class="pdf-folio"></div>';
    }
    page.lang=lang;page.dir=lang==='ar'?'rtl':'ltr';
    applyPdfStyle(page);
    return page;
  }
  async function buildPagesFor(snapshot,lang,rowFilter,root,layout,summaryOnly){
    layout=layout==='vertical'?'vertical':'horizontal';
    const s=schedule(snapshot);
    if(rowFilter&&rowFilter.size){
      s.selectedOnly=true;s.allCount=s.rows.length;
      s.rows=s.rows.filter(r=>rowFilter.has(r.id));
      s.selectedTotal=s.rows.reduce((sum,r)=>sum+r.value,0);
    }
    const f=localFormat(lang);
    const names=lang==='ar'?{
      down:()=> 'مقدم التعاقد',delivery:()=> 'دفعة الاستلام',installment:()=> 'قسط',payment:()=> 'دفعة',maintenance:()=> 'وديعة الصيانة',fee:()=> 'عمولة الوساطة',
      garage:()=> 'الجراج',storage:()=> 'المخزن',utilities:()=> 'المرافق'
    }:{
      down:()=> 'Down payment',delivery:()=> 'Handover payment',installment:()=> 'Installment',payment:()=> 'Payment',maintenance:()=> 'Maintenance deposit',fee:()=> 'Brokerage commission',
      garage:()=> 'Garage',storage:()=> 'Storage room',utilities:()=> 'Utilities'
    };
    const freqMap={1:lang==='ar'?'شهري':'Monthly',3:lang==='ar'?'ربع سنوي':'Quarterly',6:lang==='ar'?'نصف سنوي':'Semiannual',12:lang==='ar'?'سنوي':'Annual'};
    const data={s,p:snapshot,f,names,curr:lang==='ar'?'ج.م':'EGP',freq:()=>({label:freqMap[snapshot.period]||''})};
    const totalMoney=cents=>'<span class="pdf-total-money" dir="ltr"><span class="pdf-total-currency">'+data.curr+'</span> <bdi>'+f.intl.format(cents/100)+'</bdi></span>';
    if(document.fonts){
      await Promise.all([400,600,700].map(weight=>document.fonts.load(weight+' 14px "IBM Plex Sans Arabic"','ميزان Mizan')));
    }
    const pages=[];
    const pdfRows=summaryOnly||s.cash?[]:s.rows.filter(row=>['down','delivery','installment','payment'].includes(row.type)&&!(row.custom&&row.value===0));
    const pdfSum=pdfRows.reduce((sum,row)=>sum+row.value,0);
    const footerMismatch=!summaryOnly&&!s.cash&&!s.selectedOnly&&pdfSum!==s.price;
    const totalLabel=s.selectedOnly?(lang==='ar'?'إجمالي المحدد':'Selected total'):(lang==='ar'?'الإجمالي':'Total');
    const mismatchText=!footerMismatch?'':(()=>{
      const reasons=[];
      const hiddenCount=(snapshot.hidden||[]).length;
      if(hiddenCount)reasons.push((lang==='ar'?'صفوف أساسية مخفية لا تدخل في مجموع الجدول: ':'Hidden principal rows excluded from the table total: ')+hiddenCount);
      if(s.gap>0)reasons.push((lang==='ar'?'مبلغ غير مجدول خارج الجدول: ':'Unscheduled amount outside the table: ')+data.curr+' '+f.intl.format(s.gap/100));
      if(s.reconcile)reasons.push((lang==='ar'?'فرق تسوية التقريب المتبقي: ':'Remaining rounding reconciliation: ')+data.curr+' '+f.intl.format(Math.abs(s.reconcile)/100));
      if(s.overAllocated)reasons.push(lang==='ar'?'المخصص للأقساط يتجاوز رصيد الوحدة':'Installment allocation exceeds the property balance');
      const diff=pdfSum-s.price;
      reasons.push((lang==='ar'?'الفرق بين مجموع الصفوف وسعر الوحدة: ':'Difference between displayed rows and unit price: ')+(diff>0?'+':'')+data.curr+' '+f.intl.format(diff/100));
      return reasons.join(' · ');
    })();
    let migrated=false,prepared=false;
    const preparePage=sheet=>{
      if(!sheet||offersMode())return;
      if(migratePdfTextOffsets([sheet]))migrated=true;
      /* Migration changes the ids in DOC_STYLE; commit them to this sheet
         before geometry is measured, otherwise the solver sees un-offset text. */
      applyPdfStyle(sheet);
      normalizePdfGeometry([sheet],{force:true});
      applyPdfStyle(sheet);
      prepared=true;
    };
    if(summaryOnly){
      const page=makePage(lang,data,false,layout,true);
      root.appendChild(page);pages.push(page);preparePage(page);
    }else if(s.cash){
      const page=makePage(lang,data,false,layout,false);
      root.appendChild(page);pages.push(page);preparePage(page);
    }else{
      let page=makePage(lang,data,false,layout,false),body=page.querySelector('[data-pdf-body]'),count=0;
      root.appendChild(page);preparePage(page);
      for(const r of pdfRows){
        const row=pdfRow(lang,r,data,layout);
        body.appendChild(row);
        if(row.getBoundingClientRect().bottom>page.getBoundingClientRect().bottom-64&&count>0){
          body.removeChild(row);
          pages.push(page);
          page=makePage(lang,data,true,layout,false);root.appendChild(page);body=page.querySelector('[data-pdf-body]');preparePage(page);body.appendChild(row);count=1;
        }else count++;
      }
      pages.push(page);
    }
    const writePageFooters=()=>pages.forEach((sheet,i)=>{
      const footer=sheet.querySelector('.pdf-folio');
      footer.innerHTML='<span>'+esc(snapshot.unit||(lang==='ar'?'خطة السداد':'Payment plan'))+'</span><span>'+(lang==='ar'?'صفحة':'Page')+' <bdi>'+(i+1)+' / '+pages.length+'</bdi></span>';
    });
    writePageFooters();
    if(!summaryOnly&&!s.cash&&pages.length){
      const last=pages[pages.length-1];
      const schedule=last.querySelector('.pdf-schedule');
      if(schedule){
        const table=schedule.querySelector('.pdf-table');
        if(table){
          let tfoot=table.querySelector('tfoot');
          if(!tfoot){tfoot=document.createElement('tfoot');table.appendChild(tfoot)}
          const tr=document.createElement('tr');
          tr.className='pdf-total-row';
          tr.innerHTML='<td class="type-cell total-label">'+totalLabel+'</td><td class="date"></td><td class="num total-amount">'+totalMoney(pdfSum)+'</td><td></td>';
          tfoot.appendChild(tr);
          if(footerMismatch&&mismatchText){
           const note=document.createElement('tr');
           note.className='pdf-total-note';
           note.innerHTML='<td colspan="4">'+esc(mismatchText)+'</td>';
           tfoot.appendChild(note);
          }
        }else{
          const total=document.createElement('div');
          total.className='pdf-schedule-total';
          total.innerHTML='<span>'+totalLabel+'</span><b>'+totalMoney(pdfSum)+'</b>';
          schedule.appendChild(total);
          if(footerMismatch&&mismatchText){
           const note=document.createElement('div');
           note.className='pdf-schedule-total-note';
           note.textContent=mismatchText;
           schedule.appendChild(note);
          }
        }
      }
      /* The total row is appended after row pagination. If a dense last sheet
         no longer clears the footer, move it and the last rows forward. */
      const repairTable=last&&last.querySelector('.pdf-table'),repairFolio=last&&last.querySelector('.pdf-folio');
      if(repairTable&&repairFolio&&repairTable.getBoundingClientRect().bottom>repairFolio.getBoundingClientRect().top-1){
        const next=makePage(lang,data,true,layout,false);
        root.appendChild(next);pages.push(next);
        const nextTable=next.querySelector('.pdf-table');
        const newBody=nextTable&&nextTable.querySelector('tbody');
        const oldFoot=repairTable.querySelector('tfoot');
        if(oldFoot){
          let newFoot=nextTable.querySelector('tfoot');
          if(!newFoot){newFoot=document.createElement('tfoot');nextTable.appendChild(newFoot)}
          while(oldFoot.firstChild)newFoot.appendChild(oldFoot.firstChild);
          oldFoot.remove();
        }
        const oldBody=repairTable.querySelector('tbody');
        while(oldBody&&newBody&&oldBody.children.length&&repairTable.getBoundingClientRect().bottom>repairFolio.getBoundingClientRect().top-16){
          newBody.insertBefore(oldBody.lastElementChild,newBody.firstChild);
        }
        if(oldBody&&newBody&&!newBody.children.length&&oldBody.children.length)newBody.insertBefore(oldBody.lastElementChild,newBody.firstChild);
        writePageFooters();
      }
    }
    // A hidden/background tab pauses requestAnimationFrame; never let that stall pagination.
    await new Promise(resolve=>{
      let done=false;const fin=()=>{if(!done){done=true;resolve()}};
      requestAnimationFrame(()=>requestAnimationFrame(fin));
      setTimeout(fin,140);
    });
    pages.forEach(applyPdfStyle);
    await Promise.all(pages.map(waitForImages));
    positionWatermarks(pages);
    maybeReflowPdf(pages,migrated,prepared);
    return {pages,s,data};
  }
  async function buildPdf(signature,token){
    token=token||++S.buildToken;
    const snapshot=JSON.parse(JSON.stringify(A.p));
    const offers=offersMode()?S.offers.map(o=>JSON.parse(JSON.stringify(o))):null;
    if(S.showTotalOverride!==null){snapshot.showTotal=S.showTotalOverride;if(offers)offers.forEach(o=>{o.showTotal=S.showTotalOverride})}
    const lang=docLang();
    const rowFilter=S.rowFilter;
    S.progress=0;S.progressLabel=tt('تجهيز الصفحات','Preparing pages');S.error=null;
    const libs=await ensureLibs();
    const root=document.createElement('div');root.id='pdfRoot';
    document.body.appendChild(root);
    try{
      const summaryOnly=S.fileScope==='summary';
      let pageEntries=[];
      if(offers){
        for(let oi=0;oi<offers.length;oi++){
          const built=await buildPagesFor(offers[oi],lang,null,root,S.pdfLayout,summaryOnly);
          built.pages.forEach((page,pi)=>pageEntries.push({page,offerIndex:oi,offerPage:pi}));
        }
      }else{
        const built=await buildPagesFor(snapshot,lang,rowFilter,root,S.pdfLayout,summaryOnly);
        built.pages.forEach((page,pi)=>pageEntries.push({page,offerIndex:0,offerPage:pi}));
      }
      const out=[];
      for(let i=0;i<pageEntries.length;i++){
        if(token!==S.buildToken)throw new Error('cancelled');
        const entry=pageEntries[i],page=entry.page;
        S.progress=Math.round((i/pageEntries.length)*90);
        S.progressLabel=tt('تجهيز الصفحة','Rendering page')+' '+(i+1)+' / '+pageEntries.length;
        updateBuildProgress();
        const canvas=await libs.html2canvas(page,{scale:3,backgroundColor:'#ffffff',logging:false,useCORS:true,width:PAGE_W,height:PAGE_H,windowWidth:900,windowHeight:1300,scrollX:0,scrollY:0});
        const full=canvas.toDataURL('image/jpeg',.92);
        const blob=await canvasBlob(canvas,'image/jpeg',.92);
        const thumb=previewThumbnail(canvas);
        const rowIds=[...page.querySelectorAll('tbody tr')].map(tr=>tr.dataset.rowId).filter(Boolean);
        out.push({full,thumb,blob,w:canvas.width,h:canvas.height,dataUrl:full,html:page.outerHTML,rowIds,offerIndex:entry.offerIndex,offerPage:entry.offerPage});
        canvas.width=0;canvas.height=0;
      }
      if(token!==S.buildToken)throw new Error('cancelled');
      S.progress=94;S.progressLabel=tt('تجميع ملف PDF','Building PDF');updateBuildProgress();
      const doc=new libs.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      try{doc.setProperties({title:lang==='ar'?'عرض سداد تقديري':'Estimated payment offer',subject:(offers?dt('عروض محفوظة','Saved offers')+' · '+offers.length:snapshot.unit)||'',author:'',creator:'',keywords:'Mizan'})}catch{}
      out.forEach((pg,i)=>{
        if(i)doc.addPage('a4','portrait');
        doc.addImage(pg.full,'JPEG',0,0,210,297,undefined,'FAST');
      });
      const pdfBlob=doc.output('blob');
      if(token!==S.buildToken)throw new Error('cancelled');
      const pdfUrl=URL.createObjectURL(pdfBlob);
      const built={signature,pages:out,pdfBlob,pdfUrl,fileName:pdfFileName(),size:pdfBlob.size,created:Date.now(),offerCount:offers?offers.length:1};
      S.progress=100;S.progressLabel=tt('تم','Done');updateBuildProgress();
      return built;
    }finally{
      root.remove();
    }
  }
  async function buildBatchPdf(offers){
    const lang=docLang();
    const root=document.createElement('div');root.id='pdfRoot';
    document.body.appendChild(root);
    let pageHtml=[];
    try{
      for(const offer of offers){
        const snapshot=JSON.parse(JSON.stringify(offer));
        const {pages}=await buildPagesFor(snapshot,lang,null,root,S.pdfLayout,S.fileScope==='summary');
        pageHtml.push(...pages.map(p=>p.outerHTML));
      }
    }finally{root.remove()}
    const printRoot=$('#printRoot');
    printRoot.innerHTML=pageHtml.join('');
    await new Promise(resolve=>{
      let done=false;const fin=()=>{if(!done){done=true;resolve()}};
      requestAnimationFrame(()=>requestAnimationFrame(fin));setTimeout(fin,160);
    });
    try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch{}
    await Promise.all([...printRoot.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():new Promise(res=>{img.onload=img.onerror=res})));
    let res=null;
    if(isWindowsNative()){
      try{res=await postNative({action:'print_pdf'})}catch(err){console.warn('batch print_pdf',err)}
    }
    printRoot.innerHTML='';
    if(res&&res.base64)return dataUrlBlob('data:application/pdf;base64,'+res.base64);
    // Browser fallback: rasterize every page into one PDF.
    const libs=await ensureLibs();
    const doc=new libs.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const temp=document.createElement('div');
    temp.style.cssText='position:fixed;left:-12000px;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none';
    document.body.appendChild(temp);
    try{
      for(let i=0;i<pageHtml.length;i++){
        temp.innerHTML=pageHtml[i];
        await new Promise(resolve=>{
          let done=false;const fin=()=>{if(!done){done=true;resolve()}};
          requestAnimationFrame(()=>requestAnimationFrame(fin));setTimeout(fin,120);
        });
        const el=temp.querySelector('.pdf-page');
        const canvas=await libs.html2canvas(el,{scale:3,backgroundColor:'#ffffff',logging:false,useCORS:true,width:PAGE_W,height:PAGE_H,windowWidth:900,windowHeight:1300,scrollX:0,scrollY:0});
        if(i)doc.addPage('a4','portrait');
        doc.addImage(canvas.toDataURL('image/jpeg',.92),'JPEG',0,0,210,297,undefined,'FAST');
        canvas.width=0;canvas.height=0;
      }
    }finally{temp.remove()}
    return doc.output('blob');
  }
  async function shareOffers(offers){
    if(!offers||!offers.length)return;
    openOffers(offers,'pdf');
  }

  function updateBuildProgress(){
    const bar=document.querySelector('#shareProgress i');
    const lab=document.querySelector('#shareProgressLabel');
    if(bar)bar.style.width=S.progress+'%';
    if(lab)lab.textContent=S.progressLabel;
  }
  function ensureBuilt(){
    const sig=S.signature||buildSignature();
    if(S.built&&S.built.signature===sig)return Promise.resolve(S.built);
    if(S.buildPromise)return S.buildPromise;
    const token=++S.buildToken;
    const styleVersion=DOC_STYLE_VERSION;
    S.error=null;
    S.buildPromise=buildPdf(sig,token).then(async built=>{
      if(token!==S.buildToken)return S.built;
      if(S.signature!==sig){try{URL.revokeObjectURL(built.pdfUrl)}catch{}return S.built}
      if(styleVersion!==DOC_STYLE_VERSION){
        try{URL.revokeObjectURL(built.pdfUrl)}catch{}
        S.buildPromise=null;
        return ensureBuilt();
      }
      if(!offersMode())await applyStoredPageEdits(built);
      S.built=built;
      if(offersMode()){
        S.selectedPages.clear();
        built.pages.forEach((_,i)=>S.selectedPages.add(i));
        S.pdfOffers.clear();
        const seen=new Set();
        built.pages.forEach(p=>{const oi=p.offerIndex||0;if(!seen.has(oi)){seen.add(oi);S.pdfOffers.add(oi)}});
      }
      if(S.open)renderAll();
      if(S.open&&isMobile()&&S.zoomMode==='actual'&&S.zoom===1)scheduleMobileFit();
      return built;
    }).catch(err=>{
      if(token!==S.buildToken)return null;
      S.error=err&&err.message?err.message:tt('تعذر تجهيز الملف','Could not prepare the file');
      if(S.open)renderAll();
      return null;
    }).finally(()=>{if(token===S.buildToken)S.buildPromise=null});
    return S.buildPromise;
  }

  /* ---------- vector PDF via WebView2 print ---------- */
  async function rasterPdfBlob(){
    if(!S.built)return null;
    const libs=await ensureLibs();
    const doc=new libs.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    for(let i=0;i<S.built.pages.length;i++){
      const page=await ensurePageRaster(i);
      if(i)doc.addPage('a4','portrait');
      doc.addImage(page.full,'JPEG',0,0,210,297,undefined,'FAST');
    }
    return doc.output('blob');
  }
  async function vectorPdfBlob(){
    if(!S.built)return null;
    if(!isWindowsNative())return rasterPdfBlob();
    const key=String(S.built.htmlVersion||0);
    if(S.built.vectorPdf&&S.built.vectorKey===key)return S.built.vectorPdf;
    const root=$('#printRoot');
    root.innerHTML=S.built.pages.map(p=>p.html||'').join('');
    await new Promise(resolve=>{
      let done=false;const fin=()=>{if(!done){done=true;resolve()}};
      requestAnimationFrame(()=>requestAnimationFrame(fin));setTimeout(fin,120);
    });
    try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch{}
    let res=null;
    try{res=await postNative({action:'print_pdf'})}
    catch(err){console.warn('print_pdf',err)}
    finally{root.innerHTML=''}
    if(res&&res.base64){
      const blob=await dataUrlBlob('data:application/pdf;base64,'+res.base64);
      S.built.vectorPdf=blob;S.built.vectorKey=key;
      return blob;
    }
    // Fallback for older runtimes or browser mode.
    return rasterPdfBlob();
  }
  async function pdfBlobForPages(pages){
    if(!pages||!pages.length)return null;
    if(isWindowsNative()){
      const root=$('#printRoot');
      root.innerHTML=pages.map(p=>p.html||'').join('');
      await new Promise(resolve=>{
        let done=false;const fin=()=>{if(!done){done=true;resolve()}};
        requestAnimationFrame(()=>requestAnimationFrame(fin));setTimeout(fin,120);
      });
      try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch{}
      let res=null;
      try{res=await postNative({action:'print_pdf'})}
      catch(err){console.warn('offer print_pdf',err)}
      finally{root.innerHTML=''}
      if(res&&res.base64)return dataUrlBlob('data:application/pdf;base64,'+res.base64);
    }
    const libs=await ensureLibs();
    const doc=new libs.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    let added=0;
    for(const page of pages){
      if(!page||!page.full)continue;
      if(added)doc.addPage('a4','portrait');
      doc.addImage(page.full,'JPEG',0,0,210,297,undefined,'FAST');
      added++;
    }
    return added?doc.output('blob'):null;
  }
  function uniqueFileName(name,used){
    if(!used.has(name)){used.add(name);return name}
    const dot=name.lastIndexOf('.');
    const extension=dot>0?name.slice(dot):'';
    const base=dot>0?name.slice(0,dot):name;
    let n=2,candidate;
    do{candidate=base+' - '+n+extension;n++}while(used.has(candidate));
    used.add(candidate);return candidate;
  }
  async function selectedPdfFiles(){
    if(!offersMode()||!S.built)return [];
    const groups=offerPdfGroups(),files=[],used=new Set();
    for(const oi of [...S.pdfOffers].sort((a,b)=>a-b)){
      const group=groups.find(g=>g.offerIndex===oi);
      if(!group)continue;
      const blob=await pdfBlobForPages(group.pages.map(i=>S.built.pages[i]));
      if(!blob)continue;
      files.push(new File([blob],uniqueFileName(offerPdfName(oi),used),{type:'application/pdf'}));
    }
    return files;
  }
  async function activeOfferPdfFile(){
    if(!offersMode()||!S.built)return null;
    const groups=offerPdfGroups();
    const group=groups.find(g=>g.offerIndex===S.activeOffer)||groups[0];
    if(!group)return null;
    const blob=await pdfBlobForPages(group.pages.map(i=>S.built.pages[i]));
    return blob?new File([blob],offerPdfName(group.offerIndex),{type:'application/pdf'}):null;
  }
  async function renderPageFromHtml(i,html){
    const libs=await ensureLibs();
    const root=document.createElement('div');
    root.style.cssText='position:fixed;left:-12000px;top:0;width:794px;background:#fff;z-index:-1;pointer-events:none';
    root.innerHTML=html;
    document.body.appendChild(root);
    try{
      await new Promise(resolve=>{
        let done=false;const fin=()=>{if(!done){done=true;resolve()}};
        requestAnimationFrame(()=>requestAnimationFrame(fin));setTimeout(fin,120);
      });
      const el=root.querySelector('.pdf-page');
      const canvas=await libs.html2canvas(el,{scale:3,backgroundColor:'#ffffff',logging:false,useCORS:true,width:PAGE_W,height:PAGE_H,windowWidth:900,windowHeight:1300,scrollX:0,scrollY:0});
      const full=canvas.toDataURL('image/jpeg',.96);
      const blob=await canvasBlob(canvas,'image/jpeg',.96);
      const thumb=previewThumbnail(canvas);
      const page=S.built.pages[i];
      page.full=full;page.blob=blob;page.thumb=thumb;page.dataUrl=full;page.w=canvas.width;page.h=canvas.height;
      page.rasterDirty=false;
      canvas.width=0;canvas.height=0;
      return page;
    }finally{root.remove()}
  }
  async function ensurePageRaster(i){
    const page=S.built&&S.built.pages[i];
    if(!page)return null;
    if(!page.rasterDirty)return page;
    if(!page.renderPromise){
      page.renderPromise=renderPageFromHtml(i,page.html).finally(()=>{page.renderPromise=null});
    }
    return page.renderPromise;
  }

  /* ---------- unified share sheet markup ---------- */
  function shellHtml(){
    return '<div class="share-backdrop" data-share-act="close"></div><section class="share-sheet" tabindex="-1" role="dialog" aria-modal="true" aria-label="'+tt('مشاركة','Share')+'">'+
      '<button type="button" class="share-x share-x-float" data-share-act="close" aria-label="'+tt('إغلاق','Close')+'">×</button>'+
      '<div class="share-unified"><aside class="share-rail" id="shareRail" aria-label="'+tt('الصفحات والعروض','Pages and offers')+'"></aside><div class="share-main"><div class="share-body" id="shareBody"></div></div></div>'+
      '<div class="share-notes" id="shareNotes"></div>'+
      '<div class="share-scope" id="shareScopePrompt"></div>'+
      '<footer class="share-foot" id="shareFoot"></footer>'+
    '</section>';
  }
  function formatLabel(tab){return tab==='images'?tt('صور','Images'):tab==='text'?tt('نص','Text'):'PDF'}
  function toolbarHtml(){
    const zoom=Math.round(S.zoom*100);
    const format='<label class="share-format"><span>'+tt('تنسيق','Format')+'</span><select id="shareFormat" aria-label="'+tt('تنسيق التصدير','Export format')+'"><option value="pdf" '+(S.tab==='pdf'?'selected':'')+'>PDF</option><option value="images" '+(S.tab==='images'?'selected':'')+'>'+tt('صور','Images')+'</option><option value="text" '+(S.tab==='text'?'selected':'')+'>'+tt('نص','Text')+'</option></select></label>';
    const zoomTools=S.tab==='pdf'?'<div class="share-zoom" role="group" aria-label="'+tt('التكبير','Zoom')+'"><button type="button" data-share-act="zoom-out" aria-label="'+tt('تصغير','Zoom out')+'">−</button><button type="button" class="zoom-value" data-share-act="zoom-reset" title="'+tt('إعادة الضبط إلى 100%','Reset to 100%')+'">'+zoom+'%</button><button type="button" data-share-act="zoom-in" aria-label="'+tt('تكبير','Zoom in')+'">+</button><button type="button" class="zoom-fit" data-share-act="zoom-fit" title="'+tt('ملاءمة العرض','Fit to view')+'" aria-label="'+tt('ملاءمة العرض','Fit to view')+'">'+icon('fit',13)+'</button></div>':'';
    const context=S.tab==='pdf'&&S.built?'<span class="share-doc-meta">'+pageCountLabel(S.built.pages.length)+(offersMode()?' · '+esc(offerLabel(S.activeOffer)):'')+'</span>':'';
    const view='<div class="share-view-tools"><button type="button" class="share-toggle" data-share-act="toggle-language"></button><button type="button" class="share-toggle" data-share-act="toggle-layout"></button><button type="button" class="share-toggle share-notes-btn" data-share-act="notes">'+icon('note',14)+tt('مقدمة وخاتمة','Intro & closing')+'</button></div>';
    return format+zoomTools+context+view;
  }
  function docPageHtml(page,number,index){
    return '<figure class="doc-page editable" data-doc-page="'+index+'"><div class="pdf-page-host" contenteditable="true" spellcheck="false" data-edit-page="'+index+'">'+page.html+'</div></figure>';
  }
  function canonicalPageLayout(page,fn){
    const host=page&&page.closest?page.closest('.pdf-page-host'):null;
    if(!host){fn();return}
    const prev=host.style.zoom;
    const view=host.closest('.share-doc');
    const scrollTop=view?view.scrollTop:0,scrollLeft=view?view.scrollLeft:0;
    host.style.zoom='1';
    try{fn()}
    finally{
      if(prev)host.style.zoom=prev;else host.style.removeProperty('zoom');
      if(view){view.scrollTop=scrollTop;view.scrollLeft=scrollLeft}
    }
  }
  function canonicalRefreshDividers(page){
    if(!page)return;
    canonicalPageLayout(page,()=>refreshPageDividers(page));
  }
  function saveEditablePage(host){
    if(!host||!S.built)return;
    const index=+host.dataset.editPage;
    const page=S.built.pages[index];
    if(!page)return;
    const source=host.querySelector('.pdf-page');
    if(!source)return;
    // Store divider geometry from the canonical 794px layout so preview zoom
    // can never leak viewport coordinates into the saved/exported document.
    canonicalRefreshDividers(source);
    const clone=source.cloneNode(true);
    clone.dataset.contentSig=pdfReflowSignature();
    clone.dataset.layoutVersion=String(PDF_LAYOUT_VERSION);
    clone.removeAttribute('contenteditable');
    clone.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));
    clone.querySelectorAll('.pdf-divider.selected').forEach(x=>x.classList.remove('selected'));
    clone.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
    page.html=clone.outerHTML;
    page.rasterDirty=true;
    page.renderPromise=null;
    S.built.htmlVersion=(S.built.htmlVersion||0)+1;
    S.built.vectorPdf=null;
    savePageEdits();
  }
  const PAGE_EDITS_KEY='mizan.pdfEdits';
  function pageEditKey(){return S.signature||buildSignature()}
  function readPageEdits(){try{return JSON.parse(localStorage.getItem(PAGE_EDITS_KEY)||'{}')||{}}catch{return{}}}
  function savePageEdits(){
    if(!S.built||offersMode())return;
    try{
      const all=readPageEdits();
      all[pageEditKey()]=S.built.pages.map(p=>p.html);
      const keys=Object.keys(all);
      while(keys.length>6)delete all[keys.shift()];
      localStorage.setItem(PAGE_EDITS_KEY,JSON.stringify(all));
    }catch{}
  }
  function upgradePdfTableOrder(page){
    const table=page.querySelector('.pdf-table');
    if(table){
      const bodyRow=table.querySelector('tbody tr');
      const oldBody=bodyRow&&bodyRow.children.length>=4&&bodyRow.children[1].classList.contains('num')&&bodyRow.children[3].classList.contains('date');
      if(oldBody){
        const reorder=row=>{const cells=[...row.children];if(cells.length<4)return;row.append(cells[0],cells[3],cells[1],cells[2])};
        const head=table.querySelector('thead tr');if(head)reorder(head);
        table.querySelectorAll('tbody tr').forEach(reorder);
      }
      const total=table.querySelector('tfoot .total-amount');
      const totalOld=!!total&&total.cellIndex!==2;
      if(totalOld){
        const row=total.parentElement,label=row.querySelector('.total-label');
        if(label){
          const blank=document.createElement('td');blank.className='date';
          const blank2=document.createElement('td');
          row.replaceChildren(label,blank,total,blank2);
        }
      }
      if(oldBody||totalOld){
        const cg=table.querySelector('colgroup');
        if(cg)cg.innerHTML='<col style="width:24%"><col style="width:24%"><col style="width:23%"><col style="width:29%">';
      }
    }
    page.querySelectorAll('.pdf-pay-head').forEach(head=>{
      const type=head.querySelector('.type'),date=head.querySelector('.date');
      if(type&&date&&head.firstElementChild===date)head.insertBefore(type,date);
    });
  }
  function ensureSectionAccent(page){
    page.querySelectorAll('.pdf-section-title').forEach(title=>{
      const accents=[...title.children].filter(el=>el.classList&&el.classList.contains('accent'));
      let accent=accents[0];
      if(!accent){
        accent=document.createElement('span');
        accent.className='accent';
        accent.setAttribute('aria-hidden','true');
      }
      title.insertBefore(accent,title.firstChild);
      accents.slice(1).forEach(el=>el.remove());
    });
  }
  function upgradeStoredTotalCurrency(page){
    const upgrade=el=>{
      if(!el||el.querySelector('.pdf-total-money'))return;
      const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
      const m=text.match(/-?\d[\d.,]*/);
      if(!m)return;
      const number=m[0];
      const currency=text.replace(number,'').replace(/[–—-]/g,'').trim()||'ج.م';
      el.innerHTML='<span class="pdf-total-money" dir="ltr"><span class="pdf-total-currency">'+esc(currency)+'</span> <bdi>'+esc(number)+'</bdi></span>';
    };
    page.querySelectorAll('.pdf-table tfoot .num.total-amount,.pdf-table tfoot .total-amount').forEach(upgrade);
    page.querySelectorAll('.pdf-schedule-total b').forEach(upgrade);
  }
  function upgradeStoredCurrencyOrder(page){
    if(!page)return;
    page.querySelectorAll('.pdf-price-block .amt').forEach(el=>{
      if(el.querySelector('.pdf-amount'))return;
      const bdi=el.querySelector('bdi');
      const cur=el.querySelector('.pdf-curr,small');
      if(!bdi||!cur||bdi.parentNode!==el||cur.parentNode!==el)return;
      const wrap=document.createElement('span');
      wrap.className='pdf-amount';wrap.setAttribute('dir','ltr');
      el.insertBefore(wrap,el.firstChild);
      wrap.appendChild(cur);
      wrap.appendChild(document.createTextNode(' '));
      wrap.appendChild(bdi);
    });
    page.querySelectorAll('bdi').forEach(bdi=>{
      if(bdi.closest('.pdf-total-money,.pdf-amount'))return;
      let node=bdi.nextSibling,curText='';
      while(node){
        if(node.nodeType===3){
          const match=node.nodeValue.match(/(ج\.م|EGP)/);
          if(match){
            curText=match[1];
            node.nodeValue=node.nodeValue.replace(match[1],'').replace(/\s+/g,' ').trim();
            if(!node.nodeValue)node.remove();
            break;
          }
        }else if(node.nodeType===1&&/^(ج\.م|EGP)$/.test(node.textContent.trim())){
          curText=node.textContent.trim();
          node.remove();
          break;
        }
        node=node.nextSibling;
      }
      if(!curText)return;
      const wrap=document.createElement('span');
      wrap.className='pdf-amount';wrap.setAttribute('dir','ltr');
      const cur=document.createElement('span');
      cur.className='pdf-cur';cur.textContent=curText;
      wrap.appendChild(cur);
      wrap.appendChild(document.createTextNode(' '));
      bdi.parentNode.insertBefore(wrap,bdi);
      wrap.appendChild(bdi);
    });
    const walker=document.createTreeWalker(page,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const parent=node.parentElement;
      if(!parent)return NodeFilter.FILTER_REJECT;
      if(parent.closest('.pdf-total-money,.pdf-amount,.pdf-curr,.pdf-table td.num'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const next=node.nodeValue.replace(/(\d[\d,\.]*)\s*(ج\.م|EGP)/g,(m,num,cur)=>cur+' '+num);
      if(next!==node.nodeValue)node.nodeValue=next;
    });
    page.dataset.currencyOrder='before';
  }
  function stripInactiveItemDates(page){
    page.querySelectorAll('.pdf-group.pdf-included-title .pdf-charge .lbl,.pdf-group.pdf-excluded-title .pdf-charge .lbl,.pdf-group.pdf-cash-included-title .pdf-charge .lbl,.pdf-group.pdf-cash-excluded-title .pdf-charge .lbl').forEach(label=>{
      label.querySelectorAll('.pdf-due').forEach(due=>{
        const prev=due.previousSibling;
        due.remove();
        if(prev&&prev.nodeType===3)prev.nodeValue=prev.nodeValue.replace(/\s*[–—-]\s*$/,'');
      });
      label.normalize();
    });
  }
  function upgradeStoredPageHtml(html){
    try{
      const wrap=document.createElement('div');wrap.innerHTML=html;
      const page=wrap.querySelector('.pdf-page');
      if(!page)return html;
      upgradePdfTableOrder(page);
      ensureSectionAccent(page);
      stripInactiveItemDates(page);
      upgradeStoredTotalCurrency(page);
      upgradeStoredCurrencyOrder(page);
      const price=page.querySelector('.pdf-price-block');
      if(price)price.dataset.dividerHost='price';
      const payHosts=[['.pdf-pay-down','down'],['.pdf-pay-plan','plan'],['.pdf-pay-delivery','delivery'],['.pdf-pay-installment','installment']];
      payHosts.forEach(([selector,key])=>{
        const item=page.querySelector(selector);
        if(item)item.dataset.dividerHost=key;
      });
      page.querySelectorAll('.pdf-divider').forEach(el=>{
        if(!el.closest('.pdf-edit-layer'))el.remove();
      });
      applyPdfStyle(page);
      return page.outerHTML;
    }catch{return html}
  }
  function pageChargeKeys(page,cls){
    const group=page.querySelector('.pdf-group.'+cls);
    if(!group)return[];
    return [...group.querySelectorAll('.pdf-charge')].map(x=>x.dataset.chargeKey||'').filter(Boolean).sort();
  }
  function storedPageMatchesSchedule(page){
    /* Continuation pages contain only the compact brand header and the table;
       the edit key already binds their rows to the current content signature. */
    if(!page.querySelector('.pdf-group'))return true;
    const s=activeSchedule();
    const expected={
      included:(s.includedItems||[]).map(x=>x.key).filter(Boolean).sort(),
      excluded:(s.excludedItems||[]).map(x=>x.key).filter(Boolean).sort(),
      extras:(s.extras||[]).map(x=>String(x.label)).filter(Boolean).concat(s.commission?['commission']:[]).sort()
    };
    const actual={
      included:pageChargeKeys(page,'pdf-included-title').length?pageChargeKeys(page,'pdf-included-title'):pageChargeKeys(page,'pdf-cash-included-title'),
      excluded:pageChargeKeys(page,'pdf-excluded-title').length?pageChargeKeys(page,'pdf-excluded-title'):pageChargeKeys(page,'pdf-cash-excluded-title'),
      extras:pageChargeKeys(page,'pdf-extras-title').length?pageChargeKeys(page,'pdf-extras-title'):pageChargeKeys(page,'pdf-cash-charges-title')
    };
    /* Cash offers render the included list as one text block, not item rows. */
    if(page.querySelector('.pdf-cash-included-list'))actual.included=expected.included;
    return ['included','excluded','extras'].every(k=>actual[k].join('|')===expected[k].join('|'));
  }
  function storedPageFits(page){
    const table=page.querySelector('.pdf-table');
    const folio=page.querySelector('.pdf-folio');
    if(!table||!folio)return true;
    const t=table.getBoundingClientRect(),f=folio.getBoundingClientRect();
    return !t.height||!f.height||t.bottom<=f.top-1;
  }
  async function applyStoredPageEdits(built){
    try{
      const pages=readPageEdits()[pageEditKey()];
      if(!Array.isArray(pages)||pages.length!==built.pages.length)return;
      const contentSig=pdfReflowSignature();
      const ready=[];
      const temp=document.createElement('div');
      temp.style.cssText='position:fixed;left:-12000px;top:0;width:794px;z-index:-1;background:#fff;';
      document.body.appendChild(temp);
      try{
        for(let i=0;i<pages.length;i++){
          if(!built.pages[i]||typeof pages[i]!=='string')return;
          temp.innerHTML=upgradeStoredPageHtml(pages[i]);
          const page=temp.querySelector('.pdf-page');
          if(!page)return;
          if(page.dataset.layoutVersion&&+page.dataset.layoutVersion!==PDF_LAYOUT_VERSION)return;
          if(page.dataset.contentSig&&page.dataset.contentSig!==contentSig)return;
          if(!storedPageMatchesSchedule(page))return;
          await waitForImages(page);
          normalizePdfGeometry([page],{force:true});
          applyPdfStyle(page);
          /* Old page revisions can carry a pagination that no longer fits the
             reflowed header. Never apply half a document: a single stale sheet
             makes the whole saved revision unusable. */
          if(!storedPageFits(page))return;
          positionWatermark(page,i===0);
          ready.push(page.outerHTML);
        }
      }finally{temp.remove()}
      if(ready.length!==built.pages.length)return;
      ready.forEach((html,i)=>{
        built.pages[i].html=html;
        built.pages[i].rasterDirty=true;
        built.pages[i].renderPromise=null;
      });
      built.htmlVersion=(built.htmlVersion||0)+1;
      built.vectorPdf=null;
    }catch{}
  }

  /* Manual amount edits inside the statement recalculate the offer total when
     the edited figure is one of the amounts included in that total. */
  const PDF_AMOUNT_FORMAT=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
  const pdfAmountBase=new WeakMap();
  function parsePdfAmount(value){
    let text=String(value||'').replace(/\u00a0/g,' ');
    text=text.replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    text=text.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    const match=text.match(/-?\d[\d.,]*/);
    if(!match)return null;
    const number=Number(match[0].replace(/,/g,''));
    return Number.isFinite(number)?number:null;
  }
  function formatPdfAmount(value){
    return PDF_AMOUNT_FORMAT.format(Math.round((+value||0)*100)/100);
  }
  function pdfTotalElement(page){
    return page?page.querySelector('.pdf-total .amt, .pdf-cash-total .amt'):null;
  }
  function pdfAmountScope(target){
    const el=target&&(target.nodeType===1?target:target.parentElement);
    if(!el||!el.closest)return null;
    const page=el.closest('.pdf-page');
    if(!page)return null;
    const totalEl=el.closest('.pdf-total .amt, .pdf-cash-total .amt');
    if(totalEl)return {page,totalEl,partEl:null};
    if(page.querySelector('.pdf-cash-total'))return null;
    const unit=el.closest('.pdf-price-block:not(.pdf-cash-total) .amt');
    if(unit)return {page,totalEl:pdfTotalElement(page),partEl:unit};
    const extra=el.closest('.pdf-charge:not(.pdf-charge-included) .val');
    if(extra)return {page,totalEl:pdfTotalElement(page),partEl:extra};
    const fee=el.closest('.pdf-fee-amount');
    if(fee)return {page,totalEl:pdfTotalElement(page),partEl:fee};
    return null;
  }
  function setPdfTotalText(el,value){
    if(!el)return;
    const text=formatPdfAmount(value);
    const bdi=el.querySelector('bdi');
    if(bdi){bdi.textContent=text;return}
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      if(/\d/.test(node.nodeValue)){
        node.nodeValue=node.nodeValue.replace(/-?\d[\d.,]*/,text);
        return;
      }
    }
    el.textContent=text;
  }
  function markPdfAmounts(){
    document.querySelectorAll('.pdf-page').forEach(page=>{
      const total=pdfTotalElement(page);
      if(total)pdfAmountBase.set(total,parsePdfAmount(total.textContent));
      if(page.querySelector('.pdf-cash-total'))return;
      const unit=page.querySelector('.pdf-price-block .amt');
      if(unit)pdfAmountBase.set(unit,parsePdfAmount(unit.textContent));
      page.querySelectorAll('.pdf-charge:not(.pdf-charge-included) .val').forEach(el=>{
        pdfAmountBase.set(el,parsePdfAmount(el.textContent));
      });
      page.querySelectorAll('.pdf-fee-line').forEach(line=>{
        let amount=line.querySelector('.pdf-fee-amount');
        if(!amount){
          const bdi=line.querySelector('bdi');
          if(bdi){bdi.classList.add('pdf-fee-amount');amount=bdi}
        }
        if(!amount){
          const last=line.lastChild;
          if(last&&last.nodeType===3&&/\d/.test(last.nodeValue)){
            amount=document.createElement('span');
            amount.className='pdf-fee-amount';
            line.replaceChild(amount,last);
            amount.appendChild(last);
          }
        }
        if(amount)pdfAmountBase.set(amount,parsePdfAmount(amount.textContent));
      });
    });
  }
  function syncPdfAmountEdit(target){
    const scope=pdfAmountScope(target);
    if(!scope)return;
    if(!scope.partEl){
      const value=parsePdfAmount(scope.totalEl.textContent);
      if(value!==null)pdfAmountBase.set(scope.totalEl,value);
      return;
    }
    const value=parsePdfAmount(scope.partEl.textContent);
    if(value===null)return;
    const previous=pdfAmountBase.get(scope.partEl);
    if(previous===undefined){
      pdfAmountBase.set(scope.partEl,value);
      return;
    }
    if(Math.abs(value-previous)<0.0001)return;
    const totalEl=scope.totalEl;
    if(!totalEl){
      pdfAmountBase.set(scope.partEl,value);
      return;
    }
    const storedTotal=pdfAmountBase.get(totalEl);
    const base=storedTotal===undefined?(parsePdfAmount(totalEl.textContent)||0):storedTotal;
    const next=Math.max(0,base+(value-previous));
    setPdfTotalText(totalEl,next);
    pdfAmountBase.set(totalEl,next);
    pdfAmountBase.set(scope.partEl,value);
  }
  const COLOR_PRESETS_KEY='mizan.colorPresets';
  function readColorPresets(){
    try{const v=JSON.parse(localStorage.getItem(COLOR_PRESETS_KEY)||'[]');return Array.isArray(v)?v.filter(x=>/^#[0-9a-f]{6}$/i.test(String(x))).slice(0,12):[]}catch{return[]}
  }
  function writeColorPresets(list){
    try{localStorage.setItem(COLOR_PRESETS_KEY,JSON.stringify([...new Set(list)].slice(0,12)))}catch{}
  }
  function hidePdfColorPresets(){
    const el=document.getElementById('pdfColorPresets');
    if(el)el.hidden=true;
  }
  function pdfColorPresetsHtml(){
    const colors=readColorPresets();
    return '<div class="pdf-color-presets-head"><b>'+tt('الألوان المحفوظة','Saved colors')+'</b><button type="button" class="pdf-fb-close" data-fb-colors-close aria-label="'+tt('إغلاق','Close')+'">×</button></div><div class="pdf-color-swatches">'+(colors.length?colors.map(c=>'<span class="pdf-color-preset"><button type="button" data-fb-saved-color="'+c+'" style="background:'+c+'" aria-label="'+c+'" title="'+c+'"></button><button type="button" class="pdf-color-del" data-fb-del-color="'+c+'" aria-label="'+tt('حذف اللون','Remove color')+'" title="'+tt('حذف اللون','Remove color')+'">×</button></span>').join(''):'<span class="pdf-color-empty">'+tt('لا توجد ألوان محفوظة بعد.','No saved colors yet.')+'</span>')+'</div><button type="button" class="pdf-color-save" data-fb-save-color>'+tt('+ حفظ اللون الحالي','+ Save current color')+'</button>';
  }
  function showPdfColorPresets(){
    let el=document.getElementById('pdfColorPresets');
    if(!el){el=document.createElement('div');el.id='pdfColorPresets';el.className='pdf-color-presets';document.body.appendChild(el)}
    el.innerHTML=pdfColorPresetsHtml();el.hidden=false;
    const bar=document.getElementById('pdfFontBar');
    const r=bar?bar.getBoundingClientRect():null;
    el.style.left=Math.max(8,Math.min(window.innerWidth-260,(r?r.left:8)))+'px';
    el.style.top=((r?r.bottom:74)+6)+'px';
  }
  const PDF_FONT_FAMILIES=[
    ['"IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif','IBM Plex Sans Arabic'],
    ['Calibri,"Segoe UI",Tahoma,sans-serif','Calibri'],
    ['"Segoe UI",Tahoma,Arial,sans-serif','Segoe UI'],
    ['Tahoma,Arial,sans-serif','Tahoma'],
    ['Arial,Helvetica,sans-serif','Arial'],
    ['"Times New Roman",Times,serif','Times New Roman']
  ];
  const PDF_FONT_SIZES=[9,10,11,12,13,14,16,18,20,22,24,28,32];
  const DOC_ROLE_SIZES=[9,10,10.5,11,11.5,12,12.5,13,13.5,14,15,16,17,18,20,22,24,26,28,32];
  function docPresetList(){return [...docBuiltinPresets(),...readCustomDocPresets()]}
  function docPresetById(id){return docPresetList().find(p=>p.id===id)||null}
  function docPresetPickerHtml(){
    const presets=docPresetList(),active=DOC_STYLE.activePreset||'';
    const current=!active||!presets.some(p=>p.id===active)?'<option value="">'+tt('النمط الحالي','Current style')+'</option>':'';
    return current+presets.map(p=>'<option value="'+p.id+'" '+(p.id===active?'selected':'')+'>'+esc(p.name)+(p.compareOnly?' · '+tt('مقارنة','compare'):(p.builtin?'':' · '+tt('مخصص','Custom')))+'</option>').join('')+'<option value="__style">'+tt('تنسيق المستند…','Document style…')+'</option>';
  }
  function refreshPresetPicker(){
    const sel=document.querySelector('[data-doc-preset-select]');if(!sel)return;
    const active=DOC_STYLE.activePreset||'';
    sel.innerHTML=docPresetPickerHtml();
    sel.value=docPresetList().some(p=>p.id===active)?active:'';
  }
  function docPresetToolsHtml(){
    if(!docCompareMode()){
      return '<button type="button" class="share-toggle share-style-settings" data-share-act="open-doc-style" title="'+tt('تنسيق المستند وإدارة القوالب','Document style and presets')+'">'+icon('tools',14)+tt('تنسيق المستند','Document style')+'</button>';
    }
    return '<span class="share-preset-picker"><span class="share-preset-label">'+tt('القالب','Preset')+'</span><select data-doc-preset-select aria-label="'+tt('قالب المستند','Document preset')+'">'+docPresetPickerHtml()+'</select><button type="button" class="share-toggle share-preset-confirm" data-share-act="confirm-doc-preset" title="'+tt('تثبيت القالب الحالي','Confirm current template')+'" aria-label="'+tt('تثبيت القالب الحالي','Confirm current template')+'">'+icon('check',13)+'<span>'+tt('تثبيت','Confirm')+'</span></button><button type="button" class="share-toggle share-preset-save" data-share-act="save-current-preset" title="'+tt('حفظ التصميم الحالي كقالب','Save current style as preset')+'" aria-label="'+tt('حفظ التصميم الحالي كقالب','Save current style as preset')+'">'+icon('save',13)+'</button><button type="button" class="share-toggle share-preset-save" data-share-act="export-template" title="'+tt('تصدير القالب','Export template')+'" aria-label="'+tt('تصدير القالب','Export template')+'">'+icon('download',13)+'</button><button type="button" class="share-toggle share-preset-save" data-share-act="import-template" title="'+tt('استيراد قالب','Import template')+'" aria-label="'+tt('استيراد قالب','Import template')+'">'+icon('upload',13)+'</button></span>';
  }
  function refreshDocPresetTools(){
    const host=document.querySelector('[data-doc-preset-tools]');
    if(host)host.innerHTML=docPresetToolsHtml();
    const sel=document.querySelector('[data-doc-preset-select]');
    if(sel){const active=DOC_STYLE.activePreset||'';sel.value=docPresetList().some(p=>p.id===active)?active:''}
  }
  function docSelectedPresetId(){const list=docPresetList();const id=S.docPresetSel||DOC_STYLE.activePreset;return list.some(p=>p.id===id)?id:list[0].id}
  function roleStyleAttr(role){const font=String(role.font||DOC_FONT_MAIN).replace(/"/g,'&quot;');return 'font-family:'+font+';font-size:'+(+role.size||12)+'px;font-weight:'+(+role.weight||400)+';color:'+role.color}
  function docStylePanelHtml(){
    const presets=docPresetList();
    let selectedId=S.docPresetSel||DOC_STYLE.activePreset||'';
    if(selectedId&&!presets.some(p=>p.id===selectedId))selectedId='';
    S.docPresetSel=selectedId;
    const selected=selectedId?presets.find(p=>p.id===selectedId):null;
    const preview=selected?selected.style:DOC_STYLE;
    const roleKey=DOC_ROLE_DEFS[S.docRoleSel]?S.docRoleSel:'main';S.docRoleSel=roleKey;
    const role=DOC_STYLE.roles[roleKey];
    const dividerKey=DOC_DIVIDER_DEFS[S.docDividerSel]?S.docDividerSel:'price';S.docDividerSel=dividerKey;
    const div=DOC_STYLE.dividers[dividerKey];
    const sectionDivider=!!sectionDividerMap(dividerKey);
    const sectionAnchor=sectionDivider?activeSectionAnchorKey(dividerKey):'';
    const dividerOffset=sectionDivider?(+DOC_STYLE.textOffsets[sectionAnchor]||0):div.offset;
    const custom=!!selectedCustomPreset()||(selected&&!selected.builtin);
    const fontOptions=PDF_FONT_FAMILIES.map(([value,label])=>'<option value="'+esc(value)+'" '+(role.font===value?'selected':'')+'>'+label+'</option>').join('');
    const sizeOptions=DOC_ROLE_SIZES.map(n=>'<option value="'+n+'" '+(Math.abs(+role.size-n)<.01?'selected':'')+'>'+n+'</option>').join('');
    const weightOptions=[[400,tt('عادي','Regular')],[500,tt('متوسط','Medium')],[600,tt('نصف عريض','Semi-bold')],[700,tt('عريض','Bold')]].map(([value,label])=>'<option value="'+value+'" '+(+role.weight===value?'selected':'')+'>'+label+'</option>').join('');
    const currentOption=selectedId?'':'<option value="" selected>'+tt('النمط الحالي','Current style')+'</option>';
    const presetOptions=currentOption+presets.map(p=>'<option value="'+p.id+'" '+(p.id===selectedId?'selected':'')+'>'+esc(p.name)+(p.compareOnly?' · '+tt('مقارنة','compare'):(p.builtin?'':' · '+tt('مخصص','Custom')))+'</option>').join('');
    const roleOptions=Object.entries(DOC_ROLE_DEFS).map(([key,def])=>'<option value="'+key+'" '+(key===roleKey?'selected':'')+'>'+def.label+'</option>').join('');
    const dividerOptions=Object.entries(DOC_DIVIDER_DEFS).map(([key,def])=>'<option value="'+key+'" '+(key===dividerKey?'selected':'')+'>'+def.label+'</option>').join('');
    const pv=preview.roles||DOC_STYLE.roles;
    const sample='<div class="ds-sample"><b style="'+roleStyleAttr(pv.title)+'">'+tt('عرض سداد تقديري','Estimated payment offer')+'</b><span style="'+roleStyleAttr(pv.main)+'">'+tt('الملخص المالي','Financial summary')+'</span><div class="ds-sample-line"><span style="'+roleStyleAttr(pv.label)+'">'+tt('سعر الوحدة','Unit price')+'</span><b style="'+roleStyleAttr(pv.value)+'"><span dir="ltr">'+tt('ج.م','EGP')+' 5,000,000</span></b></div><b class="ds-sample-total" style="'+roleStyleAttr(pv.total)+'">'+tt('إجمالي العرض','Offer total')+' · <span dir="ltr">'+tt('ج.م','EGP')+' 5,000,000</span></b></div>';
    const compareBar=docCompareMode()
      ?'<div class="ds-compare-bar"><span>'+tt('القالب الأساسي: MIZAN. ثبّت القالب لإخفاء مبدّل القوالب.','Base template: MIZAN. Confirm to hide the preset switcher.')+'</span><span class="ds-compare-actions"><button type="button" class="ds-btn primary" data-ds-act="confirm-preset">'+tt('تثبيت القالب','Confirm template')+'</button></span></div>'
      :'<div class="ds-compare-bar"><span>'+tt('تبديل القوالب مخفي من شريط المشاركة اليومي.','Preset switching is hidden from the daily Share bar.')+'</span><button type="button" class="ds-btn" data-ds-act="show-presets">'+tt('إظهار القالب','Show template')+'</button></div>';
    return '<div class="ds-head"><b>'+tt('تنسيق المستند','Document style')+'</b><button type="button" class="pdf-fb-close" data-ds-act="close" aria-label="'+tt('إغلاق','Close')+'">×</button></div>'+compareBar+
      '<div class="ds-grid"><div class="ds-col">'+
        '<div class="ds-block"><div class="ds-block-title">'+tt('القالب','Preset')+'</div>'+
          '<div class="ds-row"><select data-ds-preset class="ds-grow" aria-label="'+tt('القالب','Preset')+'">'+presetOptions+'</select><button type="button" class="ds-btn primary" data-ds-act="apply-preset" '+(!selectedId?'disabled':'')+'>'+tt('تطبيق','Apply')+'</button></div>'+
          sample+
          '<div class="ds-actions"><button type="button" class="ds-btn" data-ds-act="restore-defaults">'+tt('استعادة الأصل','Restore original')+'</button><button type="button" class="ds-btn" data-share-act="export-template">'+tt('تصدير','Export')+'</button><button type="button" class="ds-btn" data-share-act="import-template">'+tt('استيراد','Import')+'</button></div>'+
        '</div>'+
        '<div class="ds-block"><div class="ds-block-title">'+tt('الخط','Typography')+'</div>'+
          '<label class="ds-field"><span>'+tt('الدور','Role')+'</span><select data-ds-role>'+roleOptions+'</select></label>'+
          '<div class="ds-row"><label class="ds-field ds-grow"><span>'+tt('الخط','Font')+'</span><select data-ds-role-font>'+fontOptions+'</select></label><label class="ds-field"><span>'+tt('الحجم','Size')+'</span><select data-ds-role-size>'+sizeOptions+'</select></label></div>'+
          '<div class="ds-row"><label class="ds-field ds-grow"><span>'+tt('الوزن','Weight')+'</span><select data-ds-role-weight>'+weightOptions+'</select></label><label class="ds-field ds-color-field"><span>'+tt('اللون','Color')+'</span><input type="color" data-ds-role-color value="'+role.color+'"><input class="ds-hex" data-ds-role-hex value="'+role.color+'" maxlength="7" spellcheck="false"></label></div>'+
          '<div class="ds-actions"><button type="button" class="ds-btn" data-ds-act="reset-role">'+tt('إعادة ضبط الدور','Reset role')+'</button></div>'+
        '</div>'+
      '</div><div class="ds-col">'+
        '<div class="ds-block"><div class="ds-block-title">'+tt('الفواصل','Dividers')+'</div>'+
          '<label class="ds-check"><input type="checkbox" data-ds-divider-editing '+(S.dividerEditing?'checked':'')+'><span>'+tt('تحريك الخطوط','Move lines')+'</span></label>'+
          '<label class="ds-field"><span>'+tt('الفاصل','Divider')+'</span><select data-ds-divider>'+dividerOptions+'</select></label>'+
          '<label class="ds-check"><input type="checkbox" data-ds-divider-visible '+(div.visible?'checked':'')+'><span>'+tt('إظهار الفاصل','Show divider')+'</span></label>'+
          '<label class="ds-field"><span>'+tt(sectionDivider?'إزاحة القسم (px)':'الإزاحة (px)',sectionDivider?'Section offset (px)':'Offset (px)')+'</span><input type="number" step="0.5" data-ds-divider-offset value="'+dividerOffset+'"></label>'+
          '<label class="ds-range"><span>'+tt('السماكة','Thickness')+'</span><input type="range" min="0.5" max="4" step="0.5" data-ds-divider-thickness value="'+div.thickness+'"><output data-ds-out="thickness">'+div.thickness+'px</output></label>'+
          '<label class="ds-range"><span>'+tt('الطول','Length')+'</span><input type="range" min="20" max="100" step="5" data-ds-divider-length value="'+div.length+'"><output data-ds-out="length">'+div.length+'%</output></label>'+
          '<label class="ds-range"><span>'+tt('الشفافية','Opacity')+'</span><input type="range" min="0" max="1" step="0.05" data-ds-divider-opacity value="'+(div.opacity===undefined?1:div.opacity)+'"><output data-ds-out="opacity">'+(div.opacity===undefined?1:div.opacity)+'</output></label>'+
          '<div class="ds-row"><label class="ds-field ds-color-field ds-grow"><span>'+tt('اللون','Color')+'</span><input type="color" data-ds-divider-color value="'+div.color+'"><input class="ds-hex" data-ds-divider-hex value="'+div.color+'" maxlength="7" spellcheck="false"></label><button type="button" class="ds-btn" data-ds-act="reset-divider">'+tt('استعادة الفاصل','Reset divider')+'</button></div>'+
        '</div>'+
        '<div class="ds-block"><div class="ds-block-title">'+tt('قوالب مخصصة','Custom presets')+'</div>'+
          '<label class="ds-field"><span>'+tt('اسم النمط','Preset name')+'</span><input data-ds-preset-name value="'+esc(S.docPresetName)+'" placeholder="'+tt('اسم النمط','Preset name')+'"></label>'+
          '<div class="ds-actions"><button type="button" class="ds-btn primary" data-ds-act="save-preset">'+tt('حفظ الحالي','Save current')+'</button><button type="button" class="ds-btn" data-ds-act="update-preset" '+(custom?'':'disabled')+'>'+tt('تحديث','Update')+'</button><button type="button" class="ds-btn" data-ds-act="rename-preset" '+(custom?'':'disabled')+'>'+tt('إعادة تسمية','Rename')+'</button><button type="button" class="ds-btn" data-ds-act="delete-preset" '+(custom?'':'disabled')+'>'+tt('حذف','Delete')+'</button></div>'+
        '</div>'+
      '</div></div>';
  }
  function ensureDocStylePanel(){
    let el=document.getElementById('docStylePanel');
    if(!el){el=document.createElement('div');el.id='docStylePanel';el.className='doc-style-panel';el.hidden=true;const sheet=document.querySelector('.share-sheet');(sheet||document.body).appendChild(el)}
    return el;
  }
  function renderDocStylePanel(){const el=document.getElementById('docStylePanel');if(el&&!el.hidden)el.innerHTML=docStylePanelHtml()}
  function showDocStylePanel(){const el=ensureDocStylePanel();el.hidden=false;S.docStyleOpen=true;renderDocStylePanel()}
  function hideDocStylePanel(){
    const el=document.getElementById('docStylePanel');if(el)el.hidden=true;
    S.docStyleOpen=false;
  }
  function applyDocStyleLive(){
    const pages=[...document.querySelectorAll('.pdf-page')];
    pages.forEach(page=>applyPdfStyle(page));
    pages.forEach(page=>positionWatermark(page,page.dataset.wmFirst==='1'));
  }
  function markDocStyleCustom(){DOC_STYLE.activePreset='';S.docPresetSel='';refreshPresetPicker()}
  function commitDocStyle(){
    const next=JSON.stringify(mergeDocStyle(DOC_STYLE));
    if(!S.docRestoring&&next!==DOC_STYLE_COMMITTED){
      S.docHistory=S.docHistory||[];
      S.docHistory.push(DOC_STYLE_COMMITTED);
      if(S.docHistory.length>80)S.docHistory.shift();
      S.docRedo=[];
      DOC_STYLE_COMMITTED=next;
    }
    writeDocStyle(DOC_STYLE)||A.note(tt('تعذر حفظ تنسيق المستند. تحقق من مساحة التخزين.','Could not save document formatting. Check storage space.'));
    applyDocStyleLive();
    if(S.built){flushEditablePages();S.built.vectorPdf=null}
    S.lastPageInputAt=0;
  }
  function rebuildStylePreview(){
    if(!S.open||S.tab==='text')return;
    resetBuilt();
    S.signature=buildSignature();
    renderAll();
    ensureBuilt();
  }
  function applyDocPreset(id){
    const preset=docPresetById(id);if(!preset)return;
    DOC_STYLE=mergeDocStyle(preset.style);DOC_STYLE.activePreset=id;S.docPresetSel=id;
    S.docPresetEditId=preset.builtin?'':id;
    S.dividerSelected='';
    S.textSelected='';document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
    commitDocStyle();applyDividerStyles(document);refreshPresetPicker();A.note(tt('تم تطبيق النمط','Preset applied'));
    rebuildStylePreview();
  }
  function confirmDocPreset(){
    const id=S.docPresetSel||DOC_STYLE.activePreset||'';
    const preset=id?docPresetById(id):null;
    if(preset){DOC_STYLE=mergeDocStyle(preset.style);DOC_STYLE.activePreset=id;S.docPresetSel=id}
    setDocCompareMode(false);
    commitDocStyle();
    refreshDocPresetTools();
    if(S.docStyleOpen)renderDocStylePanel();
    A.note(tt('تم تثبيت القالب النهائي','Final template confirmed'));
  }
  function showDocPresets(){
    setDocCompareMode(true);
    refreshDocPresetTools();
    if(S.docStyleOpen)renderDocStylePanel();
    A.note(tt('تم إظهار القوالب للمقارنة','Preset comparison enabled'));
  }
  function restoreDocDefaults(){
    DOC_STYLE=docDefaultStyle();DOC_STYLE.activePreset=MAIN_PRESET_ID;S.docPresetSel=MAIN_PRESET_ID;S.docPresetEditId='';
    S.dividerSelected='';
    S.textSelected='';document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
    commitDocStyle();applyDividerStyles(document);refreshPresetPicker();A.note(tt('تمت استعادة التنسيق الأصلي','Original styling restored'));
    rebuildStylePreview();
  }
  function resetDocRole(){
    const key=S.docRoleSel||'main';
    DOC_STYLE.roles[key]={...docDefaultStyle().roles[key]};
    commitDocStyle();renderDocStylePanel();
  }
  function resetDocDivider(){
    const key=S.docDividerSel||'price';
    DOC_STYLE.dividers[key]={...docDefaultStyle().dividers[key]};
    markDocStyleCustom();
    commitDocStyle();applyDividerStyles(document);renderDocStylePanel();
  }
  function validPresetName(name,ignoreId){
    const clean=String(name||'').trim().slice(0,60);
    if(!clean)return '';
    const taken=new Set([
      ...docBuiltinPresets().map(p=>p.name.toLowerCase()),
      ...readCustomDocPresets().filter(p=>p.id!==ignoreId).map(p=>p.name.toLowerCase())
    ]);
    return taken.has(clean.toLowerCase())?'':clean;
  }
  function saveCustomDocPreset(){
    const nameEl=document.querySelector('[data-ds-preset-name]');
    const name=validPresetName(nameEl?nameEl.value:'');
    if(!name){A.note(tt('أدخل اسمًا جديدًا للنمط.','Enter a new preset name.'));return}
    const id=newDocPresetId();
    const list=readCustomDocPresets();
    list.push({id,name,builtin:false,style:docStyleSnapshot()});
    writeCustomDocPresets(list);S.docPresetSel=id;S.docPresetEditId=id;DOC_STYLE.activePreset=id;writeDocStyle(DOC_STYLE);S.docPresetName='';
    renderDocStylePanel();refreshPresetPicker();A.note(tt('تم حفظ النمط','Preset saved'));
  }
  function saveCurrentAsPreset(){
    const entered=(prompt(tt('اسم القالب','Preset name'),'')||'').trim();
    if(!entered)return;
    const name=validPresetName(entered);
    if(!name){A.note(tt('هذا الاسم مستخدم بالفعل.','This name is already used.'));return}
    const id=newDocPresetId();
    const list=readCustomDocPresets();
    list.push({id,name,builtin:false,style:docStyleSnapshot()});
    writeCustomDocPresets(list);DOC_STYLE.activePreset=id;S.docPresetSel=id;S.docPresetEditId=id;writeDocStyle(DOC_STYLE);
    refreshPresetPicker();A.note(tt('تم حفظ القالب','Preset saved'));
  }
  function selectedCustomPreset(){
    const list=readCustomDocPresets();
    if(S.docPresetSel)return list.find(x=>x.id===S.docPresetSel)||null;
    if(S.docPresetEditId)return list.find(x=>x.id===S.docPresetEditId)||null;
    return null;
  }
  function updateCustomDocPreset(){
    const p=selectedCustomPreset();if(!p){A.note(tt('اختر نمطًا مخصصًا أولًا.','Select a custom preset first.'));return}
    const list=readCustomDocPresets().map(x=>x.id===p.id?{...x,name:p.name,style:docStyleSnapshot()}:x);
    writeCustomDocPresets(list);
    DOC_STYLE.activePreset=p.id;S.docPresetSel=p.id;S.docPresetEditId=p.id;writeDocStyle(DOC_STYLE);
    refreshPresetPicker();A.note(tt('تم تحديث النمط','Preset updated'));renderDocStylePanel();
  }
  function renameCustomDocPreset(){
    const p=selectedCustomPreset();if(!p)return;
    const name=prompt(tt('اسم النمط','Preset name'),p.name);
    if(!name||!name.trim())return;
    const clean=validPresetName(name,p.id);
    if(!clean){A.note(tt('هذا الاسم مستخدم بالفعل.','This name is already used.'));return}
    writeCustomDocPresets(readCustomDocPresets().map(x=>x.id===p.id?{...x,name:clean}:x));
    renderDocStylePanel();refreshPresetPicker();A.note(tt('تمت إعادة التسمية','Preset renamed'));
  }
  function deleteCustomDocPreset(){
    const p=selectedCustomPreset();if(!p)return;
    if(!confirm(tt('حذف النمط المخصص؟','Delete custom preset?')))return;
    writeCustomDocPresets(readCustomDocPresets().filter(x=>x.id!==p.id));
    S.docPresetSel='';S.docPresetEditId='';DOC_STYLE.activePreset='';writeDocStyle(DOC_STYLE);
    refreshPresetPicker();renderDocStylePanel();A.note(tt('تم حذف النمط','Preset deleted'));
  }
  const TEMPLATE_FORMAT='mizan-template',TEMPLATE_VERSION=1;
  function exportDocTemplate(){
    const id=S.docPresetSel||S.docPresetEditId||DOC_STYLE.activePreset;
    const preset=id?docPresetById(id):null;
    const name=(preset?preset.name:(S.docPresetName||'').trim())||tt('قالب MIZAN','MIZAN template');
    // Always export what is actually active on screen, not a stale preset snapshot.
    const style=docStyleSnapshot();
    const payload={format:TEMPLATE_FORMAT,version:TEMPLATE_VERSION,kind:'preset',name,style};
    try{
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
      const file=new File([blob],(filePart(name)||'mizan-template')+'.mizan-template',{type:'application/json'});
      saveFilesToDisk([file]).catch(err=>A.note(err.message));
    }catch(err){A.note(tt('تعذر تصدير القالب','Could not export template'))}
  }
  function importDocTemplate(){
    let input=document.getElementById('docTemplateFile');
    if(!input){
      input=document.createElement('input');
      input.type='file';input.id='docTemplateFile';input.hidden=true;
      input.accept='.mizan-template,application/json,.json';
      input.addEventListener('change',async()=>{
        const file=input.files&&input.files[0];input.value='';
        if(file)await importTemplateFile(file);
      });
      document.body.appendChild(input);
    }
    input.value='';input.click();
  }
  async function importTemplateFile(file){
    if(!file)return;
    if(file.size>1048576){A.note(tt('ملف القالب كبير جدًا.','The template file is too large.'));return}
    let raw='';
    try{raw=await file.text()}catch{raw=''}
    let data=null;
    try{data=JSON.parse(raw)}catch{data=null}
    if(!data||data.format!==TEMPLATE_FORMAT||data.kind!=='preset'||Number(data.version)!==TEMPLATE_VERSION||!data.style||typeof data.style!=='object'){
      A.note(tt('ملف قالب غير صالح.','Invalid template file.'));return;
    }
    const base=(String(data.name||'').trim()||tt('قالب مستورد','Imported template')).slice(0,54);
    const existing=readCustomDocPresets();
    const used=new Set([...docBuiltinPresets().map(p=>p.name.toLowerCase()),...existing.map(p=>p.name.toLowerCase())]);
    let name=base,index=2;
    while(used.has(name.toLowerCase())){name=(base+' ('+index+')').slice(0,60);index++}
    const id=newDocPresetId();
    existing.push({id,name,builtin:false,style:mergeDocStyle(data.style)});
    writeCustomDocPresets(existing);
    DOC_STYLE=mergeDocStyle(data.style);DOC_STYLE.activePreset=id;
    S.docPresetSel=id;S.docPresetEditId=id;
    commitDocStyle();applyDividerStyles(document);refreshPresetPicker();renderDocStylePanel();
    A.note(tt('تم استيراد القالب','Template imported'));
  }
  function liveDocRoleChange(){
    markDocStyleCustom();
    const role=DOC_STYLE.roles[S.docRoleSel||'main'];
    applyDocStyleLive();
    const out=document.querySelector('[data-ds-role-hex]');if(out)out.value=role.color;
  }
  function liveDocDividerChange(){
    markDocStyleCustom();
    applyDocStyleLive();
    const div=DOC_STYLE.dividers[S.docDividerSel||'price'];
    const set=(name,val)=>{const el=document.querySelector('[data-ds-out="'+name+'"]');if(el)el.textContent=val};
    set('thickness',div.thickness+'px');set('length',div.length+'%');set('opacity',div.opacity===undefined?1:div.opacity);
    const hex=document.querySelector('[data-ds-divider-hex]');if(hex)hex.value=div.color;
  }
  document.addEventListener('click',e=>{
    const act=e.target.closest('[data-ds-act]');
    if(!act)return;
    const a=act.dataset.dsAct;
    if(a==='close'){hideDocStylePanel();return}
    if(a==='apply-preset'){applyDocPreset(S.docPresetSel);return}
    if(a==='confirm-preset'){confirmDocPreset();return}
    if(a==='show-presets'){showDocPresets();return}
    if(a==='restore-defaults'){restoreDocDefaults();return}
    if(a==='reset-role'){resetDocRole();return}
    if(a==='reset-divider'){resetDocDivider();return}
    if(a==='save-preset'){saveCustomDocPreset();return}
    if(a==='update-preset'){updateCustomDocPreset();return}
    if(a==='rename-preset'){renameCustomDocPreset();return}
    if(a==='delete-preset'){deleteCustomDocPreset();return}
  });
  document.addEventListener('change',e=>{
    const presetSel=e.target.closest&&e.target.closest('[data-doc-preset-select]');
    if(presetSel){
      if(presetSel.value==='__style'){
        presetSel.value=docPresetList().some(p=>p.id===DOC_STYLE.activePreset)?DOC_STYLE.activePreset:'';
        showDocStylePanel();
        return;
      }
      if(presetSel.value)applyDocPreset(presetSel.value);
      return;
    }
    const t=e.target;
    if(t.matches('[data-ds-preset]')){S.docPresetSel=t.value;renderDocStylePanel();return}
    if(t.matches('[data-ds-role]')){S.docRoleSel=t.value;renderDocStylePanel();return}
    if(t.matches('[data-ds-divider]')){S.docDividerSel=t.value;applyDividerStyles(document);renderDocStylePanel();return}
    if(t.matches('[data-ds-divider-editing]')){S.dividerEditing=!!t.checked;syncDividerEditingState();renderDocStylePanel();return}
    if(t.matches('[data-ds-role-font]')){markDocStyleCustom();DOC_STYLE.roles[S.docRoleSel||'main'].font=t.value;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-role-size]')){markDocStyleCustom();DOC_STYLE.roles[S.docRoleSel||'main'].size=+t.value||12;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-role-weight]')){markDocStyleCustom();DOC_STYLE.roles[S.docRoleSel||'main'].weight=+t.value||400;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-role-color]')){markDocStyleCustom();DOC_STYLE.roles[S.docRoleSel||'main'].color=t.value;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-role-hex]')){if(/^#[0-9a-f]{6}$/i.test(t.value)){markDocStyleCustom();DOC_STYLE.roles[S.docRoleSel||'main'].color=t.value;commitDocStyle();renderDocStylePanel()}return}
    if(t.matches('[data-ds-divider-visible]')){markDocStyleCustom();DOC_STYLE.dividers[S.docDividerSel||'price'].visible=t.checked;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-divider-color]')){markDocStyleCustom();DOC_STYLE.dividers[S.docDividerSel||'price'].color=t.value;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-divider-hex]')){if(/^#[0-9a-f]{6}$/i.test(t.value)){markDocStyleCustom();DOC_STYLE.dividers[S.docDividerSel||'price'].color=t.value;commitDocStyle();renderDocStylePanel()}return}
    if(t.matches('[data-ds-divider-offset]')){
      const v=+t.value;
      if(Number.isFinite(v)){
        const key=S.docDividerSel||'price';
        markDocStyleCustom();
        if(sectionDividerMap(key))setSectionAnchorOffset(activeSectionAnchorKey(key),clampSectionOffset(key,v));
        else DOC_STYLE.dividers[key].offset=v;
        commitDocStyle();
      }
      renderDocStylePanel();return;
    }
    if(t.matches('[data-ds-divider-thickness]')){markDocStyleCustom();DOC_STYLE.dividers[S.docDividerSel||'price'].thickness=+t.value;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-divider-length]')){markDocStyleCustom();DOC_STYLE.dividers[S.docDividerSel||'price'].length=+t.value;commitDocStyle();renderDocStylePanel();return}
    if(t.matches('[data-ds-divider-opacity]')){markDocStyleCustom();DOC_STYLE.dividers[S.docDividerSel||'price'].opacity=+t.value;commitDocStyle();renderDocStylePanel();return}
  });
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.matches('[data-ds-preset-name]')){S.docPresetName=t.value;return}
    if(t.matches('[data-ds-role-color]')){DOC_STYLE.roles[S.docRoleSel||'main'].color=t.value;writeDocStyle(DOC_STYLE);liveDocRoleChange();return}
    if(t.matches('[data-ds-role-hex]')){if(/^#[0-9a-f]{6}$/i.test(t.value)){DOC_STYLE.roles[S.docRoleSel||'main'].color=t.value;writeDocStyle(DOC_STYLE);liveDocRoleChange()}return}
    if(t.matches('[data-ds-divider-color]')){DOC_STYLE.dividers[S.docDividerSel||'price'].color=t.value;writeDocStyle(DOC_STYLE);liveDocDividerChange();return}
    if(t.matches('[data-ds-divider-hex]')){if(/^#[0-9a-f]{6}$/i.test(t.value)){DOC_STYLE.dividers[S.docDividerSel||'price'].color=t.value;writeDocStyle(DOC_STYLE);liveDocDividerChange()}return}
    if(t.matches('[data-ds-divider-offset]')){
      const v=+t.value;
      if(Number.isFinite(v)){
        const key=S.docDividerSel||'price';
        if(sectionDividerMap(key)){
          setSectionAnchorOffset(activeSectionAnchorKey(key),clampSectionOffset(key,v));
          writeDocStyle(DOC_STYLE);
          applyDocStyleLive();
        }else{
          DOC_STYLE.dividers[key].offset=v;
          writeDocStyle(DOC_STYLE);
          liveDocDividerChange();
        }
      }
      return;
    }
    if(t.matches('[data-ds-divider-thickness]')){DOC_STYLE.dividers[S.docDividerSel||'price'].thickness=+t.value;writeDocStyle(DOC_STYLE);liveDocDividerChange();return}
    if(t.matches('[data-ds-divider-length]')){DOC_STYLE.dividers[S.docDividerSel||'price'].length=+t.value;writeDocStyle(DOC_STYLE);liveDocDividerChange();return}
    if(t.matches('[data-ds-divider-opacity]')){DOC_STYLE.dividers[S.docDividerSel||'price'].opacity=+t.value;writeDocStyle(DOC_STYLE);liveDocDividerChange();return}
  });
  function dividerInfo(id){
    if(DOC_STYLE.dividers&&DOC_STYLE.dividers[id])return {cfg:DOC_STYLE.dividers[id],host:id,builtin:true};
    const extra=(DOC_STYLE.extraDividers||[]).find(x=>x.id===id);
    return extra?{cfg:extra,host:extra.host,builtin:false}:null;
  }
  function dividerSnapshot(){return JSON.stringify(mergeDocStyle(DOC_STYLE))}
  function restoreDividerSnapshot(json){
    try{
      if(S.built)flushEditablePages();
      DOC_STYLE=mergeDocStyle(JSON.parse(json));
      S.docRestoring=true;
      DOC_STYLE_COMMITTED=JSON.stringify(mergeDocStyle(DOC_STYLE));
      writeDocStyle(DOC_STYLE);
      applyDocStyleLive();
      S.dividerSelected='';
      S.textSelected='';document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
      document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
      if(S.built){flushEditablePages();S.built.vectorPdf=null}
      refreshPresetPicker();
    }catch{}finally{S.docRestoring=false}
  }
  function undoDivider(){
    if(!S.docHistory||!S.docHistory.length)return;
    S.docRedo=S.docRedo||[];S.docRedo.push(dividerSnapshot());
    restoreDividerSnapshot(S.docHistory.pop());
  }
  function redoDivider(){
    if(!S.docRedo||!S.docRedo.length)return;
    S.docHistory=S.docHistory||[];S.docHistory.push(dividerSnapshot());
    restoreDividerSnapshot(S.docRedo.pop());
  }
  function deleteSelectedDivider(){
    if(!S.dividerSelected)return;
    const info=dividerInfo(S.dividerSelected);if(!info)return;
    if(info.builtin){info.cfg.visible=false}
    else{DOC_STYLE.extraDividers=(DOC_STYLE.extraDividers||[]).filter(x=>x.id!==S.dividerSelected)}
    S.dividerSelected='';DOC_STYLE.activePreset='';S.docPresetSel='';
    commitDocStyle();
    refreshPresetPicker();
  }
  function dividerHandleId(el){return el.dataset.divider||el.dataset.dividerExtra||''}
  function setDividerSelectedClass(id){
    document.querySelectorAll('.pdf-edit-layer>.pdf-divider').forEach(el=>el.classList.toggle('selected',!!id&&dividerHandleId(el)===id));
  }
  function dividerAtPoint(page,x,y){
    if(!page)return null;
    const hits=[];
    page.querySelectorAll('.pdf-edit-layer>.pdf-divider[data-divider],.pdf-edit-layer>.pdf-divider[data-divider-extra]').forEach(el=>{
      const id=el.dataset.divider||el.dataset.dividerExtra;
      const info=dividerInfo(id);
      if(!info||!info.cfg.visible)return;
      const r=el.getBoundingClientRect();
      if(!r.width||!r.height)return;
      if(x<r.left-1||x>r.right+1)return;
      const cy=r.top+r.height/2;
      const distance=Math.abs(y-cy);
      if(distance>r.height/2+1)return;
      const centerDx=Math.abs(x-(r.left+r.width/2));
      hits.push({el,id,info,r,distance,centerDx});
    });
    if(!hits.length)return null;
    hits.sort((a,b)=>(a.distance-b.distance)||(a.centerDx-b.centerDx));
    // Keep dragging the divider that is already selected when lines overlap.
    if(S.dividerSelected){
      const current=hits.find(h=>h.id===S.dividerSelected);
      if(current&&current.distance<=hits[0].distance+1.5&&current.centerDx<=hits[0].centerDx+8)return current;
    }
    return hits[0];
  }
  document.addEventListener('pointerdown',e=>{
    if(!S.open||S.pv||!(e.ctrlKey||e.metaKey))return;
    const host=e.target.closest&&e.target.closest('.pdf-page-host[contenteditable]');
    if(!host)return;
    if(e.target.closest('.pdf-divider')||e.target.closest('.doc-style-panel'))return;
    const el=e.target.closest('[data-text-id]');
    if(!el||!host.contains(el))return;
    e.preventDefault();e.stopPropagation();
    const id=el.dataset.textId;
    document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
    el.classList.add('pdf-text-selected');
    S.textSelected=id;S.dividerSelected='';setDividerSelectedClass('');
    const page=el.closest('.pdf-page');
    const scale=pdfPageScale(el)||1;
    const target=pdfTextOffsetTarget(el);
    const startY=e.clientY,startOffset=+((DOC_STYLE.textOffsets||{})[id])||0;
    const pageRect=page.getBoundingClientRect(),elRect=target.getBoundingClientRect();
    const baseTop=elRect.top-startOffset*scale,baseBottom=elRect.bottom-startOffset*scale;
    // The page is the only vertical boundary. No row, section or collision clamps.
    const topLogical=(baseTop-pageRect.top)/scale,bottomLogical=(baseBottom-pageRect.top)/scale;
    const pageHeightLogical=pageRect.height/scale;
    let lo=-topLogical,hi=pageHeightLogical-bottomLogical;
    if(lo>hi){lo=hi=startOffset}
    let moved=false;
    const move=ev=>{
      if(Math.abs(ev.clientY-startY)<0.5)return;
      moved=true;
      let next=startOffset+(ev.clientY-startY)/scale;
      next=Math.max(lo,Math.min(hi,next));
      next=Math.round(next*10)/10;
      DOC_STYLE.textOffsets=DOC_STYLE.textOffsets||{};
      DOC_STYLE.textOffsets[id]=next;
      target.style.translate='0 '+next+'px';
      el.classList.add('pdf-text-moved');
      if(target!==el)target.classList.add('pdf-text-moved');
      const cell=el.closest('td,th');
      if(cell)cell.classList.add('pdf-has-moved-text');
      if(target!==el)refreshPageDividers(page);
    };
    const up=()=>{
      document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);
      if(moved){
        DOC_STYLE.activePreset='';S.docPresetSel='';
        commitDocStyle();
        refreshPresetPicker();
      }
    };
    document.addEventListener('pointermove',move);
    document.addEventListener('pointerup',up);
  },true);
  document.addEventListener('pointerdown',e=>{
    if(e.ctrlKey||e.metaKey||!S.dividerEditing)return;
    const divider=e.target.closest&&e.target.closest('.pdf-edit-layer>.pdf-divider');
    if(!divider||!S.open||S.pv)return;
    e.preventDefault();e.stopPropagation();
    const page=divider.closest('.pdf-page');
    const picked=dividerAtPoint(page,e.clientX,e.clientY);
    if(!picked)return;
    const id=picked.id,info=picked.info;
    const cfg=info.cfg;
    const startY=e.clientY,startOffset=+cfg.offset||0;
    const scale=pdfPageScale(picked.el)||1;
    const pageRect=page.getBoundingClientRect();
    const pageHeightLogical=pageRect.height/scale;
    const startTop=parseFloat(picked.el.style.top);
    const baseY=Number.isFinite(startTop)?startTop-startOffset:0;
    const minOffset=-baseY+0.5,maxOffset=pageHeightLogical-baseY-0.5;
    const handles=[...document.querySelectorAll('.pdf-edit-layer>.pdf-divider')].filter(el=>dividerHandleId(el)===id).map(el=>{
      const top=parseFloat(el.style.top);
      return {el,base:Number.isFinite(top)?top-startOffset:baseY};
    });
    const heading=sectionDividerMap(id)?sectionHeadingFor(page,id):null;
    const sectionKey=heading?String(heading.dataset.textAnchor||heading.dataset.textId||''):'';
    const sectionTarget=heading?pdfTextOffsetTarget(heading):null;
    const sectionStart=sectionKey?(+DOC_STYLE.textOffsets[sectionKey]||0):0;
    S.dividerSelected=id;
    if(DOC_DIVIDER_DEFS[id])S.docDividerSel=id;
    else if(DOC_DIVIDER_DEFS[info.host])S.docDividerSel=info.host;
    S.textSelected='';document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
    setDividerSelectedClass(id);
    document.body.classList.add('divider-dragging');
    try{divider.setPointerCapture(e.pointerId)}catch{}
    let moved=false;
    const move=ev=>{
      if(ev.pointerId!==e.pointerId)return;
      const delta=(ev.clientY-startY)/scale;
      moved=moved||Math.abs(ev.clientY-startY)>=0.5;
      if(sectionKey&&sectionTarget){
        const next=Math.round(clampSectionOffset(id,sectionStart+delta)*100)/100;
        setSectionAnchorOffset(sectionKey,next);
        sectionTarget.style.translate='0 '+next+'px';
        sectionTarget.classList.add('pdf-text-moved');
        heading.classList.add('pdf-text-moved');
        handles.forEach(h=>{h.el.style.top=(h.base+startOffset+(next-sectionStart)).toFixed(2)+'px'});
        return;
      }
      const next=Math.max(minOffset,Math.min(maxOffset,startOffset+delta));
      cfg.offset=Math.round(next*100)/100;
      handles.forEach(h=>{h.el.style.top=(h.base+cfg.offset).toFixed(2)+'px'});
    };
    const end=()=>{
      document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end);
      document.body.classList.remove('divider-dragging');
      if(moved){
        DOC_STYLE.activePreset='';S.docPresetSel='';
        commitDocStyle();
        refreshPresetPicker();
      }
    };
    document.addEventListener('pointermove',move);
    document.addEventListener('pointerup',end);
    document.addEventListener('pointercancel',end);
  },true);
  document.addEventListener('pointermove',e=>{S.lastPointer={x:e.clientX,y:e.clientY}},true);
  function syncDividerCtrlState(e){
    const on=!!(e.ctrlKey||e.metaKey);
    document.body.classList.toggle('pdf-ctrl',on&&S.open);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Control'||e.key==='Meta')syncDividerCtrlState(e)});
  document.addEventListener('keyup',e=>{if(e.key==='Control'||e.key==='Meta')syncDividerCtrlState(e)});
  window.addEventListener('blur',()=>document.body.classList.remove('pdf-ctrl'));
  document.addEventListener('pointerdown',e=>{syncDividerCtrlState(e)},true);
  document.addEventListener('pointerdown',e=>{
    if(e.target.closest&&(e.target.closest('.pdf-divider')||e.target.closest('.doc-style-panel')))return;
    if(S.dividerSelected){S.dividerSelected='';setDividerSelectedClass('')}
    if(S.textSelected&&!(e.ctrlKey||e.metaKey)){S.textSelected='';document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'))}
  },false);
  function selectedDividerHandle(id){
    if(!id)return null;
    return [...document.querySelectorAll('.pdf-edit-layer>.pdf-divider')].find(el=>{
      if(el.dataset.divider)return el.dataset.divider===id;
      return el.dataset.dividerExtra===id;
    })||null;
  }
  function clampDividerOffset(id,value){
    const handle=selectedDividerHandle(id);
    const page=handle&&handle.closest('.pdf-page');
    if(!page)return value;
    const info=dividerInfo(id);if(!info)return value;
    const top=handle?parseFloat(handle.style.top):NaN;
    const current=+info.cfg.offset||0;
    let baseY=Number.isFinite(top)?top-current:NaN;
    if(!Number.isFinite(baseY)){
      const anchor=dividerAnchorFor(page,info.host);
      if(!anchor)return value;
      baseY=anchor.y;
    }
    const pageHeight=1123;
    return Math.max(-baseY+0.5,Math.min(pageHeight-baseY-0.5,value));
  }
  document.addEventListener('keydown',e=>{
    if(!S.open)return;
    const target=e.target;
    if(target&&target.matches&&target.matches('input,textarea'))return;
    if(target&&target.closest&&target.closest('.pdf-page-host[contenteditable]')&&Date.now()-S.lastPageInputAt<1500)return;
    const ctrl=e.ctrlKey||e.metaKey;
    if(ctrl&&((e.key==='z'||e.key==='Z')||(e.key==='y'||e.key==='Y'))&&((S.docHistory&&S.docHistory.length)||(S.docRedo&&S.docRedo.length))){
      e.preventDefault();
      if(e.shiftKey||e.key==='y'||e.key==='Y')redoDivider();else undoDivider();
      return;
    }
    if(!S.dividerEditing)return;
    if(ctrl&&(e.key==='v'||e.key==='V')&&S.dividerClipboard&&S.dividerSelected){
      e.preventDefault();pasteDivider();return;
    }
    const info=S.dividerSelected?dividerInfo(S.dividerSelected):null;
    if(!info)return;
    const cfg=info.cfg;
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){
      e.preventDefault();
      const step=(e.key==='ArrowDown'?1:-1)*(e.shiftKey?1:.5);
      const dividerKey=S.dividerSelected;
      if(sectionDividerMap(dividerKey)){
        const key=activeSectionAnchorKey(dividerKey);
        setSectionAnchorOffset(key,clampSectionOffset(dividerKey,(+DOC_STYLE.textOffsets[key]||0)+step));
      }else{
        cfg.offset=Math.round(clampDividerOffset(dividerKey,(+cfg.offset||0)+step)*100)/100;
      }
      DOC_STYLE.activePreset='';S.docPresetSel='';
      commitDocStyle();
      refreshPresetPicker();
      return;
    }
    if(e.key==='Delete'||e.key==='Backspace'){
      e.preventDefault();deleteSelectedDivider();return;
    }
    if(ctrl&&(e.key==='c'||e.key==='C')){
      e.preventDefault();
      S.dividerClipboard={host:info.host,offset:+cfg.offset||0,thickness:+cfg.thickness||1,color:cfg.color||'#D8E2DB',length:+cfg.length||100,opacity:cfg.opacity===undefined?1:+cfg.opacity};
      return;
    }
  });
  document.addEventListener('beforeinput',e=>{
    const host=e.target.closest&&e.target.closest('.pdf-page-host[contenteditable]');
    if(!host||!/^delete/.test(e.inputType||''))return;
    const sel=window.getSelection();
    if(!sel||!sel.rangeCount)return;
    const range=sel.getRangeAt(0);
    if(range.collapsed)return;
    const fields=[...host.querySelectorAll('[data-text-id]')].filter(el=>{
      try{return range.intersectsNode(el)}catch{return false}
    });
    const startEl=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
    const startField=startEl&&startEl.closest?startEl.closest('[data-text-id]'):null;
    const field=startField&&host.contains(startField)?startField:fields[0];
    let structural=fields.length>1;
    if(!structural&&field){
      const children=[...field.children].filter(el=>{
        try{return range.intersectsNode(el)}catch{return false}
      });
      structural=children.length>1;
    }
    if(!structural)return;
    const value=field&&(field.querySelector('.val,.amt,:scope>b,:scope>.lbl'));
    e.preventDefault();
    if(!value)return;
    /* A selection crossing field boxes must never merge or remove the boxes
       themselves. Clear the value content and let native undo handle it. */
    const safe=document.createRange();
    safe.selectNodeContents(value);
    sel.removeAllRanges();
    sel.addRange(safe);
    try{document.execCommand('delete')}catch{}
  },true);
  document.addEventListener('input',e=>{
    const host=e.target.closest&&e.target.closest('.pdf-page-host[contenteditable]');
    if(!host)return;
    S.lastPageInputAt=Date.now();
    const page=host.querySelector('.pdf-page');
    if(page)requestAnimationFrame(()=>refreshPageDividers(page));
  });
  function nearestDividerHost(page,x,y){
    const pageRect=page.getBoundingClientRect(),scale=pdfPageScale(page)||1;
    const px=(x-pageRect.left)/scale,py=(y-pageRect.top)/scale;
    let best=null;
    for(const key of Object.keys(DOC_DIVIDER_ANCHORS)){
      const anchor=dividerAnchorFor(page,key);
      if(!anchor)continue;
      const inside=px>=anchor.x-8&&px<=anchor.x+anchor.width+8;
      const distance=Math.abs(py-anchor.y)+(inside?0:10000);
      if(!best||distance<best.distance)best={host:key,anchor,distance};
    }
    return best;
  }
  function pasteDivider(){
    const clip=S.dividerClipboard;if(!clip)return;
    let host=clip.host,offset=Math.round((clip.offset+2)*100)/100;
    const point=S.lastPointer;
    if(point){
      const el=document.elementFromPoint(point.x,point.y);
      const page=el&&el.closest&&el.closest('.pdf-page');
      if(page){
        const handle=el.closest&&el.closest('.pdf-edit-layer>.pdf-divider');
        const info=handle?dividerInfo(handle.dataset.divider||handle.dataset.dividerExtra):null;
        const near=info?null:nearestDividerHost(page,point.x,point.y);
        const chosen=info?info.host:(near&&near.host);
        const anchor=chosen?dividerAnchorFor(page,chosen):null;
        if(chosen&&anchor){
          host=chosen;
          const pageRect=page.getBoundingClientRect(),scale=pdfPageScale(page)||1;
          offset=Math.round((((point.y-pageRect.top)/scale)-anchor.y)*100)/100;
          offset=Math.max(-anchor.y+0.5,Math.min(1123-anchor.y-0.5,offset));
        }
      }
    }
    if(!DOC_DIVIDER_DEFS[host])return;
    const used=new Set((DOC_STYLE.extraDividers||[]).filter(x=>x.host===host).map(x=>Math.round((+x.offset||0)*10)));
    if(DOC_STYLE.dividers&&DOC_STYLE.dividers[host])used.add(Math.round((+DOC_STYLE.dividers[host].offset||0)*10));
    if(used.has(Math.round(offset*10))){
      for(let step=.5;step<=40;step+=.5){
        const down=offset-step,up=offset+step;
        if(!used.has(Math.round(down*10))){offset=Math.round(down*100)/100;break}
        if(!used.has(Math.round(up*10))){offset=Math.round(up*100)/100;break}
      }
    }
    const id='dv-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);
    DOC_STYLE.extraDividers=[...(DOC_STYLE.extraDividers||[]),{id,host,visible:true,offset,thickness:clip.thickness,color:clip.color,length:clip.length,opacity:clip.opacity}];
    DOC_STYLE.activePreset='';S.docPresetSel='';S.dividerSelected=id;
    commitDocStyle();
    refreshPresetPicker();
  }
  function rgbHex(value){
    const m=String(value||'').match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if(!m)return /^#/.test(value||'')?value:'#123d36';
    return '#'+[1,2,3].map(i=>Number(m[i]).toString(16).padStart(2,'0')).join('');
  }
  function pdfFontBarHtml(){
    const fonts=PDF_FONT_FAMILIES.map(([v,l])=>'<option value="'+esc(v)+'">'+l+'</option>').join('');
    const sizes=PDF_FONT_SIZES.map(n=>'<option value="'+n+'">'+n+'</option>').join('');
    return '<span class="pdf-font-mark" aria-hidden="true">Aa</span>'+
      '<button type="button" class="pdf-fb-btn pdf-fb-bold" data-fb="bold" aria-pressed="false" title="'+tt('عريض','Bold')+'">B</button>'+
      '<button type="button" class="pdf-fb-btn pdf-fb-semi" data-fb="semi" aria-pressed="false" title="'+tt('نصف عريض','Semi bold')+'">S</button>'+
      '<button type="button" class="pdf-fb-btn" data-fb="size-down" title="'+tt('تصغير الخط','Smaller')+'">A−</button>'+
      '<select data-fb-size aria-label="'+tt('حجم الخط','Font size')+'">'+sizes+'</select>'+
      '<button type="button" class="pdf-fb-btn" data-fb="size-up" title="'+tt('تكبير الخط','Larger')+'">A+</button>'+
      '<select data-fb-font aria-label="'+tt('نوع الخط','Font family')+'">'+fonts+'</select>'+
      '<button type="button" class="pdf-fb-btn pdf-fb-preset" data-fb="preset" title="'+tt('تنسيق المستند الافتراضي','Default document formatting')+'">'+tt('مستند','Doc')+'</button>'+
      '<label class="pdf-font-color" title="'+tt('لون الخط','Font color')+'"><input type="color" data-fb-color value="#123d36"><span class="pdf-font-swatch" aria-hidden="true"></span></label>'+
      '<input class="pdf-font-hex" data-fb-hex maxlength="9" value="#123d36" spellcheck="false" aria-label="'+tt('كود اللون','Color code')+'">'+
      '<button type="button" class="pdf-fb-btn pdf-fb-colors" data-fb-colors title="'+tt('الألوان المحفوظة','Saved colors')+'" aria-label="'+tt('الألوان المحفوظة','Saved colors')+'"><span class="pdf-color-dot" aria-hidden="true"></span></button>'+
      '<select data-fb-reset aria-label="'+tt('استعادة الافتراضي','Restore default')+'"><option value="">'+tt('استعادة…','Reset…')+'</option><option value="all">'+tt('الكل','All')+'</option><option value="color">'+tt('اللون','Color')+'</option><option value="size">'+tt('الحجم','Size')+'</option><option value="weight">'+tt('الوزن','Weight')+'</option><option value="family">'+tt('الخط','Font')+'</option></select>'+
      '<button type="button" class="pdf-fb-close" data-fb-close aria-label="'+tt('إغلاق','Close')+'" title="'+tt('إغلاق','Close')+'">×</button>';
  }
  function hidePdfFontBar(){
    const bar=document.getElementById('pdfFontBar');
    if(bar)bar.hidden=true;
    hidePdfColorPresets();
  }
  function hidePdfFontTrigger(){
    const el=document.getElementById('pdfFontTrigger');
    if(el)el.hidden=true;
  }
  function showPdfFontTrigger(range){
    if(!S.open||S.tab!=='pdf'||S.pv)return hidePdfFontTrigger();
    const bar=document.getElementById('pdfFontBar');
    if(bar&&!bar.hidden)return hidePdfFontTrigger();
    const rect=range&&range.getBoundingClientRect?range.getBoundingClientRect():null;
    if(!rect||(!rect.width&&!rect.height))return hidePdfFontTrigger();
    let el=document.getElementById('pdfFontTrigger');
    if(!el){
      el=document.createElement('button');
      el.type='button';el.id='pdfFontTrigger';el.className='pdf-font-trigger';el.textContent='Aa';
      el.title=tt('تنسيق النص المحدد','Format selected text');
      el.setAttribute('aria-label',tt('تنسيق النص المحدد','Format selected text'));
      el.addEventListener('mousedown',e=>e.preventDefault());
      el.addEventListener('click',e=>{e.preventDefault();hidePdfFontTrigger();showPdfFontBar()});
      document.body.appendChild(el);
    }
    el.hidden=false;
    const w=30,h=26;
    let left=rect.right+6;
    if(left+w>window.innerWidth-6)left=rect.left-w-6;
    left=Math.max(6,Math.min(window.innerWidth-w-6,left));
    let top=rect.top-h-6;
    if(top<8)top=rect.bottom+6;
    top=Math.max(8,Math.min(window.innerHeight-h-8,top));
    el.style.left=left+'px';el.style.top=top+'px';
  }
  function pdfSelectionInfo(){
    const sel=window.getSelection();
    if(!sel||!sel.rangeCount||sel.isCollapsed)return null;
    const range=sel.getRangeAt(0);
    const start=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
    const host=start&&start.closest?start.closest('.pdf-page-host[contenteditable]'):null;
    if(!host)return null;
    return {host,range};
  }
  function pdfRangeElement(range){
    if(!range)return null;
    const node=range.startContainer;
    return node.nodeType===1?node:node.parentElement;
  }
  function pdfRangeStyle(){
    const el=pdfRangeElement(S.fontRange);
    return el?getComputedStyle(el):null;
  }
  function syncPdfFontBar(){
    const bar=document.getElementById('pdfFontBar');
    if(!bar||bar.hidden)return;
    const cs=pdfRangeStyle();
    if(!cs)return;
    const weight=parseInt(cs.fontWeight,10)||400;
    const bold=bar.querySelector('[data-fb="bold"]');
    const semi=bar.querySelector('[data-fb="semi"]');
    if(bold){bold.classList.toggle('on',weight>=700);bold.setAttribute('aria-pressed',String(weight>=700))}
    if(semi){const on=weight>=600&&weight<700;semi.classList.toggle('on',on);semi.setAttribute('aria-pressed',String(on))}
    const size=parseFloat(cs.fontSize)||12;
    const nearest=PDF_FONT_SIZES.reduce((a,b)=>Math.abs(b-size)<Math.abs(a-size)?b:a,PDF_FONT_SIZES[0]);
    const sizeSel=bar.querySelector('[data-fb-size]');
    if(sizeSel)sizeSel.value=String(nearest);
    const fontSel=bar.querySelector('[data-fb-font]');
    if(fontSel)fontSel.value=PDF_FONT_FAMILIES.find(([v])=>cs.fontFamily.indexOf(v.split(',')[0].replace(/"/g,''))>=0)?.[0]||PDF_FONT_FAMILIES[0][0];
    const hex=rgbHex(cs.color);
    const colorInput=bar.querySelector('[data-fb-color]');
    const hexInput=bar.querySelector('[data-fb-hex]');
    if(colorInput)colorInput.value=hex;
    if(hexInput)hexInput.value=hex;
  }
  function showPdfFontBar(){
    hidePdfFontTrigger();
    const info=pdfSelectionInfo();
    if(info){S.fontHost=info.host;S.fontRange=info.range.cloneRange()}
    const host=S.fontHost,range=S.fontRange;
    const valid=host&&range&&host.isConnected&&range.startContainer&&range.startContainer.isConnected;
    if(!valid){A.note(tt('حدد نصًا داخل البيان أولًا ثم اضغط تنسيق.','Select text in the document first, then press Format.'));return}
    let bar=document.getElementById('pdfFontBar');
    if(!bar){
      bar=document.createElement('div');bar.id='pdfFontBar';bar.className='pdf-font-bar';bar.hidden=true;
      bar.innerHTML=pdfFontBarHtml();document.body.appendChild(bar);
      bar.addEventListener('mouseenter',()=>{S.fontBarHover=true});
      bar.addEventListener('mouseleave',()=>{S.fontBarHover=false});
    }
    bar.hidden=false;
    syncPdfFontBar();
  }
  function applyFontStyle(styles){
    const host=S.fontHost,range=S.fontRange;
    if(!host||!range)return;
    S.fontApplying=true;
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
    const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(!node.nodeValue.trim()||!range.intersectsNode(node))continue;
      const start=node===range.startContainer?range.startOffset:0;
      const end=node===range.endContainer?range.endOffset:node.nodeValue.length;
      if(end>start)nodes.push({node,start,end});
    }
    const created=[];
    for(const {node,start,end} of nodes.reverse()){
      const parent=node.parentElement;
      if(parent&&parent.tagName==='SPAN'&&parent.childNodes.length===1&&start===0&&end===node.nodeValue.length){
        for(const [k,v] of Object.entries(styles))if(v)parent.style[k]=v;
        created.push(parent);
        continue;
      }
      const span=document.createElement('span');
      for(const [k,v] of Object.entries(styles))if(v)span.style[k]=v;
      const r=document.createRange();r.setStart(node,start);r.setEnd(node,end);
      try{r.surroundContents(span);created.push(span)}catch{}
    }
    if(created.length){
      const first=created[created.length-1],last=created[0];
      const firstNode=first.firstChild||first,lastNode=last.lastChild||last;
      const next=document.createRange();
      if(firstNode.nodeType===3&&lastNode.nodeType===3){
        next.setStart(firstNode,0);
        next.setEnd(lastNode,lastNode.nodeValue.length);
      }else{
        next.setStartBefore(first);next.setEndAfter(last);
      }
      sel.removeAllRanges();sel.addRange(next);
      S.fontRange=next.cloneRange();
    }
    host.dispatchEvent(new Event('input',{bubbles:true}));
    saveEditablePage(host);
    syncPdfFontBar();
    setTimeout(()=>{S.fontApplying=false},180);
  }
  function pdfFontAction(action){
    const cs=pdfRangeStyle();
    if(!cs)return;
    if(action==='preset'){
      return resetPdfFont('all');
    }
    const weight=parseInt(cs.fontWeight,10)||400;
    if(action==='bold'){
      if(weight>=700)return applyFontStyle({fontWeight:'400'});
      return applyFontStyle({fontWeight:'700'});
    }
    if(action==='semi'){
      if(weight>=600&&weight<700)return applyFontStyle({fontWeight:'400'});
      return applyFontStyle({fontWeight:'600'});
    }
    if(action==='size-up'||action==='size-down'){
      const size=parseFloat(cs.fontSize)||12;
      const next=Math.max(7,Math.min(48,size+(action==='size-up'?1:-1)));
      return applyFontStyle({fontSize:next+'px'});
    }
  }
  function resetPdfFont(kind){
    const host=S.fontHost;
    if(!host)return;
    const range=S.fontRange||(window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0):null);
    if(!range)return;
    const keys=kind==='all'?['color','size','weight','family']:[kind];
    const props=keys.map(key=>({color:'color',size:'font-size',weight:'font-weight',family:'font-family'}[key])).filter(Boolean);
    if(!props.length)return;
    const spans=[...host.querySelectorAll('span')].filter(span=>{
      try{return range.intersectsNode(span)}catch{return false}
    });
    let touched=false;
    spans.forEach(span=>props.forEach(prop=>{
      if(span.style.getPropertyValue(prop)){span.style.removeProperty(prop);touched=true}
    }));
    if(!touched)return;
    host.dispatchEvent(new Event('input',{bubbles:true}));
    saveEditablePage(host);
    syncPdfFontBar();
  }
  document.addEventListener('selectionchange',()=>{
    if(!S.open||S.fontApplying||S.pv)return;
    const info=pdfSelectionInfo();
    if(!info){hidePdfFontTrigger();return}
    S.fontHost=info.host;S.fontRange=info.range.cloneRange();
    const bar=document.getElementById('pdfFontBar');
    if(bar&&!bar.hidden)syncPdfFontBar();else showPdfFontTrigger(info.range);
  });
  document.addEventListener('scroll',()=>hidePdfFontTrigger(),true);
  document.addEventListener('mousedown',e=>{
    const zone=e.target.closest('#pdfFontBar,#pdfColorPresets');
    if(zone&&e.target.closest('button'))e.preventDefault();
  },true);
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-fb-close]')){hidePdfFontBar();return}
    if(e.target.closest('[data-fb-colors]')){e.preventDefault();const el=document.getElementById('pdfColorPresets');if(el&&!el.hidden)hidePdfColorPresets();else showPdfColorPresets();return}
    if(e.target.closest('[data-fb-colors-close]')){hidePdfColorPresets();return}
    const savedColor=e.target.closest('[data-fb-saved-color]');
    if(savedColor){const c=savedColor.dataset.fbSavedColor;const bar=document.getElementById('pdfFontBar');const ci=bar&&bar.querySelector('[data-fb-color]'),hi=bar&&bar.querySelector('[data-fb-hex]');if(ci)ci.value=c;if(hi)hi.value=c;applyFontStyle({color:c});return}
    const delColor=e.target.closest('[data-fb-del-color]');
    if(delColor){writeColorPresets(readColorPresets().filter(x=>x!==delColor.dataset.fbDelColor));showPdfColorPresets();return}
    if(e.target.closest('[data-fb-save-color]')){
      const bar=document.getElementById('pdfFontBar');const c=bar&&bar.querySelector('[data-fb-color]')?.value;
      if(c){writeColorPresets([...readColorPresets(),c]);showPdfColorPresets()}
      return;
    }
    const fb=e.target.closest('[data-fb]');
    if(fb){pdfFontAction(fb.dataset.fb);return}
  });
  document.addEventListener('change',e=>{
    const bar=e.target.closest('#pdfFontBar');
    if(!bar)return;
    if(e.target.matches('[data-fb-font]')){applyFontStyle({fontFamily:e.target.value});syncPdfFontBar()}
    else if(e.target.matches('[data-fb-size]')){applyFontStyle({fontSize:e.target.value+'px'});syncPdfFontBar()}
    else if(e.target.matches('[data-fb-reset]')){const kind=e.target.value;e.target.value='';if(kind)resetPdfFont(kind)}
  });
  document.addEventListener('input',e=>{
    const bar=e.target.closest('#pdfFontBar');
    if(!bar)return;
    if(e.target.matches('[data-fb-color]')){
      const hex=e.target.value;
      const txt=bar.querySelector('[data-fb-hex]');if(txt)txt.value=hex;
      applyFontStyle({color:hex});
    }else if(e.target.matches('[data-fb-hex]')){
      const hex=String(e.target.value||'').trim();
      if(/^#[0-9a-f]{6}$/i.test(hex)){
        const color=bar.querySelector('[data-fb-color]');if(color)color.value=hex;
        applyFontStyle({color:hex});
      }
    }
  });
  function flushEditablePages(){
    document.querySelectorAll('.pdf-page-host[contenteditable]').forEach(saveEditablePage);
  }
  function railHtml(){
    if(!S.built)return '<div class="rail-empty">'+tt('جارٍ التجهيز…','Preparing…')+'</div>';
    if(offersMode()){
      return offerPdfGroups().map(g=>{
        const on=g.offerIndex===S.activeOffer;
        const pages=on?'<div class="rail-offer-pages">'+g.pages.map(pi=>{
          const page=S.built.pages[pi];
          const local=(page.offerPage||0)+1;
          return '<button type="button" class="rail-page rail-page-mini" data-rail-page="'+pi+'" aria-label="'+tt('صفحة','Page')+' '+local+'"><img src="'+page.thumb+'" alt=""><span>'+local+'</span></button>';
        }).join('')+'</div>':'';
        return '<div class="rail-offer '+(on?'on':'')+'" data-offer-rail="'+g.offerIndex+'"><button type="button" class="rail-offer-open" data-offer-rail="'+g.offerIndex+'" aria-pressed="'+on+'"><img src="'+S.built.pages[g.pages[0]].thumb+'" alt=""><span><b>'+esc(offerLabel(g.offerIndex))+'</b><small>'+esc(offerClient(g.offerIndex)||'')+'</small></span></button><label class="rail-check"><input type="checkbox" data-pdf-offer="'+g.offerIndex+'" '+(S.pdfOffers.has(g.offerIndex)?'checked':'')+' aria-label="'+tt('تحديد ملف PDF','Select PDF file')+'"></label>'+pages+'</div>';
      }).join('');
    }
    return S.built.pages.map((p,i)=>'<button type="button" class="rail-page" data-rail-page="'+i+'" aria-label="'+tt('صفحة','Page')+' '+(i+1)+'"><img src="'+p.thumb+'" alt=""><span>'+(i+1)+'</span></button>').join('');
  }
  function toolbarMount(){const el=$('#shareToolbar');if(el)el.innerHTML=toolbarHtml()}
  function railMount(){const el=$('#shareRail');if(el)el.innerHTML=railHtml()}
  function subtitleMount(){
    const el=$('#shareSubtitle');if(!el)return;
    const src=offersMode()?S.offers[S.activeOffer]:A.p;
    el.textContent=(src&&src.unit?src.unit+' · ':'')+(S.built?pageCountLabel(S.built.pages.length):tt('جارٍ التجهيز…','Preparing…'));
  }
  function notesPanelHtml(){
    const note=(type,label,text,preset)=>{
      const list=presetsOf(type);
      return '<div class="notes-col"><div class="notes-head"><label class="notes-toggle-label"><input type="checkbox" data-note-toggle="'+type+'" '+((type==='intro'?S.includeIntro:S.includeOutro)?'checked':'')+'><b>'+label+'</b></label><select data-preset-select="'+type+'" aria-label="'+label+'"><option value="">'+tt('الافتراضي','Default')+'</option>'+list.map(p=>'<option value="'+p.id+'" '+(preset===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></div><textarea data-note-text="'+type+'" maxlength="800" rows="4" dir="auto">'+esc(text)+'</textarea><div class="notes-save"><input data-preset-name="'+type+'" placeholder="'+tt('اسم Preset','Preset name')+'" maxlength="60"><button type="button" class="mini-btn" data-share-act="preset-save-'+type+'">'+tt('حفظ Preset','Save preset')+'</button><button type="button" class="mini-btn" data-share-act="preset-delete-'+type+'">'+tt('حذف','Delete')+'</button></div></div>';
    };
    return '<div class="notes-panel"><div class="notes-panel-head"><b>'+tt('المقدمة والخاتمة','Introduction & closing')+'</b><div class="notes-panel-toggles">'+noteTogglesHtml()+'</div><button type="button" class="share-x" data-share-act="notes-close" aria-label="'+tt('إغلاق','Close')+'">×</button></div><div class="notes-grid">'+note('intro',tt('مقدمة','Introduction'),S.introText,S.introPreset)+note('outro',tt('خاتمة','Closing'),S.outroText,S.outroPreset)+'</div><label class="notes-show-total"><input type="checkbox" data-show-total-share '+(showTotalValue()?'checked':'')+'><span>'+tt('إظهار الإجمالي في العرض','Show the total in the offer')+'</span></label><p class="notes-hint">'+tt('تُطبَّق على النص المنسوخ والمرسل فقط، ولا تظهر داخل PDF أو الصور.','Applies to copied and shared text only; it is not added to PDF or images.')+'</p></div>';
  }
  function notesMount(){const el=$('#shareNotes');if(el){el.innerHTML=S.notesOpen?notesPanelHtml():'';el.classList.toggle('on',S.notesOpen)}}
  function loadingHtml(){
    return '<div class="share-loading"><div class="spinner"></div><div>'+tt('جارٍ تجهيز العرض…','Preparing your offer…')+'</div><div id="shareProgress" class="progress"><i style="width:'+S.progress+'%"></i></div><div class="muted" id="shareProgressLabel" style="font-size:10.5px;margin-top:8px;color:var(--sub)">'+esc(S.progressLabel||'')+'</div></div>';
  }
  function pageCountLabel(n){return n+' '+(n===1?tt('صفحة','page'):tt('صفحات','pages'))}
  function paymentsLabel(n){return n+' '+(n===1?tt('دفعة','payment'):tt('دفعات','payments'))}
  function previewThumbnail(canvas){
    const out=document.createElement('canvas');
    out.width=Math.min(794,canvas.width);
    out.height=Math.round(out.width*canvas.height/canvas.width);
    const ctx=out.getContext('2d');
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(canvas,0,0,out.width,out.height);
    return out.toDataURL('image/png');
  }
  function pagePreview(page){
    return page.thumb;
  }
  function offerPdfGroups(){
    const groups=[];
    if(!S.built)return groups;
    S.built.pages.forEach((p,i)=>{
      const oi=p.offerIndex||0;
      let g=groups[oi];
      if(!g)g=groups[oi]={offerIndex:oi,pages:[]};
      g.pages.push(i);
    });
    return groups.filter(Boolean);
  }
  function offerLabel(i){
    const o=S.offers&&S.offers[i]||{};
    return o.unit||tt('عرض عقاري','Property offer');
  }
  function offerClient(i){
    const o=S.offers&&S.offers[i]||{};
    return o.client||'';
  }
  function offerPdfName(i){
    const o=S.offers&&S.offers[i]||{};
    const title=offerTitleFor(o);
    const parts=[filePart(o.unit),filePart(title)];
    if(S.fileScope==='summary')parts.push(filePart(dt('ملخص','summary')));
    return (parts.filter(Boolean).join(' - ')||title)+'.pdf';
  }
  function offerPdfCard(g){
    const first=S.built.pages[g.pages[0]];
    const oi=g.offerIndex,checked=S.pdfOffers.has(oi);
    return '<div class="page-card pdf-offer-card'+(checked?' on':'')+'" data-pdf-offer-card="'+oi+'">'+
      '<input class="page-check" type="checkbox" data-pdf-offer="'+oi+'" aria-label="'+esc(offerLabel(oi))+' · '+tt('تحديد ملف PDF','Select PDF file')+'" '+(checked?'checked':'')+'>'+
      '<img src="'+first.thumb+'" alt="'+esc(offerLabel(oi))+'" data-pv-page="'+g.pages[0]+'">'+
      '<div class="pdf-offer-info"><div><b>'+esc(offerLabel(oi))+'</b>'+(offerClient(oi)?'<span>'+esc(offerClient(oi))+'</span>':'')+'</div><button type="button" class="pdf-offer-open" data-pv-page="'+g.pages[0]+'" aria-label="'+tt('فتح PDF','Open PDF')+'" title="'+tt('فتح PDF','Open PDF')+'">'+icon('open',14)+'</button></div>'+
    '</div>';
  }
  function offersPdfHtml(){
    const groups=offerPdfGroups();
    return '<div class="share-subhead"><div class="sub-left"><h3>'+tt('ملفات PDF','PDF files')+'</h3><span class="selected-count">'+S.pdfOffers.size+' '+tt('محدد','selected')+'</span></div><div class="tools"><button type="button" class="mini-btn" data-share-act="pdf-select-all">'+icon('check',13)+tt('تحديد الكل','Select all')+'</button><button type="button" class="mini-btn" data-share-act="pdf-clear">'+tt('مسح','Clear')+'</button></div></div><div class="pdf-offer-grid">'+groups.map(offerPdfCard).join('')+'</div>';
  }
  function pdfHtml(){
    const b=S.built;
    if(offersMode()){
      const groups=offerPdfGroups();
      const group=groups.find(g=>g.offerIndex===S.activeOffer)||groups[0];
      if(!group)return '<div class="share-empty">'+tt('لا توجد صفحات.','No pages.')+'</div>';
      return '<div class="share-doc" style="--zoom:'+S.zoom+'">'+group.pages.map((pi,local)=>docPageHtml(b.pages[pi],local+1,pi)).join('')+'</div>';
    }
    return '<div class="share-doc" style="--zoom:'+S.zoom+'">'+b.pages.map((p,i)=>docPageHtml(p,i+1,i)).join('')+'</div>';
  }
  function pageCard(i,page){
    const n=i+1;
    const thumb=page.thumb;
    return '<div class="page-card'+(S.selectedPages.has(i)?' on':'')+'" data-page-card="'+i+'"><input class="page-check" type="checkbox" data-page="'+i+'" aria-label="'+tt('تحديد الصفحة','Select page')+' '+n+'" '+(S.selectedPages.has(i)?'checked':'')+'><img src="'+thumb+'" alt="'+tt('صفحة','Page')+' '+n+'"><span class="mark">'+icon('check',13)+'</span><span class="pno">'+n+'</span><button type="button" class="page-edit" data-pv-page="'+i+'">'+icon('pen',12)+'<span>Edit</span></button></div>';
  }
  function imagesHtml(){
    const b=S.built;
    const total=S.selectedPages.size+S.crops.length;
    let html='<div class="share-subhead"><div class="sub-left"><h3>'+tt('الصفحات','Pages')+'</h3><span class="selected-count">'+total+' '+tt('محدد','selected')+'</span></div><div class="tools"><button type="button" class="mini-btn" data-share-act="select-all">'+icon('check',13)+tt('تحديد الكل','Select all')+'</button><button type="button" class="mini-btn" data-share-act="clear-selection">'+tt('مسح','Clear')+'</button></div></div><div class="page-grid">'+b.pages.map((p,i)=>pageCard(i,p)).join('')+'</div>';
    if(S.crops.length){
      html+='<div class="crop-list-title"><span>'+tt('الأجزاء المحددة','Selected parts')+' ('+S.crops.length+')</span></div><div class="crop-strip">'+S.crops.map((c,i)=>'<div class="crop-thumb"><img src="'+c.data+'" alt="'+tt('جزء','Part')+' '+(i+1)+'" data-pv-crop="'+i+'"><span>'+tt('جزء','Part')+' '+(i+1)+'</span><button type="button" data-crop-remove="'+i+'" aria-label="'+tt('حذف الجزء','Remove part')+'">×</button></div>').join('')+'</div>';
    }
    return html;
  }
  function noteTogglesHtml(){
    return '<div class="note-toggles" role="group" aria-label="'+tt('إظهار المقدمة والخاتمة','Show intro and closing')+'"><span class="note-toggle-wrap"><label class="note-toggle"><input type="checkbox" data-note-toggle="intro" '+(S.includeIntro?'checked':'')+'><span>'+tt('مقدمة','Intro')+'</span></label><button type="button" class="note-preset-btn" data-note-presets="intro" aria-label="'+tt('قوائم المقدمة','Intro presets')+'" title="'+tt('قوائم المقدمة','Intro presets')+'">▾</button></span><span class="note-toggle-wrap"><label class="note-toggle"><input type="checkbox" data-note-toggle="outro" '+(S.includeOutro?'checked':'')+'><span>'+tt('خاتمة','Outro')+'</span></label><button type="button" class="note-preset-btn" data-note-presets="outro" aria-label="'+tt('قوائم الخاتمة','Outro presets')+'" title="'+tt('قوائم الخاتمة','Outro presets')+'">▾</button></span></div>';
  }
  function textHtml(){
    const len=S.text.length;
    const rtl=docLang()==='ar';
    const full=S.textScope!=='summary';
    return '<div class="text-share"><div class="text-scope" role="group" aria-label="'+tt('نطاق النص','Text scope')+'">'+
      '<button type="button" data-share-act="scope-full" class="'+(full?'on':'')+'" aria-pressed="'+full+'">'+tt('الملخص وجدول الدفعات','Summary and payment schedule')+'</button>'+
      '<button type="button" data-share-act="scope-summary" class="'+(!full?'on':'')+'" aria-pressed="'+(!full)+'">'+tt('الملخص','Summary')+'</button>'+
      '</div><textarea id="shareText" dir="'+(rtl?'rtl':'ltr')+'" spellcheck="false" aria-label="'+tt('نص العرض','Offer text')+'">'+esc(S.text)+'</textarea><div class="text-meta"><span>'+len+' '+tt('حرفًا','characters')+'</span><span>'+tt('الأسعار بالجنيه المصري','Amounts in Egyptian pounds')+'</span></div></div>';
  }
  function resultHtml(){
    const r=S.result||{};
    const isFile=r.kind==='pdf'||r.kind==='images';
    let title=tt('تم تجهيز المشاركة','Share prepared');
    let msg=r.message||'';
    if(!msg){
      if(r.method==='shareui')msg=tt('اختر واتساب من نافذة المشاركة التي ظهرت. الملفات مرفقة تلقائيًا.','Choose WhatsApp in the share window. The files are attached automatically.');
      else if(r.method==='webshare')msg=tt('تم فتح نافذة المشاركة على الجهاز. اختر واتساب ثم أرسل.','The device share sheet opened. Choose WhatsApp, then send.');
      else if(r.method==='download')msg=tt('تم تنزيل الملفات. أرفقها في محادثة واتساب ثم أرسل.','The files were downloaded. Attach them in WhatsApp, then send.');
      else if(r.method==='text-web')msg=tt('تم فتح واتساب مع النص. اختر المحادثة ثم أرسل.','WhatsApp opened with the text. Choose a chat, then send.');
      else if(isFile&&r.whatsapp==='desktop')msg=tt('تم نسخ الملفات وفتح واتساب. الصقها في المحادثة (Ctrl+V) ثم أرسل.','Files were copied and WhatsApp opened. Paste them in the chat (Ctrl+V), then send.');
      else if(isFile)msg=tt('تم تجهيز الملفات وفتح واتساب في المتصفح. اسحب الملفات من المجلد المفتوح إلى المحادثة ثم أرسل.','Files are ready and WhatsApp Web opened. Drag the files from the opened folder into the chat, then send.');
      else msg=tt('تم فتح واتساب مع النص.','WhatsApp opened with the text.');
    }
    if(r.method==='shareui')title=tt('نافذة المشاركة مفتوحة','Share window opened');
    if(r.method==='download')title=tt('الملفات جاهزة','Files are ready');
    if(r.method==='text-web')title=tt('واتساب مفتوح','WhatsApp is open');
    const steps=[];
    if(isFile&&r.folder)steps.push(tt('المجلد المفتوح يحتوي على كل الملفات التي اخترتها.','The opened folder contains every file you selected.'));
    if(r.method==='clipboard'||r.method==='clipboard-text')steps.push(tt('إذا لم يظهر واتساب، استخدم زر «فتح واتساب» بالأسفل.','If WhatsApp did not appear, use the “Open WhatsApp” button below.'));
    return '<div class="share-result"><div class="result-card"><span class="ok">'+icon('check')+'</span><div><h3>'+esc(title)+'</h3><p>'+esc(msg)+'</p></div></div>'+
      (r.folder?'<div class="copy-path">'+esc(r.folder)+'</div>':'')+
      (steps.length?'<ul class="result-steps">'+steps.map((x,i)=>'<li><b>'+(i+1)+'</b><span>'+esc(x)+'</span></li>').join('')+'</ul>':'')+
      '</div>';
  }
  function bodyHtml(){
    if(S.result)return resultHtml();
    if(S.tab==='text')return textHtml();
    if(S.error)return '<div class="share-err">'+esc(S.error)+'<div style="margin-top:12px"><button type="button" class="share-btn" data-share-act="retry-build">'+icon('refresh')+tt('إعادة المحاولة','Retry')+'</button></div></div>';
    if(!S.built)return loadingHtml();
    return S.tab==='pdf'?pdfHtml():imagesHtml();
  }
  function waMenuHtml(busy){
    const label=tt('مشاركة','Share');
    const item=(act,ic,text,sep)=>'<button type="button" role="menuitem" data-share-act="'+act+'"'+(busy&&act.startsWith('wa-')?busy:'')+' class="'+(sep?'sep':'')+'">'+icon(ic,15)+'<span>'+text+'</span></button>';
    return '<div class="share-wa">'+
      '<button type="button" class="share-icon share-primary" data-share-act="wa-menu"'+busy+' title="'+label+'" aria-haspopup="menu" aria-expanded="false" aria-label="'+label+'">'+icon('open',19)+'</button>'+
      '<div class="share-wa-menu" role="menu" aria-label="'+tt('اختر صيغة المشاركة','Choose a format')+'">'+
        item('wa-pdf','file',offersMode()?tt('PDF · الملف الحالي','PDF · current file'):'PDF')+
        item('wa-images','image',tt('صور','Images'))+
        item('wa-text','text',tt('نص','Text'))+
        item('shareui','windows',tt('تطبيقات أخرى','Other apps'),true)+
        item('open-file','open',tt('فتح الملف خارجيًا','Open file externally'))+
      '</div></div>';
  }
  function copyMenuHtml(){
    const label=tt('خيارات النسخ','Copy options');
    return '<div class="share-wa share-copy">'+
      '<button type="button" class="share-icon" data-share-act="copy-menu" title="'+label+'" aria-haspopup="menu" aria-expanded="false" aria-label="'+label+'">'+icon('copy',19)+'</button>'+
      '<div class="share-wa-menu" role="menu" aria-label="'+label+'">'+
        '<button type="button" role="menuitem" data-share-act="copy-full">'+tt('نسخ الملخص وجدول الدفعات','Copy summary and payment schedule')+'</button>'+
        '<button type="button" role="menuitem" data-share-act="copy-summary">'+tt('نسخ الملخص','Copy summary')+'</button>'+
      '</div></div>';
  }
  function controlsHtml(){
    const zoom=Math.round(S.zoom*100);
    const copyLabel=S.textMode==='horizontal'?tt('نسخ أفقي','Copy horizontal'):tt('نسخ رأسي','Copy vertical');
    const fileLabel=S.pdfLayout==='horizontal'?tt('ملف أفقي','File horizontal'):tt('ملف رأسي','File vertical');
    const fileMenu='<div class="share-layout-menu" role="menu" aria-label="'+tt('شكل ملف PDF','PDF file layout')+'"><button type="button" data-file-layout="horizontal" class="'+(S.pdfLayout==='horizontal'?'on':'')+'">'+tt('ملف أفقي','File horizontal')+'</button><button type="button" data-file-layout="vertical" class="'+(S.pdfLayout==='vertical'?'on':'')+'">'+tt('ملف رأسي','File vertical')+'</button></div>';
    return '<div class="share-controls"><button type="button" class="share-toggle" data-share-act="toggle-language">'+(docLang()==='ar'?'العربية':'EN')+'</button><span class="share-layout-wrap"><button type="button" class="share-toggle share-layout-btn" data-share-act="toggle-layout" title="'+tt('كليك شمال: نسخ فقط · كليك يمين: شكل الملف','Left click: copy only · Right click: file layout')+'">'+copyLabel+'</button><button type="button" class="share-layout-caret" data-share-act="layout-menu" aria-haspopup="menu" aria-expanded="false" title="'+fileLabel+'">▾</button>'+fileMenu+'</span><span class="share-preset-tools" data-doc-preset-tools>'+docPresetToolsHtml()+'</span><button type="button" class="share-toggle share-notes-btn" data-share-act="notes">'+icon('note',14)+tt('مقدمة وخاتمة','Intro & closing')+'</button><button type="button" class="share-zoom-btn" data-share-act="zoom-toggle" title="'+tt('ملاءمة الصفحة أو الرجوع إلى 100%','Fit page or return to 100%')+'">'+zoom+'%</button></div>';
  }
  function footHtml(){
    if(S.result){
      return '<div class="left">'+(S.result.folder?'<button type="button" class="share-btn" data-share-act="open-folder">'+icon('folder')+tt('فتح المجلد','Open folder')+'</button>':'')+'<button type="button" class="share-btn" data-share-act="share-wa-result">'+icon('whatsapp')+tt('فتح واتساب + نسخ','Open WhatsApp + copy')+'</button></div><div class="right"><button type="button" class="share-btn primary" data-share-act="dismiss-result">'+tt('تم','Done')+'</button></div>';
    }
    const busy=S.busy?' disabled':'';
    const saveLabel=offersMode()?tt('تنزيل ملفات PDF المحددة','Download selected PDFs'):tt('حفظ','Save');
    return '<div class="share-controls-wrap"><div class="share-actions" style="direction:rtl">'+waMenuHtml(busy)+(S.built?'<button type="button" class="share-icon" data-share-act="save-pdf" title="'+saveLabel+'" aria-label="'+saveLabel+'">'+icon('download',19)+'</button>':'')+copyMenuHtml()+'</div>'+controlsHtml()+'</div>';
  }
  function scopePromptHtml(){
    if(!S.scopePrompt)return '';
    const kind=S.scopePrompt.kind;
    const full=tt('الملخص وجدول الدفعات','Summary and payment schedule');
    const summary=tt('الملخص','Summary');
    return '<div class="scope-backdrop" data-scope-cancel="1"></div><div class="scope-card" role="dialog" aria-modal="true"><div class="scope-actions"><button type="button" class="scope-btn primary" data-scope="full">'+esc(full)+'</button><button type="button" class="scope-btn" data-scope="summary">'+esc(summary)+'</button><button type="button" class="scope-cancel" data-scope-cancel="1">'+tt('إلغاء','Cancel')+'</button></div></div>';
  }
  function scopeMount(){const el=$('#shareScopePrompt');if(el)el.innerHTML=scopePromptHtml()}
  function openScopePrompt(kind){
    if(!['pdf','images','text'].includes(kind))return;
    S.scopePrompt={kind};
    scopeMount();
  }
  async function chooseScope(scope){
    const kind=S.scopePrompt&&S.scopePrompt.kind;
    if(!kind)return;
    S.scopePrompt=null;scopeMount();
    if(kind==='text'){
      setTextScope(scope==='summary'?'summary':'full');
      renderAll();
      await shareText();
      return;
    }
    if(S.fileScope!==(scope==='summary'?'summary':'full')){
      setFileScope(scope==='summary'?'summary':'full');
      await ensureBuilt();
    }
    renderAll();
    if(kind==='pdf')await sharePdf();else await shareImages();
  }
  function renderAll(){
    if(!S.open)return;
    hidePdfFontBar();
    hidePdfFontTrigger();
    railMount();notesMount();
    const body=$('#shareBody');if(body)body.innerHTML=bodyHtml();
    markPdfAmounts();
    const foot=$('#shareFoot');if(foot)foot.innerHTML=footHtml();
    scopeMount();
  }
  function renderBodyKeepScroll(){
    const body=$('#shareBody');if(!body)return;
    const top=body.scrollTop;
    body.innerHTML=bodyHtml();
    body.scrollTop=top;
    markPdfAmounts();
    railMount();
  }
  function renderFoot(){
    if(!S.open)return;
    const foot=$('#shareFoot');if(foot)foot.innerHTML=footHtml();
  }
  function setTab(tab){
    if(!['pdf','images','text'].includes(tab)||S.tab===tab)return;
    S.tab=tab;S.result=null;S.error=null;
    renderAll();
    if(tab!=='text')ensureBuilt();
    scheduleMobileFit();
  }
  function updateZoomLabel(){
    const btn=document.querySelector('[data-share-act="zoom-toggle"]');
    if(btn)btn.textContent=Math.round(S.zoom*100)+'%';
  }
  function setZoom(value){
    S.zoom=Math.max(.3,Math.min(2.5,Math.round(value*100)/100));S.zoomMode=Math.abs(S.zoom-1)<.001?'actual':'custom';
    const doc=$('.share-doc');if(doc)doc.style.setProperty('--zoom',String(S.zoom));
    updateZoomLabel();
  }
  function fitZoom(){
    const view=$('.share-doc');if(!view)return;
    const width=Math.max(220,view.clientWidth-28),height=Math.max(220,view.clientHeight-28);
    const fit=Math.min(width/794,height/1123);
    const widthFit=Math.min(1,width/794);
    S.zoom=Math.max(.2,Math.min(2.5,fit<.4?widthFit:fit));S.zoomMode='fit';
    view.style.setProperty('--zoom',String(S.zoom));
    updateZoomLabel();
  }
  function scheduleMobileFit(){
    if(!isMobile())return;
    setTimeout(()=>{if(S.open&&S.tab!=='text')fitZoom()},140);
  }
  function zoomAt(value,clientY){
    const view=$('.share-doc');if(!view)return;
    const old=S.zoom,next=Math.max(.3,Math.min(2.5,Math.round(value*100)/100));
    if(Math.abs(next-old)<.001)return;
    const rect=view.getBoundingClientRect();
    const y=clientY==null?view.clientHeight/2:clientY-rect.top;
    view.scrollTop=(view.scrollTop+y)*(next/old)-y;
    S.zoom=next;S.zoomMode=Math.abs(next-1)<.001?'actual':'custom';
    view.style.setProperty('--zoom',String(next));
    updateZoomLabel();
  }
  function toggleZoom(){
    if(S.zoomMode==='fit'){
      setZoom(1);
      const view=$('.share-doc');if(view)view.scrollTop=0;
    }else fitZoom();
  }
  function setTextMode(mode){
    if(mode!=='horizontal')mode='vertical';
    if(S.textMode===mode)return;
    S.textMode=mode;
    S.text=buildShareText();
    if(S.tab==='text')renderBodyKeepScroll();else renderFoot();
  }
  function setPdfLayout(mode){
    mode=mode==='vertical'?'vertical':'horizontal';
    if(S.pdfLayout===mode)return;
    S.pdfLayout=mode;
    resetBuilt();
    S.signature=buildSignature();
    renderAll();
    if(S.tab!=='text')ensureBuilt();
    scheduleMobileFit();
  }
  function setFileScope(scope){
    scope=scope==='summary'?'summary':'full';
    if(S.fileScope===scope)return;
    S.fileScope=scope;
    resetBuilt();
    S.signature=buildSignature();
    S.text=buildShareText();
    renderAll();
    if(S.tab!=='text')ensureBuilt();
    scheduleMobileFit();
  }
  function setTextScope(scope){
    scope=scope==='summary'?'summary':'full';
    if(S.textScope===scope)return;
    S.textScope=scope;
    S.text=buildShareText();
    if(S.tab==='text')renderBodyKeepScroll();
  }
  function syncNoteToggles(){
    document.querySelectorAll('[data-note-toggle]').forEach(cb=>{
      cb.checked=cb.dataset.noteToggle==='intro'?S.includeIntro:S.includeOutro;
    });
  }
  function setNoteVisibility(intro,outro){
    S.includeIntro=!!intro;S.includeOutro=!!outro;
    A.setNoteVisibility(S.includeIntro,S.includeOutro);
    syncNoteToggles();
    S.text=buildShareText();
    if(S.open&&S.tab==='text')updateTextArea();
  }
  function updateTextArea(){
    const area=$('#shareText');
    if(area&&area.value!==S.text)area.value=S.text;
    const meta=area&&area.parentNode&&area.parentNode.querySelector('.text-meta span');
    if(meta)meta.textContent=S.text.length+' '+tt('حرفًا','characters');
  }
  function selectPreset(type,id){
    const list=presetsOf(type);
    const preset=list.find(p=>p.id===id);
    if(preset){S[type+'Text']=preset.text;S[type+'Preset']=preset.id;S[type+'Dirty']=true}
    else{S[type+'Text']=offersMode()?(S.offers[0]&&S.offers[0][type])||'':A.p[type]||'';S[type+'Preset']='';S[type+'Dirty']=false}
    S.text=buildShareText();
    notesMount();
    if(S.tab==='text')updateTextArea();
  }
  function savePreset(type){
    const nameEl=document.querySelector('[data-preset-name="'+type+'"]');
    const textEl=document.querySelector('[data-note-text="'+type+'"]');
    const name=String(nameEl&&nameEl.value||'').trim();
    const text=String(textEl&&textEl.value||'').trim();
    if(!name||!text){A.note(tt('اكتب اسمًا ونصًا للـ Preset.','Enter a preset name and text.'));return}
    const list=readPresets();
    const preset={id:(crypto.randomUUID?crypto.randomUUID():'p'+Date.now()),type,name,text};
    list.push(preset);writePresets(list);
    S[type+'Text']=text;S[type+'Preset']=preset.id;S[type+'Dirty']=true;
    S.text=buildShareText();notesMount();
    A.note(tt('تم حفظ الـ Preset','Preset saved'));
    if(S.tab==='text')updateTextArea();
  }
  function deletePreset(type){
    const id=S[type+'Preset'];
    if(!id){A.note(tt('اختر Preset محفوظًا أولًا.','Choose a saved preset first.'));return}
    writePresets(readPresets().filter(p=>p.id!==id));
    S[type+'Preset']='';notesMount();
    A.note(tt('تم حذف الـ Preset','Preset deleted'));
  }

  /* ---------- open / close ---------- */
  function open(tab,opts){
    if(S.open)close(true);
    S.offers=null;
    S.rowFilter=opts&&opts.rows&&opts.rows.length?new Set(opts.rows):null;
    const s=activeSchedule();
    if(!s.valid){A.note(tt('راجع شروط العرض أولًا.','Check the offer terms first.'));return}
    S.open=true;S.tab=tab||'pdf';S.result=null;S.error=null;S.busy=false;S.cropBusy=false;
    S.dividerSelected='';S.dividerEditing=false;S.textSelected='';
    S.zoom=1;S.zoomMode='actual';S.activeOffer=0;S.notesOpen=false;S.scopePrompt=null;S.pdfOffers.clear();
    S.introText=A.p.intro||'';S.outroText=A.p.outro||'';S.introDirty=false;S.outroDirty=false;S.introPreset='';S.outroPreset='';S.showTotalOverride=null;
    if(S.pv)closePreview(true);
    if(!S.docLang)S.docLang=A.lang;
    S.signature=buildSignature();
    if(S.built&&S.built.signature!==S.signature)resetBuilt();
    if(S.lastSignature!==S.signature){S.selectedPages.clear();S.crops=[];S.lastSignature=S.signature}
    S.text=buildShareText();
    document.querySelectorAll('details.pop[open]').forEach(d=>d.open=false);
    const root=$('#shareRoot');
    root.innerHTML=shellHtml();
    root.classList.add('on');
    document.body.classList.add('share-open');
    syncDividerEditingState();
    renderAll();
    if(S.tab!=='text')ensureBuilt();
    scheduleMobileFit();
    setTimeout(()=>{const sheet=root.querySelector('.share-sheet');if(sheet)sheet.focus({preventScroll:true})},60);
  }
  function openOffers(offers,tab){
    if(!offers||!offers.length)return;
    if(S.open)close(true);
    S.offers=offers.map(o=>JSON.parse(JSON.stringify(o)));
    S.rowFilter=null;
    S.open=true;S.tab=tab||'pdf';S.result=null;S.error=null;S.busy=false;S.cropBusy=false;
    S.dividerSelected='';S.dividerEditing=false;S.textSelected='';
    S.zoom=1;S.zoomMode='actual';S.activeOffer=0;S.notesOpen=false;S.scopePrompt=null;S.pdfOffers.clear();
    const first=offers[0]||{};
    S.introText=first.intro||'';S.outroText=first.outro||'';S.introDirty=false;S.outroDirty=false;S.introPreset='';S.outroPreset='';S.showTotalOverride=null;
    if(S.pv)closePreview(true);
    if(!S.docLang)S.docLang=A.lang;
    S.signature=buildSignature();
    if(S.built&&S.built.signature!==S.signature)resetBuilt();
    if(S.lastSignature!==S.signature){S.selectedPages.clear();S.crops=[];S.lastSignature=S.signature}
    S.text=buildShareText();
    document.querySelectorAll('details.pop[open]').forEach(d=>d.open=false);
    const root=$('#shareRoot');
    root.innerHTML=shellHtml();
    root.classList.add('on');
    document.body.classList.add('share-open');
    syncDividerEditingState();
    renderAll();
    if(S.tab!=='text')ensureBuilt();
    scheduleMobileFit();
    setTimeout(()=>{const sheet=root.querySelector('.share-sheet');if(sheet)sheet.focus({preventScroll:true})},60);
  }
  function close(silent){
    if(!S.open)return;
    writeDocStyle(DOC_STYLE);
    if(S.pv)closePreview(true);
    flushEditablePages();
    hidePdfFontBar();
    hidePdfFontTrigger();
    hideDocStylePanel();
    S.fontHost=null;S.fontRange=null;S.fontDefaults=null;S.fontBarHover=false;S.fontApplying=false;
    S.open=false;
    S.offers=null;
    S.scopePrompt=null;
    S.dividerSelected='';S.dividerEditing=false;syncDividerEditingState();
    S.textSelected='';document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
    document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));
    const root=$('#shareRoot');
    if(root){root.classList.remove('on');root.innerHTML=''}
    document.body.classList.remove('share-open');
    if(!silent)try{history.replaceState(null,'')}catch{}
  }

  /* ---------- actual sharing ---------- */
  function setResult(r){
    S.result=r;
    S.busy=false;
    renderAll();
    const body=$('#shareBody');if(body)body.scrollTop=0;
  }
  function nativeFallback(files,text){
    if(files&&files.length)files.forEach((f,i)=>setTimeout(()=>downloadFile(f),i*420));
    let opened=false;
    try{opened=!!window.open(waOpenUrl(text),'_blank','noopener')}catch{}
    setResult({method:'download',kind:'',count:files?files.length:0,folder:'',opened});
    if(!opened)A.note(tt('تم تنزيل الملفات. افتح واتساب وأرفقها.','Files downloaded. Open WhatsApp and attach them.'));
  }
  async function nativeWhatsApp(files,text,kind){
    const payload={action:'whatsapp',text:text||'',phone:normalizedPhone(),kind:kind||'',files:files&&files.length?await filesPayload(files):[]};
    const r=await postNative(payload);
    if(r&&r.canceled){S.busy=false;renderAll();return}
    S.lastFiles=files||[];S.lastText=text||'';S.lastKind=kind||'';
    setResult({method:r.method||'clipboard',whatsapp:r.whatsapp,folder:r.folder||'',kind:kind||'',count:files?files.length:0,message:''});
  }
  async function shareFiles(files,text,kind){
    S.lastFiles=files;S.lastText=text;S.lastKind=kind;
    if(!files.length){await shareText(text);return}
    if(isNative()){
      try{await nativeWhatsApp(files,text,kind)}
      catch(err){console.warn(err);nativeFallback(files,text)}
      return;
    }
    if(navigator.share&&navigator.canShare){
      let can=false;
      try{can=navigator.canShare({files})}catch{}
      if(can){
        try{
          await navigator.share({files,text:caption()});
          setResult({method:'webshare',kind,count:files.length,folder:'',whatsapp:''});
          return;
        }catch(err){if(err&&err.name==='AbortError')return}
      }
    }
    nativeFallback(files,text);
  }
  async function sharePdf(){
    flushEditablePages();
    if(S.busy)return;
    if(!S.built){
      S.busy=true;renderAll();
      await ensureBuilt();
      if(!S.built){S.busy=false;renderAll();return}
    }
    S.busy=true;renderAll();
    if(offersMode()){
      const file=await activeOfferPdfFile();
      if(!file){S.busy=false;renderAll();A.note(tt('تعذر تجهيز ملف PDF.','Could not prepare the PDF file.'));return}
      try{await shareFiles([file],activeOfferCaption(),'pdf')}
      finally{if(!S.result){S.busy=false;renderAll()}}
      return;
    }
    const blob=await vectorPdfBlob();
    if(!blob){S.busy=false;renderAll();return}
    const file=new File([blob],S.built.fileName,{type:'application/pdf'});
    try{await shareFiles([file],offersCaption(),'pdf')}
    finally{if(!S.result){S.busy=false;renderAll()}}
  }
  async function selectedImageFiles(){
    const files=[];
    let indexes=[...S.selectedPages].sort((a,b)=>a-b);
    if(!indexes.length&&!S.crops.length)indexes=S.built.pages.map((_,i)=>i);
    for(const i of indexes){
      const exp=await ensurePageRaster(i);if(!exp)continue;
      files.push(new File([exp.blob],shareBase()+'-'+dt('صفحة','page')+'-'+(i+1)+'.jpg',{type:'image/jpeg'}));
    }
    S.crops.forEach((c,i)=>{
      const blob=c.blob;
      if(blob)files.push(new File([blob],shareBase()+'-'+dt('جزء','part')+'-'+(i+1)+'.jpg',{type:'image/jpeg'}));
    });
    return files;
  }
  async function shareImages(){
    flushEditablePages();
    if(S.busy)return;
    if(!S.built){
      S.busy=true;renderAll();
      await ensureBuilt();
      if(!S.built){S.busy=false;renderAll();return}
    }
    const files=await selectedImageFiles();
    if(!files.length){A.note(tt('حدد صفحة أو جزءًا أولًا.','Select a page or part first.'));return}
    S.busy=true;renderAll();
    try{await shareFiles(files,offersCaption(),'images')}
    finally{if(!S.result){S.busy=false;renderAll()}}
  }
  async function saveFilesToDisk(files){
    if(!files||!files.length)return false;
    if(isNative()){
      try{
        const action=files.length>1?'save_many':'save';
        const r=await postNative({action,text:offersCaption(),kind:'files',files:await filesPayload(files)});
        if(r&&r.canceled)return false;
        if(r&&r.method==='shareui'){A.note(tt('اختر Files أو أي تطبيق مناسب من نافذة المشاركة لحفظ الملف.','Choose Files or another app in the share window to save the file.'));return true}
        if(files.length>1)A.note(tt('تم حفظ الملفات','Files saved')+(r&&r.folder?' · '+r.folder:''));
        else A.note(r&&r.path?tt('تم حفظ الملف','File saved')+' · '+r.path:tt('تم حفظ الملف','File saved'));
        return true;
      }catch(err){A.note(err.message);return false}
    }
    files.forEach((f,i)=>setTimeout(()=>downloadFile(f),i*350));
    A.note(files.length>1?tt('تم تنزيل الملفات','Files downloaded'):tt('تم تنزيل الملف','File downloaded'));
    return true;
  }
  async function saveImages(){
    flushEditablePages();
    if(S.busy)return;
    if(!S.built){
      S.busy=true;renderAll();
      await ensureBuilt();
      if(!S.built){S.busy=false;renderAll();return}
    }
    S.busy=true;renderAll();
    const files=await selectedImageFiles();
    if(!files.length){S.busy=false;renderAll();A.note(tt('حدد صفحة أو جزءًا أولًا.','Select a page or part first.'));return}
    try{await saveFilesToDisk(files)}
    finally{S.busy=false;renderAll()}
  }
  async function shareText(text){
    const msg=A.directedText(text||S.text||'',docLang());
    if(!msg)return;
    S.lastText=msg;S.lastFiles=[];S.lastKind='text';
    if(isNative()){
      try{
        await postNative({action:'whatsapp',text:msg,phone:normalizedPhone(),kind:'text',files:[]});
        S.result=null;S.busy=false;renderAll();
      }catch(err){
        console.warn(err);
        try{await copyTextValue(msg)}catch{}
        window.open(waOpenUrl(msg.length>7000?'':msg),'_blank','noopener');
        S.result=null;S.busy=false;renderAll();
        A.note(tt('تم نسخ النص وفتح واتساب. الصقه في المحادثة.','The text was copied and WhatsApp opened. Paste it in the chat.'));
      }
      return;
    }
    const long=msg.length>7000;
    // Open WhatsApp inside the click gesture so the popup is never blocked.
    const win=window.open(waOpenUrl(long?'':msg),'_blank','noopener');
    await copyTextValue(msg);
    if(!win)A.note(tt('منع المتصفح فتح واتساب. النص منسوخ، افتحه يدويًا.','The browser blocked WhatsApp. The text is copied; open it manually.'));
    S.result=null;S.busy=false;renderAll();
  }
  function clipboardVariants(text){
    const normalized=String(text||'').replace(/\r\n?/g,'\n');
    const plain=normalized.replace(/\n/g,'\r\n');
    const rtl=/[\u0590-\u08ff]/.test(normalized);
    const body=normalized.split('\n').map(line=>esc(line)).join('<br>');
    const html='<html><body><!--StartFragment--><div dir="'+(rtl?'rtl':'ltr')+'" style="white-space:pre-wrap;font-family:Arial,\'Segoe UI\',Tahoma,sans-serif;font-size:13px;text-align:start">'+body+'</div><!--EndFragment--></body></html>';
    return {plain,html};
  }
  async function copyTextValue(text){
    const {plain,html}=clipboardVariants(text);
    if(navigator.clipboard&&navigator.clipboard.write&&window.ClipboardItem){
      try{
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain':new Blob([plain],{type:'text/plain;charset=utf-8'}),
          'text/html':new Blob([html],{type:'text/html;charset=utf-8'})
        })]);
        return true;
      }catch{}
    }
    if(isNative()){
      try{await postNative({action:'copy_text',text:plain,html});return true}catch{}
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      try{await navigator.clipboard.writeText(plain);return true}catch{}
    }
    try{
      const ta=document.createElement('textarea');ta.value=plain;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return true;
    }catch{return false}
  }
  function selectedImagesText(){
    const s=activeSchedule();
    const ids=new Set();
    for(const i of S.selectedPages){
      const page=S.built&&S.built.pages[i];
      if(page&&page.rowIds)page.rowIds.forEach(id=>ids.add(id));
    }
    for(const crop of S.crops){
      if(crop.rows)crop.rows.forEach(id=>ids.add(id));
    }
    s.rows=s.rows.filter(r=>ids.has(r.id));
    return A.clientText(s,true,docLang(),S.textMode,S.includeIntro,S.includeOutro);
  }
  async function copyText(){
    const selected=!offersMode()&&S.tab==='images'&&(S.selectedPages.size+S.crops.length)>0;
    const ok=await copyTextValue(A.directedText(selected?selectedImagesText():S.text,docLang()));
    A.note(ok?tt('تم نسخ النص','Text copied'):tt('تعذر النسخ','Copy unavailable'));
  }
  async function copySummary(){
    const ok=await copyTextValue(A.directedText(summaryText(),docLang()));
    A.note(ok?tt('تم نسخ الملخص المالي','Financial summary copied'):tt('تعذر النسخ','Copy unavailable'));
  }
  async function copyPath(){
    const p=S.result&&S.result.folder;
    if(!p)return;
    const ok=await copyTextValue(p);
    A.note(ok?tt('تم نسخ المسار','Path copied'):tt('تعذر النسخ','Copy unavailable'));
  }
  async function openFolder(){
    const folder=S.result&&S.result.folder;
    if(!folder)return;
    if(isNative()){
      try{await postNative({action:'open_folder',folder});return}catch(err){A.note(err.message);return}
    }
    await copyTextValue(folder);A.note(tt('تم نسخ مسار المجلد','Folder path copied'));
  }
  async function savePdf(){
    flushEditablePages();
    if(!S.built)return;
    if(offersMode()){
      S.busy=true;renderAll();
      const files=await selectedPdfFiles();
      if(!files.length){S.busy=false;renderAll();A.note(tt('حدد ملف PDF واحدًا على الأقل.','Select at least one PDF file.'));return}
      try{await saveFilesToDisk(files)}
      finally{S.busy=false;renderAll()}
      return;
    }
    const blob=await vectorPdfBlob();if(!blob)return;
    const file=new File([blob],S.built.fileName,{type:'application/pdf'});
    if(isNative()){
      try{
        const r=await postNative({action:'save',text:offersCaption(),kind:'pdf',files:await filesPayload([file])});
        if(r&&r.canceled)return;
        A.note(r&&r.path?tt('تم حفظ PDF','PDF saved')+' · '+r.path:tt('تم حفظ PDF','PDF saved'));
      }catch(err){A.note(err.message)}
      return;
    }
    downloadFile(file);A.note(tt('تم تنزيل PDF','PDF downloaded'));
  }
  async function openPdf(){
    flushEditablePages();
    if(!S.built)return;
    const blob=await vectorPdfBlob();if(!blob)return;
    const file=new File([blob],S.built.fileName,{type:'application/pdf'});
    if(isNative()){
      try{await postNative({action:'open',kind:'pdf',files:await filesPayload([file])})}catch(err){A.note(err.message)}
      return;
    }
    let url=null;
    try{
      url=URL.createObjectURL(blob);
      const w=window.open(url,'_blank','noopener');
      if(!w)downloadFile(file);
    }catch{downloadFile(file)}
    if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function openPreviewExternal(){
    const pv=S.pv;if(!pv)return;
    try{
      if(pv.kind==='page'){await openPdf();return}
      const crop=pv.cropImage||S.crops[pv.index];if(!crop)return;
      let blob=crop.blob;
      if(!blob&&crop.data)blob=await (await fetch(crop.data)).blob();
      if(!blob)return;
      const mime=blob.type||'image/jpeg';
      const ext=mime.indexOf('png')>=0?'.png':'.jpg';
      const file=new File([blob],'Mizan-image-'+(pv.index+1)+ext,{type:mime});
      if(isNative()){
        await postNative({action:'open',kind:'image',files:await filesPayload([file])});
        return;
      }
      const url=URL.createObjectURL(blob);
      const win=window.open(url,'_blank','noopener');
      if(!win){downloadFile(file);A.note(tt('تم تنزيل الصورة','Image downloaded'))}
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(err){
      A.note(err&&err.message?err.message:tt('تعذر فتح الملف','Could not open the file'));
    }
  }
  async function shareViaWindows(){
    if(!isNative()||S.busy)return;
    if(!S.built)return;
    S.busy=true;renderAll();
    let files=[];
    if(S.tab==='pdf'){
      if(offersMode())files=await selectedPdfFiles();
      else{
        const blob=await vectorPdfBlob();
        if(blob)files=[new File([blob],S.built.fileName,{type:'application/pdf'})];
      }
    }else{
      let indexes=[...S.selectedPages].sort((a,b)=>a-b);
      if(!indexes.length&&!S.crops.length)indexes=S.built.pages.map((_,i)=>i);
      for(const i of indexes){
        const exp=await ensurePageRaster(i);
        if(exp)files.push(new File([exp.blob],shareBase()+'-'+(i+1)+'.jpg',{type:'image/jpeg'}));
      }
      S.crops.forEach((c,i)=>{if(c.blob)files.push(new File([c.blob],shareBase()+'-part-'+(i+1)+'.jpg',{type:'image/jpeg'}))});
    }
    if(!files.length){S.busy=false;renderAll();A.note(S.tab==='pdf'?tt('حدد ملف PDF واحدًا على الأقل.','Select at least one PDF file.'):tt('حدد صفحة أو جزءًا أولًا.','Select a page or part first.'));return}
    const text=S.tab==='text'?S.text:offersCaption();
    try{
      const r=await postNative({action:'shareui',text,kind:S.tab==='pdf'?'pdf':'images',files:await filesPayload(files)});
      if(r&&r.canceled){S.busy=false;renderAll();return}
      S.lastFiles=files;S.lastText=text;S.lastKind=S.tab==='pdf'?'pdf':'images';
      setResult({method:'shareui',kind:S.tab==='pdf'?'pdf':'images',count:files.length,folder:r&&r.folder?r.folder:'',whatsapp:''});
    }catch(err){S.busy=false;renderAll();A.note(err.message)}
  }
  function downloadFile(file){
    try{
      const url=URL.createObjectURL(file);
      const a=document.createElement('a');a.href=url;a.download=file.name;a.rel='noopener';document.body.appendChild(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1600);
    }catch{}
  }
  function fmtSize(n){
    if(!n)return'—';
    return n>1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(0)+' KB';
  }

  /* ---------- page selection / crops ---------- */
  function selectAllPages(){
    if(!S.built)return;
    if(S.selectedPages.size===S.built.pages.length)S.selectedPages.clear();
    else S.built.pages.forEach((_,i)=>S.selectedPages.add(i));
    renderBodyKeepScroll();renderFoot();
  }
  function clearSelection(){
    S.selectedPages.clear();S.crops=[];
    renderAll();
  }
  function removeCrop(i){
    S.crops.splice(i,1);renderBodyKeepScroll();renderFoot();
  }
  function ensurePageImage(src){
    return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
  }
  /* ---------- immersive document preview ---------- */
  function previewPos(e,el){
    const r=el.getBoundingClientRect();
    return {x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))};
  }
  function previewToolButton(tool,icn){
    return '<button type="button" class="pv-tool" data-pv-tool="'+tool+'" title="'+esc(tt({select:'تحديد وتعديل',crop:'قص جزء',hl:'تظليل',pen:'رسم',eraser:'مسح تسلسلي'}[tool],{select:'Select / edit',crop:'Crop',hl:'Highlight',pen:'Draw',eraser:'Eraser'}[tool]))+'" aria-label="'+esc(tt({select:'تحديد وتعديل',crop:'قص جزء',hl:'تظليل',pen:'رسم',eraser:'مسح تسلسلي'}[tool],{select:'Select / edit',crop:'Crop',hl:'Highlight',pen:'Draw',eraser:'Eraser'}[tool]))+'">'+icon(icn,20)+'</button>';
  }
  function annotationTool(tool,icn){
    return '<div class="pv-tool-pair">'+previewToolButton(tool,icn)+'<button type="button" class="pv-options" data-options="'+tool+'" aria-label="'+tt('خيارات الأداة','Tool options')+'">▾</button></div>';
  }
  function previewFrames(){
    return new Promise(resolve=>{
      let done=false;const fin=()=>{if(!done){done=true;resolve()}};
      requestAnimationFrame(()=>requestAnimationFrame(fin));setTimeout(fin,140);
    });
  }
  async function previewCapture(node,scale,size){
    const clone=node.cloneNode(true);
    clone.querySelectorAll('.pv-draft').forEach(x=>x.remove());
    clone.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));
    clone.removeAttribute('contenteditable');
    const root=document.createElement('div');
    root.style.cssText='position:fixed;left:-12000px;top:0;z-index:-1;background:#fff;pointer-events:none';
    root.appendChild(clone);document.body.appendChild(root);
    try{
      await previewFrames();
      const libs=await ensureLibs();
      try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch{}
      return await libs.html2canvas(clone,Object.assign({scale,backgroundColor:'#ffffff',logging:false,useCORS:true},size||{}));
    }finally{root.remove()}
  }
  async function copyImageToClipboard(blob){
    if(!blob)return false;
    if(isNative()){
      try{
        await postNative({action:'copy_image',files:await filesPayload([new File([blob],'Mizan-preview.png',{type:'image/png'})])});
        return true;
      }catch(err){console.warn('copy_image',err)}
    }
    try{
      if(navigator.clipboard&&window.ClipboardItem){
        await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
        return true;
      }
    }catch(err){console.warn('copy_image clipboard',err)}
    return false;
  }
  async function copyPreviewCurrent(pv){
    let rec=pv&&pv.pageRec;if(!rec)return false;
    if(pv.kind==='page'&&pv.scroll&&pv.records.length>1){
      const view=pv.scroll.getBoundingClientRect();
      const center=view.top+view.height/2;
      let best=rec,bestDist=Infinity;
      pv.records.forEach(r=>{
        const b=r.paper.getBoundingClientRect();
        const d=Math.abs((b.top+b.height/2)-center);
        if(d<bestDist){bestDist=d;best=r}
      });
      pv.pageRec=best;rec=best;
    }
    try{
      const canvas=await previewCapture(rec.paper,2);
      const blob=await canvasBlob(canvas,'image/png',1);
      canvas.width=0;canvas.height=0;
      return await copyImageToClipboard(blob);
    }catch(err){console.warn('copy preview image',err);return false}
  }
  async function previewAllFiles(pv){
    if(pv.kind==='page'){
      savePreview(pv);
      if(offersMode())return await selectedPdfFiles();
      const blob=await vectorPdfBlob();
      return blob?[new File([blob],S.built.fileName,{type:'application/pdf'})]:[];
    }
    const files=[];
    let currentBlob=null;
    try{
      const canvas=await previewCapture(pv.pageRec.paper,2);
      currentBlob=await canvasBlob(canvas,'image/jpeg',.95);
      canvas.width=0;canvas.height=0;
    }catch(err){console.warn('copy current crop',err)}
    if(S.built){
      for(let i=0;i<S.built.pages.length;i++){
        const page=await ensurePageRaster(i);
        if(page&&page.blob)files.push(new File([page.blob],shareBase()+'-'+tt('صفحة','page')+'-'+(i+1)+'.jpg',{type:'image/jpeg'}));
      }
    }
    S.crops.forEach((c,i)=>{
      const blob=(i===pv.index&&currentBlob)?currentBlob:c.blob;
      if(blob)files.push(new File([blob],shareBase()+'-'+tt('جزء','part')+'-'+(i+1)+'.jpg',{type:'image/jpeg'}));
    });
    return files;
  }
  async function copyPreviewAll(pv){
    const files=await previewAllFiles(pv);
    if(!files.length)return false;
    if(isNative()){
      try{
        await postNative({action:'copy_files',kind:pv.kind==='page'?'pdf':'images',files:await filesPayload(files)});
        return 'copied';
      }catch(err){console.warn('copy_files',err)}
    }
    files.forEach((f,i)=>setTimeout(()=>downloadFile(f),i*350));
    return 'download';
  }
  function openPreview(kind,index){
    if(S.pv)closePreview(true);
    const pageData=kind==='page'&&S.built&&S.built.pages[index];
    const crop=kind==='crop'?S.crops[index]:null;
    if(kind==='page'&&!pageData)return;
    if(kind==='crop'&&!crop)return;
    const paperW=kind==='page'?794:(crop.w||600);
    const paperH=kind==='page'?1123:(crop.h||400);
    const externalLabel=kind==='page'?tt('فتح PDF خارجيًا','Open PDF externally'):tt('فتح الصورة خارجيًا','Open image externally');
    const layer=document.createElement('div');
    layer.className='pv-layer';layer.id='pvLayer';
    layer.innerHTML='<div class="pv-dialog" id="pvDialog">'+
      '<button type="button" class="pv-x" data-pv-act="cancel" title="'+tt('إغلاق دون تأكيد','Close without applying')+'" aria-label="'+tt('إغلاق دون تأكيد','Close without applying')+'">'+icon('close',16)+'</button>'+
      '<div class="pv-scroll" id="pvScroll"><div class="pv-stage" id="pvStage"></div></div>'+
      '<footer class="pv-footer">'+
      '<button type="button" class="pv-done" data-pv-act="done" title="'+tt('تأكيد','Confirm')+'" aria-label="'+tt('تأكيد','Confirm')+'">'+icon('check',16)+'</button>'+
      '<button type="button" data-pv-act="external" title="'+externalLabel+'" aria-label="'+externalLabel+'">'+icon('open',17)+'</button>'+
      '<div class="pv-copy" id="pvCopy">'+
        '<button type="button" class="pv-copy-btn" data-pv-act="copy-menu" aria-haspopup="menu" aria-expanded="false" title="'+tt('نسخ','Copy')+'" aria-label="'+tt('نسخ','Copy')+'">'+icon('copy',19)+'</button>'+
        '<div class="pv-copy-menu" role="menu">'+
          '<button type="button" role="menuitem" data-pv-act="copy-current">'+(kind==='page'?tt('نسخ الصفحة الحالية','Copy current page'):tt('نسخ الصورة الحالية','Copy current image'))+'</button>'+
          '<button type="button" role="menuitem" data-pv-act="copy-all">'+(kind==='page'?tt('نسخ الملف كامل','Copy whole file'):tt('نسخ كل الصور','Copy all images'))+'</button>'+
        '</div>'+
      '</div>'+
      '<button type="button" class="pv-scale" data-pv-act="zoom"><span id="pvZoomLabel"></span></button>'+
      '<div class="pv-tools" id="pvTools"><div class="pv-tool-list">'+previewToolButton('select','cursor')+previewToolButton('crop','crop')+annotationTool('hl','highlight')+annotationTool('pen','pen')+previewToolButton('eraser','eraser')+'</div><button type="button" class="pv-tools-toggle" data-pv-act="tools" aria-label="'+tt('الأدوات','Tools')+'">'+icon('tools',21)+'</button></div>'+
      '<div class="pv-note-toggles" role="group" aria-label="'+tt('إظهار المقدمة والخاتمة','Show intro and closing')+'"><label class="pv-note-toggle"><input type="checkbox" data-note-toggle="intro" '+(S.includeIntro?'checked':'')+'><span>'+tt('مقدمة','Intro')+'</span></label><label class="pv-note-toggle"><input type="checkbox" data-note-toggle="outro" '+(S.includeOutro?'checked':'')+'><span>'+tt('خاتمة','Outro')+'</span></label></div>'+
      '</footer><div class="pv-toast" id="pvToast" role="status" aria-live="polite"></div>'+
    '</div>';
    document.body.appendChild(layer);
    document.body.classList.add('pv-open');
    const dialog=layer.querySelector('#pvDialog'),scroll=layer.querySelector('#pvScroll'),stage=layer.querySelector('#pvStage');
    const records=[];
    const addRecord=(i,paper,pageEl,ann)=>{
      let layerEl=ann||pageEl.querySelector('.pdf-ann-layer');
      if(!layerEl){layerEl=document.createElement('div');layerEl.className='pdf-ann-layer';layerEl.setAttribute('contenteditable','false');pageEl.appendChild(layerEl)}
      layerEl.querySelectorAll('.pv-draft').forEach(x=>x.remove());
      const draft=document.createElement('div');draft.className='pv-draft';draft.style.display='none';layerEl.appendChild(draft);
      const rec={index:i,paper,pageEl,ann:layerEl,draft,dirty:false};
      records.push(rec);return rec;
    };
    if(kind==='page'){
      S.built.pages.forEach((p,i)=>{
        const paper=document.createElement('div');
        paper.className='pv-paper';paper.style.width='794px';paper.style.height='1123px';
        paper.innerHTML=p.html;
        stage.appendChild(paper);
        const pageEl=paper.querySelector('.pdf-page');
        if(!pageEl){paper.remove();return}
        pageEl.setAttribute('contenteditable','true');pageEl.spellcheck=false;
        const wm=pageEl.querySelector('.pdf-watermark');if(wm)wm.setAttribute('contenteditable','false');
        addRecord(i,paper,pageEl);
      });
    }else{
      const paper=document.createElement('div');
      paper.className='pv-paper pv-crop-paper';
      paper.style.width=paperW+'px';paper.style.height=paperH+'px';
      paper.innerHTML='<div class="pv-image-paper" style="position:relative;width:100%;line-height:0"><img src="'+crop.data+'" alt="" draggable="false"><div class="pdf-ann-layer" contenteditable="false"></div></div>';
      stage.appendChild(paper);
      addRecord(index,paper,paper,paper.querySelector('.pdf-ann-layer'));
    }
    if(!records.length){layer.remove();document.body.classList.remove('pv-open');return}
    const pv={kind,index,layer,dialog,scroll,stage,records,pageRec:records.find(r=>r.index===index)||records[0],zoom:1,fitZoom:1,tool:'select',drawing:null,backupCrops:S.crops.length,cropImage:crop};
    S.pv=pv;
    if(kind==='crop'){const cropTool=layer.querySelector('[data-pv-tool="crop"]');if(cropTool)cropTool.remove()}
    pv.copySelection=event=>{
      const selection=window.getSelection();
      if(!event.clipboardData||!selection.rangeCount||selection.isCollapsed)return;
      const range=selection.getRangeAt(0);
      if(!stage.contains(range.commonAncestorContainer))return;
      const chunks=[];
      let tableRows=[],lastRow=null;
      function flushTable(){
        if(tableRows.length)chunks.push(A.paymentColumns(tableRows,docLang()));
        tableRows=[];lastRow=null;
      }
      const pages=stage.querySelectorAll('.pdf-page');
      const leaves='h1,h2,.pdf-meta-item span,.pdf-meta-item b,.pdf-sitem .lbl,.pdf-sitem .val,.pdf-total>span,.pdf-sectionhead>span,th,td,.pdf-folio span';
      for(const page of pages){
        if(!range.intersectsNode(page))continue;
        let previous=null;
        for(const field of page.querySelectorAll(leaves)){
          if(!range.intersectsNode(field))continue;
          const fragment=document.createRange();fragment.selectNodeContents(field);
          if(range.compareBoundaryPoints(Range.START_TO_START,fragment)>0)fragment.setStart(range.startContainer,range.startOffset);
          if(range.compareBoundaryPoints(Range.END_TO_END,fragment)<0)fragment.setEnd(range.endContainer,range.endOffset);
          const value=fragment.toString().trim();if(!value)continue;
          const row=field.closest('tr'),group=row||field.parentElement;
          const multi=!field.contains(range.commonAncestorContainer);
          if(row&&multi&&field.tagName==='TD'&&S.textMode==='horizontal'){
            if(row!==lastRow){tableRows.push(['','','','']);lastRow=row}
            tableRows[tableRows.length-1][field.cellIndex]=value;
            continue;
          }
          flushTable();
          if(group!==previous && row && chunks.length)chunks.push('');
          const numeric=field.matches('td.num')&&multi;
          const label=numeric?row.closest('table').tHead.rows[0].cells[field.cellIndex].textContent+': ':'';
          if(group===previous&&!numeric)chunks[chunks.length-1]+=(row?' · ':': ')+value;
          else chunks.push(label+value);
          previous=group;
        }
      }
      flushTable();
      const lines=chunks.length?chunks:selection.toString().split('\n');
      const notes=noteSource();
      const intro=S.includeIntro?String(A.fillOfferText(notes.intro||'',notes)).trim():'';
      const outro=S.includeOutro?String(A.fillOfferText(notes.outro||'',notes)).trim():'';
      const copied=[intro,lines.join('\n'),outro].filter(Boolean).join('\n\n');
      event.clipboardData.setData('text/plain',A.directedText(copied,docLang()));
      event.preventDefault();
    };
    document.addEventListener('copy',pv.copySelection);
    let fitted=true;
    function updateZoomControl(){
      const btn=layer.querySelector('[data-pv-act="zoom"]');
      const label=layer.querySelector('#pvZoomLabel');
      if(!btn||!label)return;
      btn.classList.toggle('zoomed',!fitted);
      const title=fitted?tt('عرض بالحجم الكامل','Actual size'):tt('ملاءمة الصفحة','Fit page');
      btn.title=title;btn.setAttribute('aria-label',title);
      label.textContent=Math.round(pv.zoom*100)+'%';
    }
    function setZoom(z,isFit,point){
      const viewport=scroll.getBoundingClientRect();
      const x=point?.clientX??(viewport.left+scroll.clientWidth/2);
      const y=point?.clientY??(viewport.top+scroll.clientHeight/2);
      const before=stage.getBoundingClientRect();
      const localX=(x-before.left)/pv.zoom,localY=(y-before.top)/pv.zoom;
      pv.zoom=Math.max(Math.min(pv.fitZoom,.1),Math.min(4,z));
      stage.style.zoom=pv.zoom;
      const after=stage.getBoundingClientRect();
      scroll.scrollLeft+=after.left+localX*pv.zoom-x;
      scroll.scrollTop+=after.top+localY*pv.zoom-y;
      fitted=isFit;
      updateZoomControl();
    }
    function fit(target){
      const box=scroll.getBoundingClientRect();
      const style=getComputedStyle(scroll);
      const padX=parseFloat(style.paddingLeft||0)+parseFloat(style.paddingRight||0);
      const padY=parseFloat(style.paddingTop||0)+parseFloat(style.paddingBottom||0);
      const rec=target||records.reduce((best,r)=>Math.abs(r.paper.getBoundingClientRect().top-box.top)<Math.abs(best.paper.getBoundingClientRect().top-box.top)?r:best);
      pv.fitZoom=Math.min((scroll.clientWidth-padX)/paperW,(scroll.clientHeight-padY)/paperH);
      setZoom(pv.fitZoom,true);
      scroll.scrollTop+=rec.paper.getBoundingClientRect().top-box.top-parseFloat(style.paddingTop||0);
      scroll.scrollLeft=0;
    }
    fit(pv.pageRec);
    pv.resize=new ResizeObserver(()=>{if(fitted)fit()});
    pv.resize.observe(scroll);
    const options={hl:'#f5cc48',pen:'#245248',width:3.2,mode:kind==='page'?'text':'area'};
    const menu=document.createElement('div');
    menu.className='pv-annotation-menu';menu.hidden=true;dialog.appendChild(menu);
    function openOptions(tool){
      const modes=kind==='page'&&tool==='hl'?'<label>'+tt('طريقة التظليل','Highlight mode')+'<select data-setting="mode"><option value="text">'+tt('تحديد النص','Select text')+'</option><option value="area">'+tt('مستطيل','Rectangle')+'</option></select></label>':'';
      const widths=tool==='pen'?'<label>'+tt('سُمك القلم','Pen width')+'<select data-setting="width">'+[1.5,3.2,5,8].map(n=>'<option value="'+n+'">'+n+' px</option>').join('')+'</select></label>':'';
      setTool(tool);
      menu.innerHTML='<label>'+tt('اللون','Color')+'<input type="color" data-setting="'+tool+'" value="'+options[tool]+'"></label>'+modes+widths;
      menu.querySelectorAll('select').forEach(el=>el.value=options[el.dataset.setting]);
      menu.hidden=false;
    }
    menu.addEventListener('input',e=>{
      const key=e.target.dataset.setting;if(!key)return;
      options[key]=key==='width'?Number(e.target.value):e.target.value;
      if(key==='mode')setTool('hl');
    });
    layer.addEventListener('contextmenu',e=>{
      const b=e.target.closest('[data-options],[data-pv-tool="hl"],[data-pv-tool="pen"]');
      if(!b)return;e.preventDefault();openOptions(b.dataset.options||b.dataset.pvTool);
    });
    layer.addEventListener('pointerdown',e=>{
      if(!menu.contains(e.target)&&!e.target.closest('[data-options]'))menu.hidden=true;
    });
    const setTool=(tool)=>{
      pv.tool=tool;
      const textMode=tool==='hl'&&options.mode==='text';
      layer.classList.toggle('draw-mode',tool!=='select'&&!textMode);
      layer.classList.toggle('text-highlight',textMode);
      if(kind==='page')records.forEach(r=>r.pageEl.setAttribute('contenteditable',tool==='select'?'true':'false'));
      layer.querySelectorAll('[data-pv-tool]').forEach(b=>b.classList.toggle('on',b.dataset.pvTool===tool));
      if(tool!=='select'&&document.activeElement&&records.some(r=>r.pageEl.contains(document.activeElement)))document.activeElement.blur();
      layer.querySelector('#pvTools').classList.remove('open');
    };
    setTool('select');
    const recFromEvent=e=>{
      const ann=e.target.closest('.pdf-ann-layer');
      return ann?records.find(r=>r.ann===ann)||null:null;
    };
    const showDraft=(rec,x,y,w,h)=>{rec.draft.style.display='block';rec.draft.style.left=(x*100)+'%';rec.draft.style.top=(y*100)+'%';rec.draft.style.width=(w*100)+'%';rec.draft.style.height=(h*100)+'%'};
    const hideDraft=rec=>{rec.draft.style.display='none'};
    const addHighlight=(rec,x,y,w,h)=>{
      const el=document.createElement('div');el.className='pv-hl';el.style.backgroundColor=options.hl+'66';el.dataset.pvAnnot='hl';el.dataset.box=JSON.stringify({x,y,w,h});
      el.style.left=(x*100)+'%';el.style.top=(y*100)+'%';el.style.width=(w*100)+'%';el.style.height=(h*100)+'%';
      rec.ann.appendChild(el);rec.dirty=true;
    };
    const nearestAnnot=(ann,p)=>{
      const items=[...ann.querySelectorAll('[data-pv-annot]')];
      for(let n=items.length-1;n>=0;n--){
        const el=items[n];
        if(el.dataset.pvAnnot==='hl'){
          let b;try{b=JSON.parse(el.dataset.box)}catch{continue}
          if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h)return el;
        }else if(el.dataset.pvAnnot==='pen'){
          let pts;try{pts=JSON.parse(el.dataset.pts)}catch{continue}
          for(let k=0;k<pts.length;k++){
            const dx=pts[k].x-p.x,dy=pts[k].y-p.y;
            if(dx*dx+dy*dy<.0005)return el;
            if(k){const ax=pts[k-1].x,ay=pts[k-1].y,bx=pts[k].x,by=pts[k].y;const vx=bx-ax,vy=by-ay;const wx=p.x-ax,wy=p.y-ay;const len=vx*vx+vy*vy;const t=len?Math.max(0,Math.min(1,(wx*vx+wy*vy)/len)):0;const qx=ax+t*vx,qy=ay+t*vy;const ex=p.x-qx,ey=p.y-qy;if(ex*ex+ey*ey<.00025)return el;}
          }
        }
      }
      return null;
    };
    const makeCrop=async(rec,p)=>{
      if(!rec||kind!=='page')return;
      if(p.w<.02||p.h<.02)return;
      hideDraft(rec);
      let canvas=null;
      try{
        canvas=await previewCapture(rec.pageEl,3,{width:794,height:1123,windowWidth:900,windowHeight:1300,scrollX:0,scrollY:0});
        const sx=Math.round(p.x*canvas.width),sy=Math.round(p.y*canvas.height);
        const sw=Math.max(1,Math.round(p.w*canvas.width)),sh=Math.max(1,Math.round(p.h*canvas.height));
        const c=document.createElement('canvas');c.width=sw;c.height=sh;
        const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,sw,sh);ctx.drawImage(canvas,sx,sy,sw,sh,0,0,sw,sh);
        const data=c.toDataURL('image/jpeg',.95);
        const blob=await canvasBlob(c,'image/jpeg',.95);
        const pageBox=rec.pageEl.getBoundingClientRect();
        const rows=[...rec.pageEl.querySelectorAll('tbody tr')].filter(tr=>{
          const box=tr.getBoundingClientRect();
          const top=(box.top-pageBox.top)/pageBox.height;
          const bottom=(box.bottom-pageBox.top)/pageBox.height;
          return bottom>p.y&&top<p.y+p.h;
        }).map(tr=>tr.dataset.rowId).filter(Boolean);
        S.crops.push({data,blob,page:rec.index+1,w:sw,h:sh,rows});
        A.note(tt('تمت إضافة الجزء','Part added'));
      }catch(err){A.note(tt('تعذر قص الجزء','Could not crop the part'))}
      finally{canvas&&(canvas.width=0,canvas.height=0)}
    };
    function clearTextMark(mark){
      const parent=mark.parentNode;mark.replaceWith(...mark.childNodes);parent.normalize();
    }
    function clearAnnotations(rec){
      rec.pageEl.querySelectorAll('mark[data-text-hl]').forEach(clearTextMark);
      rec.ann.querySelectorAll('[data-pv-annot]').forEach(el=>el.remove());rec.dirty=true;
    }
    function highlightSelection(){
      const selection=window.getSelection();
      if(!selection.rangeCount||selection.isCollapsed)return;
      const range=selection.getRangeAt(0);
      if(!stage.contains(range.startContainer)||!stage.contains(range.endContainer))return;
      for(const rec of records){
        if(!range.intersectsNode(rec.pageEl))continue;
        const walk=document.createTreeWalker(rec.pageEl,NodeFilter.SHOW_TEXT);
        const segments=[];
        while(walk.nextNode()){
          const node=walk.currentNode;
          if(!node.textContent.trim()||node.parentElement.closest('.pdf-ann-layer')||!range.intersectsNode(node))continue;
          const from=node===range.startContainer?range.startOffset:0;
          const to=node===range.endContainer?range.endOffset:node.length;
          if(to>from)segments.push({node,from,to});
        }
        for(const {node,from,to} of segments.reverse()){
          const r=document.createRange();r.setStart(node,from);r.setEnd(node,to);
          const mark=document.createElement('mark');mark.dataset.textHl='1';
          mark.style.backgroundColor=options.hl+'70';mark.style.color='inherit';
          r.surroundContents(mark);rec.dirty=true;
        }
      }
      selection.removeAllRanges();
    }
    stage.addEventListener('pointerup',()=>{
      if(pv.tool==='hl'&&options.mode==='text')highlightSelection();
    });
    stage.addEventListener('pointerdown',e=>{
      if(e.button!==0||pv.tool==='select')return;
      const rec=recFromEvent(e);if(!rec)return;
      e.preventDefault();
      const p=previewPos(e,rec.ann);
      if(pv.tool==='eraser'){const hit=nearestAnnot(rec.ann,p);if(hit){hit.remove();rec.dirty=true;}else{const mark=document.elementsFromPoint(e.clientX,e.clientY).map(el=>el.closest('mark[data-text-hl]')).find(Boolean);if(mark){clearTextMark(mark);rec.dirty=true;}}return}
      pv.drawing={id:e.pointerId,rec,x0:p.x,y0:p.y,x1:p.x,y1:p.y,pts:[p]};
      try{rec.ann.setPointerCapture(e.pointerId)}catch{}
      if(pv.tool==='pen'){
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','pv-pen-svg pv-pen-draft');svg.setAttribute('viewBox','0 0 '+paperW+' '+paperH);svg.setAttribute('preserveAspectRatio','none');
        const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');pl.setAttribute('fill','none');pl.setAttribute('stroke',options.pen);pl.setAttribute('stroke-width',String(options.width));pl.setAttribute('stroke-linecap','round');pl.setAttribute('stroke-linejoin','round');svg.appendChild(pl);rec.ann.appendChild(svg);
        pv.drawing.svg=svg;pv.drawing.poly=pl;
      }else showDraft(rec,p.x,p.y,0,0);
    });
    stage.addEventListener('pointermove',e=>{
      const d=pv.drawing;
      if(!d||e.pointerId!==d.id)return;
      e.preventDefault();
      const rec=d.rec,p=previewPos(e,rec.ann);d.x1=p.x;d.y1=p.y;d.pts.push(p);
      if(pv.tool==='hl'||pv.tool==='crop'){
        const x=Math.min(d.x0,d.x1),y=Math.min(d.y0,d.y1),w=Math.abs(d.x1-d.x0),h=Math.abs(d.y1-d.y0);
        showDraft(rec,x,y,w,h);
      }else if(pv.tool==='pen'&&d.poly){
        d.poly.setAttribute('points',d.pts.map(q=>(q.x*paperW).toFixed(1)+','+(q.y*paperH).toFixed(1)).join(' '));
      }
    });
    const finish=e=>{
      const d=pv.drawing;if(!d||e.pointerId!==d.id)return;pv.drawing=null;
      const rec=d.rec,tool=pv.tool;
      if(tool==='pen'&&d.svg){
        if(d.pts.length>1){d.svg.classList.remove('pv-pen-draft');d.svg.dataset.pvAnnot='pen';d.svg.dataset.pts=JSON.stringify(d.pts);rec.dirty=true;}
        else d.svg.remove();
      }else if(tool==='hl'){
        const x=Math.min(d.x0,d.x1),y=Math.min(d.y0,d.y1),w=Math.abs(d.x1-d.x0),h=Math.abs(d.y1-d.y0);
        hideDraft(rec);if(w>.006&&h>.006)addHighlight(rec,x,y,w,h);
      }else if(tool==='crop'){
        const x=Math.min(d.x0,d.x1),y=Math.min(d.y0,d.y1),w=Math.abs(d.x1-d.x0),h=Math.abs(d.y1-d.y0);
        hideDraft(rec);if(w>.02&&h>.02)makeCrop(rec,{x,y,w,h});
      }
    };
    stage.addEventListener('pointerup',finish);
    stage.addEventListener('pointercancel',finish);
    stage.addEventListener('contextmenu',e=>{
      if(pv.tool!=='eraser')return;
      e.preventDefault();
      const rec=recFromEvent(e);if(rec)clearAnnotations(rec);
    });
    stage.addEventListener('input',e=>{
      const paper=e.target.closest('.pv-paper');if(!paper)return;
      const rec=records.find(r=>r.paper===paper);if(rec)rec.dirty=true;
    });
    layer.querySelectorAll('[data-pv-tool]').forEach(b=>{
      if(b.dataset.pvTool==='eraser')b.addEventListener('contextmenu',ev=>{
        ev.preventDefault();
        records.forEach(clearAnnotations);
      });
    });
    const copyWrap=layer.querySelector('.pv-copy');
    function setCopyOpen(open){
      if(!copyWrap)return;
      copyWrap.classList.toggle('open',open);
      const btn=copyWrap.querySelector('[data-pv-act="copy-menu"]');
      if(btn)btn.setAttribute('aria-expanded',open?'true':'false');
    }
    function pvToast(msg,sticky){
      const el=layer.querySelector('#pvToast');if(!el)return;
      el.textContent=msg;el.classList.add('on');
      clearTimeout(pvToast.timer);
      if(!sticky)pvToast.timer=setTimeout(()=>el.classList.remove('on'),2200);
    }
    layer.addEventListener('click',e=>{
      if(copyWrap&&!e.target.closest('.pv-copy'))setCopyOpen(false);
      const opts=e.target.closest('[data-options]');if(opts){openOptions(opts.dataset.options);return}
      const tool=e.target.closest('[data-pv-tool]');
      if(tool){setTool(tool.dataset.pvTool);return}
      const act=e.target.closest('[data-pv-act]');
      if(!act)return;
      const a=act.dataset.pvAct;
      if(a==='copy-menu'){setCopyOpen(!copyWrap.classList.contains('open'));return}
      if(a==='copy-current'||a==='copy-all'){
        setCopyOpen(false);
        if(pv.copyBusy)return;
        pv.copyBusy=true;
        if(a==='copy-current'){
          pvToast(pv.kind==='page'?tt('جارٍ نسخ الصفحة...','Copying page...'):tt('جارٍ نسخ الصورة...','Copying image...'),true);
          copyPreviewCurrent(pv).then(ok=>{pv.copyBusy=false;pvToast(ok?(pv.kind==='page'?tt('تم نسخ الصفحة','Page copied'):tt('تم نسخ الصورة','Image copied')):tt('تعذر النسخ','Copy unavailable'))});
        }else{
          pvToast(tt('جارٍ تجهيز الملفات...','Preparing files...'),true);
          copyPreviewAll(pv).then(res=>{
            pv.copyBusy=false;
            if(res==='copied')pvToast(pv.kind==='page'?tt('تم نسخ الملف كامل','Whole file copied'):tt('تم نسخ كل الصور','All images copied'));
            else if(res==='download')pvToast(tt('تم تنزيل الملفات','Files downloaded'));
            else pvToast(tt('لا يوجد ما يُنسخ','Nothing to copy'));
          }).catch(()=>{pv.copyBusy=false;pvToast(tt('تعذر النسخ','Copy unavailable'))});
        }
        return;
      }
      if(a==='tools'){layer.querySelector('#pvTools').classList.toggle('open');return}
      if(a==='zoom'){
        if(fitted)setZoom(1,false);else fit();
        return;
      }
      if(a==='external'){openPreviewExternal();return}
      if(a==='cancel'){closePreview(true);return}
      if(a==='done'){closePreview(false);return}
    });
    scroll.addEventListener('wheel',e=>{
      if(!e.ctrlKey)return;
      e.preventDefault();
      const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?scroll.clientHeight:1);
      setZoom(pv.zoom*Math.exp(-Math.max(-180,Math.min(180,delta))*.0025),false,e);
    },{passive:false});
    const keyHandler=e=>{
      if(!S.pv)return;
      if(e.ctrlKey&&(e.key==='+'||e.key==='='||e.key==='-')){e.preventDefault();setZoom(pv.zoom+(e.key==='-'?-.15:.15),false);}
      else if(e.ctrlKey&&e.key==='0'){e.preventDefault();fit();}
      else if(e.key==='Escape'){e.preventDefault();closePreview(true);}
    };
    document.addEventListener('keydown',keyHandler);
    layer._pvKeyHandler=keyHandler;
  }

  function savePreview(pv){
    if(!pv)return;
    if(pv.kind==='page'&&S.built){
      const dirty=pv.records.filter(r=>r.dirty);
      if(!dirty.length)return;
      for(const rec of dirty){
        const clone=rec.pageEl.cloneNode(true);
        clone.removeAttribute('contenteditable');
        clone.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));
        clone.querySelectorAll('.pv-draft').forEach(x=>x.remove());
        const page=S.built.pages[rec.index];
        if(page){page.html=clone.outerHTML;page.rasterDirty=true;page.renderPromise=null}
      }
      S.built.htmlVersion=(S.built.htmlVersion||0)+1;
      S.built.vectorPdf=null;
      Promise.all(dirty.map(r=>ensurePageRaster(r.index))).then(()=>{if(S.open){renderBodyKeepScroll();renderFoot()}}).catch(()=>{});
    }else if(pv.kind==='crop'&&pv.cropImage&&pv.records[0].dirty){
      const crop=S.crops[pv.index],paperRec=pv.records[0];
      if(crop&&paperRec){
        previewCapture(paperRec.paper,2).then(canvas=>{
          const data=canvas.toDataURL('image/jpeg',.94);
          canvas.toBlob(blob=>{
            if(blob){crop.data=data;crop.blob=blob;crop.w=canvas.width;crop.h=canvas.height;if(S.open){renderBodyKeepScroll();renderFoot()}}
          },'image/jpeg',.94);
          canvas.width=0;canvas.height=0;
        }).catch(()=>{});
      }
    }
  }
  function closePreview(discard){
    const layer=$('#pvLayer');if(!layer)return;
    const pv=S.pv;
    if(layer._pvKeyHandler)document.removeEventListener('keydown',layer._pvKeyHandler);
    if(pv){
      document.removeEventListener('copy',pv.copySelection);
      pv.resize.disconnect();
      if(discard){if(S.crops.length>pv.backupCrops)S.crops.length=pv.backupCrops}
      else savePreview(pv);
    }
    layer.remove();
    document.body.classList.remove('pv-open');
    S.pv=null;
    if(S.open){renderBodyKeepScroll();renderFoot()}
  }

  /* ---------- events ---------- */
  function closeWaMenus(){
    document.querySelectorAll('.share-wa.open').forEach(el=>{
      el.classList.remove('open');
      const btn=el.querySelector('[data-share-act="wa-menu"]');
      if(btn)btn.setAttribute('aria-expanded','false');
    });
  }
  function closeLayoutMenus(){
    document.querySelectorAll('.share-layout-wrap.open').forEach(el=>{
      el.classList.remove('open');
      const btn=el.querySelector('[data-share-act="layout-menu"]');
      if(btn)btn.setAttribute('aria-expanded','false');
    });
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#pvLayer'))return;
    if(!e.target.closest('.share-wa'))closeWaMenus();
    if(!e.target.closest('.share-layout-wrap'))closeLayoutMenus();
    const fileLayout=e.target.closest('[data-file-layout]');
    if(fileLayout&&S.open){closeLayoutMenus();setPdfLayout(fileLayout.dataset.fileLayout);return}
    const scopeBtn=e.target.closest('[data-scope]');
    if(scopeBtn&&S.open){chooseScope(scopeBtn.dataset.scope);return}
    const scopeCancel=e.target.closest('[data-scope-cancel]');
    if(scopeCancel&&S.open){S.scopePrompt=null;scopeMount();return}
    const railPage=e.target.closest('[data-rail-page]');
    if(railPage&&S.open){
      const i=+railPage.dataset.railPage;
      const target=document.querySelector('[data-doc-page="'+i+'"]');
      if(target)target.scrollIntoView({block:'start',behavior:'smooth'});
      document.querySelectorAll('.rail-page').forEach(el=>el.classList.toggle('on',+el.dataset.railPage===i));
      return;
    }
    const offerRail=e.target.closest('[data-offer-rail]');
    if(offerRail&&S.open&&!e.target.closest('[data-pdf-offer]')){
      S.activeOffer=+offerRail.dataset.offerRail;
      renderAll();
      return;
    }
    const pvBtn=e.target.closest('[data-pv-page]');
    if(pvBtn&&S.open){openPreview('page',+pvBtn.dataset.pvPage);return}
    const pvCrop=e.target.closest('[data-pv-crop]');
    if(pvCrop&&S.open){openPreview('crop',+pvCrop.dataset.pvCrop);return}
    const card=e.target.closest('[data-page-card]');
    if(card&&S.open&&!e.target.closest('.page-edit')&&!e.target.closest('.page-check')){
      const i=+card.dataset.pageCard,cb=card.querySelector('.page-check');
      if(S.selectedPages.has(i))S.selectedPages.delete(i);else S.selectedPages.add(i);
      if(cb)cb.checked=S.selectedPages.has(i);
      card.classList.toggle('on',S.selectedPages.has(i));
      const count=document.querySelector('.share-subhead .selected-count');
      if(count)count.textContent=(S.selectedPages.size+S.crops.length)+' '+tt('محدد','selected');
      renderFoot();
      return;
    }
    const rm=e.target.closest('[data-crop-remove]');
    if(rm&&S.open){removeCrop(+rm.dataset.cropRemove);return}
    const notePreset=e.target.closest('[data-note-presets]');
    if(notePreset&&S.open){
      S.notesOpen=true;notesMount();
      setTimeout(()=>{const sel=document.querySelector('[data-preset-select="'+notePreset.dataset.notePresets+'"]');if(sel){sel.focus();sel.scrollIntoView({block:'center'})}},60);
      return;
    }
    const act=e.target.closest('[data-share-act]');
    if(!act||!S.open)return;
    const a=act.dataset.shareAct;
    if(a==='font-tools'){showPdfFontBar();return}
    if(a==='save-current-preset'){saveCurrentAsPreset();return}
    if(a==='confirm-doc-preset'){confirmDocPreset();return}
    if(a==='open-doc-style'){showDocStylePanel();return}
    if(a==='export-template'){exportDocTemplate();return}
    if(a==='import-template'){importDocTemplate();return}
    if(a==='notes'){S.notesOpen=!S.notesOpen;notesMount();return}
    if(a==='notes-close'){S.notesOpen=false;notesMount();return}
    if(a==='zoom-toggle'){toggleZoom();return}
    if(a==='preset-save-intro'){savePreset('intro');return}
    if(a==='preset-save-outro'){savePreset('outro');return}
    if(a==='preset-delete-intro'){deletePreset('intro');return}
    if(a==='preset-delete-outro'){deletePreset('outro');return}
    if(a==='toggle-layout'){setTextMode(S.textMode==='horizontal'?'vertical':'horizontal');return}
    if(a==='layout-menu'){
      const wrap=act.closest('.share-layout-wrap');
      const willOpen=wrap&&!wrap.classList.contains('open');
      closeLayoutMenus();
      if(wrap&&willOpen){wrap.classList.add('open');act.setAttribute('aria-expanded','true')}
      return;
    }
    if(a==='toggle-language'){
      S.docLang=docLang()==='ar'?'en':'ar';S.result=null;S.lastFiles=null;S.lastText='';
      S.text=buildShareText();
      resetBuilt();S.signature=buildSignature();renderAll();if(S.tab!=='text')ensureBuilt();return;
    }
    if(a==='close'){close();return}
    if(a==='wa-menu'||a==='copy-menu'){
      const wrap=act.closest('.share-wa');
      const willOpen=wrap&&!wrap.classList.contains('open');
      closeWaMenus();
      if(wrap&&willOpen){wrap.classList.add('open');act.setAttribute('aria-expanded','true')}
      return;
    }
    if(a==='copy-full'){closeWaMenus();copyText();return}
    if(a==='copy-summary'){closeWaMenus();copySummary();return}
    if(a==='scope-full'){setTextScope('full');return}
    if(a==='scope-summary'){setTextScope('summary');return}
    if(a==='wa-pdf'){closeWaMenus();openScopePrompt('pdf');return}
    if(a==='wa-images'){closeWaMenus();openScopePrompt('images');return}
    if(a==='wa-text'){closeWaMenus();openScopePrompt('text');return}
    if(a==='select-all'){selectAllPages();return}
    if(a==='clear-selection'){clearSelection();return}
    if(a==='pdf-select-all'){
      if(S.offers)S.offers.forEach((_,i)=>S.pdfOffers.add(i));
      railMount();renderFoot();return;
    }
    if(a==='pdf-clear'){
      S.pdfOffers.clear();railMount();renderFoot();return;
    }
    if(a==='copy-text'){copyText();return}
    if(a==='share-text'){shareText();return}
    if(a==='share-pdf'){sharePdf();return}
    if(a==='save-pdf'){savePdf();return}
    if(a==='save-images'){saveImages();return}
    if(a==='open-pdf'){openPdf();return}
    if(a==='share-images'){shareImages();return}
    if(a==='shareui'){shareViaWindows();return}
    if(a==='open-file'){openPdf();return}
    if(a==='open-folder'){openFolder();return}
    if(a==='copy-path'){copyPath();return}
    if(a==='retry-build'){resetBuilt();S.signature=buildSignature();renderAll();ensureBuilt();return}
    if(a==='dismiss-result'){S.result=null;renderAll();return}
    if(a==='share-wa-result'){
      if(S.lastFiles&&S.lastFiles.length){shareFiles(S.lastFiles,S.lastText,S.lastKind)}
      else{shareText(S.lastText||S.text)}
      return;
    }
    if(a==='open-wa'){
      if(S.lastFiles&&S.lastFiles.length){shareFiles(S.lastFiles,S.lastText,S.lastKind)}
      else shareText(S.lastText||S.text);
      return;
    }
  });
  document.addEventListener('contextmenu',e=>{
    const wrap=e.target.closest('.share-layout-wrap');
    if(!wrap||!S.open)return;
    e.preventDefault();
    closeWaMenus();
    const willOpen=!wrap.classList.contains('open');
    closeLayoutMenus();
    if(willOpen){wrap.classList.add('open');const btn=wrap.querySelector('[data-share-act="layout-menu"]');if(btn)btn.setAttribute('aria-expanded','true')}
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='shareFormat'&&S.open){setTab(e.target.value);return}
    const presetSelect=e.target.closest('[data-preset-select]');
    if(presetSelect&&S.open){selectPreset(presetSelect.dataset.presetSelect,presetSelect.value);return}
    if(e.target.matches('[data-note-toggle]')&&S.open){
      const key=e.target.dataset.noteToggle;
      if(key==='intro')setNoteVisibility(e.target.checked,S.includeOutro);
      else setNoteVisibility(S.includeIntro,e.target.checked);
      return;
    }
    if(e.target.matches('[data-show-total-share]')&&S.open){
      S.showTotalOverride=e.target.checked;
      S.signature=buildSignature();
      resetBuilt();
      S.text=buildShareText();
      if(S.tab==='text'){renderBodyKeepScroll();}
      else {renderAll();ensureBuilt();}
      return;
    }
    const pdfOffer=e.target.closest('[data-pdf-offer]');
    if(pdfOffer&&S.open){
      const oi=+pdfOffer.dataset.pdfOffer;
      pdfOffer.checked?S.pdfOffers.add(oi):S.pdfOffers.delete(oi);
      const card=pdfOffer.closest('.pdf-offer-card')||pdfOffer.closest('.rail-offer');
      if(card)card.classList.toggle('on',pdfOffer.checked);
      renderFoot();
      return;
    }
    const cb=e.target.closest('[data-page]');
    if(cb&&S.open){
      const i=+cb.dataset.page;
      cb.checked?S.selectedPages.add(i):S.selectedPages.delete(i);
      const card=cb.closest('.page-card');
      if(card)card.classList.toggle('on',cb.checked);
      renderFoot();
    }
  });
  document.addEventListener('contextmenu',e=>{
    if(!S.open)return;
    const toggle=e.target.closest('.note-toggle');
    if(!toggle)return;
    e.preventDefault();
    const type=toggle.querySelector('[data-note-toggle]')?.dataset.noteToggle;
    if(!type)return;
    S.notesOpen=true;notesMount();
    setTimeout(()=>{const sel=document.querySelector('[data-preset-select="'+type+'"]');if(sel){sel.focus();sel.scrollIntoView({block:'center'})}},60);
  });
  document.addEventListener('input',e=>{
    const editable=e.target.closest('.pdf-page-host[contenteditable]');
    if(editable){
      syncPdfAmountEdit(e.target);
      clearTimeout(editable._saveTimer);
      editable._saveTimer=setTimeout(()=>saveEditablePage(editable),250);
      return;
    }
    if(e.target.matches('[data-note-text]')&&S.open){
      const type=e.target.dataset.noteText;
      S[type+'Text']=e.target.value;S[type+'Dirty']=true;S[type+'Preset']='';
      try{A.setNoteDefault(type,e.target.value)}catch{}
      S.text=buildShareText();
      if(S.tab==='text')updateTextArea();
      return;
    }
    if(e.target.id==='shareText'&&S.open){
      S.text=e.target.value;
      e.target.dir=docLang()==='ar'?'rtl':'ltr';
      const meta=e.target.parentNode&&e.target.parentNode.querySelector('.text-meta span');
      if(meta)meta.textContent=S.text.length+' '+tt('حرفًا','characters');
    }
  });
  let pendingZoom=null,pendingZoomY=null,zoomRaf=0;
  document.addEventListener('wheel',e=>{
    if(!S.open)return;
    const view=e.target.closest?.('.share-doc');
    if(!view||!(e.ctrlKey||e.metaKey)||!e.deltaY)return;
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    e.preventDefault();
    const factor=e.deltaY<0?1.08:1/1.08;
    pendingZoom=(pendingZoom==null?S.zoom:pendingZoom)*factor;
    pendingZoomY=e.clientY;
    if(!zoomRaf){
      zoomRaf=requestAnimationFrame(()=>{
        zoomRaf=0;
        const next=pendingZoom;pendingZoom=null;
        if(next!=null)zoomAt(next,pendingZoomY);
      });
    }
  },{passive:false});
  function focusShareControl(sel){
    const el=sel&&document.querySelector(sel);
    if(el&&el.focus)try{el.focus({preventScroll:true})}catch{}
  }
  function closeTopShareLayer(){
    if(!S.open)return false;
    if(S.scopePrompt){S.scopePrompt=null;scopeMount();focusShareControl('.share-sheet');return true}
    const colors=document.getElementById('pdfColorPresets');
    if(colors&&!colors.hidden){hidePdfColorPresets();return true}
    const fontBar=document.getElementById('pdfFontBar');
    if(fontBar&&!fontBar.hidden){hidePdfFontBar();focusShareControl('.share-sheet');return true}
    const stylePanel=document.getElementById('docStylePanel');
    if(stylePanel&&!stylePanel.hidden){hideDocStylePanel();focusShareControl('[data-doc-preset-select]');return true}
    if(document.querySelector('.share-wa.open')){closeWaMenus();return true}
    if(document.querySelector('.share-layout-wrap.open')){closeLayoutMenus();return true}
    if(S.notesOpen){S.notesOpen=false;notesMount();focusShareControl('.share-notes-btn');return true}
    if(S.dividerSelected){S.dividerSelected='';applyDividerStyles(document);return true}
    if(S.textSelected){S.textSelected='';document.querySelectorAll('.pdf-text-selected').forEach(x=>x.classList.remove('pdf-text-selected'));return true}
    return false;
  }
  document.addEventListener('keydown',e=>{
    if($('#pvLayer'))return;
    if(e.key!=='Escape'||!S.open)return;
    e.preventDefault();
    if(closeTopShareLayer())return;
    close();
  });

  window.addEventListener('resize',()=>{if(S.open&&S.zoomMode==='fit'&&S.tab!=='text')setTimeout(fitZoom,120)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')writeDocStyle(DOC_STYLE)});
  window.addEventListener('beforeunload',()=>writeDocStyle(DOC_STYLE));
  let shareSyncRaf=0;
  function syncShareOffer(){
    if(!S.open||offersMode())return false;
    const sig=buildSignature();
    if(sig===S.signature)return false;
    if(shareSyncRaf){cancelAnimationFrame(shareSyncRaf);shareSyncRaf=0}
    S.signature=sig;S.lastSignature='';S.selectedPages.clear();S.crops=[];S.pdfOffers.clear();
    if(S.pv)closePreview(true);
    resetBuilt();
    S.text=buildShareText();
    renderAll();
    if(S.tab!=='text')ensureBuilt();
    return true;
  }
  window.addEventListener('mizan:offer-change',()=>{
    if(!S.open||offersMode()||shareSyncRaf)return;
    shareSyncRaf=requestAnimationFrame(()=>{shareSyncRaf=0;syncShareOffer()});
  });
  window.MizanShare={open,close,shareOffers,sync:syncShareOffer,
    get built(){return S.built},
    build:()=>ensureBuilt(),
    pdfBlob:async()=>{flushEditablePages();return vectorPdfBlob()},
    printTest:async()=>{
      const root=$('#printRoot');
      root.innerHTML='<section class="pdf-page" dir="rtl"><div class="pdf-brandline"><img src="assets/logo-approved.png" alt="Mizan"></div><h1 class="pdf-title">اختبار طباعة PDF</h1><p style="font-size:15px;color:#243c34">هذا نص عربي للتحقق من قابلية التحديد والبحث. Mizan vector text test.</p></section>';
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch{}
      try{return await postNative({action:'print_pdf'})}finally{root.innerHTML=''}
    }
  };
})();
