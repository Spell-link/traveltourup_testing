import fs from 'fs';
import postcss from 'postcss';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scope-widget-css.mjs <embed.html>');
  process.exit(1);
}

const html = fs.readFileSync(file, 'utf8');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  console.error('No <style> block found');
  process.exit(1);
}

const css = styleMatch[1];

function shouldSkipScope(selector) {
  const s = selector.trim();
  if (s.includes('#ttu-widget-root')) return true;
  if (s.startsWith('html.ttu-sheet-open')) return true;
  if (s === '.ttu-mobile-sheet' || s.startsWith('.ttu-mobile-sheet.')) return true;
  if (s.startsWith('.ttu-mobile-sheet ')) return true;
  return false;
}

function scopeSelector(selector) {
  const s = selector.trim();
  if (s === ':root') return '#ttu-widget-root';
  if (shouldSkipScope(s)) return s;
  return `#ttu-widget-root ${s}, .ttu-mobile-sheet ${s}`;
}

const root = postcss.parse(css);
root.walkRules((rule) => {
  if (rule.parent?.type === 'rule') return;
  rule.selectors = rule.selectors.map(scopeSelector);
});

let scoped = root.toString();

scoped = scoped.replace(/\.dropdown-scrollbar/g, '.ttu-dropdown-scroll');

const newHtml = html
  .replace(/<style>[\s\S]*?<\/style>/, `<style>${scoped}</style>`)
  .replace(/dropdown-scrollbar/g, 'ttu-dropdown-scroll');

fs.writeFileSync(file, newHtml);
console.log('Scoped CSS written to', file);
