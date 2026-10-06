// Folds dist-artifact/ into one HTML body fragment (the viewer supplies <html>/<head>/<body>):
// the stylesheet becomes a <style>, the module bundle an inline <script type="module">.
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../dist-artifact/', import.meta.url);
let html = readFileSync(new URL('index.html', dir), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/, (_, file) => {
  const css = readFileSync(new URL(file, dir), 'utf8');
  return `<style>${css}</style>`;
});
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/, (_, file) => {
  const js = readFileSync(new URL(file, dir), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="icon"[^>]*>/, '');

const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const rest = head.replace(/<title>[\s\S]*?<\/title>|<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, '');

const out = `${title}\n${rest.trim()}\n${body.trim()}\n`;
if (/src="\.\/|href="\.\/assets/.test(out)) throw new Error('artifact still references external assets');
writeFileSync(new URL('yona.html', dir), out);
console.log(`dist-artifact/yona.html ${(out.length / 1024).toFixed(0)} KB`);
