(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const PLATFORMS = {
    youtube: { name: 'YouTube', color: 'var(--c-youtube)', hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'] },
    facebook: { name: 'Facebook', color: 'var(--c-facebook)', hosts: ['facebook.com', 'fb.watch', 'fb.com'] },
    instagram: { name: 'Instagram', color: 'var(--c-instagram)', hosts: ['instagram.com'] },
    x: { name: 'X', color: 'var(--c-x)', hosts: ['x.com', 'twitter.com'] },
  };
  const LINK_ICON = $('#platformIcon').innerHTML;
  const iconOf = (p) => $(`#platforms [data-p="${p}"] svg`).outerHTML;

  const el = {
    form: $('#form'), box: $('#searchBox'), input: $('#url'), icon: $('#platformIcon'), hint: $('#hint'),
    paste: $('#pasteBtn'), clear: $('#clearBtn'), go: $('#goBtn'),
    result: $('#result'), skeleton: $('#skeleton'),
    thumb: $('#thumb'), duration: $('#duration'), badge: $('#badgePlatform'), title: $('#title'), uploader: $('#uploader'),
    tabs: $('.tabs'), videoOpts: $('#videoOpts'), audioOpts: $('#audioOpts'),
    dl: $('#downloadBtn'), dlLabel: $('#downloadLabel'),
    progress: $('#progress'), stage: $('#stage'), pct: $('#pct'), bar: $('#barFill'), speed: $('#speed'), eta: $('#eta'), cancel: $('#cancelBtn'),
    done: $('#done'), doneInfo: $('#doneInfo'), again: $('#againLink'), toast: $('#toast'),
  };

  let current = null;     // info da mídia analisada
  let kind = 'video';
  let job = null;         // { id, es }
  let lastPlatform = null;

  // ---------- Utilitários ----------
  function detect(raw) {
    let u;
    const s = raw.trim();
    try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
    const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|music)\./, '');
    for (const [key, p] of Object.entries(PLATFORMS)) {
      if (p.hosts.some((h) => host === h || host.endsWith('.' + h))) return key;
    }
    return null;
  }
  const normalize = (s) => (/^https?:\/\//i.test(s.trim()) ? s.trim() : 'https://' + s.trim());

  function fmtDuration(sec) {
    if (!sec && sec !== 0) return '';
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
  }
  function fmtSize(b) {
    if (!b) return '';
    const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return b.toFixed(i > 1 ? 1 : 0) + ' ' + u[i];
  }
  let toastT;
  function toast(msg, isErr) {
    el.toast.textContent = msg;
    el.toast.classList.toggle('err', !!isErr);
    el.toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.toast.classList.remove('show'), 3200);
  }
  function setHint(html, type = '') { el.hint.innerHTML = html || '&nbsp;'; el.hint.className = 'hint ' + type; }
  function shake() { el.box.classList.remove('shake'); void el.box.offsetWidth; el.box.classList.add('shake'); }

  // ---------- Detecção ao vivo ----------
  function onInput() {
    const v = el.input.value;
    el.clear.hidden = !v;
    const p = v ? detect(v) : null;

    if (p !== lastPlatform) {
      lastPlatform = p;
      $$('#platforms li').forEach((li) => li.classList.toggle('active', li.dataset.p === p));
      el.box.classList.toggle('detected', !!p);
      el.box.style.setProperty('--pc', p ? PLATFORMS[p].color : 'var(--accent)');
      el.hint.style.setProperty('--pc', p ? PLATFORMS[p].color : '');
      el.icon.innerHTML = p ? iconOf(p) : LINK_ICON;
      el.icon.classList.remove('pop'); void el.icon.offsetWidth; if (p) el.icon.classList.add('pop');
    }
    if (!v) setHint('');
    else if (p) setHint(`<b>${PLATFORMS[p].name}</b> detectado — pronto para analisar.`, 'ok');
    else setHint('Plataforma não reconhecida. Use links do YouTube, Facebook, Instagram ou X.', 'err');
  }
  el.input.addEventListener('input', onInput);

  el.paste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return toast('A área de transferência está vazia.');
      el.input.value = text.trim();
      onInput();
      el.input.focus();
      if (detect(text)) analyze();
    } catch {
      toast('Permita o acesso à área de transferência ou cole com Ctrl+V.', true);
      el.input.focus();
    }
  });

  el.clear.addEventListener('click', () => { el.input.value = ''; onInput(); el.input.focus(); });

  el.input.addEventListener('paste', () => setTimeout(() => { if (detect(el.input.value)) analyze(); }, 0));

  // ---------- Análise ----------
  el.form.addEventListener('submit', (e) => { e.preventDefault(); analyze(); });

  async function analyze() {
    const raw = el.input.value;
    if (!raw.trim()) { shake(); setHint('Cole um link para começar.', 'err'); return; }
    if (!detect(raw)) { shake(); onInput(); return; }
    if (el.go.classList.contains('loading')) return;

    resetJob();
    el.go.classList.add('loading'); el.go.disabled = true;
    el.result.hidden = true; el.skeleton.hidden = false;
    setHint('Buscando informações da mídia…', 'ok');

    try {
      const res = await fetch('/api/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: normalize(raw) }) });
      const data = await res.json().catch(() => ({ error: 'Resposta inválida do servidor.' }));
      if (!res.ok) throw new Error(data.error || 'Falha ao analisar o link.');
      current = data;
      render(data);
      setHint('');
    } catch (err) {
      el.skeleton.hidden = true;
      shake();
      setHint(err.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor.' : err.message, 'err');
    } finally {
      el.go.classList.remove('loading'); el.go.disabled = false;
    }
  }

  function render(d) {
    const p = PLATFORMS[d.platform];
    el.result.style.setProperty('--pc', p.color);
    el.thumb.src = d.thumbnail ? `${d.thumbnail}` : '';
    el.thumb.referrerPolicy = 'no-referrer';
    el.thumb.onerror = () => { el.thumb.removeAttribute('src'); };
    el.duration.textContent = fmtDuration(d.duration);
    el.duration.hidden = !d.duration;
    el.badge.innerHTML = iconOf(d.platform) + p.name;
    el.badge.style.color = p.color;
    el.title.textContent = d.title;
    el.title.title = d.title;
    el.uploader.textContent = d.uploader ? 'por ' + d.uploader : '';
    el.uploader.hidden = !d.uploader;

    // Qualidades
    let best = null;
    d.qualities.forEach((q) => {
      const input = el.videoOpts.querySelector(`input[value="${q.height}"]`);
      input.disabled = !q.available;
      input.closest('.opt').classList.toggle('unavailable', !q.available);
      input.checked = false;
      if (q.available && (q.height <= 1080 || !best)) best = input;
    });
    if (!d.qualities.some((q) => q.available)) {
      // mídia abaixo de 720p: permite baixar a melhor disponível pela opção 720p
      const i720 = el.videoOpts.querySelector('input[value="720"]');
      i720.disabled = false; i720.closest('.opt').classList.remove('unavailable'); best = i720;
    }
    if (best) best.checked = true;

    setKind(d.hasVideo ? 'video' : 'audio');
    $('.tab[data-kind="video"]').disabled = !d.hasVideo;

    el.skeleton.hidden = true;
    el.result.hidden = false;
    el.result.querySelector('.preview').style.animation = 'none';
    void el.result.offsetWidth;
    el.result.querySelector('.preview').style.animation = '';
    el.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Abas ----------
  function setKind(k) {
    kind = k;
    el.tabs.dataset.kind = k;
    $$('.tab').forEach((t) => { const on = t.dataset.kind === k; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
    el.videoOpts.hidden = k !== 'video';
    el.audioOpts.hidden = k !== 'audio';
    el.dlLabel.textContent = k === 'video' ? 'Baixar vídeo' : 'Baixar áudio MP3';
  }
  $$('.tab').forEach((t) => t.addEventListener('click', () => { if (!job) setKind(t.dataset.kind); }));

  // ---------- Download ----------
  el.dl.addEventListener('click', startDownload);

  async function startDownload() {
    if (!current || job) return;
    const quality = el.videoOpts.querySelector('input:checked')?.value || 1080;
    el.dl.hidden = true; el.done.hidden = true;
    el.progress.hidden = false; el.progress.classList.add('indeterminate');
    updateProgress({ stage: 'Preparando…', percent: 0 });
    lockOptions(true);

    try {
      const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: current.url, kind, quality }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao iniciar o download.');
      const es = new EventSource(`/api/jobs/${data.id}/events`);
      job = { id: data.id, es };
      es.onmessage = (ev) => onJobEvent(JSON.parse(ev.data));
      es.onerror = () => { if (job && job.es === es && es.readyState === EventSource.CLOSED) fail('Conexão perdida com o servidor.'); };
    } catch (err) {
      fail(err.message);
    }
  }

  function onJobEvent(s) {
    if (s.status === 'done') {
      updateProgress({ ...s, stage: 'Pronto!', percent: 100 });
      const id = job.id;
      job.es.close();
      job = null;
      const a = document.createElement('a');
      a.href = `/api/jobs/${id}/file`; a.download = s.filename || '';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => {
        el.progress.hidden = true;
        el.done.hidden = false;
        el.doneInfo.textContent = [s.filename, fmtSize(s.size)].filter(Boolean).join(' · ');
        el.again.href = `/api/jobs/${id}/file`;
        lockOptions(false);
      }, 500);
      toast('Download concluído ✓');
    } else if (s.status === 'error') {
      fail(s.error || 'Erro no download.');
    } else {
      updateProgress(s);
    }
  }

  function updateProgress(s) {
    const pct = Math.max(0, Math.min(100, Number(s.percent) || 0));
    const indet = pct === 0 || /Unindo|Convertendo|Preparando|Iniciando/.test(s.stage || '');
    el.progress.classList.toggle('indeterminate', indet && pct < 100 || /Unindo|Convertendo/.test(s.stage || ''));
    el.stage.textContent = s.stage || '';
    el.pct.textContent = indet && pct === 0 ? '' : Math.round(pct) + '%';
    el.bar.style.width = pct + '%';
    el.speed.textContent = s.speed && !/N\/A|Unknown/i.test(s.speed) ? s.speed : '';
    el.eta.textContent = s.eta && !/N\/A|Unknown/i.test(s.eta) ? 'Restam ' + s.eta : '';
  }

  function fail(msg) {
    if (job) { job.es.close(); job = null; }
    el.progress.hidden = true;
    el.dl.hidden = false;
    lockOptions(false);
    toast(msg, true);
  }

  function lockOptions(lock) {
    el.result.querySelectorAll('.tab, .opt input').forEach((i) => {
      if (lock) { i.dataset.wasDisabled = i.disabled; i.disabled = true; }
      else if (i.dataset.wasDisabled !== undefined) { i.disabled = i.dataset.wasDisabled === 'true'; delete i.dataset.wasDisabled; }
    });
  }

  el.cancel.addEventListener('click', () => {
    if (!job) return;
    fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    job.es.close(); job = null;
    el.progress.hidden = true; el.dl.hidden = false;
    lockOptions(false);
    toast('Download cancelado.');
  });

  el.again.addEventListener('click', (e) => {
    if (el.again.getAttribute('href') === '#') e.preventDefault();
  });

  function resetJob() {
    if (job) { fetch(`/api/jobs/${job.id}`, { method: 'DELETE' }); job.es.close(); job = null; }
    el.progress.hidden = true; el.done.hidden = true; el.dl.hidden = false;
    lockOptions(false);
  }

  // Esconde o card de concluído ao trocar opções
  el.result.addEventListener('change', () => { if (!job) { el.done.hidden = true; el.dl.hidden = false; } });
  $$('.tab').forEach((t) => t.addEventListener('click', () => { if (!job) { el.done.hidden = true; el.dl.hidden = false; } }));

  $('#year').textContent = new Date().getFullYear();

  // Aviso se o servidor não tem os binários
  fetch('/api/health').then((r) => r.json()).then((h) => {
    if (!h.ready) setHint('⚠ Servidor sem yt-dlp/ffmpeg — rode <b>npm run setup</b> no terminal.', 'err');
  }).catch(() => {});
})();
