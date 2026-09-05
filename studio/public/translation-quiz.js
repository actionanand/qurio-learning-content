(() => {
  const form = document.getElementById('quizTranslationForm');
  if (!form) return;
  const source = JSON.parse(document.getElementById('sourceTranslationQuiz').textContent);
  const target = JSON.parse(document.getElementById('targetTranslationQuiz').textContent);
  const container = document.getElementById('translationQuestions');
  const esc = (value='') => String(value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  container.innerHTML = source.questions.map((sq, index) => {
    const tq = target.questions?.[index] || {};
    return `<article class="question-card tr-question" data-index="${index}">
      <div class="question-head"><div><span class="question-number">${esc(sq.id)}</span><strong>Correct option: ${esc(sq.correctOption)}</strong></div><span class="lock-chip">Locked</span></div>
      <div class="translation-field"><div class="source-text"><small>English question</small><p>${esc(sq.question)}</p></div><label>Translation<textarea data-field="question" required>${esc(tq.question || '')}</textarea></label></div>
      <div class="translation-field"><div class="source-text"><small>English hint</small><p>${esc(sq.hint || '')}</p></div><label>Translation<textarea data-field="hint">${esc(tq.hint || '')}</textarea></label></div>
      <div class="translation-options">${sq.options.map((so, oi) => {
        const to = tq.options?.[oi] || {};
        return `<div class="option-editor ${sq.correctOption===so.id?'is-correct':''}" data-option-index="${oi}">
          <div class="option-title"><span>${esc(so.id)}</span>${sq.correctOption===so.id?'<strong>Correct</strong>':''}</div>
          <div class="source-text"><small>English answer</small><p>${esc(so.text)}</p></div>
          <label>Translated answer<input data-option-field="text" value="${esc(to.text || '')}" required></label>
          <div class="source-text"><small>English feedback</small><p>${esc(so.feedback)}</p></div>
          <label>Translated feedback<textarea data-option-field="feedback" required>${esc(to.feedback || '')}</textarea></label>
        </div>`;
      }).join('')}</div>
      <div class="translation-field"><div class="source-text"><small>English explanation</small><p>${esc(sq.explanation || '')}</p></div><label>Translation<textarea data-field="explanation" required>${esc(tq.explanation || '')}</textarea></label></div>
    </article>`;
  }).join('');

  form.addEventListener('submit', () => {
    const questions = source.questions.map((sq, index) => {
      const card = container.querySelector(`[data-index="${index}"]`);
      const translatedOptions = sq.options.map((so, oi) => {
        const option = card.querySelector(`[data-option-index="${oi}"]`);
        return {
          id: so.id,
          text: option.querySelector('[data-option-field="text"]').value,
          feedback: option.querySelector('[data-option-field="feedback"]').value
        };
      });
      return {
        id: sq.id,
        type: sq.type,
        question: card.querySelector('[data-field="question"]').value,
        hint: card.querySelector('[data-field="hint"]').value,
        options: translatedOptions,
        correctOption: sq.correctOption,
        explanation: card.querySelector('[data-field="explanation"]').value
      };
    });
    document.getElementById('translationJson').value = JSON.stringify({
      setLabel: document.getElementById('trSetLabel').value,
      title: document.getElementById('trTitle').value,
      description: document.getElementById('trDescription').value,
      questions
    });
  });
})();
