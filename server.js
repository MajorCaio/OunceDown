// OunceDown: servidor Express que usa o yt-dlp e o ffmpeg para baixar os vídeos.
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const SEO = require('./seo-pages');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || undefined; // ex.: 127.0.0.1 para aceitar só conexões locais
const ROOT = __dirname;
const TMP_DIR = process.env.TMP_DIR || path.join(ROOT, 'tmp');

// Onde procurar os programas: variável de ambiente, depois ./bin, depois ffmpeg-static ou o PATH.
// No servidor Twist (Termux) yt-dlp e ffmpeg vêm do gerenciador de pacotes.
const LOCAL_YTDLP = path.join(ROOT, 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const YTDLP = process.env.YTDLP_PATH || (fs.existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : 'yt-dlp');
let FFMPEG = process.env.FFMPEG_PATH || null;
if (!FFMPEG) { try { FFMPEG = require('ffmpeg-static'); } catch { /* opcional */ } }
// yt-dlp precisa de um runtime JavaScript para o YouTube; ex.: YTDLP_JS_RUNTIMES=node
const JS_RUNTIMES = process.env.YTDLP_JS_RUNTIMES || '';

const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT) || 3;
// Resolução máxima oferecida (ex.: MAX_HEIGHT=720 em servidores fracos). Padrão: 4K.
const MAX_HEIGHT = Number(process.env.MAX_HEIGHT) || 2160;
const JOB_TTL_MS = 30 * 60 * 1000;

// ---------- Proteção contra abuso (todos ajustáveis por variável de ambiente) ----------
const envNum = (k, d) => (Number(process.env[k]) > 0 ? Number(process.env[k]) : d);
const MAX_INFO_CONCURRENT = envNum('MAX_INFO_CONCURRENT', 2);   // análises (yt-dlp) rodando ao mesmo tempo
const INFO_QUEUE_MAX = envNum('INFO_QUEUE_MAX', 4);             // pedidos que podem esperar na fila
const INFO_QUEUE_WAIT_MS = envNum('INFO_QUEUE_WAIT_MS', 60000); // tempo máximo esperando na fila
const INFO_TIMEOUT_MS = envNum('INFO_TIMEOUT_MS', 90000);       // tempo máximo de uma análise
const RATE_INFO_PER_MIN = envNum('RATE_INFO_PER_MIN', 8);       // análises por visitante por minuto
const RATE_JOBS_PER_10MIN = envNum('RATE_JOBS_PER_10MIN', 6);   // downloads por visitante a cada 10 min
const INFO_CACHE_TTL_MS = 30 * 60 * 1000;                       // resultado de um link vale 30 min
const INFO_ERROR_TTL_MS = 2 * 60 * 1000;                        // link com erro: não reprocessa por 2 min
const INFO_CACHE_MAX = 300;

fs.mkdirSync(TMP_DIR, { recursive: true });

// ---------- Plataformas ----------
const PLATFORMS = {
  youtube: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
  facebook: ['facebook.com', 'fb.watch', 'fb.com'],
  instagram: ['instagram.com'],
  x: ['x.com', 'twitter.com'],
};

function detectPlatform(raw) {
  let u;
  try { u = new URL(String(raw).trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase().replace(/^www\.|^m\.|^mobile\.|^music\./, '');
  for (const [name, hosts] of Object.entries(PLATFORMS)) {
    if (hosts.some((h) => host === h || host.endsWith('.' + h))) return { name, url: u.toString() };
  }
  return null;
}

// Aceita caminho completo ou só o nome do programa (procurado no PATH).
function binExists(bin) {
  if (!bin) return false;
  if (path.isAbsolute(bin)) return fs.existsSync(bin);
  const exts = process.platform === 'win32' ? ['', '.exe', '.cmd'] : [''];
  return (process.env.PATH || '').split(path.delimiter).some((d) =>
    exts.some((e) => d && fs.existsSync(path.join(d, bin + e))));
}

function binariesReady() {
  return binExists(YTDLP) && binExists(FFMPEG);
}

function baseArgs() {
  const args = ['--no-playlist', '--no-warnings', '--no-color'];
  if (binExists(FFMPEG)) args.push('--ffmpeg-location', FFMPEG);
  if (JS_RUNTIMES) args.push('--js-runtimes', JS_RUNTIMES);
  return args;
}

function runYtdlp(args, { timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(YTDLP, args, { windowsHide: true });
    let out = '', err = '';
    const t = setTimeout(() => { p.kill(); reject(new Error('Tempo esgotado ao consultar a mídia.')); }, timeout);
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => { clearTimeout(t); reject(e); });
    p.on('close', (code) => {
      clearTimeout(t);
      code === 0 ? resolve(out) : reject(new Error(friendlyError(err)));
    });
  });
}

function friendlyError(stderr) {
  const s = String(stderr);
  if (/private|login|sign in|cookies/i.test(s)) return 'Esta mídia é privada ou exige login.';
  if (/unavailable|not available|removed/i.test(s)) return 'Mídia indisponível ou removida.';
  if (/Unsupported URL/i.test(s)) return 'Link não suportado.';
  if (/No video formats|no video/i.test(s)) return 'Nenhum vídeo encontrado neste link.';
  const line = s.split('\n').find((l) => l.startsWith('ERROR:'));
  return line ? line.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, '').slice(0, 200) : 'Não foi possível processar o link.';
}

// ---------- Configuração do site (site.config.json) ----------
// site.config.json fica fora do Git (tem as chaves de anúncio); sem ele, usa o modelo de exemplo.
const CONFIG_PATH = path.join(ROOT, 'site.config.json');
const CONFIG_EXAMPLE = path.join(ROOT, 'site.config.example.json');
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : CONFIG_EXAMPLE, 'utf8')); }
  catch (e) { console.warn('⚠ site.config.json inválido:', e.message); return { adsense: {} }; }
}
const validClient = (c) => /^ca-pub-\d{10,20}$/.test(c || '');
// Rede de anúncios ativa: "ads.provider" no site.config.json; sem ele, AdSense se houver ca-pub.
function adsProvider(cfg) {
  const p = cfg.ads?.provider;
  if (p === 'adsterra' || p === 'adsense') return p;
  return validClient(cfg.adsense?.client) ? 'adsense' : '';
}
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const MAX_LABEL = MAX_HEIGHT >= 2160 ? '4K' : `${MAX_HEIGHT}p`;
const RES_TEXT = MAX_HEIGHT >= 2160 ? '720p, 1080p e 2160p conforme a qualidade original.'
  : MAX_HEIGHT >= 1080 ? '720p e 1080p conforme a qualidade original.'
  : 'Vídeos em HD (720p) conforme a qualidade original.';

const fill = (str, vars) => String(str ?? '').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
const siteBase = (cfg) => (cfg.siteUrl || '').replace(/\/$/, '');

// Blocos gerados a partir de seo-pages.js: FAQ (HTML + dados estruturados) e links das ferramentas.
function seoBlocks(cfg, route, page, base) {
  const faq = (page.faq || []).map(([q, a]) => [fill(q, base), fill(a, base)]);
  const faqHtml = faq.map(([q, a]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('\n        ');
  const links = SEO.toolLinks.map(([href, label]) =>
    `<li><a href="${href}"${href === route ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a></li>`).join('');
  const url = siteBase(cfg) + route;
  const graph = [
    {
      '@type': 'WebApplication',
      name: base.SITE_NAME,
      url: siteBase(cfg) + '/',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      isAccessibleForFree: true,
      description: fill(SEO.pages['/'].description, base),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    },
    { '@type': 'FAQPage', url, mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  if (route !== '/') {
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: base.SITE_NAME, item: siteBase(cfg) + '/' },
      { '@type': 'ListItem', position: 2, name: fill(page.h1a + ' ' + page.h1b, base).replace(/[.]$/, ''), item: url },
    ] });
  }
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return { RAW_FAQ: faqHtml, RAW_TOOL_LINKS: links, RAW_JSON_LD: jsonLd, RAW_SEO_TEXT: fill(page.seo, base) };
}

// Renderiza páginas HTML trocando {{CHAVES}} e injetando a verificação do AdSense no <head>.
// Chaves RAW_* entram como HTML; as demais são escapadas.

// Versão do CSS/JS no endereço (?v=...), tirada da data dos arquivos. Quando eles mudam,
// o endereço muda junto e a cópia antiga guardada pela Cloudflare deixa de ser usada.
function assetVersion() {
  let newest = 0;
  for (const f of ['styles.css', 'app.js', 'ads.js']) {
    try { newest = Math.max(newest, fs.statSync(path.join(ROOT, 'public', f)).mtimeMs); } catch { /* sem o arquivo */ }
  }
  return Math.floor(newest / 1000).toString(36);
}

function renderPage(file, route = '/') {
  const cfg = loadConfig();
  const client = cfg.adsense?.client;
  let html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
  const base = {
    SITE_NAME: cfg.siteName || 'OunceDown',
    SITE_URL: siteBase(cfg),
    CONTACT_EMAIL: cfg.contactEmail || '',
    OWNER: cfg.owner || '',
    UPDATED: formatDate(cfg.policiesUpdated || ''),
    MAX_LABEL,
    RES_TEXT,
    ASSET_V: assetVersion(),
  };
  const page = SEO.pages[route];
  const vars = { ...base, CANONICAL: siteBase(cfg) + route };
  if (page) {
    Object.assign(vars, {
      PAGE_TITLE: fill(page.title, base), PAGE_DESC: fill(page.description, base),
      H1_A: fill(page.h1a, base), H1_B: fill(page.h1b, base), LEAD: fill(page.lead, base),
    }, seoBlocks(cfg, route, page, base));
  }
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? (k.startsWith('RAW_') ? vars[k] : escapeHtml(vars[k])) : m));
  // Tira do HTML as opções de qualidade acima do limite do servidor (no tablet, 1080p e 4K).
  html = html.replace(/\s*<label class="opt"><input type="radio" name="q" value="(\d+)"[^]*?<\/label>/g,
    (m, h) => (Number(h) > MAX_HEIGHT ? '' : m));
  if (adsProvider(cfg) === 'adsense' && validClient(client)) {
    html = html.replace('</head>',
      `  <meta name="google-adsense-account" content="${client}" />\n` +
      `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>\n</head>`);
  }
  return html;
}

// ---------- Proteção: IP do visitante, limite de pedidos, fila e cache ----------

// Atrás do Cloudflare Tunnel toda conexão chega de 127.0.0.1; o IP real vem no cabeçalho
// CF-Connecting-IP. Só confia nele quando a conexão é local (o cloudflared), para ninguém da rede forjar.
function clientIp(req) {
  const remote = req.socket.remoteAddress || '';
  const local = /^(::1$|127\.|::ffff:127\.)/.test(remote);
  const cf = req.get('cf-connecting-ip');
  return local && cf ? cf.trim().slice(0, 64) : remote;
}

// Contador por visitante que zera a cada janela de tempo.
const hits = new Map();
function rateLimit(bucket, limit, windowMs, message) {
  return (req, res, next) => {
    const key = bucket + ':' + clientIp(req);
    const now = Date.now();
    let h = hits.get(key);
    if (!h || now >= h.reset) { h = { count: 0, reset: now + windowMs }; hits.set(key, h); }
    if (++h.count > limit) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

class BusyError extends Error {}
const BUSY_MSG = 'Muitas pessoas usando agora. Tente novamente em alguns segundos.';

// Fila das análises: no máximo MAX_INFO_CONCURRENT rodando e INFO_QUEUE_MAX esperando.
let infoActive = 0;
const infoQueue = [];
function acquireInfoSlot(res) {
  if (infoActive < MAX_INFO_CONCURRENT) { infoActive++; return Promise.resolve(); }
  if (infoQueue.length >= INFO_QUEUE_MAX) return Promise.reject(new BusyError(BUSY_MSG));
  return new Promise((resolve, reject) => {
    const item = { resolve, reject };
    const drop = () => {
      const i = infoQueue.indexOf(item);
      if (i >= 0) infoQueue.splice(i, 1);
      clearTimeout(item.timer);
    };
    item.timer = setTimeout(() => { drop(); reject(new BusyError(BUSY_MSG)); }, INFO_QUEUE_WAIT_MS);
    // Visitante desistiu (fechou a aba): sai da fila sem gastar um yt-dlp.
    res.on('close', () => { if (!res.writableEnded && infoQueue.includes(item)) { drop(); reject(new BusyError(BUSY_MSG)); } });
    infoQueue.push(item);
  });
}
function releaseInfoSlot() {
  const next = infoQueue.shift();
  if (next) { clearTimeout(next.timer); next.resolve(); } else infoActive--;
}

// Cache de resultados e pedidos iguais em andamento (o mesmo link analisado só uma vez).
const infoCache = new Map();    // url → { ok, data | error, exp }
const infoInflight = new Map(); // url → Promise
const infoPerIp = new Map();    // ip → análises em andamento

function cacheGet(url) {
  const c = infoCache.get(url);
  if (!c) return null;
  if (Date.now() > c.exp) { infoCache.delete(url); return null; }
  return c;
}
function cacheSet(url, entry) {
  if (infoCache.size >= INFO_CACHE_MAX) infoCache.delete(infoCache.keys().next().value); // remove o mais antigo
  infoCache.set(url, entry);
}

// Limpeza periódica dos contadores (evita que muitos IPs diferentes encham a memória).
setInterval(() => {
  const now = Date.now();
  for (const [k, h] of hits) if (now >= h.reset) hits.delete(k);
  if (hits.size > 20000) hits.clear();
  for (const [k, c] of infoCache) if (now > c.exp) infoCache.delete(k);
}, 60 * 1000).unref();

// ---------- App ----------
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Manda o www para o domínio sem www, para o Google não ver duas cópias do site.
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.startsWith('www.')) return res.redirect(301, `https://${host.slice(4)}${req.originalUrl}`);
  next();
});

// Página inicial e páginas de entrada por plataforma (mesmo modelo, textos de seo-pages.js)
Object.keys(SEO.pages).forEach((route) => {
  app.get(route, (_req, res) => res.type('html').set('Cache-Control', 'public, max-age=300').send(renderPage('index.html', route)));
});
app.get('/index.html', (_req, res) => res.redirect(301, '/'));
['privacidade', 'termos'].forEach((p) => {
  app.get(`/${p}`, (_req, res) => res.type('html').send(renderPage(`${p}.html`, `/${p}`)));
  app.get(`/${p}.html`, (_req, res) => res.redirect(301, `/${p}`));
});

// ads.txt: o AdSense exige esse arquivo na raiz do domínio.
app.get('/ads.txt', (_req, res) => {
  const cfg = loadConfig();
  const client = cfg.adsense?.client;
  res.type('text/plain').set('Cache-Control', 'no-cache');
  if (adsProvider(cfg) === 'adsense' && validClient(client)) return res.send(`google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);
  res.send('# ads.txt do OunceDown\n# Preencha "adsense.client" em site.config.json para gerar a linha do Google AdSense.\n');
});

// Configuração pública dos anúncios, lida pelo ads.js.
app.get('/ads-config.js', (_req, res) => {
  const cfg = loadConfig();
  const a = cfg.adsense || {};
  const ads = cfg.ads || {};
  const t = ads.adsterra || {};
  const key = (k) => (/^[a-f0-9]{32}$/i.test(k || '') ? k : ''); // chaves da Adsterra: 32 caracteres hex
  const pub = {
    provider: adsProvider(cfg),
    showPlaceholders: (ads.showPlaceholders ?? a.showPlaceholders) !== false,
    adsenseClient: validClient(a.client) ? a.client : '',
    slots: a.slots || {},
    adsterra: {
      // Modelo do endereço do script, com {key} no lugar da chave (ex.: https://dominio/22/{key})
      scriptUrl: /^https:\/\/[a-z0-9.-]+\/[\w./-]*\{key\}[\w./-]*$/i.test(t.scriptUrl || '') ? t.scriptUrl : '',
      scriptHost: /^[a-z0-9.-]+$/i.test(t.scriptHost || '') ? t.scriptHost : '',
      banner728: key(t.banner728), banner320: key(t.banner320), banner160: key(t.banner160),
    },
  };
  res.type('application/javascript').set('Cache-Control', 'no-cache').send(`window.OUNCEDOWN_ADS = ${JSON.stringify(pub)};\n`);
});

app.get('/robots.txt', (_req, res) => {
  const url = (loadConfig().siteUrl || '').replace(/\/$/, '');
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\n${url ? `Sitemap: ${url}/sitemap.xml\n` : ''}`);
});

app.get('/sitemap.xml', (_req, res) => {
  const cfg = loadConfig();
  const url = siteBase(cfg);
  const mtime = (f) => { try { return fs.statSync(path.join(ROOT, f)).mtime.toISOString().slice(0, 10); } catch { return ''; } };
  const pagesDate = [mtime('seo-pages.js'), mtime('public/index.html')].sort().pop();
  const entries = [
    ...Object.keys(SEO.pages).map((p) => [p, pagesDate, p === '/' ? '1.0' : '0.8']),
    ['/privacidade', cfg.policiesUpdated || mtime('public/privacidade.html'), '0.2'],
    ['/termos', cfg.policiesUpdated || mtime('public/termos.html'), '0.2'],
  ];
  const urls = entries.map(([p, d, pr]) =>
    `  <url><loc>${escapeHtml(url + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${pr}</priority></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
});

// Arquivos estáticos com cache: imagens da marca por 30 dias, CSS/JS por 1 hora
// (a Cloudflare guarda uma cópia e o tablet recebe menos acessos).
app.use(express.static(path.join(ROOT, 'public'), {
  index: false,
  setHeaders(res, file) {
    const f = file.replace(/\\/g, '/');
    if (/\.html$/.test(f)) return;
    res.set('Cache-Control', f.includes('/brand/') ? 'public, max-age=2592000' : 'public, max-age=3600');
  },
}));

app.get('/api/health', (_req, res) => res.json({ ok: true, ready: binariesReady() }));

// Roda o yt-dlp e monta a resposta da análise.
async function fetchInfo(p) {
  const json = JSON.parse(await runYtdlp([...baseArgs(), '-J', p.url], { timeout: INFO_TIMEOUT_MS }));
  const info = json._type === 'playlist' && json.entries?.length ? json.entries[0] : json;
  const formats = info.formats || [];
  const heights = formats.filter((f) => f.vcodec && f.vcodec !== 'none' && f.height).map((f) => f.height);
  const maxH = heights.length ? Math.max(...heights) : (info.height || 0);
  const hasAudio = formats.some((f) => f.acodec && f.acodec !== 'none') || !formats.length;
  return {
    platform: p.name,
    url: p.url,
    title: info.title || info.description?.slice(0, 80) || 'Mídia sem título',
    uploader: info.uploader || info.channel || info.uploader_id || '',
    thumbnail: info.thumbnail || info.thumbnails?.at(-1)?.url || '',
    duration: info.duration || null,
    maxHeight: maxH,
    limit: MAX_HEIGHT,
    qualities: [720, 1080, 2160].map((q) => ({ height: q, available: q <= MAX_HEIGHT && maxH >= q * 0.9 })),
    hasVideo: heights.length > 0 || !!info.height,
    hasAudio,
  };
}

const limitInfo = rateLimit('info', RATE_INFO_PER_MIN, 60 * 1000,
  'Muitas análises seguidas. Aguarde um minuto e tente de novo.');

app.post('/api/info', limitInfo, async (req, res) => {
  const p = detectPlatform(req.body?.url);
  if (!p) return res.status(400).json({ error: 'Cole um link válido do YouTube, Facebook, Instagram ou X.' });
  if (!binariesReady()) return res.status(503).json({ error: 'Servidor sem yt-dlp/ffmpeg. Rode "npm run setup".' });

  // Link analisado há pouco: responde direto do cache.
  const cached = cacheGet(p.url);
  if (cached) return cached.ok ? res.json(cached.data) : res.status(422).json({ error: cached.error });

  // O mesmo link já está sendo analisado: espera o resultado dele.
  if (infoInflight.has(p.url)) {
    try { return res.json(await infoInflight.get(p.url)); }
    catch (e) { return res.status(e instanceof BusyError ? 429 : 422).json({ error: e.message }); }
  }

  // Uma análise por visitante de cada vez.
  const ip = clientIp(req);
  if ((infoPerIp.get(ip) || 0) >= 1) {
    return res.status(429).json({ error: 'Aguarde a análise anterior terminar.' });
  }
  infoPerIp.set(ip, (infoPerIp.get(ip) || 0) + 1);

  const task = (async () => {
    await acquireInfoSlot(res);                 // entra na fila ou recebe "ocupado"
    try {
      const data = await fetchInfo(p);
      cacheSet(p.url, { ok: true, data, exp: Date.now() + INFO_CACHE_TTL_MS });
      return data;
    } catch (e) {
      cacheSet(p.url, { ok: false, error: e.message, exp: Date.now() + INFO_ERROR_TTL_MS });
      throw e;
    } finally {
      releaseInfoSlot();
    }
  })();
  infoInflight.set(p.url, task);

  try {
    res.json(await task);
  } catch (e) {
    if (!res.headersSent && !res.destroyed) res.status(e instanceof BusyError ? 429 : 422).json({ error: e.message });
  } finally {
    infoInflight.delete(p.url);
    const n = (infoPerIp.get(ip) || 1) - 1;
    n > 0 ? infoPerIp.set(ip, n) : infoPerIp.delete(ip);
  }
});

// ---------- Jobs de download ----------
const jobs = new Map();
const activeCount = () => [...jobs.values()].filter((j) => j.status === 'running').length;

function emit(job, data) {
  Object.assign(job.state, data);
  const payload = `data: ${JSON.stringify(job.state)}\n\n`;
  job.clients.forEach((c) => c.write(payload));
}

const limitJobs = rateLimit('jobs', RATE_JOBS_PER_10MIN, 10 * 60 * 1000,
  'Limite de downloads atingido. Aguarde alguns minutos e tente de novo.');

app.post('/api/jobs', limitJobs, (req, res) => {
  const ip = clientIp(req);
  if ([...jobs.values()].some((j) => j.status === 'running' && j.ip === ip)) {
    return res.status(429).json({ error: 'Você já tem um download em andamento. Aguarde ele terminar.' });
  }
  const p = detectPlatform(req.body?.url);
  const kind = req.body?.kind === 'audio' ? 'audio' : 'video';
  const asked = [720, 1080, 2160].includes(Number(req.body?.quality)) ? Number(req.body.quality) : 1080;
  const quality = Math.min(asked, MAX_HEIGHT);
  if (!p) return res.status(400).json({ error: 'Link inválido.' });
  if (!binariesReady()) return res.status(503).json({ error: 'Servidor sem yt-dlp/ffmpeg. Rode "npm run setup".' });
  if (activeCount() >= MAX_CONCURRENT) return res.status(429).json({ error: 'Servidor ocupado. Tente novamente em instantes.' });

  const id = crypto.randomBytes(8).toString('hex');
  const dir = path.join(TMP_DIR, id);
  fs.mkdirSync(dir);

  const args = [...baseArgs(), '--newline', '--restrict-filenames',
    '--progress-template', 'download:OD|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    '-o', path.join(dir, '%(title).80B.%(ext)s')];

  if (kind === 'audio') {
    args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    args.push('-f', `bv*[height<=${quality}]+ba/b[height<=${quality}]/bv*+ba/b`,
      '-S', 'res,ext:mp4:m4a', '--merge-output-format', 'mp4');
  }
  args.push(p.url);

  const job = { id, dir, ip, status: 'running', created: Date.now(), clients: new Set(), file: null,
    state: { status: 'running', stage: 'Iniciando…', percent: 0, speed: '', eta: '', part: 1 } };
  jobs.set(id, job);

  const proc = spawn(YTDLP, args, { windowsHide: true });
  job.proc = proc;
  let lastPct = 0, part = 1, stderr = '';

  const onLine = (line) => {
    if (line.startsWith('OD|')) {
      const [, pct, speed, eta] = line.split('|');
      const n = parseFloat(pct) || 0;
      if (n + 20 < lastPct) part++;          // começou outro stream (ex.: áudio após vídeo)
      lastPct = n;
      const label = kind === 'audio' ? 'Baixando áudio' : (part === 1 ? 'Baixando vídeo' : 'Baixando áudio');
      emit(job, { stage: label, percent: n, speed: speed?.trim(), eta: eta?.trim(), part });
    } else if (/^\[(Merger|VideoConvertor)\]/.test(line)) {
      emit(job, { stage: 'Unindo vídeo e áudio…', percent: 100, speed: '', eta: '' });
    } else if (/^\[ExtractAudio\]/.test(line)) {
      emit(job, { stage: 'Convertendo para MP3…', percent: 100, speed: '', eta: '' });
    }
  };

  let buf = '';
  proc.stdout.on('data', (d) => {
    buf += d;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    lines.forEach((l) => onLine(l.trim()));
  });
  proc.stderr.on('data', (d) => (stderr += d));
  proc.on('close', (code) => {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !/\.(part|ytdl|temp)$/.test(f)) : [];
    if (code === 0 && files.length) {
      job.file = path.join(dir, files[0]);
      job.status = 'done';
      const size = fs.statSync(job.file).size;
      emit(job, { status: 'done', stage: 'Pronto!', percent: 100, filename: files[0], size });
    } else {
      job.status = 'error';
      emit(job, { status: 'error', stage: 'Erro', error: friendlyError(stderr) });
    }
  });

  res.json({ id });
});

app.get('/api/jobs/:id/events', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).end();
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(job.state)}\n\n`);
  job.clients.add(res);
  req.on('close', () => job.clients.delete(res));
});

app.get('/api/jobs/:id/file', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== 'done' || !job.file) return res.status(404).json({ error: 'Arquivo não disponível.' });
  res.download(job.file, path.basename(job.file));
});

app.delete('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (job) removeJob(job);
  res.json({ ok: true });
});

function removeJob(job) {
  try { job.proc?.kill(); } catch { /* já encerrado */ }
  job.clients.forEach((c) => c.end());
  fs.rm(job.dir, { recursive: true, force: true }, () => {});
  jobs.delete(job.id);
}

// 404 de verdade (o Google não indexa endereços inexistentes)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Rota não encontrada.' });
  res.status(404).type('html').send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Página não encontrada | OunceDown</title><link rel="stylesheet" href="/styles.css"></head><body><main class="hero"><h1>Página não encontrada</h1><p class="lead">O endereço que você abriu não existe.</p><p style="margin-top:24px"><a class="btn-primary" href="/" style="display:inline-flex;padding:12px 22px;border-radius:12px">Ir para o OunceDown</a></p></main></body></html>`);
});

setInterval(() => {
  const now = Date.now();
  jobs.forEach((j) => { if (now - j.created > JOB_TTL_MS) removeJob(j); });
}, 60 * 1000).unref();

const server = app.listen(PORT, HOST, () => {
  console.log(`OunceDown rodando em http://${HOST || 'localhost'}:${PORT}`);
  console.log(`Proteção: ${MAX_INFO_CONCURRENT} análise(s) por vez, fila de ${INFO_QUEUE_MAX}, ${RATE_INFO_PER_MIN} análises/min por visitante`);
  if (!binariesReady()) console.warn('⚠ yt-dlp/ffmpeg não encontrados. Rode "npm run setup".');
});
// Conexões lentas de propósito (que nunca terminam de mandar o pedido) são encerradas.
server.headersTimeout = 15000;
server.requestTimeout = 30000;
