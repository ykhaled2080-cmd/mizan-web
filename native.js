/* Android adapters for the same files produced by the document exporter. */
(function () {
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.() || cap.getPlatform() !== 'android') return;
  document.documentElement.classList.add('android-app');

  const words = (ar, en) => document.documentElement.lang === 'en' ? en : ar;
  const plugins = cap.Plugins;

  async function prepare(files) {
    const folder = 'mizan/' + crypto.randomUUID();
    const prepared = [];
    for (const [i, file] of files.entries()) {
      if (!file?.base64) throw new Error(words('تعذر تجهيز الملف.', 'Could not prepare the file.'));
      const name = String(file.name || 'Mizan').replace(/[\\/:*?"<>|]/g, '-').slice(-96);
      const path = folder + '/' + i + '/' + name;
      const entry = await plugins.Filesystem.writeFile({path, data: file.base64, directory: 'CACHE', recursive: true});
      if (!entry.uri) throw new Error(words('تعذر تجهيز الملف.', 'Could not prepare the file.'));
      prepared.push({uri: entry.uri, name, mime: file.mime || 'application/octet-stream'});
    }
    return prepared;
  }

  async function share(payload, prepared) {
    if (!prepared.length && payload.kind !== 'text') {
      throw new Error(words('لا توجد ملفات للمشاركة.', 'No files to share.'));
    }
    const title = payload.action === 'whatsapp' ? words('مشاركة عبر واتساب', 'Share via WhatsApp') : words('مشاركة ميزان', 'Share MIZAN');
    const options = {title: 'MIZAN', text: payload.text || '', dialogTitle: title};
    if (prepared.length) options.files = prepared.map(file => file.uri);
    try {
      await plugins.Share.share(options);
    } catch (err) {
      if (/cancel/i.test(String(err.message))) return {canceled: true};
      throw err;
    }
    return {ok: true, method: 'shareui', count: prepared.length, kind: payload.kind,
      message: words('فُتحت نافذة المشاركة على الجهاز.', 'The Android share sheet opened.')};
  }

  window.MizanAndroidBridge = {
    async handle(payload) {
      if (payload.action === 'copy_text') {
        await plugins.Clipboard.write({string: String(payload.text || '')});
        return {ok: true, method: 'clipboard-text'};
      }
      const files = await prepare(payload.files || []);
      switch (payload.action) {
        case 'whatsapp':
        case 'shareui':
          return share(payload, files);
        case 'open':
          if (!files.length) throw new Error(words('لا يوجد ملف.', 'No file to open.'));
          return plugins.FileOpener.open({filePath: files[0].uri, contentType: files[0].mime});
        case 'save':
        case 'save_many':
          return plugins.MizanDocuments.save({files});
        case 'copy_files':
        case 'copy_image':
          return plugins.MizanDocuments.copyFiles({files});
        default:
          throw new Error(words('الإجراء غير متاح على أندرويد.', 'This action is unavailable on Android.'));
      }
    }
  };

  let themeObserver;
  let backListener;
  let insetTimer;
  const surfaceColor = element => {
    if (!element) return '';
    const color = getComputedStyle(element).backgroundColor;
    return color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent' ? color : '';
  };
  function syncBars() {
    const root = document.documentElement;
    const dark = root.hasAttribute('data-dark');
    const header = document.getElementById('header');
    const nav = document.getElementById('mobilenav');
    const color = surfaceColor(header) || surfaceColor(nav) ||
      getComputedStyle(root).getPropertyValue('--surface').trim();
    const navColor = surfaceColor(nav) || color;
    plugins.MizanInsets.setAppearance({dark, color, navColor}).catch(() => {});
  }
  async function syncInsets() {
    try {
      const insets = await plugins.MizanInsets.getInsets();
      const root = document.documentElement;
      const vars = {top:'--android-inset-top',bottom:'--android-inset-bottom',
        left:'--android-inset-left',right:'--android-inset-right'};
      for (const [key, name] of Object.entries(vars)) {
        const value = Math.max(0,Number(insets?.[key]) || 0);
        root.style.setProperty(name, value + 'px');
      }
    } catch {}
  }
  function scheduleInsets() {
    syncInsets();
    syncBars();
    clearTimeout(insetTimer);
    insetTimer = setTimeout(() => {
      syncInsets();
      syncBars();
      insetTimer = setTimeout(() => {
        syncInsets();
        syncBars();
      }, 750);
    }, 220);
  }
  async function start() {
    themeObserver = new MutationObserver(syncBars);
    themeObserver.observe(document.documentElement, {attributes:true, attributeFilter:['data-dark','data-theme-id','data-nav-style']});
    window.addEventListener('mizan:appearance', () => { syncBars(); scheduleInsets(); });
    const listener = plugins.App.addListener('backButton', () => {
      if (window.MizanShare?.handleBack?.() || window.MizanNativeBack?.()) return;
      plugins.App.minimizeApp();
    });
    const launch = document.getElementById('mizanLaunch');
    let launchDismissed = false;
    const dismissLaunch = () => {
      if (launchDismissed || !launch) return;
      launchDismissed = true;
      launch.classList.add('is-done');
      document.documentElement.classList.remove('mizan-launching');
      setTimeout(() => launch.remove(), 240);
    };
    setTimeout(dismissLaunch, 2200);
    syncBars();
    await syncInsets();
    scheduleInsets();
    setTimeout(dismissLaunch, 600);
    plugins.SplashScreen.hide().catch(() => {});
    backListener = await listener;
  }
  window.addEventListener('load', scheduleInsets);
  window.addEventListener('resize', scheduleInsets);
  window.addEventListener('orientationchange', scheduleInsets);
  window.visualViewport?.addEventListener('resize', syncInsets);
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    clearTimeout(insetTimer);
    window.removeEventListener('load', scheduleInsets);
    window.removeEventListener('resize', scheduleInsets);
    window.removeEventListener('orientationchange', scheduleInsets);
    window.visualViewport?.removeEventListener('resize', syncInsets);
    themeObserver?.disconnect();
    backListener?.remove();
  }, {once:true});
  start();
})();
