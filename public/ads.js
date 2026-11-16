/*
 * OunceDown — espaços de anúncio não invasivos.
 *
 * Regras de design:
 *  - Nada de pop-up, popunder, intersticial, vídeo com som ou banner grudado na tela do celular.
 *  - Nenhum anúncio entre o campo de link e o resultado/progresso do download.
 *  - Cada espaço tem altura reservada (sem "pulo" de layout) e o rótulo "Publicidade".
 *  - Os anúncios só carregam quando o espaço está perto de aparecer na tela (lazy).
 *
 * A configuração vem do servidor (/ads-config.js), que lê o bloco "ads" de site.config.json:
 *   provider          → "adsterra" ou "adsense"
 *   showPlaceholders  → false esconde os marcadores "Seu anúncio aqui"
 *   adsterra          → chaves dos banners (728x90, 320x50 e 160x600) e o domínio do script
 *   adsense           → ca-pub-… e o ID de cada bloco (se um dia usar o AdSense)
 */
window.OUNCEDOWN_ADS = Object.assign({
  provider: '',
  showPlaceholders: true,
  adsenseClient: '',
  slots: {},
  adsterra: { scriptUrl: '', scriptHost: '', banner728: '', banner320: '', banner160: '' },
}, window.OUNCEDOWN_ADS || {});

(() => {
  const cfg = window.OUNCEDOWN_ADS;
  const slots = document.querySelectorAll('.ad[data-ad]');
  const isMobile = () => window.innerWidth < 760;
  let adsenseLoaded = false;

  function renderPlaceholder(el) {
    el.innerHTML = '<span class="ad-label">Publicidade</span><div class="ad-placeholder"><span>Seu anúncio aqui</span><small></small></div>';
    el.querySelector('small').textContent = el.classList.contains('ad-rail') ? '160 × 600' : '728 × 90 · 320 × 50';
  }

  function empty(el) {
    if (cfg.showPlaceholders) renderPlaceholder(el); else el.hidden = true;
  }

  // ---------- Adsterra ----------
  // Cada banner roda dentro do seu próprio iframe: assim vários banners convivem na mesma página
  // (o código da Adsterra usa uma variável global). O sandbox não dá "allow-top-navigation", então o
  // anúncio não redireciona a página principal; cliques abrem em nova aba.
  // "allow-same-origin" é necessário: sem ele o script da Adsterra não entrega anúncio (testado em 16/11/2026).
  function adsterraBanner(el) {
    const a = cfg.adsterra || {};
    const rail = el.classList.contains('ad-rail');
    const pick = rail ? { key: a.banner160, w: 160, h: 600 }
      : (isMobile() && a.banner320) ? { key: a.banner320, w: 320, h: 50 }
      : a.banner728 ? { key: a.banner728, w: 728, h: 90 }
      : { key: a.banner320, w: 320, h: 50 };
    // Endereço do script: modelo "scriptUrl" com {key} (formato atual do painel) ou o antigo host/chave/invoke.js
    const src = a.scriptUrl ? a.scriptUrl.replace('{key}', pick.key)
      : a.scriptHost ? `https://${a.scriptHost}/${pick.key}/invoke.js` : '';
    if (!pick.key || !src) return empty(el);

    const doc = '<!doctype html><html><head><meta charset="utf-8">' +
      '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
      `<script>atOptions={key:'${pick.key}',format:'iframe',height:${pick.h},width:${pick.w},params:{}};<\/script>` +
      `<script src="${src}"><\/script>` +
      '</body></html>';

    el.innerHTML = '<span class="ad-label">Publicidade</span>';
    const frame = document.createElement('iframe');
    frame.className = 'ad-frame';
    frame.width = pick.w;
    frame.height = pick.h;
    frame.title = 'Publicidade';
    frame.loading = 'lazy';
    frame.scrolling = 'no';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    frame.srcdoc = doc;
    el.appendChild(frame);
  }

  // ---------- AdSense ----------
  function loadAdsense() {
    if (adsenseLoaded) return;
    adsenseLoaded = true;
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return; // já injetado no <head> pelo servidor
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.adsenseClient}`;
    document.head.appendChild(s);
  }

  function adsenseBanner(el) {
    const slotId = cfg.slots[el.dataset.ad];
    if (!/^ca-pub-\d+$/.test(cfg.adsenseClient) || !slotId) return empty(el);
    loadAdsense();
    const rail = el.classList.contains('ad-rail');
    el.innerHTML = '<span class="ad-label">Publicidade</span>';
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.dataset.adClient = cfg.adsenseClient;
    ins.dataset.adSlot = slotId;
    if (rail) { ins.style.width = '160px'; ins.style.height = '600px'; }
    else { ins.dataset.adFormat = 'horizontal'; ins.dataset.fullWidthResponsive = 'true'; }
    el.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* bloqueador de anúncios */ }
  }

  function renderAd(el) {
    if (cfg.provider === 'adsterra') return adsterraBanner(el);
    if (cfg.provider === 'adsense') return adsenseBanner(el);
    empty(el);
  }

  // Laterais só existem em telas largas — não carrega nada em telas menores.
  const visible = (el) => getComputedStyle(el).display !== 'none';

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && visible(e.target)) { io.unobserve(e.target); renderAd(e.target); }
      });
    }, { rootMargin: '300px 0px' });
    slots.forEach((el) => io.observe(el));
  } else {
    slots.forEach((el) => visible(el) && renderAd(el));
  }
})();
