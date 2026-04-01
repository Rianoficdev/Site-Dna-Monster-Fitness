const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const staticFiles = ['index.html', 'script.js', 'styles.css'];

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

  fs.copyFileSync(sourcePath, targetPath);
}

function writeHeadersFile() {
  const headersPath = path.join(distDir, '_headers');
  const headersContent = [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
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
