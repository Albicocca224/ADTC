(() => {
  const copyNode = document.getElementById('adtc-ui-copy');
  const copy = copyNode ? JSON.parse(copyNode.textContent) : {};
  window.ADTC_UI = copy;
  function initializeUi() {
  const emit = (name, params = {}) => document.dispatchEvent(new CustomEvent('adtc:analytics', {detail: {name, params}}));
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  document.querySelectorAll('[data-language]').forEach(link => link.addEventListener('click', () => {
    write('adtc-language', link.dataset.language);
    emit('language_change', {target_language:link.dataset.language});
  }));
  const dialog = document.getElementById('wechat-dialog');
  let lastOpener = null;
  document.querySelectorAll('[data-wechat-open]').forEach(button => button.addEventListener('click', () => {
    if (!dialog || dialog.open) return;
    lastOpener = button;
    dialog.showModal();
    emit('wechat_open', {link_type:'wechat'});
  }));
  dialog?.querySelector('[data-wechat-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) { const rect=dialog.getBoundingClientRect(); if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close(); } });
  dialog?.addEventListener('close', () => lastOpener?.focus());
  const inlineQr=document.querySelector('[data-wechat-inline] .wechat-inline-image');
  const floatingWechat=document.querySelector('.sticky-mobile[data-wechat-open]');
  if(inlineQr && floatingWechat && typeof IntersectionObserver==='function') {
    new IntersectionObserver(([entry])=>floatingWechat.classList.toggle('is-qr-visible',entry.isIntersecting)).observe(inlineQr);
  }
  const names = {ru:'Русский',kk:'Қазақша',en:'English',zh:'中文'};
  const current = document.documentElement.lang === 'zh-Hans' ? 'zh' : document.documentElement.lang;
  const preferred = read('adtc-language') || (navigator.languages || [navigator.language]).map(lang => lang.toLowerCase().startsWith('zh')?'zh':lang.toLowerCase().split('-')[0]).find(lang => Object.hasOwn(names, lang));
  const languageLink = document.querySelector(`[data-language="${preferred}"]`);
  if (preferred && preferred !== current && languageLink && !read('adtc-language-hint-dismissed')) {
    const hint = document.createElement('div');
    hint.className = 'language-hint';
    const anchor = document.createElement('a');
    anchor.href = languageLink.href;
    anchor.lang = languageLink.lang;
    anchor.textContent = ({ru:'Открыть русскую версию',kk:'Қазақша нұсқасын ашу',en:'View in English',zh:'查看中文版'})[preferred];
    anchor.addEventListener('click',()=>{ write('adtc-language',preferred); emit('language_change',{target_language:preferred}); });
    const close = document.createElement('button');
    close.type='button';close.textContent='×';close.setAttribute('aria-label', copy.close || 'Close');
    close.addEventListener('click',()=>{ write('adtc-language-hint-dismissed','true');hint.remove(); });
    hint.append(anchor,close);
    const header=document.querySelector('.site-header');
    if(header) header.after(hint); else document.body.prepend(hint);
  }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initializeUi,{once:true});
  else initializeUi();
})();
