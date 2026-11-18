// Textos de cada página. Todas usam o mesmo HTML (public/index.html); aqui mudam só título,
// descrição, chamada e perguntas, pensados para o que as pessoas digitam no Google.
// {{MAX_LABEL}} vira a resolução máxima do servidor (720p no tablet) e {{SITE_NAME}} o nome do site.

const commonFaq = [
  ['Por que algumas resoluções aparecem desativadas?',
    'Porque o vídeo original não foi publicado nelas, ou porque passam do limite do servidor (hoje, {{MAX_LABEL}}). Só aparecem as qualidades que dá para entregar de verdade.'],
  ['Consigo baixar vídeo privado?',
    'Não. Só funciona com o que qualquer pessoa consegue assistir sem fazer login.'],
  ['Funciona no celular?',
    'Funciona no navegador do Android e do iPhone, sem instalar nada. Copie o link no app e toque em “Colar”.'],
  ['É de graça? Precisa criar conta?',
    'É de graça e não tem cadastro. Os anúncios pagam o servidor e nunca aparecem no meio do download.'],
  ['Posso baixar qualquer coisa?',
    'Baixe vídeos seus, de domínio público ou que o autor liberou. Direito autoral vale na internet também, e cada rede tem as próprias regras.'],
];

const pages = {
  '/': {
    title: 'Baixar vídeos do YouTube, Instagram, Facebook e X | OunceDown',
    description: 'Cole o link e baixe vídeos do YouTube, Instagram, Facebook e X em MP4, ou só o áudio em MP3. De graça, sem cadastro e sem instalar nada.',
    h1a: 'Cole o link.',
    h1b: 'Leve o vídeo.',
    lead: 'YouTube, Instagram, Facebook e X. Em MP4 até {{MAX_LABEL}}, ou só o áudio em MP3.',
    seo: `
      <h2>Para que serve o {{SITE_NAME}}</h2>
      <p>Você cola o link de um vídeo público e recebe o arquivo para assistir sem internet. Se preferir, sai só o áudio, em MP3. Funciona no computador e no celular, sem programa, extensão ou conta.</p>
      <p>O site descobre sozinho de qual rede é o link e mostra só as qualidades que aquele vídeo realmente tem.</p>`,
    faq: commonFaq,
  },

  '/baixar-video-youtube': {
    platform: 'YouTube',
    title: 'Baixar vídeo do YouTube em MP4, sem programa | OunceDown',
    description: 'Cole o link e salve vídeos do YouTube em MP4, até {{MAX_LABEL}}, direto pelo navegador. De graça e sem cadastro.',
    h1a: 'Baixar vídeo do YouTube',
    h1b: 'em MP4.',
    lead: 'Cole o link do vídeo e salve em MP4 (até {{MAX_LABEL}}), ou só o áudio em MP3.',
    seo: `
      <h2>Como baixar vídeo do YouTube</h2>
      <ol>
        <li>No app ou no site do YouTube, toque em <b>Compartilhar</b> e depois em <b>Copiar link</b>.</li>
        <li>Cole o link no campo lá em cima e toque em <b>Analisar</b>.</li>
        <li>Deixe em <b>Vídeo MP4</b>, escolha a qualidade e toque em <b>Baixar vídeo</b>.</li>
      </ol>
      <p>Vale para vídeo comum, Shorts e link curto (youtu.be). Playlist não vem inteira: o {{SITE_NAME}} baixa só o vídeo do link.</p>`,
    faq: [
      ['Dá para baixar Shorts?', 'Dá. Copie o link do Short pelo botão Compartilhar e cole aqui, como qualquer outro vídeo.'],
      ['Em que qualidade o vídeo vem?', 'Na melhor disponível até {{MAX_LABEL}}. Se o original for menor que isso, vem na resolução original.'],
      ...commonFaq.slice(1),
    ],
  },

  '/youtube-para-mp3': {
    platform: 'YouTube',
    title: 'YouTube para MP3: converta online e de graça | OunceDown',
    description: 'Transforme vídeos do YouTube em MP3 na melhor qualidade que o vídeo tiver. Cole o link, escolha Áudio MP3 e baixe. Sem cadastro.',
    h1a: 'YouTube',
    h1b: 'para MP3.',
    lead: 'Cole o link de um vídeo do YouTube e baixe só o áudio, em MP3.',
    seo: `
      <h2>Como passar um vídeo do YouTube para MP3</h2>
      <ol>
        <li>Copie o link do vídeo no YouTube (<b>Compartilhar</b> e depois <b>Copiar link</b>).</li>
        <li>Cole no campo lá em cima e toque em <b>Analisar</b>.</li>
        <li>Mude para a aba <b>Áudio MP3</b> e toque em <b>Baixar áudio</b>.</li>
      </ol>
      <p>O áudio sai do próprio vídeo e é convertido na melhor qualidade disponível. Serve bem para podcast, aula e palestra no fone, sem gastar internet.</p>`,
    faq: [
      ['Qual a qualidade do MP3?', 'Usamos a melhor faixa de áudio que o vídeo tem e convertemos em MP3 de até 320 kbps, dependendo do original.'],
      ['Funciona com vídeo longo?', 'Funciona, só demora mais. A barra de progresso mostra em que pé está.'],
      ...commonFaq.slice(1),
    ],
  },

  '/baixar-video-instagram': {
    platform: 'Instagram',
    title: 'Baixar Reels e vídeos do Instagram, de graça | OunceDown',
    description: 'Salve Reels e vídeos públicos do Instagram em MP4, ou só o áudio em MP3. É colar o link e baixar, sem login.',
    h1a: 'Baixar Reels e vídeos',
    h1b: 'do Instagram.',
    lead: 'Cole o link de um Reel ou vídeo público e salve em MP4, ou só o áudio em MP3.',
    seo: `
      <h2>Como baixar Reels do Instagram</h2>
      <ol>
        <li>No Reel, toque nos <b>três pontinhos</b> ou no ícone de <b>enviar</b> e escolha <b>Copiar link</b>.</li>
        <li>Cole o link no campo lá em cima e toque em <b>Analisar</b>.</li>
        <li>Escolha vídeo ou áudio e baixe.</li>
      </ol>
      <p>Só funciona com perfil público. Perfil privado e Stories pedem login, então não dá para baixar.</p>`,
    faq: [
      ['Dá para baixar Stories?', 'Não. Stories e posts de contas privadas pedem login, e o {{SITE_NAME}} só acessa o que é público.'],
      ['O vídeo vem com marca d’água?', 'Não colocamos marca nenhuma. Você recebe o vídeo do jeito que foi publicado.'],
      ...commonFaq.slice(1),
    ],
  },

  '/baixar-video-facebook': {
    platform: 'Facebook',
    title: 'Baixar vídeo do Facebook em MP4, de graça | OunceDown',
    description: 'Salve vídeos públicos do Facebook em MP4, ou só o áudio em MP3. Funciona no celular e no PC, sem cadastro e sem instalar nada.',
    h1a: 'Baixar vídeo',
    h1b: 'do Facebook.',
    lead: 'Cole o link de um vídeo público do Facebook e salve em MP4, ou só o áudio em MP3.',
    seo: `
      <h2>Como baixar vídeo do Facebook</h2>
      <ol>
        <li>No vídeo, toque em <b>Compartilhar</b> e depois em <b>Copiar link</b>.</li>
        <li>Cole o link no campo lá em cima e toque em <b>Analisar</b>.</li>
        <li>Escolha a qualidade ou o áudio em MP3 e baixe.</li>
      </ol>
      <p>Funciona com vídeo público de página, perfil e Reels, inclusive link curto (fb.watch). Vídeo de grupo privado não dá.</p>`,
    faq: [
      ['Funciona com Reels do Facebook?', 'Funciona. Copie o link do Reel e cole aqui.'],
      ['Por que aparece “mídia privada”?', 'O vídeo está num perfil, grupo ou página fechada. Só dá para baixar o que é público.'],
      ...commonFaq.slice(1),
    ],
  },

  '/baixar-video-twitter-x': {
    platform: 'X',
    title: 'Baixar vídeo do X (Twitter) em MP4, de graça | OunceDown',
    description: 'Salve vídeos de posts públicos do X, o antigo Twitter, em MP4 ou MP3. Cole o link do post e baixe. Sem cadastro.',
    h1a: 'Baixar vídeo do X',
    h1b: '(Twitter).',
    lead: 'Cole o link de um post público do X, o antigo Twitter, e salve em MP4 ou só o áudio em MP3.',
    seo: `
      <h2>Como baixar vídeo do X (Twitter)</h2>
      <ol>
        <li>No post com o vídeo, toque em <b>Compartilhar</b> e depois em <b>Copiar link</b>.</li>
        <li>Cole o link no campo lá em cima e toque em <b>Analisar</b>.</li>
        <li>Escolha vídeo ou áudio e baixe.</li>
      </ol>
      <p>Aceita link de x.com e de twitter.com. Post de conta protegida não dá para baixar.</p>`,
    faq: [
      ['Link do twitter.com funciona?', 'Funciona. Os links antigos do twitter.com e os novos do x.com dão no mesmo.'],
      ['Dá para baixar GIF do X?', 'Dá. Os GIFs do X são, na verdade, vídeos curtos, e vêm em MP4.'],
      ...commonFaq.slice(1),
    ],
  },
};

// Links para as outras páginas, no rodapé de todas (ajudam o Google a achar cada uma).
const toolLinks = [
  ['/baixar-video-youtube', 'Baixar vídeo do YouTube'],
  ['/youtube-para-mp3', 'YouTube para MP3'],
  ['/baixar-video-instagram', 'Baixar Reels do Instagram'],
  ['/baixar-video-facebook', 'Baixar vídeo do Facebook'],
  ['/baixar-video-twitter-x', 'Baixar vídeo do X (Twitter)'],
];

module.exports = { pages, toolLinks };
