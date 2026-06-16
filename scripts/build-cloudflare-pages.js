const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const staticFiles = ['index.html', 'script.js', 'site-loader.js', 'styles.css', 'css/admin.css'];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function copyStaticFile(fileName) {
  const sourcePath = path.join(projectRoot, fileName);
  const targetPath = path.join(distDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Arquivo estatico nao encontrado: ${fileName}`);
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function writeHeadersFile() {
  const headersPath = path.join(distDir, '_headers');
  const headersContent = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '',
    '/script.js',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/site-loader.js',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/styles.css',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/css/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.png',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.jpg',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.jpeg',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.webp',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/*.svg',
    '  Cache-Control: public, max-age=31536000, immutable',
    ''
  ].join('\n');

  fs.writeFileSync(headersPath, headersContent, 'utf8');
}

function main() {
  cleanDir(distDir);
  staticFiles.forEach(copyStaticFile);
  writeHeadersFile();
  console.log(`Cloudflare Pages build pronta em: ${distDir}`);
}

main();
