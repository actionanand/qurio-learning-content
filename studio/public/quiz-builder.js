(() => {
  const form = document.getElementById('quizForm');
  if (!form) return;
  const list = document.getElementById('questionList');
  const empty = document.getElementById('questionEmpty');
  const addButton = document.getElementById('addQuestion');
  const hidden = document.getElementById('questionsJson');
  const initial = JSON.parse(document.getElementById('initialQuestions')?.textContent || '[]');
  let questions = initial.length ? initial.map(normalizeQuestion) : [];

  function normalizeQuestion(q = {}) {
    const options = ['A','B','C','D'].map((id, index) => {
      const found = (q.options || []).find(o => o.id === id) || q.options?.[index] || {};
      return { id, text: found.text || '', feedback: found.feedback || '' };
    });
    return {
      id: q.id || `q${questions.length + 1}`,
      type: 'single-choice',
      question: q.question || '',
      hint: q.hint || '',
      options,
      correctOption: q.correctOption || 'A',
      explanation: q.explanation || ''
    };
  }

  function esc(value='') {
    return String(value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  function render() {
    empty.hidden = questions.length > 0;
    list.innerHTML = questions.map((q, idx) => `
      <article class="question-card" data-index="${idx}">
        <div class="question-head"><div><span class="question-number">Q${idx + 1}</span><strong>${esc(q.id)}</strong></div><button type="button" class="icon-button danger" data-remove="${idx}" aria-label="Remove question">×</button></div>
        <div class="form-grid two">
          <label>Question<textarea data-field="question" required>${esc(q.question)}</textarea></label>
          <label>Hint<textarea data-field="hint">${esc(q.hint)}</textarea></label>
        </div>
        <div class="options-grid">
          ${q.options.map(opt => `
            <div class="option-editor ${q.correctOption===opt.id?'is-correct':''}">
              <div class="option-title"><span>${opt.id}</span><label class="radio-label"><input type="radio" name="correct-${idx}" value="${opt.id}" ${q.correctOption===opt.id?'checked':''} data-correct> Correct</label></div>
              <label>Answer<input data-option="${opt.id}" data-option-field="text" value="${esc(opt.text)}" required></label>
              <label>Feedback<textarea data-option="${opt.id}" data-option-field="feedback" required>${esc(opt.feedback)}</textarea></label>
            </div>`).join('')}
        </div>
        <label>Explanation<textarea data-field="explanation" required>${esc(q.explanation)}</textarea></label>
      </article>`).join('');
  }

  function syncFromDom() {
    document.querySelectorAll('.question-card').forEach(card => {
      const i = Number(card.dataset.index);
      const q = questions[i];
      card.querySelectorAll('[data-field]').forEach(el => q[el.dataset.field] = el.value);
      q.correctOption = card.querySelector('[data-correct]:checked')?.value || 'A';
      q.options.forEach(opt => {
        const text = card.querySelector(`[data-option="${opt.id}"][data-option-field="text"]`);
        const feedback = card.querySelector(`[data-option="${opt.id}"][data-option-field="feedback"]`);
        opt.text = text?.value || '';
        opt.feedback = feedback?.value || '';
      });
    });
  }

  addButton.addEventListener('click', () => {
    syncFromDom();
    questions.push(normalizeQuestion({ id: `q${questions.length + 1}` }));
    render();
  });
  list.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove]');
    if (!remove) return;
    syncFromDom();
    questions.splice(Number(remove.dataset.remove), 1);
    questions.forEach((q, i) => { if (/^q\d+$/.test(q.id)) q.id = `q${i + 1}`; });
    render();
  });
  list.addEventListener('change', event => {
    if (event.target.matches('[data-correct]')) {
      syncFromDom();
      render();
    }
  });
  form.addEventListener('submit', event => {
    syncFromDom();
    if (!questions.length) {
      event.preventDefault();
      alert('Add at least one question.');
      return;
    }
    hidden.value = JSON.stringify(questions);
  });

  async function updatePreview() {
    const grade = document.getElementById('quizGrade')?.value;
    const subject = document.getElementById('quizSubject')?.value;
    const topic = document.getElementById('quizTopic')?.value;
    const setNumber = document.getElementById('quizSetNumber')?.value;
    if (!grade || !subject || !topic) return;
    try {
      const params = new URLSearchParams({grade, subject, topic, setNumber});
      const data = await fetch(`/api/id-preview?${params}`).then(r => r.json());
      document.getElementById('idPreview').innerHTML = `<div><small>Note ID</small><code>${data.noteId}</code></div><div><small>Quiz ID</small><code>${data.quizId}</code></div><div><small>Series</small><code>${data.seriesId}</code></div>`;
      const series = document.getElementById('quizSeriesId');
      if (series && !series.value) series.placeholder = data.seriesId;
    } catch {}
  }
  ['quizGrade','quizSubject','quizTopic','quizSetNumber'].forEach(id => document.getElementById(id)?.addEventListener('input', updatePreview));
  render();
  updatePreview();
})();
