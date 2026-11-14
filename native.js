/* MIZAN Android bridge: native sharing, files, clipboard, status bar and Back. */
(function () {
  const Cap = window.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform() || Cap.getPlatform() !== 'android') return;
  document.documentElement.classList.add('android-app');

  const plugin = name => (Cap.Plugins && Cap.Plugins[name]) || null;
  const ready = () => new Promise(resolve => {
    if (Cap.Plugins) return resolve();
    document.addEventListener('deviceready', resolve, { once: true });
    setTimeout(resolve, 2500);
  });

  function safeName(name) {
    const raw = String(name || 'mizan-file').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    return raw.slice(-96) || 'mizan-file';
  }

  async function writeFiles(files) {
    const FS = plugin('Filesystem');
    if (!FS) throw new Error('Filesystem plugin is unavailable');
    const uris = [];
    let index = 0;
    const folder = 'mizan/' + Date.now();
    for (const file of files || []) {
      if (!file || !file.base64) continue;
      index++;
      const path = folder + '/' + index + '/' + safeName(file.name);
      const result = await FS.writeFile({ path, data: file.base64, directory: 'CACHE', recursive: true });
      if (result && result.uri) uris.push(result.uri);
      else {
        const located = await FS.getUri({ path, directory: 'CACHE' });
        if (located && located.uri) uris.push(located.uri);
      }
    }
    return uris;
  }

  async function copyText(text) {
    const Clipboard = plugin('Clipboard');
    if (!Clipboard) return false;
    try { await Clipboard.write({ string: String(text || '') }); return true; } catch { return false; }
  }

  async function sharePayload(payload, dialogTitle) {
    const Share = plugin('Share');
    if (!Share) throw new Error('Share plugin is unavailable');
    const text = String(payload.text || '');
    const files = Array.isArray(payload.files) ? payload.files : [];
    const uris = await writeFiles(files);
    const options = { title: 'MIZAN', text, dialogTitle: dialogTitle || 'مشاركة MIZAN' };
    if (uris.length) options.files = uris;
    try {
      await Share.share(options);
      return { ok: true, method: 'shareui', kind: payload.kind || '', count: uris.length, folder: '', whatsapp: true };
    } catch (error) {
      if (uris.length) {
        try {
          await Share.share({ title: 'MIZAN', text: '', files: uris, dialogTitle: 'مشاركة الملفات' });
          if (text) await copyText(text);
          return {
            ok: true, method: 'shareui', kind: payload.kind || '', count: uris.length, folder: '', whatsapp: true,
            message: text ? 'تم فتح مشاركة الملفات، وتم نسخ النص للحافظة. الصقه في المحادثة بعد اختيار التطبيق.' : ''
          };
        } catch (filesError) {
          if (text && await copyText(text)) {
            return { ok: true, method: 'clipboard-text', kind: 'text', count: 0, folder: '', whatsapp: false, message: 'تعذر فتح نافذة المشاركة. تم نسخ النص؛ افتح واتساب والصقه في المحادثة.' };
          }
          throw filesError;
        }
      }
      if (text && await copyText(text)) {
        return { ok: true, method: 'clipboard-text', kind: 'text', count: 0, folder: '', whatsapp: false, message: 'تعذر فتح نافذة المشاركة. تم نسخ النص؛ افتح واتساب والصقه في المحادثة.' };
      }
      throw error;
    }
  }

  async function openPayload(payload) {
    const Opener = plugin('FileOpener');
    if (!Opener) throw new Error('File opener plugin is unavailable');
    const files = Array.isArray(payload.files) ? payload.files : [];
    if (!files.length) throw new Error('No file to open');
    const uris = await writeFiles(files);
    if (!uris.length) throw new Error('Could not prepare the file');
    try {
      await Opener.open({ filePath: uris[0], contentType: files[0].mime || 'application/pdf' });
      return { ok: true, method: 'open' };
    } catch (error) {
      const shared = await sharePayload(payload, 'فتح الملف');
      return Object.assign(shared, { message: 'تعذر فتح الملف مباشرة. اختر تطبيقًا لعرضه من نافذة المشاركة.' });
    }
  }

  window.MizanAndroidBridge = {
    async handle(payload) {
      const action = payload && payload.action;
      if (action === 'whatsapp' || action === 'shareui') {
        return sharePayload(payload, action === 'whatsapp' ? 'مشاركة عبر واتساب' : 'مشاركة MIZAN');
      }
      if (action === 'save' || action === 'save_many') {
        return sharePayload(payload, 'حفظ / مشاركة الملف');
      }
      if (action === 'open') return openPayload(payload);
      if (action === 'copy_text') {
        const ok = await copyText(payload.text || '');
        if (!ok) throw new Error('Copy is unavailable');
        return { ok: true, method: 'clipboard-text' };
      }
      if (action === 'copy_image' || action === 'copy_files') {
        return sharePayload(payload, 'نسخ / مشاركة الملف');
      }
      if (action === 'print_pdf') {
        throw new Error('Vector PDF print is only available in the Windows application.');
      }
      if (action === 'open_folder') {
        return { ok: false, method: 'info', message: 'استخدم تطبيق Files من نافذة المشاركة للوصول إلى الملفات.' };
      }
      throw new Error('Unsupported native action: ' + action);
    }
  };

  async function applyInsets() {
    try {
      const Insets = plugin('MizanInsets');
      if (!Insets) return;
      const value = await Insets.getInsets();
      const root = document.documentElement;
      root.style.setProperty('--android-inset-top', (Number(value.top) || 0) + 'px');
      root.style.setProperty('--android-inset-bottom', (Number(value.bottom) || 0) + 'px');
      root.style.setProperty('--android-inset-left', (Number(value.left) || 0) + 'px');
      root.style.setProperty('--android-inset-right', (Number(value.right) || 0) + 'px');
    } catch {}
  }

  async function start() {
    await ready();
    await applyInsets();
    try {
      const StatusBar = plugin('StatusBar');
      if (StatusBar) {
        await StatusBar.setStyle({ style: 'LIGHT' });
      }
    } catch {}
    try {
      const Splash = plugin('SplashScreen');
      if (Splash) await Splash.hide();
    } catch {}
    try {
      const App = plugin('App');
      if (App && App.addListener) {
        App.addListener('backButton', () => {
          if (window.MizanNativeBack && window.MizanNativeBack()) return;
          App.exitApp();
        });
      }
    } catch {}
    window.addEventListener('resize', () => setTimeout(applyInsets, 80));
    window.addEventListener('orientationchange', () => setTimeout(applyInsets, 180));
    setTimeout(applyInsets, 600);
    document.addEventListener('focusin', event => {
      const field = event.target;
      if (!field || !field.matches || !field.matches('input, textarea, select')) return;
      setTimeout(() => {
        try { field.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
      }, 280);
    });
  }
  start();
})();
