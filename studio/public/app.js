(() => {
  const sidebar = document.querySelector('.sidebar');
  document.querySelector('[data-menu-toggle]')?.addEventListener('click', () => sidebar?.classList.toggle('open'));
  document.addEventListener('click', event => {
    if (window.innerWidth > 900 || !sidebar?.classList.contains('open')) return;
    if (!sidebar.contains(event.target) && !event.target.closest('[data-menu-toggle]')) sidebar.classList.remove('open');
  });

  if (window.mermaid) {
    window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default' });
  }

  async function refreshPreview() {
    const source = document.querySelector('[data-markdown-source]');
    const target = document.querySelector('[data-markdown-preview]');
    if (!source || !target) return;
    target.innerHTML = '<p class="muted">Rendering…</p>';
    try {
      const response = await fetch('/api/preview/markdown', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ markdown: source.value })
      });
      if (!response.ok) throw new Error('Preview failed');
      const { html } = await response.json();
      target.innerHTML = html;
      if (window.mermaid) {
        try { await window.mermaid.run({ nodes: target.querySelectorAll('.mermaid') }); } catch (e) { console.warn('Mermaid preview:', e); }
      }
    } catch (error) {
      target.innerHTML = `<div class="preview-error">${error.message}</div>`;
    }
  }
  document.querySelectorAll('[data-preview-button]').forEach(button => button.addEventListener('click', refreshPreview));
  if (document.querySelector('[data-markdown-source]')) refreshPreview();
})();
