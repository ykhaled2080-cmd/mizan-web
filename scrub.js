// A click edits text. Dragging locks to the first deliberate axis.
// Desktop: mouse / trackpad. Mobile: drag a numeric field (or its ↔ grip) with a finger.
(() => {
  const selector='input[inputmode="decimal"], .compare input[type="number"]';
  const monthSelector='input[type="month"]';
  const dateTextSelector='input[data-date-text="1"]';
  let drag=null, lastBuzz=0;
  const monthPartByKey={};
  function limits(input) {
    const key=input.dataset.key||input.dataset.prop||input.id;
    if(input.dataset.item&&input.dataset.itemProp==='amount')return {step:1000,min:0,max:1e12};
    if(input.dataset.item&&input.dataset.itemProp==='day')return {step:1,min:1,max:31};
    if(/Day$/.test(key||''))return {step:1,min:1,max:31};
    const price=p.price;
    const maxDeposit=Math.max(0,price*(1-p.delivery/100));
    if(key==='years') return {step:1,min:1,max:60};
    if(key==='price')return {step:10000,min:1,max:1e12};
    if(key==='amount')return {step:1000,min:0,max:maxDeposit};
    if(key==='extra')return {step:1000,min:0,max:Math.max(0,maxDeposit-schedule(p).down/100)};
    if(key==='rowValue') {
      const current=schedule(p),row=current.rows.find(r=>r.id===editing);
      return {step:500,min:.01,max:((row?.value||0)+(current.rows.at(-1)?.balance||0))/100};
    }
    if(key==='fee'&&p.feeMode==='amount')return {step:500,min:0,max:1e12};
    const max=key==='rate'||key==='down'?100-p.delivery:key==='delivery'?100-(p.mode==='rate'?p.down:100*p.down/(price||1)):100;
    return {step:1,percent:true,min:0,max:Math.max(0,max)};
  }
  function fieldOf(el){return el.closest('.field')||el.parentElement}
  function dateParts(input){
    const value=String(input.value||'').trim();
    let match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if(match){
      const day=+match[1],month=+match[2],year=+match[3];
      if(day>=1&&day<=31&&month>=1&&month<=12&&year>=1900&&year<=2200)return {kind:'dmy',day,month,year};
      return null;
    }
    match=/^(\d{1,2})\/(\d{4})$/.exec(value);
    if(match){
      const month=+match[1],year=+match[2];
      if(month>=1&&month<=12&&year>=1900&&year<=2200)return {kind:'my',month,year};
    }
    return null;
  }
  function dateSegmentAt(input,clientX){
    const parsed=dateParts(input);
    if(!parsed)return null;
    const cs=getComputedStyle(input);
    if(!dateSegmentAt.ctx)dateSegmentAt.ctx=document.createElement('canvas').getContext('2d');
    const ctx=dateSegmentAt.ctx;
    ctx.font=(cs.fontWeight||'400')+' '+cs.fontSize+' '+cs.fontFamily;
    const rect=input.getBoundingClientRect();
    const borderLeft=parseFloat(cs.borderLeftWidth)||0;
    const paddingLeft=parseFloat(cs.paddingLeft)||0;
    let x=clientX-rect.left-borderLeft-paddingLeft;
    if(cs.direction==='rtl')x=rect.width-borderLeft-paddingLeft-(clientX-rect.left);
    const value=input.value;
    const firstSlash=value.indexOf('/');
    const secondSlash=value.indexOf('/',firstSlash+1);
    const firstBoundary=firstSlash>0?ctx.measureText(value.slice(0,firstSlash)).width:0;
    const secondBoundary=secondSlash>0?ctx.measureText(value.slice(0,secondSlash)).width:firstBoundary;
    if(parsed.kind==='dmy'){
      if(x<firstBoundary)return 'day';
      if(x<secondBoundary)return 'month';
      return 'year';
    }
    return x<firstBoundary?'month':'year';
  }
  function shiftDate(parsed,segment,delta){
    let day=parsed.day,month=parsed.month,year=parsed.year;
    if(segment==='day'&&parsed.kind==='dmy'){
      const shifted=new Date(year,month-1,day+delta);
      year=shifted.getFullYear();month=shifted.getMonth()+1;day=shifted.getDate();
    }else if(segment==='month'){
      const shifted=new Date(year,month-1+delta,1);
      year=shifted.getFullYear();month=shifted.getMonth()+1;
      if(parsed.kind==='dmy')day=Math.min(day,new Date(year,month,0).getDate());
    }else if(segment==='year'){
      year+=delta;
      if(parsed.kind==='dmy')day=Math.min(day,new Date(year,month,0).getDate());
    }else if(parsed.kind==='dmy'){
      return null;
    }
    if(year<1900||year>2200)return null;
    const pad=n=>String(n).padStart(2,'0');
    return parsed.kind==='dmy'?pad(day)+'/'+pad(month)+'/'+year:pad(month)+'/'+year;
  }
  function monthInfo(input){
    const parsed=/^(\d{4})-(\d{2})$/.exec(input.value);
    if(!parsed)return null;
    const year=+parsed[1],month=+parsed[2];
    const cs=getComputedStyle(input);
    if(!monthInfo.ctx)monthInfo.ctx=document.createElement('canvas').getContext('2d');
    const ctx=monthInfo.ctx;
    ctx.font=(cs.fontWeight||'400')+' '+cs.fontSize+' '+cs.fontFamily;
    const locale=navigator.language||'en-US';
    const monthName=new Intl.DateTimeFormat(locale,{month:'long'}).format(new Date(year,month-1,1));
    const yearName=String(year);
    const borderL=parseFloat(cs.borderLeftWidth)||0;
    const borderR=parseFloat(cs.borderRightWidth)||0;
    const padL=parseFloat(cs.paddingLeft)||0;
    const padR=parseFloat(cs.paddingRight)||0;
    const rect=input.getBoundingClientRect();
    const monthW=ctx.measureText(monthName).width;
    const spaceW=ctx.measureText(' ').width;
    const boundary=borderL+padL+monthW+spaceW*.55;
    const iconLeft=rect.width-borderR-padR-20;
    return {year,month,boundary,iconLeft};
  }
  function monthPartAt(input,clientX){
    const info=monthInfo(input);
    if(!info)return null;
    const x=clientX-input.getBoundingClientRect().left;
    if(x>info.iconLeft)return null;
    return x<=info.boundary?'month':'year';
  }
  document.addEventListener('pointerover',e=>{
    if(e.target.matches(monthSelector)){
      e.target.title=t('اسحب فوق الشهر لتغيير الشهور أو فوق السنة لتغيير السنة · عجلة الماوس أيضًا','Drag the month area to change months or the year area to change years · mouse wheel too');
      return;
    }
    if(e.target.matches(dateTextSelector)){
      e.target.title=t('اسحب فوق اليوم أو الشهر أو السنة لتغيير الجزء المحدد · عجلة الماوس أيضًا','Drag over the day, month or year to change that part · mouse wheel too');
      return;
    }
    if(!e.target.matches(selector))return;
    const range=limits(e.target);
    if(range.percent){e.target.title=t('سحب أفقي أو تمرير: 1% · سحب رأسي: 0.5%','Horizontal drag or wheel: 1% · Vertical drag: 0.5%');return}
    const step=range.step;
    e.target.title=t('اكتب القيمة أو اسحب يمينًا للزيادة ويسارًا للنقصان','Type a value or drag right to increase and left to decrease')+' · '+fmt(step);
  });
  document.addEventListener('pointerleave',e=>{
    const target=e.target;
    if(!target||!target.closest)return;
    for(const sel of [selector,dateTextSelector,monthSelector]){
      const field=target.closest(sel);
      if(field)field._mizanWheelArmed=false;
    }
  },true);
  document.addEventListener('blur',e=>{
    if(e.target&&e.target._mizanWheelArmed)e.target._mizanWheelArmed=false;
  },true);
  document.addEventListener('pointerdown',e=>{
    if(drag||e.button!==0)return;
    const month=e.target.closest(monthSelector);
    if(month){
      const parsed=/^(\d{4})-(\d{2})$/.exec(month.value);
      if(!parsed)return;
      const part=monthPartAt(month,e.clientX);
      month._mizanMonthPart=part||undefined;
      if(part&&month.dataset.key)monthPartByKey[month.dataset.key]=part;
      if(!part)return;
      month._mizanWheelArmed=true;
      drag={kind:'month',part,input:month,field:fieldOf(month),grip:null,id:e.pointerId,x:e.clientX,y:e.clientY,origin:{year:+parsed[1],month:+parsed[2]},original:month.value,active:false,touch:e.pointerType==='touch'||e.pointerType==='pen'};
      return;
    }
    const dateInput=e.target.closest(dateTextSelector);
    if(dateInput){
      const parsed=dateParts(dateInput);
      if(!parsed)return;
      const segment=dateSegmentAt(dateInput,e.clientX)||dateInput._mizanDatePart||(parsed.kind==='dmy'?'day':'month');
      dateInput._mizanDatePart=segment;
      dateInput._mizanWheelArmed=true;
      drag={kind:'datepart',input:dateInput,field:fieldOf(dateInput),segment,origin:parsed,id:e.pointerId,x:e.clientX,y:e.clientY,original:dateInput.value,active:false,touch:e.pointerType==='touch'||e.pointerType==='pen'};
      return;
    }
    const grip=e.target.closest('.grip');
    const input=grip?grip.closest('.field')?.querySelector(selector):(e.target.matches(selector)?e.target:null);
    if(!input)return;
    input._mizanWheelArmed=true;
    const value=num(input.value);
    if(!Number.isFinite(value))return;
    if(grip)e.preventDefault();
    drag={kind:'number',input,field:fieldOf(input),grip,id:e.pointerId,x:e.clientX,y:e.clientY,origin:value,original:input.value,range:limits(input),active:false,touch:e.pointerType==='touch'||e.pointerType==='pen'};
  });
  function finish(){
    if(!drag)return;
    const d=drag;drag=null;
    d.input.classList.remove('drag-active');
    d.field?.classList.remove('is-dragging');
    d.grip?.classList.remove('drag-active');
    document.documentElement.classList.remove('drag-number','drag-vertical');
    if(d.input.hasPointerCapture(d.id))d.input.releasePointerCapture(d.id);
    if(d.active && d.input.value!==d.original && (d.kind==='month'||d.kind==='datepart'||d.input.dataset.plan!==undefined||(d.input.dataset.item&&d.input.dataset.itemProp==='amount')||/Day$/.test(d.input.dataset.key||'')||d.input.dataset.itemProp==='day'))
      d.input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  document.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(!(e.buttons&1)){finish();return}
    const d=drag, dx=e.clientX-d.x, dy=d.y-e.clientY;
    if(d.kind==='datepart'){
      const dead=d.touch?8:6;
      if(!d.active){
        if(Math.abs(dx)<dead&&Math.abs(dy)<dead)return;
        if(Math.abs(dy)>Math.abs(dx)){drag=null;return}
        d.active=true;
        try{d.input.setPointerCapture(d.id)}catch{}
        d.input.classList.add('drag-active');
        d.field?.classList.add('is-dragging');
        document.documentElement.classList.add('drag-number');
      }
      e.preventDefault();
      const steps=Math.sign(dx)*Math.floor((Math.abs(dx)+6)/12);
      if(!steps)return;
      const next=shiftDate(d.origin,d.segment,steps);
      if(!next||next===d.input.value)return;
      d.input.value=next;
      d.input.dispatchEvent(new Event('input',{bubbles:true}));
      return;
    }
    if(d.kind==='month'){
      const horizontal=Math.abs(dx)>=Math.abs(dy);
      const distance=horizontal?dx:dy;
      const dead=d.touch?8:6;
      if(Math.abs(distance)<dead)return;
      if(!d.active){
        d.active=true;d.axis=horizontal?'x':'y';
        try{d.input.setPointerCapture(d.id)}catch{}
        d.input.classList.add('drag-active');
        d.field?.classList.add('is-dragging');
        document.documentElement.classList.add('drag-number');
      }
      e.preventDefault();
      const steps=Math.sign(distance)*Math.floor((Math.abs(distance)+6)/12);
      if(!steps)return;
      let next;
      if(d.part==='month'){
        const month=((d.origin.month-1+steps)%12+12)%12+1;
        next=d.origin.year+'-'+String(month).padStart(2,'0');
      }else{
        const year=Math.max(1900,Math.min(9999,d.origin.year+steps));
        next=year+'-'+String(d.origin.month).padStart(2,'0');
      }
      if(d.input.value===next)return;
      d.input.value=next;
      d.input.dispatchEvent(new Event('input',{bubbles:true}));
      if(navigator.vibrate && e.timeStamp-lastBuzz>55){lastBuzz=e.timeStamp;navigator.vibrate(6)}
      return;
    }
    if(!d.active){
      const dead=d.touch?8:6;
      const vertical=d.range.percent && Math.abs(dy)>Math.abs(dx);
      if(Math.abs(vertical?dy:dx)<dead){
        // A finger moving mostly down/up is scrolling, not dragging a value.
        if(d.touch && Math.abs(dy)>Math.abs(dx)+4) drag=null;
        return
      }
      // On touch, only horizontal drags change percentages; vertical stays a scroll.
      if(d.touch && vertical){drag=null;return}
      d.vertical=vertical;
      document.documentElement.classList.toggle('drag-vertical',!!d.vertical);
      d.active=true;
      if(d.grip||d.touch)d.input.blur();
      try{d.input.setPointerCapture(d.id)}catch{}
      d.input.classList.add('drag-active');
      d.field?.classList.add('is-dragging');
      d.grip?.classList.add('drag-active');
      document.documentElement.classList.add('drag-number');
    }
    e.preventDefault();
    const distance=d.vertical?dy:dx;
    const steps=Math.sign(distance)*Math.floor((Math.abs(distance)+6)/12);
    const next=Number(Math.min(d.range.max,Math.max(d.range.min,d.origin+steps*(d.vertical?.5:d.range.step))).toFixed(2));
    if(num(d.input.value)===next)return;
    d.input.value=String(next);
    d.input.dispatchEvent(new Event('input',{bubbles:true}));
    if(navigator.vibrate && e.timeStamp-lastBuzz>55){lastBuzz=e.timeStamp;navigator.vibrate(6)}
  });
  // Collect fine trackpad deltas without multiplying a mouse-wheel notch.
  let wheelTarget=null, remainder=0, lastWheel=0;
  document.addEventListener('wheel',e=>{
    const field=e.target;
    const monthField=field.closest?.(monthSelector);
    if(monthField){
      if(document.activeElement!==monthField||!monthField._mizanWheelArmed)return;
      if(drag||e.ctrlKey||e.metaKey||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      if(e.deltaMode===0&&Math.abs(e.deltaY)<90)return;
      const key=monthField.dataset.key||'';
      const part=monthPartByKey[key]||monthPartAt(monthField,e.clientX);
      if(!part)return;
      const info=monthInfo(monthField);if(!info)return;
      e.preventDefault();
      monthField._mizanMonthPart=part;
      if(key)monthPartByKey[key]=part;
      const direction=e.deltaY<0?1:-1;
      let next;
      if(part==='month'){
        const month=((info.month-1+direction)%12+12)%12+1;
        next=info.year+'-'+String(month).padStart(2,'0');
      }else{
        const year=Math.max(1900,Math.min(9999,info.year+direction));
        next=year+'-'+String(info.month).padStart(2,'0');
      }
      if(next===monthField.value)return;
      monthField.value=next;
      monthField.dispatchEvent(new Event('input',{bubbles:true}));
      clearTimeout(monthField._mizanWheelTimer);
      monthField._mizanWheelTimer=setTimeout(()=>monthField.dispatchEvent(new Event('change',{bubbles:true})),240);
      return;
    }
    const dateField=field.closest?.(dateTextSelector);
    if(dateField){
      if(document.activeElement!==dateField||!dateField._mizanWheelArmed)return;
      if(drag||e.ctrlKey||e.metaKey||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      if(e.deltaMode===0&&Math.abs(e.deltaY)<90)return;
      const parsed=dateParts(dateField);
      if(!parsed)return;
      const segment=dateSegmentAt(dateField,e.clientX)||dateField._mizanDatePart||'month';
      dateField._mizanDatePart=segment;
      const direction=e.deltaY<0?1:-1;
      const next=shiftDate(parsed,segment,direction);
      if(!next||next===dateField.value)return;
      e.preventDefault();
      dateField.value=next;
      dateField.dispatchEvent(new Event('input',{bubbles:true}));
      clearTimeout(dateField._mizanWheelTimer);
      dateField._mizanWheelTimer=setTimeout(()=>dateField.dispatchEvent(new Event('change',{bubbles:true})),240);
      return;
    }
    if(document.activeElement!==field||!field._mizanWheelArmed)return;
    if(drag||e.ctrlKey||e.metaKey||!field.matches(selector)||!e.deltaY||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    // Trackpad two-finger scrolling sends small pixel deltas; do not change values from it.
    // A classic mouse wheel sends deltaMode line/page or a large pixel delta.
    if(e.deltaMode===0&&Math.abs(e.deltaY)<90)return;
    const value=num(field.value);
    if(!Number.isFinite(value))return;
    e.preventDefault();
    const direction=e.deltaY<0?1:-1;
    const now=e.timeStamp;
    if(field!==wheelTarget||now-lastWheel>250||Math.sign(remainder)!==direction)remainder=0;
    wheelTarget=field;lastWheel=now;
    remainder+=direction*(e.deltaMode===0?Math.min(1,Math.abs(e.deltaY)/48):1);
    if(Math.abs(remainder)<1)return;
    remainder-=direction;
    const range=limits(field);
    const end=range.percent?Math.floor(range.max):range.max;
    const proposed=range.percent?(direction>0?Math.floor(value)+1:Math.ceil(value)-1):value+direction*range.step;
    const next=Number(Math.min(end,Math.max(range.min,proposed)).toFixed(2));
    if(next===value)return;
    field.value=String(next);
    field.dispatchEvent(new Event(field.dataset.plan===undefined?'input':'change',{bubbles:true}));
  },{passive:false});
  document.addEventListener('dragstart',e=>{if(drag)e.preventDefault()});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])
    document.addEventListener(event,e=>{if(drag?.id===e.pointerId)finish()});
  window.addEventListener('blur',finish);
})();
