(() => {
  const form = document.querySelector('#examPlanForm');
  const list = document.querySelector('#phaseList');
  const empty = document.querySelector('#phaseEmpty');
  const output = document.querySelector('#phasesJson');
  if (!form || !list || !output) return;

  let phases = [];
  try { phases = JSON.parse(document.querySelector('#initialPhases')?.textContent || '[]'); } catch { phases = []; }

  function safe(value = '') {
    return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function syncFromDom() {
    phases = [...list.querySelectorAll('[data-phase]')].map((card, index) => ({
      id: card.querySelector('[data-field="id"]').value.trim() || `phase-${index + 1}`,
      order: Number(card.querySelector('[data-field="order"]').value || index + 1),
      name: card.querySelector('[data-field="name"]').value.trim(),
      startDate: card.querySelector('[data-field="startDate"]').value,
      endDate: card.querySelector('[data-field="endDate"]').value
    }));
    output.value = JSON.stringify(phases);
  }

  function render() {
    list.innerHTML = phases.map((phase, index) => `
      <article class="phase-card" data-phase>
        <div class="phase-head"><div><span class="phase-number">${index + 1}</span><strong>${safe(phase.name || `Phase ${index + 1}`)}</strong></div><button type="button" class="icon-button danger" data-remove-phase="${index}" title="Remove phase">×</button></div>
        <div class="form-grid five compact-fields">
          <label>Phase ID<input data-field="id" value="${safe(phase.id || `phase-${index + 1}`)}" placeholder="phase-${index + 1}"></label>
          <label>Order<input data-field="order" type="number" min="1" value="${Number(phase.order || index + 1)}"></label>
          <label class="span-two">Name<input data-field="name" value="${safe(phase.name || '')}" placeholder="Foundation" required></label>
          <label>Start<input data-field="startDate" type="date" value="${safe(phase.startDate || '')}" required></label>
          <label>End<input data-field="endDate" type="date" value="${safe(phase.endDate || '')}" required></label>
        </div>
      </article>`).join('');
    empty.hidden = phases.length > 0;
    syncFromDom();
  }

  document.querySelector('#addPhase')?.addEventListener('click', () => {
    syncFromDom();
    phases.push({ id: `phase-${phases.length + 1}`, order: phases.length + 1, name: '', startDate: '', endDate: '' });
    render();
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-phase]');
    if (!button) return;
    syncFromDom();
    phases.splice(Number(button.dataset.removePhase), 1);
    phases = phases.map((phase, index) => ({ ...phase, order: index + 1 }));
    render();
  });

  list.addEventListener('input', event => {
    if (event.target.matches('[data-field="name"]')) event.target.closest('[data-phase]')?.querySelector('.phase-head strong')?.replaceChildren(event.target.value || 'Untitled phase');
    syncFromDom();
  });

  document.querySelector('#createPlanTranslation')?.addEventListener('click', event => {
    const select = document.querySelector('#planTranslationLanguage');
    if (select) event.currentTarget.value = select.value;
  });

  form.addEventListener('submit', syncFromDom);
  render();
})();
