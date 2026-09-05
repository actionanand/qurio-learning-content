import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const previewMarked = new Marked();
previewMarked.use(markedKatex({ throwOnError: false }));
previewMarked.use({
  renderer: {
    html(token) {
      const text = typeof token === 'object' ? token.text : token;
      return `<pre class="raw-html-disabled">${escapeHtml(text)}</pre>`;
    },
    code(token, infoString) {
      const text = typeof token === 'object' ? token.text : token;
      const lang = typeof token === 'object' ? token.lang : infoString;
      if (String(lang || '').trim().toLowerCase() === 'mermaid') {
        return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
      }
      return false;
    }
  }
});

export function renderMarkdown(markdown) {
  return previewMarked.parse(String(markdown || ''));
}
