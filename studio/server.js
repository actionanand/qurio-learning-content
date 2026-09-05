import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { getEditableContent, getItemById, listDashboardStats, listTranslationRows, loadManifest, readLocalizedItem } from './lib/catalog.js';
import { saveNote, saveQuiz, saveSyllabus } from './lib/content-writer.js';
import { rebuildManifest } from './lib/manifest-service.js';
import { getTranslationEditorData, saveMarkdownTranslation, saveQuizTranslation } from './lib/translation-service.js';
import { renderMarkdown } from './lib/markdown-preview.js';
import { validateRepository } from './lib/validation-service.js';
import { getGitStatus } from './lib/git-status.js';
import { listCalendarFiles, listExamPlans, loadCalendar, loadExamPlanBundle, saveCalendar, saveExamPlanBundle } from './lib/exam-service.js';
import { pad2, slugify } from './lib/utils.js';
import { deleteCurriculum, deleteGrade, deleteLanguage, deleteSubject, getCatalogData, getSubjectCode, saveCurriculum, saveGrade, saveLanguage, saveSubject, supportedLanguages } from './lib/catalog-management.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('views', path.join(here, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use(express.json({ limit: '8mb' }));
app.use('/studio-assets', express.static(path.join(here, 'public')));
app.use('/vendor/katex', express.static(path.join(config.rootDir, 'node_modules', 'katex', 'dist')));
app.use('/vendor/mermaid', express.static(path.join(config.rootDir, 'node_modules', 'mermaid', 'dist')));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  const manifest = loadManifest();
  res.locals.languages = supportedLanguages(manifest);
  res.locals.defaultLanguage = manifest.defaultLanguage || 'en';
  res.locals.queryMessage = req.query.message || null;
  next();
});

function render(res, view, data = {}) {
  res.render(view, { ...data, manifest: data.manifest || loadManifest(), git: data.git || getGitStatus() });
}

function redirectWithMessage(res, target, message) {
  const [base, hash = ''] = target.split('#', 2);
  const sep = base.includes('?') ? '&' : '?';
  res.redirect(`${base}${sep}message=${encodeURIComponent(message)}${hash ? `#${hash}` : ''}`);
}

function formCatalog() {
  const manifest = loadManifest();
  return { manifest, grades: manifest.grades || [], subjects: manifest.subjects || [], curricula: manifest.curricula || [] };
}

app.get('/', (req, res) => render(res, 'dashboard', { stats: listDashboardStats(), git: getGitStatus() }));


app.get('/catalog', (req, res) => render(res, 'catalog', getCatalogData()));
app.post('/catalog/languages/save', (req, res, next) => {
  try { const value = saveLanguage(req.body); redirectWithMessage(res, '/catalog#languages', `Saved language ${value.name} (${value.id}).`); }
  catch (error) { next(error); }
});
app.post('/catalog/languages/delete', (req, res, next) => {
  try { deleteLanguage(req.body.id); redirectWithMessage(res, '/catalog#languages', `Removed language ${req.body.id}.`); }
  catch (error) { next(error); }
});
app.post('/catalog/curricula/save', (req, res, next) => {
  try { const value = saveCurriculum(req.body); redirectWithMessage(res, '/catalog#curricula', `Saved curriculum ${value.name}.`); }
  catch (error) { next(error); }
});
app.post('/catalog/curricula/delete', (req, res, next) => {
  try { deleteCurriculum(req.body.id); redirectWithMessage(res, '/catalog#curricula', `Removed curriculum ${req.body.id}.`); }
  catch (error) { next(error); }
});
app.post('/catalog/grades/save', (req, res, next) => {
  try { const value = saveGrade(req.body); redirectWithMessage(res, '/catalog#grades', `Saved Grade ${value.id}.`); }
  catch (error) { next(error); }
});
app.post('/catalog/grades/delete', (req, res, next) => {
  try { deleteGrade(req.body.id); redirectWithMessage(res, '/catalog#grades', `Removed Grade ${req.body.id}.`); }
  catch (error) { next(error); }
});
app.post('/catalog/subjects/save', (req, res, next) => {
  try { const value = saveSubject(req.body); redirectWithMessage(res, '/catalog#subjects', `Saved subject ${value.label?.en || value.id}.`); }
  catch (error) { next(error); }
});
app.post('/catalog/subjects/delete', (req, res, next) => {
  try { deleteSubject(req.body.id); redirectWithMessage(res, '/catalog#subjects', `Removed subject ${req.body.id}.`); }
  catch (error) { next(error); }
});

app.get('/content', (req, res) => {
  const manifest = loadManifest();
  const type = req.query.type || '';
  const curriculum = req.query.curriculum || '';
  const grade = req.query.grade || '';
  const subject = req.query.subject || '';
  let items = manifest.items || [];
  if (type) items = items.filter((i) => i.type === type);
  if (curriculum) items = items.filter((i) => (i.curriculum || 'general') === curriculum);
  if (grade) items = items.filter((i) => Number(i.grade) === Number(grade));
  if (subject) items = items.filter((i) => i.subject === subject);
  render(res, 'content-list', { manifest, items, filters: { type, curriculum, grade, subject } });
});

app.get('/notes/new', (req, res) => render(res, 'note-form', { ...formCatalog(), mode: 'new', note: null }));
app.get('/notes/edit', (req, res, next) => {
  try {
    const content = getEditableContent(req.query.id, req.query.lang || 'en');
    if (content.item.type !== 'note') throw new Error('Selected content is not a study note.');
    render(res, 'note-form', { ...formCatalog(), mode: 'edit', note: { ...content.attributes, body: content.body } });
  } catch (error) { next(error); }
});
app.post('/notes/save', (req, res, next) => {
  try {
    const result = saveNote(req.body);
    rebuildManifest();
    redirectWithMessage(res, '/content?type=note', `Saved ${result.relative} and rebuilt manifest.json.`);
  } catch (error) { next(error); }
});

app.get('/syllabus/new', (req, res) => render(res, 'syllabus-form', { ...formCatalog(), mode: 'new', syllabus: null }));
app.get('/syllabus/edit', (req, res, next) => {
  try {
    const content = getEditableContent(req.query.id, req.query.lang || 'en');
    if (content.item.type !== 'syllabus') throw new Error('Selected content is not a syllabus.');
    render(res, 'syllabus-form', { ...formCatalog(), mode: 'edit', syllabus: { ...content.attributes, body: content.body } });
  } catch (error) { next(error); }
});
app.post('/syllabus/save', (req, res, next) => {
  try {
    const result = saveSyllabus(req.body);
    rebuildManifest();
    redirectWithMessage(res, '/content?type=syllabus', `Saved ${result.relative} and rebuilt manifest.json.`);
  } catch (error) { next(error); }
});

app.get('/quizzes/new', (req, res) => {
  const catalog = formCatalog();
  const grade = Number(req.query.grade || catalog.grades?.[0]?.id || 5);
  const subject = req.query.subject || catalog.subjects?.[0]?.id || 'mathematics';
  const topic = req.query.topic || '';
  const existing = (catalog.manifest.items || []).filter((i) => i.type === 'quiz' && Number(i.grade) === grade && i.subject === subject && (!topic || i.topic === topic));
  const nextSet = Math.max(0, ...existing.map((i) => Number(i.setNumber || 0))) + 1;
  render(res, 'quiz-form', { ...catalog, mode: 'new', quiz: { language: 'en', grade, subject, setNumber: nextSet, questions: [] } });
});
app.get('/quizzes/edit', (req, res, next) => {
  try {
    const content = getEditableContent(req.query.id, req.query.lang || 'en');
    if (content.item.type !== 'quiz') throw new Error('Selected content is not a quiz.');
    render(res, 'quiz-form', { ...formCatalog(), mode: 'edit', quiz: content.data });
  } catch (error) { next(error); }
});
app.post('/quizzes/save', (req, res, next) => {
  try {
    const result = saveQuiz(req.body);
    rebuildManifest();
    redirectWithMessage(res, '/content?type=quiz', `Saved ${result.relative} and rebuilt manifest.json.`);
  } catch (error) { next(error); }
});

app.get('/translations', (req, res) => {
  const type = req.query.type || '';
  let rows = listTranslationRows();
  if (type) rows = rows.filter((r) => r.type === type);
  render(res, 'translations', { rows, type });
});
app.get('/translations/edit', (req, res, next) => {
  try {
    const data = getTranslationEditorData(req.query.id, req.query.target || 'ta');
    render(res, 'translation-edit', data);
  } catch (error) { next(error); }
});
app.post('/translations/markdown', (req, res, next) => {
  try {
    saveMarkdownTranslation(req.body);
    rebuildManifest();
    redirectWithMessage(res, '/translations', `Saved ${req.body.targetLanguage} translation for ${req.body.id}.`);
  } catch (error) { next(error); }
});
app.post('/translations/quiz', (req, res, next) => {
  try {
    const translated = JSON.parse(req.body.translationJson || '{}');
    saveQuizTranslation({ id: req.body.id, targetLanguage: req.body.targetLanguage, translated });
    rebuildManifest();
    redirectWithMessage(res, '/translations', `Saved ${req.body.targetLanguage} quiz translation for ${req.body.id}.`);
  } catch (error) { next(error); }
});

app.post('/api/preview/markdown', (req, res, next) => {
  try { res.json({ html: renderMarkdown(req.body.markdown || '') }); }
  catch (error) { next(error); }
});

app.post('/manifest/rebuild', (req, res, next) => {
  try {
    const nextManifest = rebuildManifest();
    redirectWithMessage(res, '/validate', `Rebuilt manifest.json as ${nextManifest.contentVersion}.`);
  } catch (error) { next(error); }
});

app.get('/validate', (req, res) => render(res, 'validate', { validation: validateRepository() }));

app.get('/exam-plans', (req, res) => render(res, 'exam-plans', { plans: listExamPlans() }));
app.get('/exam-plans/edit', (req, res, next) => {
  try {
    const language = req.query.lang || 'en';
    const bundle = loadExamPlanBundle(req.query.id, language);
    const calendars = listCalendarFiles(req.query.id, language);
    render(res, 'exam-plan-edit', { bundle, calendars });
  } catch (error) { next(error); }
});
app.post('/exam-plans/save', (req, res, next) => {
  try {
    saveExamPlanBundle(req.body.id, req.body.language, req.body);
    redirectWithMessage(res, `/exam-plans/edit?id=${encodeURIComponent(req.body.id)}&lang=${encodeURIComponent(req.body.language)}`, 'Exam plan files saved.');
  } catch (error) { next(error); }
});
app.get('/exam-plans/calendar', (req, res, next) => {
  try {
    const bundle = loadCalendar(req.query.id, req.query.lang || 'en', req.query.month);
    render(res, 'calendar-edit', { bundle });
  } catch (error) { next(error); }
});
app.post('/exam-plans/calendar/save', (req, res, next) => {
  try {
    saveCalendar(req.body.id, req.body.language, req.body.month, req.body.calendarJson);
    redirectWithMessage(res, `/exam-plans/calendar?id=${encodeURIComponent(req.body.id)}&lang=${encodeURIComponent(req.body.language)}&month=${encodeURIComponent(req.body.month)}`, 'Calendar saved.');
  } catch (error) { next(error); }
});

app.get('/api/id-preview', (req, res) => {
  const grade = Number(req.query.grade || 0);
  const subject = String(req.query.subject || '');
  const curriculum = slugify(String(req.query.curriculum || 'general')) || 'general';
  const topic = String(req.query.topic || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const setNumber = Number(req.query.setNumber || 1);
  const core = `${getSubjectCode(subject)}-${pad2(grade)}-${topic}`;
  const base = curriculum === 'general' ? core : `${curriculum}-${core}`;
  res.json({ noteId: base, quizId: `${base}-${pad2(setNumber)}`, seriesId: `${base}-practice` });
});

app.use((req, res) => res.status(404).render('error', { error: new Error('Page not found.'), manifest: loadManifest(), git: getGitStatus(), currentPath: req.path, languages: res.locals.languages, queryMessage: null }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(400).render('error', { error, manifest: loadManifest(), git: getGitStatus(), currentPath: req.path, languages: res.locals.languages, queryMessage: null });
});

app.listen(config.port, config.host, () => {
  console.log(`Qurio Content Studio: http://${config.host}:${config.port}`);
  console.log(`Content root: ${config.rootDir}`);
});
