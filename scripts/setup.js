// Baixa os binários necessários: yt-dlp (release oficial no GitHub) e ffmpeg (via ffmpeg-static).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const isWin = process.platform === 'win32';
const YTDLP_NAME = isWin ? 'yt-dlp.exe' : (process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux');
const YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_NAME}`;
const YTDLP_DEST = path.join(BIN_DIR, isWin ? 'yt-dlp.exe' : 'yt-dlp');

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  if (!isWin) fs.chmodSync(dest, 0o755);
  return buf.length;
}

(async () => {
  fs.mkdirSync(BIN_DIR, { recursive: true });

  if (fs.existsSync(YTDLP_DEST)) {
    console.log('✔ yt-dlp já existe, atualizando…');
    try { execFileSync(YTDLP_DEST, ['-U'], { stdio: 'inherit' }); } catch { /* ignora */ }
  } else {
    console.log(`↓ Baixando yt-dlp de ${YTDLP_URL}`);
    const size = await download(YTDLP_URL, YTDLP_DEST);
    console.log(`✔ yt-dlp salvo (${(size / 1048576).toFixed(1)} MB)`);
  }

  const ffmpegPath = require('ffmpeg-static');
  if (!fs.existsSync(ffmpegPath)) {
    console.log('↓ Baixando ffmpeg…');
    execFileSync(process.execPath, [path.join(path.dirname(require.resolve('ffmpeg-static')), 'install.js')], { stdio: 'inherit' });
  }
  console.log(fs.existsSync(ffmpegPath) ? '✔ ffmpeg pronto' : '✖ ffmpeg não encontrado');
})().catch((e) => { console.error(e.message); process.exit(1); });
