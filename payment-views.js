/* Adaptive renderers for the existing schedule, keyed by engine row IDs. */
'use strict';
window.MizanPayments = (() => {
  const modes = [
    ['table', 'جدول', 'Table', 'M3 4h18v16H3zM3 9h18M3 14h18M10 4v16'],
    ['grid', 'شبكة', 'Grid', 'M3 4h7v6H3zM14 4h7v6h-7zM3 14h7v6H3zM14 14h7v6h-7z'],
    ['annual', 'سنوي', 'Annual', 'M3 6h18v15H3zM7 3v5m10-5v5M3 11h18M7 15h2m4 0h3'],
    ['groups', 'تجميع', 'Groups', 'M3 5h18M3 12h13M3 19h18M19 10l2 2-2 2']
  ];
  let modeIndex, model, owner, selecting = false, dialog = null, openerId = null;
  const expanded = new Set();
  const formatters = new Map();

  function mode() {
    if (modeIndex === undefined) modeIndex = Math.max(0, modes.findIndex(m => m[0] === read('paymentView','table')));
    return modes[modeIndex];
  }
  const glyph = path => '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>';
  const switchContent = () => '<span class="pay-switch-content">'+glyph(mode()[3])+'<span class="pay-switch-label">'+t(mode()[1],mode()[2])+'</span></span>';
  const name = row => names[row.type]() + (row.type === 'installment' && row.number ? ' ' + row.number : '');
  const isolated = value => '<bdi dir="ltr">'+esc(value)+'</bdi>';
  function amount(cents) {
    if (!formatters.has(lang)) formatters.set(lang,new Intl.NumberFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB',{maximumFractionDigits:0}));
    return isolated(formatters.get(lang).format(cents/100));
  }
  const command = (id,label,content=label,style='') => '<button type="button" data-pay-action="'+id+'" class="pay-action '+style+'" aria-label="'+esc(label)+'">'+content+'</button>';
  const allocated = row => p.allocations.some(a => +a.year === +row.date.slice(0,4) && (!a.month || +a.month === +row.date.slice(5,7)));
  const changed = row => !!(row.custom || p.edits[row.id] || p.types[row.id] || (row.generated && allocated(row)));

  // Only uninterrupted engine-generated installments following the contractual cadence may coalesce.
  function series(rows) {
    const runs = [];
    let previous, previousRegular;
    for (const row of rows) {
      const regular = row.generated && row.type === 'installment' && !changed(row);
      const consecutive = previous && +row.id.slice(1) === +previous.id.slice(1)+1;
      const onCadence = previous && fullDate(monthAfter(previous.date.slice(0,7), +p.period),p.startDay) === row.date;
      if (regular && previousRegular && consecutive && onCadence && row.date.slice(0,4) === previous.date.slice(0,4) && row.value === previous.value) {
        runs.at(-1).push(row);
      } else runs.push([row]);
      previous = row;
      previousRegular = regular;
    }
    return runs;
  }
  function yearBlocks(rows) {
    const years = new Map();
    for (const row of rows) {
      const year = row.date.slice(0,4);
      if (!years.has(year)) years.set(year,[]);
      years.get(year).push(row);
    }
    return years;
  }
  function selectorMark(row) {
    if (!selecting) return '';
    return '<span class="pay-check" aria-hidden="true">'+(selected.has(row.id) ? '✓' : '')+'</span>';
  }
  function rowTitle(row) {
    const modified = changed(row);
    return '<span class="pay-type">'+selectorMark(row)+'<span>'+esc(name(row))+(modified ? '<small class="pay-modified">'+t('معدّلة','Adjusted')+'</small>' : '')+'</span></span>';
  }
  function rowAttrs(row) {
    return 'data-pay-id="'+esc(row.id)+'"'+(selected.has(row.id)?' class="pay-picked"':'');
  }
  function rowButtonAttrs(row) {
    return ' type="button" aria-label="'+esc([name(row),dateNum(row.date),fmtDisplay(row.value),curr(),changed(row)?t('معدّلة','Adjusted'):''].filter(Boolean).join(' · '))+'"'+(selecting?' aria-pressed="'+selected.has(row.id)+'"':'');
  }
  function fmtDisplay(cents) {
    if (!formatters.has(lang)) amount(cents);
    return formatters.get(lang).format(cents/100);
  }
  function table(rows) {
    const headers = [t('نوع الدفعة','Payment'),t('الاستحقاق','Due date'),t('القيمة','Amount'),t('رصيد الوحدة','Unit balance')];
    return '<table class="pay-table"><thead><tr>'+headers.map((h,i)=>'<th scope="col" class="pay-col-'+i+'">'+h+'</th>').join('')+'</tr></thead><tbody>'+
      rows.map(r=>'<tr '+rowAttrs(r)+'><td><button'+rowButtonAttrs(r)+'>'+rowTitle(r)+'</button></td><td>'+isolated(dateNum(r.date))+'</td><td>'+amount(r.value)+'</td><td class="pay-balance">'+amount(r.balance)+'</td></tr>').join('')+'</tbody></table>';
  }
  function tile(row) {
    return '<button '+rowAttrs(row)+rowButtonAttrs(row)+'>'+rowTitle(row)+'<span class="pay-date">'+isolated(dateNum(row.date))+'</span><strong>'+amount(row.value)+'</strong></button>';
  }
  const grid = rows => '<div class="pay-grid">'+rows.map(tile).join('')+'</div>';
  function grouped(rows) {
    return series(rows).map(run => {
      if (run.length === 1) return '<div class="pay-single">'+tile(run[0])+'</div>';
      const first = run[0], last = run.at(-1), key = first.id + '/' + last.id;
      const total = run.reduce((sum,r)=>sum+r.value,0);
      const longTotal=Math.round(total/100).toString().replace(/\D/g,'').length>=10;
      return '<details class="pay-group'+(longTotal?' pay-group-long':'')+'" data-pay-run="'+esc(key)+'" '+(expanded.has(key)?'open':'')+'><summary><span><strong>'+installmentCountText(run.length)+'</strong><span class="pay-range">'+isolated(dateNum(first.date))+' – '+isolated(dateNum(last.date))+'</span></span><span><small>'+t('الإجمالي','Total')+'</small><strong>'+amount(total)+'</strong></span><span class="pay-run-info"><span>'+t('قيمة القسط','Each installment')+' '+amount(first.value)+'</span><span>'+t('الرصيد بعد آخر قسط','Balance after final installment')+' '+amount(last.balance)+'</span></span></summary>'+grid(run)+'</details>';
    }).join('');
  }
  function presentation(rows) {
    switch (mode()[0]) {
      case 'table': return table(rows);
      case 'grid': return grid(rows);
      case 'annual': return [...yearBlocks(rows)].map(([year,items])=>'<section class="pay-year"><h3>'+isolated(year)+'</h3>'+grid(items)+'</section>').join('');
      default: return grouped(rows);
    }
  }
  function switchLabel() {
    return t('تغيير طريقة عرض جدول الدفعات — العرض الحالي: ','Change payment schedule view — current view: ')+t(mode()[1],mode()[2]);
  }
  function summaryActions() {
    const rows = model.rows.filter(r=>selected.has(r.id));
    if (!selecting) return command('select',t('تحديد دفعات','Select payments'),icon('check',15)+t('تحديد','Select'))+command('add',t('إضافة دفعة','Add payment'),icon('plus',15)+t('دفعة','Payment'))+(beforeDelete?B('undo',t('تراجع','Undo'),'undo'):'');
    return command('all',t('تحديد الكل','Select all'))+command('done',t('إنهاء التحديد','Done selecting'),t('تم','Done'))+
      (rows.length && rows.every(r=>SCHEDULE_PAYMENT_TYPES.has(r.type))?B('delete',t('حذف المحدد','Delete selected'),'trash'):'')+
      (beforeDelete?B('undo',t('تراجع','Undo'),'undo'):'')+'<span class="pay-selected-total" role="status">'+paymentCountText(rows.length)+' · '+amount(rows.reduce((n,r)=>n+r.value,0))+' '+curr()+'</span>';
  }
  function sectionHTML() {
    const title = t('جدول الدفعات','Payment schedule');
    if (model.cash) return '<h2>'+title+'</h2><p class="pay-empty">'+t('عرض كاش · لا توجد أقساط.','Cash offer · no installment schedule.')+'</p>'+cashPanel(model);
    if (!model.valid) return '<h2>'+title+'</h2><p class="pay-empty" role="status">'+(model.overAllocated?t('تتجاوز الدفعات المخصصة سعر الوحدة. راجع مبالغ الأقساط.','Allocated payments exceed the unit price. Review the installment amounts.'):t('راجع سعر الوحدة والدفعات وتواريخ العرض.','Review the offer price, payments, and dates.'))+'</p>';
    const mobile = typeof MizanAdaptive !== 'undefined' && MizanAdaptive.enabled();
    const body = '<span class="pay-sr" role="status" aria-live="polite"></span><div class="pay-body">'+(model.rows.length?presentation(model.rows):'<p class="pay-empty">'+t('لا توجد دفعات','No payments')+'</p>')+'</div>';
    if(mobile){
      return '<div class="pay-topbar">'+
        '<div class="pay-topbar-actions">'+summaryActions()+'</div>'+
        '<span class="pay-topbar-count" aria-live="polite">'+paymentCountText(model.rows.length)+'</span>'+
        command('cycle',switchLabel(),switchContent(),'pay-switch pay-switch-top')+'</div>'+body;
    }
    return '<div class="pay-head"><div><h2>'+title+'</h2><span>'+paymentCountText(model.rows.length)+' · '+curr()+'</span></div>'+
      command('cycle',switchLabel(),switchContent(),'pay-switch')+'</div>'+
      '<div class="pay-toolbar">'+summaryActions()+'</div>'+body;
  }
  function bindModel(s) {
    if (owner !== p) {expanded.clear(); selecting = selected.size > 0; owner = p}
    if (selected.size) selecting = true;
    model = s;
  }
  function html(s) {
    bindModel(s);
    return '<mizan-payments>'+sectionHTML()+'</mizan-payments>';
  }
  function refresh(s) {
    const host = document.querySelector('mizan-payments');
    if (host) {bindModel(s); host.innerHTML = sectionHTML()}
  }
  function update(host, announce) {
    const toolbar = host.querySelector('.pay-toolbar, .pay-topbar-actions');
    const body = host.querySelector('.pay-body');
    if (!body) return;
    if (announce) {
      const switcher = host.querySelector('[data-pay-action="cycle"]');
      switcher.innerHTML = switchContent();
      switcher.setAttribute('aria-label',switchLabel());
      host.querySelector('.pay-sr').textContent = t(mode()[1],mode()[2]);
    }
    if (toolbar) toolbar.innerHTML = summaryActions();
    body.innerHTML = presentation(model.rows);
    if (announce && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      body.getAnimations().forEach(animation=>animation.cancel());
      body.animate([{opacity:0.7},{opacity:1}],{duration:125,easing:'ease-out'});
    }
  }

  function focusRow(id) {
    if (!id) return;
    const entry = document.querySelector('mizan-payments [data-pay-id="'+CSS.escape(id)+'"]');
    const target = entry?.matches('button') ? entry : entry?.querySelector('button');
    target?.focus({preventScroll:true});
  }
  function scrollParent(host) {
    for (let el=host.parentElement; el; el=el.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight>el.clientHeight) return el;
    }
    return document.scrollingElement;
  }
  function cycle(host) {
    const viewport = scrollParent(host);
    const boundaryEl = host.querySelector('.pay-topbar, .pay-head');
    const boundary = boundaryEl ? boundaryEl.getBoundingClientRect().bottom : 0;
    const visible = Array.from(host.querySelectorAll('[data-pay-id]')).find(el=>el.getClientRects().length && el.getBoundingClientRect().bottom > boundary);
    const anchor = viewport.scrollTop && visible ? {id:visible.dataset.payId,top:visible.getBoundingClientRect().top} : null;
    modeIndex = (modeIndex+1)%modes.length;
    try {write('paymentView',mode()[0])} catch {}
    update(host,true);
    if (anchor) {
      const entry = host.querySelector('[data-pay-id="'+CSS.escape(anchor.id)+'"]');
      const container = entry?.closest('.pay-group');
      const target = container && !container.open ? container : entry;
      if (target) viewport.scrollTop += target.getBoundingClientRect().top - anchor.top;
    }
  }
  function closeEditor(ask=false) {
    if (!dialog) return false;
    if (ask && dialog.dataset.dirty && !confirm(t('تجاهل تعديلات هذه الدفعة؟','Discard the changes to this payment?'))) return true;
    const closed = dialog;
    dialog = null;
    closed.close(); closed.remove();
    focusRow(openerId);
    return true;
  }
  function clearSelection() {
    selecting = false;
    selected.clear();
    const host = document.querySelector('mizan-payments');
    if (host) {update(host,false); host.querySelector('[data-pay-action="select"]')?.focus({preventScroll:true})}
  }
  function back() {
    if (dialog) return closeEditor(true);
    if (selecting && document.querySelector('mizan-payments')) {clearSelection(); return true}
    return false;
  }
  function editForm(row) {
    const creating = !row;
    const due = (row || model.rows.at(-1))?.date || p.start;
    const types = creating ? [['installment',names.installment()],['payment',names.payment()]] : rowTypeChoices(row,rowSource(row));
    const uniqueTypes = new Map(types);
    const current = creating ? 'installment' : row.type;
    const dateLabel = t('تاريخ الاستحقاق','Due date');
    const piece = (key,label,value,maxLength,placeholder) => '<label><span>'+label+'</span><input name="'+key+'" type="text" inputmode="numeric" dir="ltr" maxlength="'+maxLength+'" value="'+esc(value)+'" placeholder="'+placeholder+'"></label>';
    return '<form class="pay-editor"><div class="pay-handle" aria-hidden="true"></div><div class="pay-edit-head"><h2 id="pay-editor-title">'+(creating?t('إضافة دفعة','Add payment'):esc(name(row)))+'</h2>'+
      (creating?'':'<p>'+t('رصيد الوحدة','Unit balance')+' · '+amount(row.balance)+' '+curr()+'</p>')+'</div><div class="pay-fields">'+
      '<label class="pay-field"><span>'+t('نوع الدفعة','Payment type')+'</span><select name="kind">'+[...uniqueTypes].map(([v,l])=>'<option value="'+v+'"'+(v===current?' selected':'')+'>'+l+'</option>').join('')+'</select></label>'+
      '<label class="pay-field"><span>'+t('المبلغ','Amount')+' · '+curr()+'</span><input name="amount" type="text" dir="ltr" inputmode="decimal" value="'+(creating?'':row.value/100)+'" required></label>'+
      '<fieldset><legend>'+dateLabel+'</legend><div class="pay-date-input" dir="ltr">'+piece('day',t('يوم (اختياري)','Day (optional)'),due.slice(8,10),2,'DD')+piece('month',t('شهر','Month'),due.slice(5,7),2,'MM')+piece('year',t('سنة','Year'),due.slice(0,4),4,'YYYY')+'</div></fieldset>'+
      (row?.maintenanceSplit?'<p>'+t('تعديل هذه الدفعة يغيّر إجمالي وديعة الصيانة الموزعة.','Changing this payment adjusts the total split maintenance deposit.')+'</p>':'')+
      '<p class="pay-error" id="pay-editor-error" role="alert"></p></div><div class="pay-editor-actions">'+command('cancel',t('إلغاء','Cancel'))+'<button type="submit" class="pay-action pay-primary">'+t('حفظ','Save')+'</button></div></form>';
  }
  function error(form,key,message) {
    const input = form.elements[key];
    form.querySelector('.pay-error').textContent = message;
    input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','pay-editor-error');input.focus();
  }
  function saveEditor(form,row) {
    const fields = form.elements;
    const value = num(fields.amount.value);
    if (!Number.isFinite(value) || value<=0 || !Number.isSafeInteger(Math.round(value*100))) return error(form,'amount',t('أدخل مبلغًا أكبر من صفر.','Enter an amount greater than zero.'));
    const year = num(fields.year.value), month = num(fields.month.value), dayText = fields.day.value.trim();
    if (!Number.isInteger(year)||year<1900||year>2200) return error(form,'year',t('أدخل سنة من 1900 إلى 2200.','Enter a year from 1900 to 2200.'));
    if (!Number.isInteger(month)||month<1||month>12) return error(form,'month',t('أدخل شهرًا من 1 إلى 12.','Enter a month from 1 to 12.'));
    const date = year + '-' + String(month).padStart(2,'0'), day = dayText ? num(dayText) : '';
    if (dayText && (!Number.isInteger(day)||day<1||day>daysInMonth(date))) return error(form,'day',t('تحقق من اليوم في هذا الشهر.','Enter a valid day for this month.'));
    if (date<p.start) return error(form,'month',t('تاريخ الدفعة يسبق بداية التعاقد.','The payment date precedes the contract start.'));
    const valueCents = Math.round(value*100);
    if (valueCents<=0) return error(form,'amount',t('أدخل مبلغًا أكبر من صفر.','Enter an amount greater than zero.'));
    const kind = fields.kind.value;
    const candidate = structuredClone(p);
    let id = row?.id;
    if (row) {
      if (!applyRowEdit(row,kind,{month:date,day},valueCents,candidate)) return error(form,'kind',t('راجع نوع الدفعة وتاريخها.','Review the payment type and date.'));
    } else id = addCustomPayment(fullDate(date,day),kind,valueCents,candidate);
    if (!schedule(candidate).valid) return error(form,'amount',t('لا يمكن تسوية هذه الدفعة مع سعر الوحدة. راجع المبلغ والخطة.','This amount cannot be reconciled with the unit price. Review the amount and plan.'));
    Object.assign(p,candidate);
    beforeDelete = null;
    closeEditor();
    persist();render();focusRow(id);
  }
  function openEditor(row,trigger) {
    if (dialog) return;
    openerId = row?.id;
    const sheet = document.createElement('dialog');
    dialog = sheet;
    sheet.className = 'pay-sheet';
    sheet.setAttribute('aria-labelledby','pay-editor-title');
    sheet.innerHTML = editForm(row);
    document.body.append(sheet);
    const form = sheet.querySelector('form');
    form.noValidate = true;
    form.addEventListener('submit',event=>{event.preventDefault();saveEditor(form,row)});
    form.addEventListener('input',event=>{
      sheet.dataset.dirty = 'true';
      form.querySelector('.pay-error').textContent = '';
      event.target.removeAttribute('aria-invalid');
    });
    sheet.querySelector('[data-pay-action="cancel"]').addEventListener('click',()=>closeEditor());
    sheet.addEventListener('cancel',event=>{event.preventDefault();closeEditor(true)});
    sheet.addEventListener('click',event=>{
      if (event.target!==sheet) return;
      const b=sheet.getBoundingClientRect();
      if (event.clientX<b.left || event.clientX>b.right || event.clientY<b.top || event.clientY>b.bottom) closeEditor(true);
    });
    sheet.addEventListener('keydown',event=>{
      if (event.key==='Escape') {event.preventDefault();event.stopPropagation();closeEditor(true)}
    });
    const handle = sheet.querySelector('.pay-handle');
    let drag;
    handle.addEventListener('pointerdown',event=>{
      if (event.button!==0) return;
      drag = {id:event.pointerId,y:event.clientY,t:event.timeStamp};handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove',event=>{
      if (event.pointerId!==drag?.id) return;
      sheet.style.translate = '0 '+Math.max(0,event.clientY-drag.y)+'px';
    });
    const release = event=>{
      if (event.pointerId!==drag?.id) return;
      const dy = event.clientY-drag.y, velocity = dy/Math.max(1,event.timeStamp-drag.t);
      drag=null;sheet.style.translate='';
      if (event.type==='pointerup' && (dy>sheet.clientHeight*0.3 || dy>35&&velocity>0.5)) closeEditor(true);
    };
    handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);
    sheet.addEventListener('close',()=>{
      if (trigger?.isConnected) trigger.focus({preventScroll:true});
      if (window.visualViewport) {
        visualViewport.removeEventListener('resize',fit);
        visualViewport.removeEventListener('scroll',fit);
      }
    },{once:true});
    function fit() {
      if (!window.visualViewport) return;
      sheet.style.setProperty('--pay-vh',visualViewport.height+'px');
      sheet.style.setProperty('--pay-keyboard',Math.max(0,innerHeight-visualViewport.height-visualViewport.offsetTop)+'px');
    }
    if (window.visualViewport) {visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit);fit()}
    // Start on the title so viewing details never forces the keyboard open.
    const heading = sheet.querySelector('h2');
    heading.tabIndex=-1;heading.autofocus=true;sheet.showModal();heading.focus({preventScroll:true});
  }
  class PaymentViews extends HTMLElement {
    connectedCallback() {
      this.events?.abort();
      this.events = new AbortController();
      const opts = {signal:this.events.signal};
      this.addEventListener('click',event=>this.activate(event),opts);
      this.addEventListener('toggle',event=>{
        const key = event.target.dataset.payRun;
        if (key) event.target.open ? expanded.add(key) : expanded.delete(key);
      },{...opts,capture:true});
      this.addEventListener('keydown',event=>{
        if (event.key==='Escape' && selecting) {event.stopPropagation();clearSelection()}
      },opts);
    }
    disconnectedCallback() {this.events?.abort()}
    activate(event) {
      const action = event.target.closest('[data-pay-action]')?.dataset.payAction;
      const entry = event.target.closest('[data-pay-id]');
      if (action==='cycle') return cycle(this);
      if (action==='add') return openEditor(null,event.target.closest('button'));
      if (action==='done') return clearSelection();
      if (action==='select' || action==='all') {
        selecting=true;
        if (action==='all') {
          const all = model.rows.every(r=>selected.has(r.id));
          selected.clear();if (!all) model.rows.forEach(r=>selected.add(r.id));
        }
        update(this,false);
        this.querySelector('[data-pay-action="all"]').focus({preventScroll:true});
      }
      if (!entry) return;
      const row = model.rows.find(r=>r.id===entry.dataset.payId);
      if (!row) return;
      if (selecting) {
        if (selected.has(row.id)) selected.delete(row.id); else selected.add(row.id);
        update(this,false);focusRow(row.id);
      } else openEditor(row,entry.matches('button') ? entry : entry.querySelector('button'));
    }
  }
  customElements.define('mizan-payments',PaymentViews);
  return {html, refresh, back};
})();

