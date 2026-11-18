/* The adaptive shell owns destinations and scroll positions. Offer data stays in app.js. */
const MizanAdaptive = (() => {
  const compact = matchMedia('(max-width: 767px), (pointer: coarse) and (max-height: 600px)');
  const tabletPortrait = matchMedia('(min-width: 768px) and (orientation: portrait) and (any-pointer: coarse)');
  const wide = matchMedia('(min-width: 980px) and (orientation: landscape)');
  const nativeAndroid = window.Capacitor?.getPlatform?.() === 'android';
  /* Phones and portrait tablets use the adaptive mobile shell. Landscape
     tablets and desktop browsers keep the original desktop-like workspace. */
  const enabled = () => tabletPortrait.matches || (nativeAndroid || window.chrome?.webview
    ? matchMedia('(max-width:760px), (pointer:coarse) and (max-height:600px)').matches
    : compact.matches);
  const routes = () => p.offerType==='cash' ? ['details','calc','saved','compare'] : ['details','calc','payments','saved','compare'];
  const scroll = new Map();
  let mounted = null;
  let activeOffer = null;
  let collapsed = false;
  const labels = () => ({
    details: t('التفاصيل','Details'), calc: t('العرض','Offer'), payments: t('الدفعات','Payments'),
    saved: t('المحفوظة','Saved'), compare: t('المقارنة','Compare')
  });
  const pageTitle = () => page==='details' ? t('تفاصيل العرض','Offer details') : page==='saved' ? t('العروض المحفوظة','Saved offers') : labels()[page];
  const split = () => wide.matches && (page === 'calc' || page === 'payments');
  function remember() {
    for (const pane of document.querySelectorAll('.destination-pane')) {
      if (pane.clientHeight) scroll.set(pane.dataset.screen, pane.scrollTop);
    }
    for (const section of document.querySelectorAll('[data-section]')) {
      if(section.open) sectionOpen.add(section.dataset.section);
      else sectionOpen.delete(section.dataset.section);
    }
  }
  function context() {
    const node = document.getElementById('adaptive-context');
    if (node) node.textContent = p.unit || p.client || offerTitle(p);
  }
  function header() {
    const iconButton = (act, label, glyph) => '<button type="button" data-act="'+act+'" title="'+label+'" aria-label="'+label+'">'+icon(glyph,20)+'</button>';
    const titleHtml = pageTitle();
    const isOffer = ['calc','payments'].includes(page);
    const dark = document.documentElement.hasAttribute('data-dark');
    const toolsClass = isOffer ? 'adaptive-tools' : 'adaptive-tools tools-solo';
    $('#header').innerHTML = '<div class="adaptive-head"><div class="adaptive-heading"><h1>'+titleHtml+'</h1>'+(isOffer?'<bdi dir="auto" id="adaptive-context"></bdi>':'')+'</div><div class="'+toolsClass+'">'+
      '<details class="adaptive-menu"><summary aria-label="'+t('خيارات','Options')+'">⋯</summary><div><button data-act="appearance">'+t('المظهر','Appearance')+'</button><button data-act="lang">'+t('English','العربية')+'</button><button data-act="theme-toggle">'+(dark?t('الوضع الفاتح','Light theme'):t('الوضع الداكن','Dark theme'))+'</button></div></details>'+
      (isOffer ? iconButton('save',t('حفظ العرض','Save offer'),'save')+iconButton('wa-share',t('مشاركة العرض','Share offer'),'share'):'')+
      '</div></div>';
    context();
    const glyph = {details:'details',calc:'calc',payments:'list',saved:'saved',compare:'compare'};
    $('#mobilenav').innerHTML = '<nav class="destination-nav nav-style-'+(window.MizanAppearance?MizanAppearance.get().navStyle:'A')+'" aria-label="'+t('التنقل الرئيسي','Main navigation')+'">'+routes().map(key=>
      '<button type="button" data-destination="'+key+'"'+(key===page?' aria-current="page"':'')+'>'+icon(glyph[key],21)+'<span>'+labels()[key]+'</span></button>').join('')+'</nav>';
    if(window.MizanBrand)MizanBrand.apply();
  }
  function pane(key, html) {
    return '<section class="destination-pane" tabindex="-1" data-screen="'+key+'" aria-label="'+labels()[key]+'">'+html+'</section>';
  }
  function paneHtml(key){
    if(key==='calc') return pane('calc',MizanMobileScreens.offer(schedule(p)));
    if(key==='payments') return pane('payments',MizanPayments.html(schedule(p)));
    if(key==='details') return pane('details',MizanMobileScreens.details(schedule(p)));
    if(key==='saved') return pane('saved',MizanMobileScreens.saved());
    if(key==='compare') return pane('compare',MizanMobileScreens.compare());
    return '';
  }
  function panelControl() {
    const control = document.querySelector('[data-panel-toggle]');
    if (!control) return;
    A.classList.toggle('offer-collapsed',collapsed);
    control.setAttribute('aria-expanded',String(!collapsed));
    control.textContent = collapsed?t('إظهار بيانات العرض','Show offer details'):t('إخفاء بيانات العرض','Hide offer details');
  }
  function renderScreen() {
    if(!routes().includes(page)) page='calc';
    if(activeOffer!==p) {
      scroll.delete('calc');scroll.delete('payments');activeOffer=p;
    } else remember();
    const two = split();
    A.classList.toggle('two-pane',two);
    A.classList.toggle('offer-collapsed',two && collapsed);
    let html;
    if(two && (page==='calc' || page==='payments')) {
      const s = schedule(p);
      html = pane('calc',MizanMobileScreens.offer(s))+
        pane('payments','<button class="pane-toggle" type="button" data-panel-toggle></button>'+MizanPayments.html(s));
    } else {
      html = paneHtml(page);
    }
    A.innerHTML=html;
    panelControl();
    for(const el of A.querySelectorAll('.destination-pane')) el.scrollTop=scroll.get(el.dataset.screen)||0;
    if(mounted !== page) {
      const target=A.querySelector('[data-screen="'+page+'"]');
      if(mounted && target) target.focus({preventScroll:true});
      if(!matchMedia('(prefers-reduced-motion:reduce)').matches) target?.animate([{opacity:.82},{opacity:1}],{duration:140});
    }
    mounted=page;
    bindSwipe();
  }
  function navigate(next,push=true) {
    if(!routes().includes(next)) return;
    if(next==='calc') collapsed=false;
    if(next==='payments' && wide.matches) collapsed=true;
    if(next===page && mounted===page){panelControl();return}
    if(push) history.pushState({mizanPage:next,mizanDepth:(history.state?.mizanDepth||0)+1},'');
    page=next;
    render();
  }
  function activatedFromAction(next) {
    if(enabled()) history.pushState({mizanPage:next,mizanDepth:(history.state?.mizanDepth||0)+1},'');
    collapsed=false;
    return next;
  }
  let swipeBound=false;
  function bindSwipe(){
    if(swipeBound) return; swipeBound=true;
    let start=null,gesture=false,settling=false,dir=0,neighborKey=null,currentPane=null,neighborPane=null,sign=0,width=0,gestureSign=0,clickGuard=0;
    const allow=target=>{
      const numeric=target.closest('input[inputmode="decimal"]');
      if(numeric&&document.activeElement!==numeric)return true;
      const grip=target.closest('.grip');
      if(grip){
        const field=grip.closest('.field')?.querySelector('input[inputmode="decimal"]');
        if(field&&document.activeElement!==field)return true;
      }
      return !target.closest('input,textarea,select,label,a,[contenteditable],.tablewrap,.schedule-grid,.pdf-page,.share-root,.alloc-editor,.ms-plan,.ms-record-more,.pv-layer,.date-seg,.pay-topbar,.pay-head,.pay-toolbar,.pay-sheet');
    };
    const blocked=()=>!!document.querySelector('.ap-host.on,.share-root .share-sheet,.pv-layer.on')||!!window.getSelection?.().toString();
    const neighborFor=dx=>{
      const list=routes(),index=list.indexOf(page);
      /* The visible RTL strip runs details → calc → payments → saved → compare.
         A right-to-left finger movement must open the page visually to the right,
         and a left-to-right movement the page visually to the left. */
      const direction=(document.documentElement.dir==='ltr'?1:-1)*(dx<0?1:-1);
      return {key:list[index+direction],direction};
    };
    const clearPager=()=>{
      A.classList.remove('pager-active','pager-animating');
      if(currentPane){currentPane.style.transform='';currentPane.style.willChange='';currentPane.classList.remove('swipe-current')}
      if(neighborPane){neighborPane.remove();neighborPane=null}
      currentPane=null;neighborKey=null;width=0;sign=0;
    };
    const mountNeighbor=(key,side)=>{
      currentPane=A.querySelector('.destination-pane');
      if(!currentPane) return false;
      const holder=document.createElement('div');
      holder.innerHTML=paneHtml(key);
      const node=holder.firstElementChild;
      if(!node) return false;
      node.classList.add('swipe-neighbor');
      node.setAttribute('aria-hidden','true');
      node.setAttribute('inert','');
      node.tabIndex=-1;
      node.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      A.appendChild(node);
      neighborPane=node;
      width=A.clientWidth||innerWidth;
      sign=side;
      currentPane.classList.add('swipe-current');
      currentPane.style.willChange='transform';
      node.style.willChange='transform';
      A.classList.add('pager-active');
      return true;
    };
    const place=dx=>{
      if(!currentPane) return;
      const resisted=neighborPane?dx:dx*.3;
      currentPane.style.transform='translate3d('+resisted+'px,0,0)';
      if(neighborPane) neighborPane.style.transform='translate3d('+((sign*width)+dx)+'px,0,0)';
    };
    A.addEventListener('click',event=>{
      if(performance.now()>clickGuard)return;
      clickGuard=0;
      event.preventDefault();
      event.stopPropagation();
    },true);
    A.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'||settling||start) return;
      if(blocked()||!allow(event.target)) return;
      start={x:event.clientX,y:event.clientY,at:performance.now(),id:event.pointerId};
      gesture=false;
    });
    A.addEventListener('pointermove',event=>{
      if(!start||event.pointerId!==start.id||settling) return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(!gesture){
        if(Math.abs(dx)<6) return;
        if(Math.abs(dx)<=Math.abs(dy)*1.25){
          if(Math.abs(dy)>8) start=null;
          return;
        }
        if(Math.abs(dy)>Math.abs(dx)){start=null;return}
        gesture=true;
        gestureSign=dx<0?1:-1;
        clickGuard=performance.now()+450;
        try{A.setPointerCapture(event.pointerId)}catch{}
        const next=neighborFor(dx);
        dir=next.direction;
        if(next.key){
          neighborKey=next.key;sign=dx<0?1:-1;
          if(!mountNeighbor(next.key,sign)){gesture=false;return}
        }else{
          currentPane=A.querySelector('.destination-pane');
          width=A.clientWidth||innerWidth;sign=dx<0?1:-1;
          A.classList.add('pager-active');
          if(currentPane){currentPane.classList.add('swipe-current');currentPane.style.willChange='transform'}
        }
      }
      if(gesture)place(dx);
    });
    const finish=event=>{
      if(!start) return;
      const dx=event.clientX-start.x,dy=event.clientY-start.y,elapsed=performance.now()-start.at;
      const was=gesture,id=start.id;
      start=null;gesture=false;
      try{A.releasePointerCapture(id)}catch{}
      if(!was){clearPager();return}
      const limit=Math.max(72,width*.27);
      const fast=Math.abs(dx)/Math.max(1,elapsed)>.6&&Math.abs(dx)>Math.max(28,width*.09);
      const sameDirection=(dx<0?1:-1)===gestureSign;
      const commit=!!neighborPane&&sameDirection&&(Math.abs(dx)>limit||fast);
      settling=true;
      A.classList.add('pager-animating');
      if(currentPane) currentPane.style.transform='translate3d('+(-(commit?sign*width:0))+'px,0,0)';
      if(neighborPane) neighborPane.style.transform='translate3d('+(commit?0:sign*width)+'px,0,0)';
      let doneCalled=false;
      const done=()=>{
        if(doneCalled) return; doneCalled=true;
        settling=false;
        const key=neighborKey;
        if(commit&&key) navigate(key);
        clearPager();
      };
      if(matchMedia('(prefers-reduced-motion:reduce)').matches){done();return}
      const timer=setTimeout(done,280);
      const onEnd=e=>{if(e&&e.propertyName&&e.propertyName!=='transform')return;clearTimeout(timer);done()};
      currentPane?.addEventListener('transitionend',onEnd,{once:true});
      neighborPane?.addEventListener('transitionend',onEnd,{once:true});
    };
    A.addEventListener('pointerup',finish);
    A.addEventListener('pointercancel',()=>{
      if(!start) return;
      if(neighborPane||gesture){
        const id=start.id;start=null;gesture=false;try{A.releasePointerCapture(id)}catch{};
        settling=false;clearPager();
      }else{start=null;gesture=false}
    });
  }
  function back() {
    if(!enabled()) return false;
    if(window.MizanPayments?.back()) return true;
    const menu=document.querySelector('.adaptive-menu[open], details.pop[open]');
    if(menu){menu.open=false;return true}
    if(history.state?.mizanDepth){history.back();return true}
    if(page!=='calc'){navigate('calc',false);return true}
    return false;
  }
  function adaptPanes() {
    if(!enabled() || !mounted || !['calc','payments'].includes(page)) return;
    const two=split();
    const siblingKey=page==='calc'?'payments':'calc';
    const sibling=A.querySelector('[data-screen="'+siblingKey+'"]');
    remember();
    A.classList.toggle('two-pane',two);
    if(two && !sibling){
      const s=schedule(p);
      if(siblingKey==='calc') A.insertAdjacentHTML('afterbegin',pane('calc',MizanMobileScreens.offer(s)));
      else A.insertAdjacentHTML('beforeend',pane('payments',MizanPayments.html(s)));
      A.querySelector('[data-screen="'+siblingKey+'"]').scrollTop=scroll.get(siblingKey)||0;
    } else if(!two && sibling) sibling.remove();
    const payments=A.querySelector('[data-screen="payments"]');
    if(two && !payments.querySelector('[data-panel-toggle]')) payments.insertAdjacentHTML('afterbegin','<button class="pane-toggle" type="button" data-panel-toggle></button>');
    if(!two) {payments?.querySelector('[data-panel-toggle]')?.remove();A.classList.remove('offer-collapsed')}
    else panelControl();
  }
  function resize() {
    if(enabled()===document.documentElement.classList.contains('mizan-adaptive')){adaptPanes();return}
    if(!enabled() && page==='payments') page='calc';
    if(!enabled()) mounted=null;
    render();
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-act="theme-toggle"]')){
      event.preventDefault();event.stopPropagation();
      window.MizanAppearance?.toggleMode?.();
      const m=document.querySelector('.adaptive-menu[open]');if(m)m.open=false;
      return;
    }
  },true);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-act="appearance"]')){event.preventDefault();window.MizanAppearance?.open?.();const m=document.querySelector('.adaptive-menu[open]');if(m)m.open=false;return}
    const dest=event.target.closest('[data-destination]');
    if(dest){navigate(dest.dataset.destination);return}
    if(event.target.closest('[data-panel-toggle]')){collapsed=!collapsed;panelControl();return}
    const menu=document.querySelector('.adaptive-menu[open]');
    if(menu && !menu.contains(event.target)) menu.open=false;
  });
  compact.addEventListener('change',resize);
  tabletPortrait.addEventListener('change',resize);
  wide.addEventListener('change',adaptPanes);
  if(window.chrome?.webview) matchMedia('(max-width:760px)').addEventListener('change',resize);
  window.addEventListener('popstate',event=>{if(enabled()) navigate(event.state?.mizanPage||'calc',false)});
  return {enabled,header,context,renderScreen,back,activatedFromAction,navigate,
    initial:()=>{if(!enabled())return 'calc';const saved=history.state?.mizanPage;return ['details','calc','payments','saved','compare'].includes(saved)?saved:'calc'}};
})();
