<p align="center">
  <a href="https://ounc3.com.br"><img src="docs/site-desktop.webp" alt="Página inicial do OunceDown" width="800" /></a>
</p>

# OunceDown

Site para baixar vídeos do YouTube, Instagram, Facebook e X em MP4, ou só o áudio em MP3. Está no ar em [ounc3.com.br](https://ounc3.com.br).

Comecei o projeto para estudar Node.js e acabei levando a sério: hoje ele roda num tablet velho de 1 GB de RAM aqui de casa, publicado na internet por um túnel da Cloudflare. A montagem desse servidor está documentada no repositório [servidor-twist](https://github.com/MajorCaio/servidor-twist).

## O que ele faz

Você cola o link, o site descobre de qual rede é e mostra título, miniatura e duração. Aí é escolher entre vídeo e áudio em MP3. No tablet o vídeo vai até 720p, que é o que ele aguenta; numa máquina mais forte o código chega a 4K, é só mudar o `MAX_HEIGHT`. O progresso aparece em tempo real enquanto o servidor baixa o vídeo, o áudio e junta os dois com o ffmpeg.

Algumas decisões que tomei pelo caminho:

- O front é HTML, CSS e JavaScript puros. Não precisei de framework e o tablet agradece.
- Cada busca importante ("YouTube para MP3", "baixar Reels"...) tem uma página própria gerada a partir do mesmo HTML, com dados estruturados para o Google, sitemap e 404 de verdade.
- Os anúncios ficam presos em iframes com sandbox, sem pop-up nem redirecionamento, e com o espaço reservado para a página não pular quando eles carregam. Funciona com Adsterra ou Google AdSense.
- A parte pesada (analisar um link com o yt-dlp) tem fila e limite por visitante, porque num servidor fraco meia dúzia de pedidos ao mesmo tempo já derrubavam tudo. Mais detalhes abaixo.

## Tecnologias

- Node.js com Express: API, páginas e entrega dos arquivos
- yt-dlp: lê os dados do vídeo e faz o download
- ffmpeg: junta vídeo e áudio e converte para MP3
- Cloudflare: DNS, HTTPS, cache e o túnel até o tablet

## Rodando na sua máquina

Precisa do Node.js 18 ou mais novo.

```bash
npm install
npm run setup     # baixa o yt-dlp (release oficial) e o ffmpeg
npm start         # abre em http://localhost:3000
```

Para usar seu domínio, e-mail e chaves de anúncio, copie o modelo de configuração:

```bash
cp site.config.example.json site.config.json
```

O `site.config.json` não vai para o Git. Sem ele, o site usa o modelo de exemplo.

### Variáveis de ambiente

| Variável | Padrão | O que faz |
|---|---|---|
| `PORT` / `HOST` | `3000` / todas | Porta e endereço do servidor |
| `MAX_HEIGHT` | `2160` | Resolução máxima oferecida. No tablet uso `720` |
| `MAX_CONCURRENT` | `3` | Quantos downloads rodam ao mesmo tempo |
| `YTDLP_PATH` / `FFMPEG_PATH` | `./bin` ou `PATH` | Caminho dos programas, se já estiverem instalados no sistema |
| `YTDLP_JS_RUNTIMES` | vazio | Runtime JavaScript que o yt-dlp usa no YouTube (ex.: `node`) |
| `TMP_DIR` | `./tmp` | Pasta dos arquivos temporários, apagados depois de 30 min |

### Proteção contra abuso

Analisar um link é o que mais pesa: cada análise abre um yt-dlp, que no YouTube ainda abre um Node.js para resolver um desafio em JavaScript. No tablet isso leva uns 40 segundos e mais de 100 MB de RAM. Por isso:

- cada visitante tem um limite de análises por minuto e de downloads a cada 10 minutos;
- cada visitante só faz uma análise e um download por vez;
- existe uma fila curta: o que passar dela recebe "servidor ocupado" na hora, sem gastar CPU;
- o resultado de um link fica guardado por 30 minutos (erros, por 2), e pedidos iguais ao mesmo tempo usam a mesma análise.

Atrás do túnel, todo acesso chega como se viesse de 127.0.0.1. O IP real vem no cabeçalho `CF-Connecting-IP`, que o servidor só aceita quando a conexão é local, ou seja, quando vem do próprio `cloudflared`.

| Variável | Padrão | O que faz |
|---|---|---|
| `MAX_INFO_CONCURRENT` | `2` | Análises rodando ao mesmo tempo |
| `INFO_QUEUE_MAX` | `4` | Quantas podem esperar na fila |
| `INFO_QUEUE_WAIT_MS` | `60000` | Tempo máximo esperando na fila |
| `INFO_TIMEOUT_MS` | `90000` | Tempo máximo de uma análise |
| `RATE_INFO_PER_MIN` | `8` | Análises por visitante por minuto |
| `RATE_JOBS_PER_10MIN` | `6` | Downloads por visitante a cada 10 minutos |

No tablet uso `MAX_INFO_CONCURRENT=1`, `INFO_QUEUE_MAX=3`, `RATE_INFO_PER_MIN=6` e `RATE_JOBS_PER_10MIN=4`. Vale somar isso a uma regra de limite de pedidos em `/api/*` no painel da Cloudflare, que barra o excesso antes de chegar no servidor.

## Configuração (`site.config.json`)

| Campo | Para que serve |
|---|---|
| `siteName`, `siteUrl`, `contactEmail`, `owner` | Nome, endereço e contato, usados nas páginas, nas políticas, no `robots.txt` e no `sitemap.xml` |
| `policiesUpdated` | Data que aparece na Privacidade e nos Termos |
| `ads.provider` | `"adsterra"` ou `"adsense"` |
| `ads.showPlaceholders` | `false` esconde os quadros "Seu anúncio aqui" |
| `ads.adsterra.scriptUrl` | Endereço do script da Adsterra, com `{key}` no lugar da chave |
| `ads.adsterra.banner728` / `banner320` / `banner160` | Chaves dos banners de computador, celular e laterais |
| `adsense.client` / `adsense.slots` | `ca-pub-…` e IDs dos blocos, se for usar AdSense. Gera o `/ads.txt` e a verificação |

O servidor relê esse arquivo a cada acesso, então não precisa reiniciar depois de mexer.

## Onde fica cada coisa

```
server.js            API, páginas, sitemap, robots e ads.txt
seo-pages.js         Títulos, textos e perguntas de cada página
public/
  index.html         HTML único das páginas, com marcadores {{...}}
  app.js             Interface: análise do link, opções e progresso
  ads.js             Espaços de anúncio
  styles.css         Visual
  privacidade.html   Política de Privacidade (LGPD)
  termos.html        Termos de Uso
  brand/             Logo, ícones, banner de fundo e imagem de compartilhamento
scripts/setup.js     Baixa o yt-dlp e o ffmpeg
docs/                Captura do site usada neste README
```

### API

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/info` | Dados do link: título, miniatura, duração e qualidades |
| `POST` | `/api/jobs` | Começa um download (`kind`: `video` ou `audio`, e `quality`) |
| `GET` | `/api/jobs/:id/events` | Progresso em tempo real (Server-Sent Events) |
| `GET` | `/api/jobs/:id/file` | Entrega o arquivo pronto |
| `DELETE` | `/api/jobs/:id` | Cancela e apaga o download |

## Sobre direitos autorais

Use para baixar vídeos seus, de domínio público ou que o autor liberou. Cada rede tem os próprios termos de uso, e vale a pena respeitar.

---

Feito por [MajorCaio](https://github.com/MajorCaio), um projeto Ounc3.
