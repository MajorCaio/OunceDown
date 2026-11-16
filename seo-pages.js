// Conteúdo de SEO do OunceDown: a página inicial e uma página de entrada para cada busca importante.
// Todas usam o mesmo modelo (public/index.html); aqui ficam título, descrição, textos e perguntas.
// {{MAX_LABEL}} vira a resolução máxima do servidor (ex.: 720p ou 4K) e {{SITE_NAME}} o nome do site.

const commonFaq = [
  ['Por que algumas resoluções aparecem desativadas?',
    'O {{SITE_NAME}} só oferece qualidades que existem no vídeo original e que o servidor suporta no momento (até {{MAX_LABEL}}). Se o vídeo foi publicado em resolução menor, as opções maiores ficam desativadas.'],
  ['Consigo baixar vídeos privados?',
    'Não. Apenas mídias públicas, que qualquer pessoa consegue ver sem fazer login, podem ser baixadas.'],
  ['Funciona no celular?',
    'Sim. O site funciona no navegador do Android e do iPhone, sem instalar nada: copie o link no app e toque em “Colar”.'],
  ['É gratuito? Preciso criar conta?',
    'É gratuito e não precisa de cadastro. O site é mantido por anúncios discretos, que nunca aparecem no meio do download.'],
  ['Posso baixar qualquer conteúdo?',
    'Baixe apenas conteúdos seus, de domínio público ou com permissão do autor. Respeite os direitos autorais e os termos de uso de cada plataforma.'],
];

const pages = {
  '/': {
    title: 'Baixar vídeos do YouTube, Instagram e Facebook | OunceDown',
    description: 'Baixe vídeos do YouTube, Instagram, Facebook e X em MP4 ou converta para MP3. Grátis, sem cadastro e sem instalar nada — direto no navegador.',
    h1a: 'Baixe qualquer vídeo',
    h1b: 'em segundos.',
    lead: 'Vídeos em até {{MAX_LABEL}} ou só o áudio em MP3 — direto do YouTube, Facebook, Instagram e X.',
    seo: `
      <h2>Baixador de vídeos online, grátis e sem cadastro</h2>
      <p>O {{SITE_NAME}} transforma o link de um vídeo público em um arquivo MP4 para assistir offline, ou extrai só o áudio em MP3. Funciona no computador e no celular, sem programas, extensões ou criação de conta.</p>
      <p>Basta copiar o endereço do vídeo, colar no campo acima e escolher entre vídeo ou áudio. O site detecta a plataforma sozinho e mostra só as qualidades disponíveis para aquele vídeo.</p>`,
    faq: commonFaq,
  },

  '/baixar-video-youtube': {
    platform: 'YouTube',
    title: 'Baixar vídeo do YouTube em MP4 — grátis e sem programa | OunceDown',
    description: 'Cole o link e baixe vídeos do YouTube em MP4, em até {{MAX_LABEL}}, direto no navegador. Grátis, sem cadastro e sem instalar nada.',
    h1a: 'Baixar vídeo do YouTube',
    h1b: 'em MP4.',
    lead: 'Cole o link do vídeo do YouTube e salve em MP4 (até {{MAX_LABEL}}) ou só o áudio em MP3.',
    seo: `
      <h2>Como baixar vídeos do YouTube</h2>
      <ol>
        <li>Abra o vídeo no app ou no site do YouTube e toque em <b>Compartilhar → Copiar link</b>.</li>
        <li>Cole o link no campo acima e toque em <b>Analisar</b>.</li>
        <li>Escolha <b>Vídeo MP4</b> e a qualidade, e toque em <b>Baixar vídeo</b>.</li>
      </ol>
      <p>Funcionam links de vídeos comuns, Shorts e links curtos (youtu.be). Playlists não são baixadas inteiras: o {{SITE_NAME}} baixa só o vídeo do link.</p>`,
    faq: [
      ['Dá para baixar YouTube Shorts?', 'Sim. Copie o link do Short pelo botão Compartilhar e cole no {{SITE_NAME}}, como em qualquer outro vídeo.'],
      ['Em que qualidade o vídeo é baixado?', 'Na melhor qualidade disponível até {{MAX_LABEL}}. Se o vídeo original tiver resolução menor, ele é baixado na resolução original.'],
      ...commonFaq.slice(1),
    ],
  },

  '/youtube-para-mp3': {
    platform: 'YouTube',
    title: 'Converter YouTube para MP3 — grátis e online | OunceDown',
    description: 'Converta vídeos do YouTube para MP3 na melhor qualidade disponível. Cole o link, escolha Áudio MP3 e baixe. Grátis e sem cadastro.',
    h1a: 'Converter YouTube',
    h1b: 'para MP3.',
    lead: 'Cole o link de um vídeo do YouTube e baixe só o áudio em MP3, na melhor qualidade disponível.',
    seo: `
      <h2>Como converter um vídeo do YouTube em MP3</h2>
      <ol>
        <li>Copie o link do vídeo no YouTube (<b>Compartilhar → Copiar link</b>).</li>
        <li>Cole no campo acima e toque em <b>Analisar</b>.</li>
        <li>Selecione a aba <b>Áudio MP3</b> e toque em <b>Baixar áudio</b>.</li>
      </ol>
      <p>O áudio é extraído do próprio vídeo e convertido para MP3 com a maior qualidade disponível, ideal para ouvir podcasts, aulas e palestras offline.</p>`,
    faq: [
      ['Qual a qualidade do MP3?', 'O {{SITE_NAME}} usa a melhor faixa de áudio que o vídeo oferece e converte para MP3 de alta qualidade (até 320 kbps, conforme o original).'],
      ['Funciona com vídeos longos?', 'Sim, mas vídeos muito longos demoram mais para converter. Acompanhe a barra de progresso.'],
      ...commonFaq.slice(1),
    ],
  },

  '/baixar-video-instagram': {
    platform: 'Instagram',
    title: 'Baixar vídeo e Reels do Instagram — grátis | OunceDown',
    description: 'Baixe Reels e vídeos públicos do Instagram em MP4 ou extraia o áudio em MP3. Cole o link e pronto — grátis e sem login.',
    h1a: 'Baixar Reels e vídeos',
    h1b: 'do Instagram.',
    lead: 'Cole o link de um Reel ou vídeo público do Instagram e salve em MP4 ou só o áudio em MP3.',
    seo: `
      <h2>Como baixar Reels do Instagram</h2>
      <ol>
        <li>No Instagram, toque nos <b>três pontinhos</b> ou no ícone de <b>enviar</b> do Reel e escolha <b>Copiar link</b>.</li>
        <li>Cole o link no campo acima e toque em <b>Analisar</b>.</li>
        <li>Escolha vídeo ou áudio e toque em baixar.</li>
      </ol>
      <p>Só funcionam publicações de perfis públicos. Conteúdos de perfis privados e Stories exigem login e não podem ser baixados.</p>`,
    faq: [
      ['Dá para baixar Stories?', 'Não. Stories e publicações de contas privadas exigem login, e o {{SITE_NAME}} só acessa conteúdo público.'],
      ['O vídeo baixado tem marca d’água?', 'Não adicionamos marca d’água. O arquivo é o vídeo publicado no Instagram.'],
      ...commonFaq.slice(1),
    ],
  },

  '/baixar-video-facebook': {
    platform: 'Facebook',
    title: 'Baixar vídeo do Facebook em MP4 — grátis | OunceDown',
    description: 'Baixe vídeos públicos do Facebook em MP4 ou extraia o áudio em MP3. Funciona no celular e no PC, sem cadastro e sem instalar nada.',
    h1a: 'Baixar vídeo',
    h1b: 'do Facebook.',
    lead: 'Cole o link de um vídeo público do Facebook e salve em MP4 ou só o áudio em MP3.',
    seo: `
      <h2>Como baixar vídeos do Facebook</h2>
      <ol>
        <li>No vídeo, toque em <b>Compartilhar → Copiar link</b>.</li>
        <li>Cole o link no campo acima e toque em <b>Analisar</b>.</li>
        <li>Escolha a qualidade ou o áudio MP3 e baixe.</li>
      </ol>
      <p>Funcionam vídeos públicos de páginas, perfis e Reels do Facebook, inclusive links curtos (fb.watch). Vídeos de grupos privados não podem ser baixados.</p>`,
    faq: [
      ['Funciona com Reels do Facebook?', 'Sim. Copie o link do Reel e cole no {{SITE_NAME}}.'],
      ['Por que aparece “mídia privada”?', 'O vídeo está em um perfil, grupo ou página com acesso restrito. Só vídeos públicos podem ser baixados.'],
      ...commonFaq.slice(1),
    ],
  },

  '/baixar-video-twitter-x': {
    platform: 'X',
    title: 'Baixar vídeo do X (Twitter) em MP4 — grátis | OunceDown',
    description: 'Baixe vídeos de posts públicos do X (antigo Twitter) em MP4 ou converta para MP3. Cole o link do post e baixe. Grátis e sem cadastro.',
    h1a: 'Baixar vídeo do X',
    h1b: '(Twitter).',
    lead: 'Cole o link de um post público do X (antigo Twitter) e salve o vídeo em MP4 ou o áudio em MP3.',
    seo: `
      <h2>Como baixar vídeos do X (Twitter)</h2>
      <ol>
        <li>No post com o vídeo, toque em <b>Compartilhar → Copiar link</b>.</li>
        <li>Cole o link no campo acima e toque em <b>Analisar</b>.</li>
        <li>Escolha vídeo ou áudio e baixe.</li>
      </ol>
      <p>Funcionam links de x.com e twitter.com. Posts de contas protegidas não podem ser baixados.</p>`,
    faq: [
      ['Funciona com links do twitter.com?', 'Sim. Links antigos do twitter.com e os novos do x.com funcionam igual.'],
      ['Dá para baixar GIFs do X?', 'Sim. Os GIFs do X são vídeos curtos e são baixados em MP4.'],
      ...commonFaq.slice(1),
    ],
  },
};

// Links internos mostrados em todas as páginas (ajudam o Google a encontrar as páginas de entrada).
const toolLinks = [
  ['/baixar-video-youtube', 'Baixar vídeo do YouTube'],
  ['/youtube-para-mp3', 'YouTube para MP3'],
  ['/baixar-video-instagram', 'Baixar Reels do Instagram'],
  ['/baixar-video-facebook', 'Baixar vídeo do Facebook'],
  ['/baixar-video-twitter-x', 'Baixar vídeo do X (Twitter)'],
];

module.exports = { pages, toolLinks };
