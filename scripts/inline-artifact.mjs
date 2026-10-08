// Folds one page of dist-artifact/<page>/ into a single self-contained HTML file: the stylesheet
// becomes a <style>, the module bundle an inline <script type="module">.
//   node scripts/inline-artifact.mjs index    → dist-artifact/yona.html (a body fragment: the
//                                              viewer supplies <html>/<head>/<body> for the main page)
//   node scripts/inline-artifact.mjs library  → dist-artifact/library.html (a full document, served
//                                              as a second page beside it)
import { readFileSync, writeFileSync } from 'node:fs';

const page = process.argv[2] === 'library' ? 'library' : 'index';
const dir = new URL(`../dist-artifact/${page}/`, import.meta.url);
let html = readFileSync(new URL(`${page}.html`, dir), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, file) => {
  const css = readFileSync(new URL(file, dir), 'utf8');
  return `<style>${css}</style>`;
});
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/, (_, file) => {
  const js = readFileSync(new URL(file, dir), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="icon"[^>]*>/, '');

let out;
let name;
if (page === 'index') {
  const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
  const rest = head.replace(/<title>[\s\S]*?<\/title>|<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, '');
  out = `${title}\n${rest.trim()}\n${body.trim()}\n`;
  name = 'yona.html';
} else {
  out = html;
  name = 'library.html';
}
if (/src="\.\/assets|href="\.\/assets/.test(out)) throw new Error('artifact still references bundled assets');
writeFileSync(new URL(`../${name}`, dir), out);
console.log(`dist-artifact/${name} ${(out.length / 1024).toFixed(0)} KB`);
