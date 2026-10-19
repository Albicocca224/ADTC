const ADTC_ANALYTICS = Object.freeze({
  ga4Id: "G-8EY6VWT11L",
  yandexId: 109159220,
});
const analyticsUi = window.ADTC_UI || {openMenu:'Открыть меню',closeMenu:'Закрыть меню',analyticsLabel:'Настройки аналитики',analyticsText:'Можно включить техническую аналитику. Персональные данные в аналитику не передаются.',more:'Подробнее',accept:'Разрешить',decline:'Не разрешать'};

const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".site-nav");
if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? analyticsUi.closeMenu : analyticsUi.openMenu);
  });
}

document.querySelectorAll("[data-faq]").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const answer = item?.querySelector(".faq-answer");
    if (!item || !answer) return;
    const isOpen = item.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
    answer.hidden = !isOpen;
  });
});

window.dataLayer = window.dataLayer || [];
const analyticsConsentKey = "adtc-analytics-consent";
const allowedTouchKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
let analyticsLoaded = false;

function getStored(key) {
  try { return window.localStorage.getItem(key); }
  catch (_) { return null; }
}

function setStored(key, value) {
  try { window.localStorage.setItem(key, value); }
  catch (_) {}
}

function cleanEventParams(params = {}) {
  const allowed = ["lead_type", "page_path", "link_type", "public_id", "page_language", "page_category", "target_language", "offer_type", ...allowedTouchKeys];
  return Object.fromEntries(Object.entries(params).filter(([key, value]) => allowed.includes(key) && typeof value === "string" && (key !== "offer_type" || ["tender_review", "tender_application", "tender_retainer", "evidence_request"].includes(value))).map(([key, value]) => [key, value.slice(0, 120)]));
}

function trackEvent(eventName, params = {}) {
  const safeParams = cleanEventParams({ page_path: window.location.pathname, page_language:document.documentElement.lang, page_category:document.documentElement.dataset.pageCategory || 'general', ...params });
  if (getStored(analyticsConsentKey) !== "accepted") return;
  if (typeof window.gtag === "function") window.gtag("event", eventName, safeParams);
  if (typeof window.ym === "function") {
    window.ym(ADTC_ANALYTICS.yandexId, "reachGoal", eventName, safeParams);
  }
}

document.addEventListener("adtc:analytics", (event) => {
  const name = String(event.detail?.name || "");
  if (["investor_project_view", "investor_project_expand", "language_change", "wechat_open"].includes(name)) trackEvent(name, event.detail?.params || {});
});

function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  const pageUrl = new URL(window.location.origin + window.location.pathname);
  const search = new URLSearchParams(window.location.search);
  allowedTouchKeys.forEach(key=>{if(search.has(key))pageUrl.searchParams.set(key,(search.get(key)||'').slice(0,120));});
  window.gtag("config", ADTC_ANALYTICS.ga4Id, { send_page_view: true, page_location:pageUrl.href, page_language:document.documentElement.lang, page_category:document.documentElement.dataset.pageCategory || 'general', allow_google_signals:false, allow_ad_personalization_signals:false });

  const googleTag = document.createElement("script");
  googleTag.async = true;
  googleTag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ADTC_ANALYTICS.ga4Id)}`;
  document.head.appendChild(googleTag);

  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  window.ym(ADTC_ANALYTICS.yandexId, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  const metrika = document.createElement("script");
  metrika.async = true;
  metrika.src = "https://mc.yandex.ru/metrika/tag.js";
  document.head.appendChild(metrika);
}

function showConsentBanner(force = false) {
  if ((!force && getStored(analyticsConsentKey)) || document.querySelector('.analytics-consent')) return;
  const banner = document.createElement("section");
  banner.className = "analytics-consent";
  banner.setAttribute("aria-label", analyticsUi.analyticsLabel);
  const privacyHref = document.querySelector('.site-footer a[href$="privacy.html"]')?.getAttribute('href') || '/privacy.html';
  banner.innerHTML = `<p>${analyticsUi.analyticsText} <a href="${privacyHref}">${analyticsUi.more}</a></p><div><button class="button" type="button" data-analytics-accept>${analyticsUi.accept}</button><button class="button secondary" type="button" data-analytics-decline>${analyticsUi.decline}</button></div>`;
  document.body.appendChild(banner);
  banner.querySelector("[data-analytics-accept]")?.addEventListener("click", () => {
    setStored(analyticsConsentKey, "accepted");
    loadAnalytics();
    banner.remove();
  });
  banner.querySelector("[data-analytics-decline]")?.addEventListener("click", () => {
    setStored(analyticsConsentKey, "declined");
    banner.remove();
    if (analyticsLoaded) { window.gtag?.('consent','update',{analytics_storage:'denied'}); window.location.reload(); }
});
}
document.querySelectorAll('[data-analytics-settings]').forEach(button=>button.addEventListener('click',()=>showConsentBanner(true)));

if (getStored(analyticsConsentKey) === "accepted") loadAnalytics();
else showConsentBanner();

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  const href = link.getAttribute("href") || "";
  if (href.startsWith("tel:")) trackEvent("phone_click", { link_type: "phone" });
  else if (href.includes("wa.me/")) {
    const offerType = link.dataset.offerType;
    const offer = ["tender_review", "tender_application", "tender_retainer", "evidence_request"].includes(offerType) ? { offer_type: offerType } : {};
    trackEvent("whatsapp_click", { link_type: "whatsapp", ...offer });
  }
  else if (href.startsWith("mailto:")) trackEvent("email_click", { link_type: "email" });
  else if ((link.dataset.track || "").startsWith("investor")) trackEvent("investor_interest", { lead_type: "investor", link_type: "cta" });
  else if ((link.dataset.track || "").startsWith("supply")) trackEvent("supply_interest", { lead_type: "supply", link_type: "cta" });
  else if (link.dataset.track === "eurasia_projects") trackEvent("eurasia_projects_click", { link_type: "external" });
  else if (link.dataset.track === "eurasia_documents") trackEvent("eurasia_documents_click", { link_type: "external" });
  else if (link.dataset.track === "wechat_download") trackEvent("wechat_qr_download", { link_type: "wechat" });
  else if ((link.dataset.track || '').startsWith('china')) trackEvent('china_interest',{lead_type:'china',link_type:'cta'});
});
