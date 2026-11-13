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
  const isNative=()=>!!(window.chrome&&window.chrome.webview&&window.chrome.webview.postMessage);
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
      windows:'M3 5l8-1v8H3zM13 3.8 21 2v10h-8zM3 13h8v8l-8-1zM13 13h8v9l-8-1.2z'
    };
    return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="'+(paths[name]||paths.file)+'"/></svg>';
  };
  const S={
    open:false,tab:'pdf',built:null,buildPromise:null,buildToken:0,
    signature:'',lastSignature:'',progress:0,progressLabel:'',error:null,
    selectedPages:new Set(),crops:[],cropIndex:null,cropRect:null,cropFull:null,pdfOffers:new Set(),
    text:'',busy:false,result:null,lastFiles:null,lastText:null,lastKind:'',
    cropBusy:false,rowFilter:null,pv:null,docLang:null,textMode:'horizontal',textScope:'full',
    offers:null,includeIntro:!!A.includeIntro,includeOutro:!!A.includeOutro,showTotalOverride:null,
    zoom:1,zoomMode:'actual',activeOffer:0,introText:'',outroText:'',introDirty:false,outroDirty:false,introPreset:'',outroPreset:'',notesOpen:false
  };
  const FIXED_PDF_STYLE={title:'IBM Plex Sans Arabic',sub:'IBM Plex Sans Arabic',body:'IBM Plex Sans Arabic',brandScale:100,headingScale:100};

  function tt(ar,en){return A.lang==='ar'?ar:en}
  function docLang(){return S.docLang||A.lang}
  function dt(ar,en){return docLang()==='ar'?ar:en}
  function offerTitleFor(o){return o&&o.offerType==='cash'?dt('عرض كاش','Cash offer'):dt('عرض سداد تقديري','Estimated payment offer')}
  function money(cents){return localFormat(docLang()).intl.format(cents/100)+' '+dt('ج.م','EGP')}
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
    const parts=[filePart(A.p.client),filePart(A.p.unit),filePart(title)].filter(Boolean);
    return parts.join(' - ').replace(/[. ]+$/,'')||title;
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
      lines.push((i+1)+'. '+(o.unit||dt('عرض عقاري','Property offer'))+(o.client?' · '+o.client:'')+' · '+A.fmt(hidden?o.price:s.total/100)+' '+dt('ج.م','EGP'));
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
      const body=A.clientText(A.schedule(o),false,lang,S.textMode,false,false,effectiveOffer(o));
      const heading=[offerTitleFor(o),o.unit||'',o.client||''].filter(Boolean).join(' · ');
      return (heading?heading+'\n':'')+body;
    }).join('\n\n————————————————\n\n');
  }
  function summaryText(){
    if(offersMode())return offersSummary();
    return A.clientText(activeSchedule(),false,docLang(),S.textMode,false,false,effectiveOffer(A.p));
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
    const label=hidden?dt('سعر الوحدة','Unit price'):dt('إجمالي العرض','Offer total');
    return [offerTitleFor(o),o.unit||'',label+' · '+money(hidden?(+o.price||0)*100:s.total)].filter(Boolean).join('\n');
  }
  function caption(){
    const s=activeSchedule();
    const src=A.p;
    const hidden=S.showTotalOverride!==null?!S.showTotalOverride:A.p.showTotal===false;
    const total=s.selectedOnly?s.selectedTotal:s.total;
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
    if(offersMode())return JSON.stringify({offers:S.offers,lang:docLang(),mode:S.textMode,showTotal:S.showTotalOverride});
    return JSON.stringify({lang:docLang(),mode:S.textMode,p:A.p,rows:S.rowFilter?[...S.rowFilter].sort():null,showTotal:S.showTotalOverride});
  }
  function fontStack(name){
    return '"'+name+'","IBM Plex Sans Arabic","Segoe UI",Tahoma,Arial,sans-serif';
  }
  function applyPdfStyle(page){
    page.style.setProperty('--pdf-font-title',fontStack(FIXED_PDF_STYLE.title));
    page.style.setProperty('--pdf-font-sub',fontStack(FIXED_PDF_STYLE.sub));
    page.style.setProperty('--pdf-font-body',fontStack(FIXED_PDF_STYLE.body));
    page.style.setProperty('--pdf-brand-scale',(FIXED_PDF_STYLE.brandScale/100).toFixed(3));
    page.style.setProperty('--pdf-heading-scale',(FIXED_PDF_STYLE.headingScale/100).toFixed(3));
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
  function pdfHeader(lang,data,cont){
    const t=(ar,en)=>lang==='ar'?ar:en;
    const title=data.s.cash?t('عرض كاش','Cash offer'):t('عرض سداد تقديري','Estimated payment offer');
    const heading='<div class="pdf-brandline"><h1 class="pdf-title">'+title+'</h1><img src="assets/logo-approved.png" alt="Mizan"></div>';
    const scheduleHeading=data.s.cash?'':'<div class="pdf-sectionhead"><h2>'+t('جدول الدفعات','Payment schedule')+'</h2></div>';
    if(cont)return heading+scheduleHeading;
    const {s,p,names}=data;
    const cash=cents=>data.f.intl.format(cents/100);
    const pct=n=>n>0?' ('+data.f.pct.format(n)+'%)':'';
    const non=t('غير محدد','Not specified');
    const amount=cents=>'<bdi dir="ltr">'+cash(cents)+'</bdi> '+data.curr;
    const deliveryLabel=p.deliveryDateMode==='none'?'':(p.deliveryDateMode==='date'&&p.deliveryDate?t('عند الاستلام بتاريخ','at handover on')+' '+data.f.date(fullDate(p.deliveryDate,p.deliveryDay)):t('عند الاستلام','at handover'));
    const maintenanceLabel=p.maintenanceDateMode==='none'?'':(p.maintenanceDateMode==='split'?t('خلال أول سنتين','Over first two years'):(p.maintenanceDateMode==='date'&&p.maintenanceDate?t('عند الاستلام بتاريخ','at handover on')+' '+data.f.date(fullDate(p.maintenanceDate,p.maintenanceDay)):t('عند الاستلام','at handover')));
    const extraDateCond=e=>e.dueMode==='date'&&e.due?t('بتاريخ','on')+' '+data.f.date(e.due):t('عند الاستلام','at handover');
    const inst=s.rows.filter(r=>r.type==='installment'&&r.value>0);
    const values=[...new Set(inst.map(r=>r.value))];
    let termMonths=0;
    if(!s.cash&&inst.length){
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
    const priceBlock='<div class="pdf-price-block"><span class="lbl">'+t('سعر الوحدة','Unit price')+'</span><b class="amt">'+amount(s.price)+'</b></div>';
    const payItems=[];
    if(!s.cash&&s.down)payItems.push('<div class="pdf-pay-item"><span class="lbl">'+names.down()+(p.mode==='rate'?pct(s.downPct):'')+'</span><b class="val">'+amount(s.down)+'</b></div>');
    if(!s.cash&&inst.length)payItems.push('<div class="pdf-pay-item"><span class="lbl">'+t('خطة التقسيط','Payment plan')+'</span><b class="val">'+esc(planText)+'</b></div>');
    if(!s.cash&&s.delivery){
      payItems.push('<div class="pdf-pay-item"><span class="lbl">'+names.delivery()+(p.delivery>0?pct(s.deliveryPct):'')+(deliveryLabel?' · '+deliveryLabel:'')+'</span><b class="val">'+amount(s.delivery)+'</b></div>');
    }
    if(!s.cash&&inst.length){
      const instValue=fixedPlan?amount(fixedValue):t('متغيرة حسب الفترة','Variable by period');
      payItems.push('<div class="pdf-pay-item"><span class="lbl">'+t('قيمة القسط','Installment amount')+'</span><b class="val">'+instValue+'</b></div>');
    }
    const payGrid=payItems.length?'<div class="pdf-pay-grid">'+payItems.join('')+'</div>':'';
    const charges=[];
    for(const e of s.extras){
      if(e.label==='maintenance')continue;
      const label=(names[e.label]?names[e.label]():e.label)+(e.label==='maintenance'&&p.maintenance>0?pct(s.maintenancePct):'');
      const due=e.label==='maintenance'?maintenanceLabel:extraDateCond(e);
      charges.push('<div class="pdf-charge"><span class="lbl">'+label+(due?' · '+due:'')+'</span><b class="val">'+amount(e.amount)+'</b></div>');
    }
    if(s.commission){
      const feeMeta=[p.feeMode==='rate'?data.f.pct.format(s.commissionPct)+'%':'',p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller')].filter(Boolean).join(' · ');
      charges.push('<div class="pdf-charge"><span class="lbl">'+names.fee()+(feeMeta?' ('+feeMeta+')':'')+'</span><b class="val">'+amount(s.commission)+'</b></div>');
    }
    const sectionTitle=(title,cls)=>'<div class="pdf-section-title '+(cls||'')+'"><span class="accent"></span><h3>'+title+'</h3><span class="rule"></span></div>';
    const extrasHtml=charges.length?sectionTitle(t('المستحقات الإضافية','Additional charges'))+'<div class="pdf-charges">'+charges.join('')+'</div>':'';
    const support=[];
    if(s.maintenance)support.push('<div class="pdf-support-line pdf-deposit-line"><b>'+names.maintenance()+(p.maintenance>0?pct(s.maintenancePct):'')+(maintenanceLabel?' · '+maintenanceLabel:'')+':</b> '+amount(s.maintenance)+' <span class="pdf-not-counted">'+t('لا تُحسب في الإجمالي','not included in the total')+'</span></div>');
    if(s.includes.length)support.push('<div class="pdf-support-line"><b>'+t('السعر يشمل:','Price includes:')+'</b> '+esc(s.includes.map(k=>names[k]?names[k]():k).join('، ')+'.')+'</div>');
 const legalFinancial=p.legal&&p.legal.noDues?t('لا توجد مستحقات مالية أخرى بخلاف المبالغ الموضحة أعلاه.','No other financial dues beyond the amounts shown above.'):'';
    const legalItems=[];
    if(p.legal&&p.legal.poa)legalItems.push(t('يوجد توكيل.','A power of attorney exists.'));
    if(p.legal&&p.legal.contract)legalItems.push(t('يوجد عقد نهائي.','A final contract exists.'));
    if(legalFinancial||legalItems.length){
      let legalHtml=sectionTitle(t('الحالة المالية والقانونية','Financial & legal status'),'pdf-legal-head');
      if(legalFinancial)legalHtml+='<div class="pdf-legal-line"><span>'+t('الحالة المالية:','Financial status:')+'</span> '+esc(legalFinancial)+'</div>';
      if(legalItems.length)legalHtml+='<div class="pdf-legal-line"><span>'+t('الحالة القانونية:','Legal status:')+'</span> '+esc(legalItems.join(' '))+'</div>';
      support.push(legalHtml);
    }
    if(s.gap&&!s.selectedOnly)support.push('<div class="pdf-support-line"><b>'+t('غير مجدول:','Unscheduled:')+'</b> '+amount(s.gap)+'</div>');
    const label=s.selectedOnly?t('إجمالي الدفعات المحددة','Selected payments total'):t('إجمالي العرض','Offer total');
    const totalHtml=p.showTotal===false?'':'<div class="pdf-total'+(charges.length?' with-extras':'')+'"><span>'+label+'</span><span class="amt"><bdi dir="ltr">'+cash(s.selectedOnly?s.selectedTotal:s.total)+'</bdi> '+data.curr+'</span></div>';
    const identity='<div class="pdf-identity"><div><span>'+t('الوحدة','Unit')+'</span><b>'+esc(p.unit||non)+'</b></div><div><span>'+t('اسم العميل','Client')+'</span><b>'+esc(p.client||non)+'</b></div></div>';
    return heading+identity+priceBlock+payGrid+extrasHtml+totalHtml+(support.length?'<div class="pdf-support">'+support.join('')+'</div>':'')+scheduleHeading;
  }
  function pdfTableShell(lang,layout){
    const t=(ar,en)=>lang==='ar'?ar:en;
    if(layout==='vertical')return '<div class="pdf-list" data-pdf-body></div>';
    const arrow=lang==='ar'?'rtl':'ltr';
    return '<table class="pdf-table" dir="'+arrow+'"><colgroup><col style="width:24%"><col style="width:26%"><col style="width:25%"><col style="width:25%"></colgroup><thead><tr><th>'+t('تاريخ الدفعة','Payment date')+'</th><th>'+t('نوع الدفعة','Payment type')+'</th><th>'+t('القيمة','Amount')+'</th><th>'+t('رصيد الوحدة','Property balance')+'</th></tr></thead><tbody data-pdf-body></tbody></table>';
  }
  function pdfRow(lang,r,data,layout){
    const t=(ar,en)=>lang==='ar'?ar:en;
    const extra=r.extra||r.type==='maintenance';
    const nm=(data.names[r.type]?data.names[r.type]():r.type)+(r.type==='installment'&&r.number?' '+r.number:'')+(extra?' · '+t('مستحق إضافي','Additional charge'):'');
    if(layout==='vertical'){
      const card=document.createElement('div');
      card.className='pdf-pay';card.dataset.rowId=r.id;
      card.innerHTML='<div class="pdf-pay-head"><span class="date">'+data.f.date(r.date)+'</span><span class="type">'+nm+'</span></div><div class="pdf-pay-line"><span class="lbl">'+t('القيمة','Amount')+'</span><b class="val">'+data.f.intl.format(r.value/100)+' '+data.curr+'</b></div><div class="pdf-pay-line"><span class="lbl">'+t('الرصيد','Balance')+'</span><b class="val">'+data.f.intl.format(r.balance/100)+' '+data.curr+'</b></div>';
      return card;
    }
    const tr=document.createElement('tr');
    tr.dataset.rowId=r.id;
    tr.innerHTML='<td class="date">'+data.f.date(r.date)+'</td><td class="type-cell '+r.type+'"><span class="type">'+nm+'</span></td><td class="num">'+data.f.intl.format(r.value/100)+'</td><td class="num">'+data.f.intl.format(r.balance/100)+'</td>';
    return tr;
  }
  function makePage(lang,data,cont,layout){
    const page=document.createElement('section');
    page.className='pdf-page'+(lang==='en'?' ltr':'')+(layout==='vertical'?' pdf-vertical':'');
    const watermark=(!cont&&!data.s.cash)?'<img class="pdf-watermark" src="assets/logo-approved.png" alt="" aria-hidden="true" contenteditable="false">':'';
    page.innerHTML=pdfHeader(lang,data,cont)+(data.s.cash?'':'<div class="pdf-schedule">'+watermark+pdfTableShell(lang,layout)+'</div>')+'<div class="pdf-folio"></div>';
    page.lang=lang;page.dir=lang==='ar'?'rtl':'ltr';
    applyPdfStyle(page);
    return page;
  }
  async function buildPagesFor(snapshot,lang,rowFilter,root,layout){
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
    if(document.fonts){
      await Promise.all([400,600,700].map(weight=>document.fonts.load(weight+' 14px "IBM Plex Sans Arabic"','ميزان Mizan')));
    }
    const pages=[];
    if(s.cash){
      const page=makePage(lang,data,false,layout);
      root.appendChild(page);pages.push(page);
    }else{
      let page=makePage(lang,data,false,layout),body=page.querySelector('[data-pdf-body]'),count=0;
      root.appendChild(page);
      for(const r of s.rows.filter(row=>!(row.custom&&row.value===0))){
        const row=pdfRow(lang,r,data,layout);
        body.appendChild(row);
        if(row.getBoundingClientRect().bottom>page.getBoundingClientRect().bottom-64&&count>0){
          body.removeChild(row);
          pages.push(page);
          page=makePage(lang,data,true,layout);root.appendChild(page);body=page.querySelector('[data-pdf-body]');body.appendChild(row);count=1;
        }else count++;
      }
      pages.push(page);
    }
    pages.forEach((sheet,i)=>{
      const footer=sheet.querySelector('.pdf-folio');
      footer.innerHTML='<span>'+esc(snapshot.unit||(lang==='ar'?'خطة السداد':'Payment plan'))+'</span><span>'+(lang==='ar'?'صفحة':'Page')+' <bdi>'+(i+1)+' / '+pages.length+'</bdi></span>';
    });
    // A hidden/background tab pauses requestAnimationFrame; never let that stall pagination.
    await new Promise(resolve=>{
      let done=false;const fin=()=>{if(!done){done=true;resolve()}};
      requestAnimationFrame(()=>requestAnimationFrame(fin));
      setTimeout(fin,140);
    });
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
      let pageEntries=[];
      if(offers){
        for(let oi=0;oi<offers.length;oi++){
          const built=await buildPagesFor(offers[oi],lang,null,root,S.textMode);
          built.pages.forEach((page,pi)=>pageEntries.push({page,offerIndex:oi,offerPage:pi}));
        }
      }else{
        const built=await buildPagesFor(snapshot,lang,rowFilter,root,S.textMode);
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
        const {pages}=await buildPagesFor(snapshot,lang,null,root,S.textMode);
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
    if(isNative()){
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
    S.error=null;
    S.buildPromise=buildPdf(sig,token).then(built=>{
      if(token!==S.buildToken)return S.built;
      if(S.signature!==sig){try{URL.revokeObjectURL(built.pdfUrl)}catch{}return S.built}
      S.built=built;
      if(offersMode()){
        S.selectedPages.clear();
        built.pages.forEach((_,i)=>S.selectedPages.add(i));
        S.pdfOffers.clear();
        const seen=new Set();
        built.pages.forEach(p=>{const oi=p.offerIndex||0;if(!seen.has(oi)){seen.add(oi);S.pdfOffers.add(oi)}});
      }
      if(S.open)renderAll();
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
    if(!isNative())return rasterPdfBlob();
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
    if(isNative()){
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
  function saveEditablePage(host){
    if(!host||!S.built)return;
    const index=+host.dataset.editPage;
    const page=S.built.pages[index];
    if(!page)return;
    const clone=host.querySelector('.pdf-page')?.cloneNode(true);
    if(!clone)return;
    clone.removeAttribute('contenteditable');
    clone.querySelectorAll('[contenteditable]').forEach(x=>x.removeAttribute('contenteditable'));
    page.html=clone.outerHTML;
    page.rasterDirty=true;
    page.renderPromise=null;
    S.built.htmlVersion=(S.built.htmlVersion||0)+1;
    S.built.vectorPdf=null;
  }
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
    return '<div class="notes-panel"><div class="notes-panel-head"><b>'+tt('المقدمة والخاتمة','Introduction & closing')+'</b><button type="button" class="share-x" data-share-act="notes-close" aria-label="'+tt('إغلاق','Close')+'">×</button></div><div class="notes-grid">'+note('intro',tt('مقدمة','Introduction'),S.introText,S.introPreset)+note('outro',tt('خاتمة','Closing'),S.outroText,S.outroPreset)+'</div><label class="notes-show-total"><input type="checkbox" data-show-total-share '+(showTotalValue()?'checked':'')+'><span>'+tt('إظهار الإجمالي في العرض','Show the total in the offer')+'</span></label><p class="notes-hint">'+tt('تُطبَّق على النص المنسوخ والمرسل فقط، ولا تظهر داخل PDF أو الصور.','Applies to copied and shared text only; it is not added to PDF or images.')+'</p></div>';
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
    const parts=[filePart(o.client),filePart(o.unit),filePart(title)].filter(Boolean);
    return (parts.join(' - ')||title)+'.pdf';
  }
  function offerPdfCard(g){
    const first=S.built.pages[g.pages[0]];
    const oi=g.offerIndex,checked=S.pdfOffers.has(oi);
    return '<div class="page-card pdf-offer-card'+(checked?' on':'')+'" data-pdf-offer-card="'+oi+'">'+
      '<input class="page-check" type="checkbox" data-pdf-offer="'+oi+'" aria-label="'+esc(offerLabel(oi))+' · '+tt('تحديد ملف PDF','Select PDF file')+'" '+(checked?'checked':'')+'>'+
      '<img src="'+first.thumb+'" alt="'+esc(offerLabel(oi))+'" data-pv-page="'+g.pages[0]+'">'+
      '<span class="pno">'+pageCountLabel(g.pages.length)+'</span>'+
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
    return '<div class="note-toggles" role="group" aria-label="'+tt('إظهار المقدمة والخاتمة','Show intro and closing')+'"><label class="note-toggle"><input type="checkbox" data-note-toggle="intro" '+(S.includeIntro?'checked':'')+'><span>'+tt('مقدمة','Intro')+'</span></label><label class="note-toggle"><input type="checkbox" data-note-toggle="outro" '+(S.includeOutro?'checked':'')+'><span>'+tt('خاتمة','Outro')+'</span></label></div>';
  }
  function textHtml(){
    const len=S.text.length;
    const rtl=docLang()==='ar';
    const full=S.textScope!=='summary';
    return '<div class="text-share"><div class="text-scope" role="group" aria-label="'+tt('نطاق النص','Text scope')+'">'+
      '<button type="button" data-share-act="scope-full" class="'+(full?'on':'')+'" aria-pressed="'+full+'">'+tt('العرض كاملًا مع الملخص المالي','Full offer with summary')+'</button>'+
      '<button type="button" data-share-act="scope-summary" class="'+(!full?'on':'')+'" aria-pressed="'+(!full)+'">'+tt('الملخص المالي فقط','Financial summary only')+'</button>'+
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
        '<button type="button" role="menuitem" data-share-act="copy-full">'+tt('نسخ العرض كاملًا','Copy full offer')+'</button>'+
        '<button type="button" role="menuitem" data-share-act="copy-summary">'+tt('نسخ الملخص المالي فقط','Copy financial summary only')+'</button>'+
      '</div></div>';
  }
  function controlsHtml(){
    const zoom=Math.round(S.zoom*100);
    return '<div class="share-controls"><button type="button" class="share-toggle" data-share-act="toggle-language">'+(docLang()==='ar'?'العربية':'EN')+'</button><button type="button" class="share-toggle" data-share-act="toggle-layout">'+(S.textMode==='horizontal'?tt('أفقي','Horizontal'):tt('رأسي','Vertical'))+'</button><button type="button" class="share-toggle share-notes-btn" data-share-act="notes">'+icon('note',14)+tt('مقدمة وخاتمة','Intro & closing')+'</button><button type="button" class="share-zoom-btn" data-share-act="zoom-toggle" title="'+tt('ملاءمة الصفحة أو الرجوع إلى 100%','Fit page or return to 100%')+'">'+zoom+'%</button>'+(S.built?'<span class="share-doc-meta">'+pageCountLabel(S.built.pages.length)+'</span>':'')+'</div>';
  }
  function footHtml(){
    if(S.result){
      return '<div class="left">'+(S.result.folder?'<button type="button" class="share-btn" data-share-act="open-folder">'+icon('folder')+tt('فتح المجلد','Open folder')+'</button>':'')+'<button type="button" class="share-btn" data-share-act="share-wa-result">'+icon('whatsapp')+tt('فتح واتساب + نسخ','Open WhatsApp + copy')+'</button></div><div class="right"><button type="button" class="share-btn primary" data-share-act="dismiss-result">'+tt('تم','Done')+'</button></div>';
    }
    const busy=S.busy?' disabled':'';
    const saveLabel=offersMode()?tt('تنزيل ملفات PDF المحددة','Download selected PDFs'):tt('حفظ','Save');
    return '<div class="share-controls-wrap"><div class="share-actions" style="direction:rtl">'+waMenuHtml(busy)+(S.built?'<button type="button" class="share-icon" data-share-act="save-pdf" title="'+saveLabel+'" aria-label="'+saveLabel+'">'+icon('download',19)+'</button>':'')+copyMenuHtml()+'</div>'+controlsHtml()+'</div>';
  }
  function renderAll(){
    if(!S.open)return;
    railMount();notesMount();
    const body=$('#shareBody');if(body)body.innerHTML=bodyHtml();
    const foot=$('#shareFoot');if(foot)foot.innerHTML=footHtml();
  }
  function renderBodyKeepScroll(){
    const body=$('#shareBody');if(!body)return;
    const top=body.scrollTop;
    body.innerHTML=bodyHtml();
    body.scrollTop=top;
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
    S.zoom=Math.max(.3,Math.min(2.5,Math.min(width/794,height/1123)));S.zoomMode='fit';
    view.style.setProperty('--zoom',String(S.zoom));
    updateZoomLabel();
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
    resetBuilt();
    S.signature=buildSignature();
    renderAll();
    if(S.tab!=='text')ensureBuilt();
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
    S.zoom=1;S.zoomMode='actual';S.activeOffer=0;S.notesOpen=false;S.pdfOffers.clear();
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
    renderAll();
    if(S.tab!=='text')ensureBuilt();
    setTimeout(()=>{const sheet=root.querySelector('.share-sheet');if(sheet)sheet.focus({preventScroll:true})},60);
  }
  function openOffers(offers,tab){
    if(!offers||!offers.length)return;
    if(S.open)close(true);
    S.offers=offers.map(o=>JSON.parse(JSON.stringify(o)));
    S.rowFilter=null;
    S.open=true;S.tab=tab||'pdf';S.result=null;S.error=null;S.busy=false;S.cropBusy=false;
    S.zoom=1;S.zoomMode='actual';S.activeOffer=0;S.notesOpen=false;S.pdfOffers.clear();
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
    renderAll();
    if(S.tab!=='text')ensureBuilt();
    setTimeout(()=>{const sheet=root.querySelector('.share-sheet');if(sheet)sheet.focus({preventScroll:true})},60);
  }
  function close(silent){
    if(!S.open)return;
    if(S.pv)closePreview(true);
    S.open=false;
    S.offers=null;
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
        const r=await postNative({action:'whatsapp',text:msg,phone:normalizedPhone(),kind:'text',files:[]});
        setResult({method:r.method||'text',kind:'text',count:0,folder:'',whatsapp:r.whatsapp||'',message:''});
      }catch(err){
        console.warn(err);
        try{await copyTextValue(msg)}catch{}
        window.open(waOpenUrl(msg.length>7000?'':msg),'_blank','noopener');
        setResult({method:'text-web',kind:'text',count:0,folder:'',whatsapp:''});
      }
      return;
    }
    const long=msg.length>7000;
    // Open WhatsApp inside the click gesture so the popup is never blocked.
    const win=window.open(waOpenUrl(long?'':msg),'_blank','noopener');
    try{await navigator.clipboard.writeText(msg)}catch{await copyTextValue(msg)}
    if(!win)A.note(tt('منع المتصفح فتح واتساب. النص منسوخ، افتحه يدويًا.','The browser blocked WhatsApp. The text is copied; open it manually.'));
    setResult({method:'text-web',kind:'text',count:0,folder:'',whatsapp:'',message:long?tt('تم نسخ النص وفتح واتساب. الصقه في المحادثة.','The text was copied and WhatsApp opened. Paste it in the chat.'):''});
  }
  async function copyTextValue(text){
    try{await navigator.clipboard.writeText(text);return true}catch{}
    if(isNative()){
      try{await postNative({action:'copy_text',text});return true}catch{}
    }
    try{
      const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();return true;
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
      await postNative({action:'shareui',text,kind:S.tab==='pdf'?'pdf':'images',files:await filesPayload(files)});
      S.lastFiles=files;S.lastText=text;S.lastKind=S.tab==='pdf'?'pdf':'images';
      setResult({method:'shareui',kind:S.tab==='pdf'?'pdf':'images',count:files.length,folder:'',whatsapp:''});
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
      const intro=S.includeIntro?String(notes.intro||'').trim():'';
      const outro=S.includeOutro?String(notes.outro||'').trim():'';
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
  document.addEventListener('click',e=>{
    if(e.target.closest('#pvLayer'))return;
    if(!e.target.closest('.share-wa'))closeWaMenus();
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
    const act=e.target.closest('[data-share-act]');
    if(!act||!S.open)return;
    const a=act.dataset.shareAct;
    if(a==='notes'){S.notesOpen=!S.notesOpen;notesMount();return}
    if(a==='notes-close'){S.notesOpen=false;notesMount();return}
    if(a==='zoom-toggle'){toggleZoom();return}
    if(a==='preset-save-intro'){savePreset('intro');return}
    if(a==='preset-save-outro'){savePreset('outro');return}
    if(a==='preset-delete-intro'){deletePreset('intro');return}
    if(a==='preset-delete-outro'){deletePreset('outro');return}
    if(a==='toggle-layout'){setTextMode(S.textMode==='horizontal'?'vertical':'horizontal');return}
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
    if(a==='wa-pdf'){closeWaMenus();sharePdf();return}
    if(a==='wa-images'){closeWaMenus();shareImages();return}
    if(a==='wa-text'){closeWaMenus();shareText();return}
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
  document.addEventListener('input',e=>{
    const editable=e.target.closest('.pdf-page-host[contenteditable]');
    if(editable){
      clearTimeout(editable._saveTimer);
      editable._saveTimer=setTimeout(()=>saveEditablePage(editable),250);
      return;
    }
    if(e.target.matches('[data-note-text]')&&S.open){
      const type=e.target.dataset.noteText;
      S[type+'Text']=e.target.value;S[type+'Dirty']=true;S[type+'Preset']='';
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
  document.addEventListener('keydown',e=>{
    if($('#pvLayer'))return;
    if(e.key==='Escape'){
      if(S.open)close();
    }
  });

  window.MizanShare={open,close,shareOffers,
    get built(){return S.built},
    build:()=>ensureBuilt(),
    pdfBlob:()=>vectorPdfBlob(),
    printTest:async()=>{
      const root=$('#printRoot');
      root.innerHTML='<section class="pdf-page" dir="rtl"><div class="pdf-brandline"><img src="assets/logo-approved.png" alt="Mizan"></div><h1 class="pdf-title">اختبار طباعة PDF</h1><p style="font-size:15px;color:#243c34">هذا نص عربي للتحقق من قابلية التحديد والبحث. Mizan vector text test.</p></section>';
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch{}
      try{return await postNative({action:'print_pdf'})}finally{root.innerHTML=''}
    }
  };
})();
