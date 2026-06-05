/**
 * Builds WordPress embed with Shadow DOM isolation (CSS cannot leak to/from theme).
 */
import fs from 'fs';
import path from 'path';

const src = path.resolve('z-docs/docs/wordpress/ttu-travel-search-widget-embed.html');
const html = fs.readFileSync(src, 'utf8');

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
function extractWidgetHtml(html) {
  const start = html.indexOf('<div id="ttu-widget-root">');
  if (start === -1) return null;
  let depth = 0;
  let i = start;
  while (i < html.length) {
    const open = html.indexOf('<div', i);
    const close = html.indexOf('</div>', i);
    if (close === -1) return null;
    if (open !== -1 && open < close) {
      depth++;
      i = open + 4;
    } else {
      depth--;
      i = close + 6;
      if (depth === 0) return html.slice(start, i);
    }
  }
  return null;
}
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const widgetHtml = extractWidgetHtml(html);

if (!styleMatch || !widgetHtml || !scriptMatch) {
  console.error('Could not parse embed sections');
  process.exit(1);
}

let css = styleMatch[1]
  .replace(/html\.ttu-sheet-open[^}]+\}[^}]+\}/g, '')
  .replace(
    /\/\* Standalone[\s\S]*?document\.head\.appendChild\(vp\);\s*\}/,
    '/* viewport: use theme meta — do not inject globally */'
  );

css = `@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;600;700&family=Bai+Jamjuree:wght@600;700&display=swap');

:host {
  display: block;
  width: 100%;
  max-width: 100%;
  font-family: 'Lato', -apple-system, BlinkMacSystemFont, sans-serif;
}

${css}

#ttu-widget-root .ttu-calendar-header,
#ttu-widget-root .ttu-mobile-sheet-title,
.ttu-mobile-sheet .ttu-mobile-sheet-title {
  font-family: 'Bai Jamjuree', sans-serif !important;
}
`;

let js = scriptMatch[1]
  .replace(
    /\/\* Standalone \/ missing theme viewport[\s\S]*?document\.head\.appendChild\(vp\);\s*\}/,
    '/* viewport: managed by WordPress theme */'
  )
  .replace(/document\.getElementById\(/g, 'byId(')
  .replace(/document\.querySelectorAll\(/g, '$qa(')
  .replace(/document\.querySelector\(/g, '$q(')
  .replace('document.body.appendChild(mobileSheetEl)', 'shadow.appendChild(mobileSheetEl)')
  .replace(
    "document.documentElement.classList.add('ttu-sheet-open')",
    "host.classList.add('ttu-sheet-open')"
  )
  .replace(
    "document.documentElement.classList.remove('ttu-sheet-open')",
    "host.classList.remove('ttu-sheet-open')"
  );

const bootstrap = `
      const host = document.getElementById('ttu-widget-host');
      if (!host) return;
      if (!host.shadowRoot) {
        const tpl = host.querySelector('#ttu-shadow-tpl');
        if (!tpl) return;
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.appendChild(tpl.content.cloneNode(true));
        tpl.remove();
      }
      const shadow = host.shadowRoot;
      function byId(id) { return shadow.getElementById(id); }
      function $q(sel) { return shadow.querySelector(sel); }
      function $qa(sel) { return shadow.querySelectorAll(sel); }
      function isInsideWidget(event) {
        return event.composedPath().includes(host);
      }
`;

js = js.replace(
  /\(function \(\) \{\s*'use strict';/,
  `(function () {
      'use strict';
${bootstrap}`
);

js = js.replace(
  'const ttuRoot = byId(\'ttu-widget-root\');',
  'const ttuRoot = byId(\'ttu-widget-root\') || host;'
);

js = js.replace(
  /function isMobileView\(\) \{\s*const root = byId\('ttu-widget-root'\);/,
  `function isMobileView() {
        const root = host;`
);

js = js.replace(
  /new ResizeObserver\(syncLayoutMode\)\.observe\(ttuRoot\)/,
  'new ResizeObserver(syncLayoutMode).observe(host)'
);

// Outside-click handlers: only close when click is inside widget shadow tree
js = js.replace(
  `document.addEventListener('click', (e) => {
        if (e.target.closest('#ttu-widget-root')) return;`,
  `document.addEventListener('click', (e) => {
        if (!isInsideWidget(e)) return;
        if (e.target.closest('#ttu-widget-root')) return;`
);

js = js.replace(
  `document.addEventListener('click', e => {
        if (!e.target.closest('#from-field-wrap')`,
  `document.addEventListener('click', e => {
        if (!isInsideWidget(e)) {
          $qa('.ttu-dropdown, .ttu-traveler-dropdown, .ttu-calendar').forEach(el => { el.style.display = 'none'; });
          return;
        }
        if (!e.target.closest('#from-field-wrap')`
);

const out = `<!-- TravelTourUp Search Widget — paste entire block into WordPress Custom HTML -->
<!-- CSS/JS are Shadow DOM isolated: zero impact on theme/Elementor styles -->
<div id="ttu-widget-host">
  <template id="ttu-shadow-tpl">
    <style>${css}</style>
    ${widgetHtml}
  </template>
</div>
<script>${js}</script>
`;

fs.writeFileSync(src, out);
console.log('Built shadow DOM embed:', src);
