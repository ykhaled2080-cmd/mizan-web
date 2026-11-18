/* Adaptive screens use the offer, plan and saved-offer stores owned by app.js. */
window.MizanMobileScreens = (() => {
  const propName = offer => offer.unit || t('عرض عقاري','Property offer');
  const mobileOnly = () => typeof MizanAdaptive !== 'undefined' && MizanAdaptive.enabled();
  const group = (name, fields) => '<section class="ms-group"><h2>'+name+'</h2><div class="fields">'+fields+'</div></section>';

  function layoutName(){return window.MizanAppearance?MizanAppearance.get().offer:'A'}
  function detailsLayout(){return window.MizanAppearance?MizanAppearance.get().details:'D'}
  function installmentDisplay(s){
    const rows=s.rows.filter(r=>r.type==='installment'&&r.value>0);
    const vals=[...new Set(rows.map(r=>r.value))];
    const base=rows.slice(0,-1).map(r=>r.value);
    const equal=base.length>0&&base.every(v=>v===base[0]);
    const last=rows.length?rows[rows.length-1].value:0;
    const rounding=equal&&last!==base[0]&&base[0]-last>0&&base[0]-last<=rows.length*100;
    const fixed=rows.length>0&&(vals.length===1||rounding);
    return {fixed,value:vals.length===1?vals[0]:(base[0]||last),variable:!fixed};
  }
  function headline(s){
    if(s.cash){
      return '<div class="ms-headline"><span class="ms-overline">'+t('إجمالي العرض','Offer total')+'</span>'+
        '<div class="ms-headline-value">'+moneyPair(s.price,true)+'</div>'+
        '<div class="ms-headline-sub">'+t('سعر الوحدة','Unit price')+'</div></div>';
    }
    const inst=installmentDisplay(s);
    const term=s.termMonths||Math.round((+p.years||0)*12);
    const termText=term?(term%12===0?(term/12)+' '+t('سنوات','years'):term+' '+t('شهرًا','months')):'—';
    return '<div class="ms-headline"><span class="ms-overline" data-detail-target="period" role="button" tabindex="0">'+t('قيمة القسط','Installment amount')+' · '+frequency()[p.period]+'</span>'+
      '<div class="ms-headline-value '+(inst.fixed?'':'is-variable')+'">'+(inst.fixed?moneyPair(inst.value,true):t('حسب الجدول','Per schedule'))+'</div>'+
      '<div class="ms-headline-sub"><span data-detail-target="termMonths" role="button" tabindex="0">'+t('مدة التقسيط','Term')+' · '+termText+'</span><span>'+s.count+' '+t('قسطًا','installments')+'</span></div></div>';
  }
  function metrics(s){
    const extra=s.extrasTotal+(p.payer==='buyer'?s.commission:0);
    const downLabel=names.down()+(s.down?' <span class="ms-metric-pct" dir="ltr">('+fmtPct(s.downPct)+'%)</span>':'');
    const rows=s.cash?
      [[t('سعر الوحدة','Unit price'),money(s.price),'price'],[t('مستحقات إضافية','Additional charges'),extra?money(extra):'—','']]:
      [[t('سعر الوحدة','Unit price'),money(s.price),'price'],[downLabel,money(s.down),'amount'],[t('الموزّع على الأقساط','Financed amount'),money(s.financed),'']];
    return '<div class="ms-metrics">'+rows.map(([k,v,target])=>{
      const attrs=target?' data-detail-target="'+target+'" role="button" tabindex="0"':'';
      return '<div class="ms-metric"'+attrs+'><span>'+k+'</span><b>'+v+'</b></div>';
    }).join('')+'</div>';
  }
  /* Alignment is decided from the rendered value box, not from digit count:
     a value only drops to its own full-width row when it actually overflows. */
  let fitFrame=0;
  function fitMetrics(){
    document.querySelectorAll('.ms-metric').forEach(metric=>{
      metric.classList.remove('is-long');
      const value=metric.querySelector('b');
      if(!value||value.clientWidth<20) return;
      const box=value.getBoundingClientRect(), row=metric.getBoundingClientRect();
      if(value.scrollWidth>value.clientWidth+5||box.left<row.left-1||box.right>row.right+1)
        metric.classList.add('is-long');
    });
  }
  function scheduleFitMetrics(){
    if(fitFrame) return;
    fitFrame=requestAnimationFrame(()=>{
      fitFrame=0;
      fitMetrics();
      setTimeout(fitMetrics,180);
      setTimeout(fitMetrics,650);
    });
  }
  window.addEventListener('resize',scheduleFitMetrics);
  document.fonts?.ready.then(scheduleFitMetrics);
  function digest(s){
    const included=(s.includedItems||[]).map(x=>({name:itemName(x.key),value:x.amount?moneyPair(x.amount,true):'',target:'items'}));
    const excluded=(s.excludedItems||[]).map(x=>({name:itemName(x.key),value:x.amount?moneyPair(x.amount,true):'',target:'items'}));
    /* Mirror the document: the maintenance deposit is shown with the additional
       dues even though it is excluded from extrasTotal (it is a deposit, not a fee). */
    const extraDue=x=>x.label==='maintenance'
      ? maintenanceDueText(p,x.due)
      : (x.dueMode==='date'&&x.due?t('بتاريخ','on')+' '+dateNum(x.due):'');
    const extras=(s.extras||[]).map(x=>({name:itemName(x.label),value:moneyPair(x.amount,true),meta:extraDue(x),target:x.label==='maintenance'?'handover':'items'}));
    if(s.commission)extras.push({name:names.fee(),pct:fmtPct(s.commissionPct),value:moneyPair(s.commission,true),meta:p.payer==='buyer'?t('المشتري','Buyer'):t('البائع','Seller'),target:'fees',commission:true});
    const groups=[
      {id:'included',label:t('السعر يشمل','Price includes'),rows:included,empty:t('لا توجد بنود مشمولة صراحة.','No explicitly included items.')},
      {id:'excluded',label:t('السعر لا يشمل','Price excludes'),rows:excluded,empty:t('لا توجد بنود غير مشمولة.','No excluded items.')},
      {id:'extras',label:t('مستحقات إضافية','Additional dues'),rows:extras,empty:t('لا توجد مستحقات إضافية.','No additional charges.')}
    ];
    const unresolved=[];
    for(const key of ['garage','storage','utilities']){
      const item=p.items&&p.items[key];
      if(item&&item.state==='unspecified')unresolved.push({name:itemName(key),value:t('غير محدد','Not specified'),target:'items'});
    }
    if(p.maintenanceState==='unspecified')unresolved.push({name:names.maintenance(),value:t('غير محدد','Not specified'),target:'handover'});
    if(unresolved.length)groups.push({id:'unknown',label:t('غير محدد','Not specified'),rows:unresolved,empty:''});
    const row=r=>{
      const name='<span>'+esc(r.name)+(r.pct?' <span class="ms-digest-pct" dir="ltr">('+r.pct+'%)</span>':'')+'</span>';
      const body=r.commission
        ? '<span class="ms-digest-stack">'+name+(r.meta?'<small class="ms-digest-payer">'+esc(r.meta)+'</small>':'')+'</span>'
        : name;
      return '<button type="button" class="ms-digest-row'+(r.commission?' is-commission':'')+'"'+(r.target?' data-detail-section="'+r.target+'"':'')+'>'+body+'<bdi>'+r.value+'</bdi>'+(!r.commission&&r.meta?'<small>'+esc(r.meta)+'</small>':'')+'</button>';
    };
    return '<section class="ms-digest" aria-label="'+t('السعر والمستحقات','Price and dues')+'">'+
      groups.map(g=>{
        const target=g.id==='included'||g.id==='excluded'?' data-detail-section="items"':'';
        return '<div class="ms-digest-group" data-digest="'+g.id+'"><button type="button" class="ms-digest-head"'+target+'><span>'+g.label+'</span><small>'+g.rows.length+'</small></button>'+(g.rows.length?g.rows.map(row).join(''):'<p class="ms-digest-empty">'+g.empty+'</p>')+'</div>';
      }).join('')+'</section>';
  }
  function planFields(s){
    if(!mobileOnly()||s.cash)return '';
    return '<div class="ms-details-plan" aria-label="'+t('بيانات التقسيط','Installment details')+'"><div class="fields ms-two">'+
      numberField('amount',t('المبلغ','Amount')+' · '+curr(),Math.round(s.down/100))+
      numberField('rate',t('النسبة','Percentage')+' %',p.mode==='rate'?p.down:+s.downPct.toFixed(5))+
      numberField('termMonths',t('المدة بالشهور','Term in months'),(p.termMonths||Math.round((+p.years||0)*12)))+
      options('period',t('دورية القسط','Frequency'),Object.entries(frequency()))+
      '<div class="wide ms-details-increase">'+increaseBlock(s)+'</div>'+
      '</div></div>';
  }
  function identityFields(s){
    return '<section class="ms-details-identity" aria-label="'+t('بيانات العميل والوحدة','Customer and property details')+'"><h2>'+t('العميل والوحدة','Customer and property')+'</h2><div class="fields ms-two">'+
      textField('client',t('اسم العميل','Client name'))+
      textField('phone',t('رقم واتساب','WhatsApp number')).replace('type="text"','type="text" dir="ltr" inputmode="tel" autocomplete="tel"')+
      textField('unit',t('الوحدة','Unit'),p.unit,'text')+
      numberField('price',t('سعر الوحدة','Unit price')+' · '+curr(),p.price)+'</div>'+planFields(s)+'</section>';
  }
  function offer(s){
    const layout=layoutName();
    scheduleFitMetrics();
    const body='<div class="ms-offer-surface"><div id="msOverview" class="ms-overview">'+headline(s)+metrics(s)+'</div></div>'+
      '<div id="msDigest">'+digest(s)+'</div>'+
      '<div class="ms-new">'+B('reset',t('عرض جديد','New offer'),'plus')+'</div>';
    return '<div class="ms-offer offer-layout-'+layout+'" data-layout="'+layout+'"><div class="ms-mode-band">'+typeSwitch()+'</div>'+
      (!s.valid?'<p class="ms-error" role="status">'+(s.overAllocated?t('تجاوزت المبالغ المخصصة المتبقي من سعر الوحدة. راجع الدفعات.','Scheduled amounts exceed the remaining unit price. Review the payments.'):t('راجع سعر الوحدة والمقدم وتاريخ الاستلام.','Review the price, down payment and handover date.'))+'</p>':'')+
      body+'</div>';
  }
  function deliveryTiming(){
    if(p.deliveryDateMode==='none')return '';
    if(p.deliveryDateMode==='date'&&p.deliveryDate)return dateNum(p.deliveryDate);
    return p.handover?dateNum(p.handover):'';
  }
  function maintenanceTiming(){
    if(p.maintenanceDateMode==='none')return '';
    if(p.maintenanceDateMode==='split')return t('أول سنتين','first two years');
    if(p.maintenanceDateMode==='date'&&p.maintenanceDate)return dateNum(p.maintenanceDate);
    return p.handover?dateNum(p.handover):'';
  }
  function detailSummary(id,s,mobile){
    if(id==='fees'){
      if(!s.commission)return t('غير محددة','Not set');
      if(!mobile)return curr()+' '+fmt(s.commission/100);
      return '<span class="ms-fee-order" dir="rtl"><span class="ms-fee-pct" dir="ltr">('+fmtPct(s.commissionPct)+'%)</span><bdi class="ms-fee-amount" dir="ltr">'+fmt(s.commission/100)+'</bdi><span class="ms-fee-curr">'+curr()+'</span></span>';
    }
    if(id==='handover'){
      if(!mobile)return [s.maintenance?names.maintenance()+' · '+fmt(s.maintenance/100):'',dateNum(p.handover)].filter(Boolean).join(' · ');
      const facts=[];
      if(s.maintenance){
        const due=maintenanceTiming();
        facts.push(names.maintenance()+' '+fmt(s.maintenance/100)+(due?' · '+due:''));
      }
      if(s.delivery){
        const due=deliveryTiming();
        facts.push(names.delivery()+' '+fmt(s.delivery/100)+(due?' · '+due:''));
      }
      if(!facts.length&&p.handover)facts.push(dateNum(p.handover));
      return facts.join('\n');
    }
    if(id==='items'){
      if(!mobile){
        const extra=(s.extras||[]).filter(x=>!x.excluded).length;
        const unknown=['garage','storage','utilities'].filter(k=>p.items&&p.items[k]&&p.items[k].state==='unspecified').length;
        return [extra?t('إضافية ','Extra ')+extra:'',unknown?t('غير محدد ','Open ')+unknown:''].filter(Boolean).join(' · ')||t('كل البنود محددة','All items resolved');
      }
      const counts={included:0,excluded:0,extra:0,unspecified:0};
      for(const key of ['garage','storage','utilities']){
        const state=p.items&&p.items[key]&&p.items[key].state;
        if(state&&counts[state]!==undefined)counts[state]++;
      }
      const labels={included:t('شامل','Included'),excluded:t('غير شامل','Excluded'),extra:t('إضافي','Extra'),unspecified:t('غير محدد','Unspecified')};
      const parts=['included','excluded','extra','unspecified']
        .filter(key=>counts[key]>0)
        .map(key=>counts[key]+' '+labels[key]);
      return parts.join(' · ')||t('كل البنود محددة','All items resolved');
    }
    if(id==='legal'){const on=Object.values(p.legal||{}).filter(Boolean).length;return on?on+' '+t('بنود مؤكدة','confirmed'):t('لا توجد بنود مؤكدة','No confirmed clauses')}
    if(id==='notes')return [p.intro?t('مقدمة','Intro'):'',p.outro?t('خاتمة','Closing'):''].filter(Boolean).join(' · ')||t('فارغة','Empty');
    return '';
  }
  function detailSummaryHtml(id,s,mobile){
    return '<span class="ms-detail-meta"><small data-summary="'+id+'">'+detailSummary(id,s,mobile)+'</small><i class="ms-detail-chev" aria-hidden="true">‹</i></span>';
  }
  function details(s,forcedLayout){
    const layout=forcedLayout||detailsLayout();
    const mobile=mobileOnly();
    const groups=detailGroups(s).map(g=>mobile&&g.id==='fees'?{...g,name:names.fee()}:g);
    const identity=identityFields(s);
    const jump='<div class="ms-details-nav" role="tablist" aria-label="'+t('أقسام التفاصيل','Details sections')+'">'+groups.map(g=>'<button type="button" data-ms-detail-jump="'+g.id+'">'+g.name+'</button>').join('')+'</div>';
    if(layout==='B'){
      return identity+'<div class="ms-details details-layout-B" data-layout="B">'+groups.map(g=>'<section class="ms-detail-section" id="msDetail-'+g.id+'" data-section="'+g.id+'"><h3>'+g.name+'</h3><p class="ms-detail-note">'+detailSummary(g.id,s,mobile)+'</p><div class="fields">'+g.body+'</div></section>').join('')+'</div>';
    }
    if(layout==='C'){
      return identity+'<div class="ms-details details-layout-C" data-layout="C">'+jump+groups.map(g=>'<section class="ms-detail-section" id="msDetail-'+g.id+'" data-section="'+g.id+'"><h3>'+g.name+'</h3><div class="fields">'+g.body+'</div></section>').join('')+'</div>';
    }
    if(layout==='E'){
      return identity+'<div class="ms-details details-layout-E" data-layout="E">'+groups.map(g=>'<details class="ms-detail-clause" name="ms-detail-e" data-section="'+g.id+'" '+(sectionOpen.has(g.id)?'open':'')+'><summary><span class="ms-detail-title">'+g.name+'</span>'+detailSummaryHtml(g.id,s,mobile)+'</summary><div class="fields">'+g.body+'</div></details>').join('')+'</div>';
    }
    // A and D are accordions; both show the detailed sections directly.
    return identity+'<div class="ms-details details-layout-'+layout+'" data-layout="'+layout+'">'+groups.map(g=>'<details class="ms-detail-acc" data-section="'+g.id+'" '+(sectionOpen.has(g.id)?'open':'')+'><summary><span class="ms-detail-title">'+g.name+'</span>'+detailSummaryHtml(g.id,s,mobile)+'</summary><div class="fields">'+g.body+'</div></details>').join('')+'</div>';
  }
  function refreshDetails(s){
    const host=document.querySelector('.destination-pane[data-screen="details"]');
    if(!host)return;
    const mobile=mobileOnly();
    const set=(key,value)=>{
      const field=host.querySelector('[data-key="'+key+'"]');
      if(field&&document.activeElement!==field)field.value=value;
    };
    set('rate',p.mode==='rate'?p.down:+s.downPct.toFixed(5));
    set('amount',Math.round(s.down/100));
    set('termMonths',p.termMonths||Math.round((+p.years||0)*12));
    const period=host.querySelector('[data-key="period"]');
    if(period&&document.activeElement!==period)period.value=String(p.period);
    for(const id of ['fees','handover','items']){
      const summary=host.querySelector('[data-summary="'+id+'"]');
      if(summary)summary.innerHTML=detailSummary(id,s,mobile);
    }
  }
  function refreshOffer(s) {
    const host=document.querySelector('.ms-offer');
    if(!host)return;
    const overview=host.querySelector('#msOverview');
    if(overview){const fresh=headline(s)+metrics(s);if(overview._summary!==fresh){overview.innerHTML=fresh;overview._summary=fresh;scheduleFitMetrics()}}
    const digestNode=host.querySelector('#msDigest');
    if(digestNode){const fresh=digest(s);if(digestNode._digest!==fresh){digestNode.innerHTML=fresh;digestNode._digest=fresh}}
    const values={rate:p.mode==='rate'?p.down:+s.downPct.toFixed(5),amount:Math.round(s.down/100)};
    for(const [key,value] of Object.entries(values)){
      const field=host.querySelector('[data-key="'+key+'"]');
      if(field&&document.activeElement!==field)field.value=value;
    }
  }
function savedList(){
    const matches=filteredSaved();
    if(!matches.length)return '<p class="ms-empty">'+(search ? t('لا توجد عروض مطابقة','No matching offers') : t('ستظهر العروض التي تحفظها هنا.','Your saved offers will appear here.'))+'</p>';
    const all=matches.every(o=>savedSel.has(o.id));
    const selectAll='<label class="ms-select-all"><input type="checkbox" data-saved-all '+(all?'checked':'')+'>'+t('تحديد الكل','Select all')+'</label>';
    return selectAll+'<ul class="ms-saved-list">'+matches.map(o=>{
      const title=propName(o), id=esc(o.id);
      const details=[o.offerType==='cash'?t('كاش','Cash'):t('تقسيط','Installments')];
      if(Number.isFinite(new Date(o.updated).getTime()))details.push(new Date(o.updated).toLocaleDateString(lang));
      return '<li><label class="ms-check"><input type="checkbox" data-saved-id="'+id+'" aria-label="'+esc(t('تحديد ','Select ')+title)+'" '+(savedSel.has(o.id)?'checked':'')+'></label>'+
        '<div class="ms-record"><button type="button" class="ms-open" data-act="open-'+id+'"><bdi>'+esc(title)+'</bdi></button>'+
        (o.client?'<div><bdi>'+esc(o.client)+'</bdi></div>':'')+'<small>'+details.join(' · ')+'</small></div>'+
        '<div class="ms-record-price">'+moneyPair(Math.round(Number(o.price)*100),true)+'</div>'+
        '<details class="ms-record-more"><summary aria-label="'+esc(t('إجراءات العرض ','Actions for ')+title)+'">•••</summary>'+
        '<div>'+B('open-'+id,t('فتح وتعديل','Open and edit'))+B('clone-'+id,t('إنشاء نسخة','Duplicate'))+B('drop-'+id,t('حذف','Delete'))+'</div></details></li>';
    }).join('')+'</ul>';
  }

  function savedView(){
    for(const id of savedSel)if(!saved.some(offer=>offer.id===id))savedSel.delete(id);
    const label=t('بحث باسم العميل أو الوحدة','Search by customer or property');
    return '<div class="ms-saved"><div class="ms-saved-bar">'+
      '<input id="search" class="search" type="search" aria-label="'+label+'" placeholder="'+label+'" value="'+esc(search)+'">'+
      '<button class="btn" type="button" data-act="saved-share" '+(!savedSel.size?'disabled':'')+'>'+icon('share')+t('مشاركة','Share')+
      (savedSel.size?' ('+savedSel.size+')':'')+'</button></div><div id="savedTable">'+savedList()+'</div></div>';
  }

  let compareChoices = ['',''];
  const choices=()=>[
    {id:'draft',label:p.unit||t('العرض الحالي','Current offer'),offer:p},
    ...plans.map((plan,i)=>({id:'plan-'+i,label:plan.name||t('خطة ','Plan ')+(i+1),
      offer:{...p,...plan,mode:'rate',termMonths:+plan.months||0,edits:{},hidden:[],offerType:'installments'}})),
    ...saved.map(o=>({id:'offer-'+o.id,label:[propName(o),o.client].filter(Boolean).join(' · '),offer:o}))
  ];
  function comparisonBody(){
    const list=choices();
    compareChoices=compareChoices.map((id,i)=>list.some(item=>item.id===id)?id:(list[i]||list[0]).id);
    const offers=compareChoices.map(id=>list.find(item=>item.id===id).offer);
    const results=offers.map(o=>schedule(o));
    const selectors=compareChoices.map((id,i)=>'<label class="field"><span>'+t('العرض ','Offer ')+(i?t('ب','B'):t('أ','A'))+'</span>'+
      '<select data-ms-compare="'+i+'">'+list.map(item=>'<option value="'+esc(item.id)+'" '+(item.id===id?'selected':'')+'>'+esc(item.label)+'</option>').join('')+'</select></label>').join('');
    const row=(label,values)=>'<div class="ms-compare-line"><div class="ms-compare-label">'+label+'</div>'+values.map(v=>'<div>'+v+'</div>').join('')+'</div>';
    const amount=(label,value)=>row(label,results.map(s=>s.valid?moneyPair(value(s),true):'—'));
    const metrics=[
      row(t('نوع العرض','Offer type'),results.map(s=>s.cash?t('كاش','Cash'):t('تقسيط','Installments'))),
      amount(t('سعر الوحدة','Unit price'),s=>s.price),
      row(names.down(),results.map(s=>s.cash||!s.valid?'—':moneyPair(s.down,true))),
      row(t('عدد الأقساط','Installments'),results.map(s=>s.cash||!s.valid?'—':fmt(s.count))),
      row(t('متوسط القسط','Average installment'),results.map(s=>{
        if(s.cash||!s.valid||!s.count)return '—';
        const sum=s.rows.filter(r=>r.type==='installment'&&r.value>0).reduce((acc,r)=>acc+r.value,0);
        return moneyPair(Math.round(sum/s.count),true);
      })),
      row(t('المدة بالشهور','Term in months'),results.map(s=>s.cash?'—':fmt(s.termMonths))),
      amount(names.maintenance(),s=>s.maintenance),
      amount(names.fee(),s=>s.commission)
    ];
    const gap=results[1].price-results[0].price;
    const priceDifference=results.every(s=>s.valid)?'<p class="ms-difference'+(gap===0?' is-equal':'')+'">'+
      (gap===0?t('سعر الوحدة متساوٍ في العرضين','Both offers have the same unit price'):
       (gap>0?t('سعر العرض ب أعلى بمقدار ','Offer B costs more by '):t('سعر العرض ب أقل بمقدار ','Offer B costs less by '))+moneyPair(Math.abs(gap),true))+'</p>':'';
    return '<div class="ms-compare-select">'+selectors+'</div>'+priceDifference+'<div class="ms-compare-metrics">'+metrics.join('')+'</div>';
  }

  function compare(){
    const planCards=plans.map((obj,i)=>{
      const input=(key,label,type='text')=>'<label class="field"><span>'+label+'</span><input data-plan="'+i+'" data-prop="'+key+'" type="'+type+'" '+(type==='number'?'inputmode="decimal" dir="ltr"':'dir="auto"')+' value="'+esc(obj[key]??(t('خطة ','Plan ')+(i+1)))+'"></label>';
      return '<section class="ms-plan"><div class="ms-plan-name">'+input('name',t('اسم الخطة','Plan name'))+'</div><div class="fields">'+
        input('down',names.down()+' %','number')+input('months',t('المدة بالشهور','Term in months'),'number')+'</div>'+
        '<div class="ms-plan-actions">'+B('use-'+i,t('تطبيق','Apply'),'check')+B('remove-'+i,t('حذف','Delete'),'trash')+'</div></section>';
    }).join('');
    return '<div class="ms-compare"><div id="msComparison">'+comparisonBody()+'</div>'+
      '<details class="ms-plans" data-section="mobile-plans" '+(sectionOpen.has('mobile-plans')?'open':'')+'><summary>'+t('إدارة خطط التقسيط','Manage installment plans')+'</summary>'+
      '<div class="ms-plan-actions">'+B('addPlan',t('إضافة خطة','Add plan'),'plus')+B('saveAllPlans',t('حفظ كل الخطط','Save all plans'),'save')+'</div>'+planCards+'</details></div>';
  }
  function openDetailTarget(target,section){
    if(!mobileOnly())return;
    const current=document.querySelector('.destination-pane')?.dataset.screen;
    if(current!=='details')MizanAdaptive.navigate('details');
    const reveal=()=>{
      const pane=document.querySelector('.destination-pane[data-screen="details"]');
      if(!pane)return;
      let host=null;
      if(section){
        const box=pane.querySelector('[data-section="'+section+'"]');
        if(box){
          if(box.tagName==='DETAILS'){box.open=true;if(typeof sectionOpen!=='undefined')sectionOpen.add(section)}
          host=box.matches('details')?box.querySelector('summary'):box;
        }
      }
      if(!host&&target){
        const field=pane.querySelector('[data-key="'+target+'"]');
        if(field){
          const sectionEl=field.closest('details[data-section]');
          if(sectionEl){sectionEl.open=true;if(typeof sectionOpen!=='undefined')sectionOpen.add(sectionEl.dataset.section)}
          host=field;
        }
      }
      if(!host)return;
      host.classList.add('is-detail-target');
      host.scrollIntoView({block:target?'center':'start',behavior:'smooth'});
      setTimeout(()=>host.classList.remove('is-detail-target'),1800);
    };
    requestAnimationFrame(()=>requestAnimationFrame(reveal));
  }
  const HOLD_MS=500;
  let holdTimer=0, holdLink=null, holdPoint=null, holdFired=false, suppressDetailClickUntil=0;
  function cancelDetailHold(){
    if(holdTimer){clearTimeout(holdTimer);holdTimer=0}
    if(holdFired){suppressDetailClickUntil=performance.now()+450;holdFired=false}
    if(holdLink){holdLink.classList.remove('is-holding');holdLink=null}
    holdPoint=null;
  }
  document.addEventListener('pointerdown',event=>{
    if(event.button!==undefined&&event.button!==0)return;
    const link=event.target.closest('[data-detail-target],[data-detail-section]');
    if(!link||event.target.closest('input,select,textarea'))return;
    cancelDetailHold();
    holdLink=link;holdPoint={x:event.clientX,y:event.clientY,id:event.pointerId};
    link.classList.add('is-holding');
    holdTimer=setTimeout(()=>{
      holdTimer=0;
      const target=holdLink;
      holdLink=null;holdPoint=null;
      if(!target)return;
      target.classList.remove('is-holding');
      holdFired=true;suppressDetailClickUntil=Infinity;
      openDetailTarget(target.dataset.detailTarget||'',target.dataset.detailSection||'');
    },HOLD_MS);
  },{passive:true});
  document.addEventListener('pointermove',event=>{
    if(!holdPoint||event.pointerId!==holdPoint.id)return;
    if(Math.hypot(event.clientX-holdPoint.x,event.clientY-holdPoint.y)>10)cancelDetailHold();
  },{passive:true});
  document.addEventListener('pointerup',cancelDetailHold,{passive:true});
  document.addEventListener('pointercancel',cancelDetailHold,{passive:true});
  document.addEventListener('click',event=>{
    if(performance.now()<suppressDetailClickUntil){
      event.preventDefault();event.stopPropagation();return;
    }
    const link=event.target.closest('[data-detail-target],[data-detail-section]');
    if(!link)return;
    if(event.detail===0){
      event.preventDefault();event.stopPropagation();
      openDetailTarget(link.dataset.detailTarget||'',link.dataset.detailSection||'');
    }
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const link=event.target.closest('[data-detail-target],[data-detail-section]');
    if(!link)return;
    event.preventDefault();
    openDetailTarget(link.dataset.detailTarget||'',link.dataset.detailSection||'');
  });
  document.addEventListener('change',event=>{
    const picker=event.target.closest('[data-ms-compare]');
    if(!picker)return;
    compareChoices[Number(picker.dataset.msCompare)]=picker.value;
    const panel=picker.closest('#msComparison');
    panel.innerHTML=comparisonBody();
    panel.querySelector('[data-ms-compare="'+picker.dataset.msCompare+'"]').focus({preventScroll:true});
  });
  document.addEventListener('click',event=>{
    const jump=event.target.closest('[data-ms-detail-jump]');
    if(jump){const target=document.getElementById('msDetail-'+jump.dataset.msDetailJump);if(target)target.scrollIntoView({block:'start',behavior:'smooth'});return}
    const all=event.target.closest('[data-ms-details-all]');
    if(all){const nodes=[...document.querySelectorAll('.ms-detail-acc,.ms-detail-clause')];const open=nodes.some(n=>!n.open);nodes.forEach(n=>n.open=open);all.textContent=open?t('?? ??????','Collapse items'):t('????? ????? ???????????','Show all')}
  });
  return {offer,refreshOffer,refreshDetails,details,saved:savedView,savedList,compare};
})();
