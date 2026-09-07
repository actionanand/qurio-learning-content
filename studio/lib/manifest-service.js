import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { parseFrontmatter } from './frontmatter.js';
import { contentVersionNow, readJson, safeRepoPath, titleCaseFromSlug, unique, writeJson } from './utils.js';
import { supportedLanguageIds } from './catalog-management.js';

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function relativeWithoutLanguage(filePath) {
  const rel = path.relative(config.rootDir, filePath).replaceAll(path.sep, '/');
  const [lang, ...rest] = rel.split('/');
  return { lang, path: rest.join('/') };
}

function detectLanguages(relativePath, languages) {
  return languages.filter((lang) => fs.existsSync(safeRepoPath(config.rootDir, lang, relativePath)));
}

function cleanLocalizedMap(entries) {
  return Object.fromEntries(
    entries
      .map(([language, value]) => [language, typeof value === 'string' ? value.trim() : ''])
      .filter(([, value]) => value)
  );
}

function localizedMarkdownField(relativePath, languages, field) {
  return cleanLocalizedMap(languages.map((language) => {
    const file = safeRepoPath(config.rootDir, language, relativePath);
    if (!fs.existsSync(file)) return [language, ''];
    try {
      const { attributes } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
      return [language, attributes?.[field] || ''];
    } catch {
      return [language, ''];
    }
  }));
}

function localizedQuizField(relativePath, languages, field) {
  return cleanLocalizedMap(languages.map((language) => {
    const file = safeRepoPath(config.rootDir, language, relativePath);
    if (!fs.existsSync(file)) return [language, ''];
    try {
      const quiz = readJson(file);
      return [language, quiz?.[field] || ''];
    } catch {
      return [language, ''];
    }
  }));
}

function itemFromMarkdown(filePath, languages) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { attributes } = parseFrontmatter(raw);
  const { path: relativePath } = relativeWithoutLanguage(filePath);
  if (!attributes.id || !attributes.type) return null;

  const availableLanguages = detectLanguages(relativePath, languages);
  const title = localizedMarkdownField(relativePath, availableLanguages, 'title');
  const base = {
    id: attributes.id,
    type: attributes.type,
    path: relativePath,
    languages: availableLanguages,
    ...(Object.keys(title).length ? { title } : {}),
    curriculum: attributes.curriculum || 'general',
    grade: Number(attributes.grade),
    subject: attributes.subject
  };

  if (attributes.type === 'note') {
    base.chapter = attributes.chapter;
    base.topic = attributes.topic;
    if (attributes.order != null) base.order = Number(attributes.order);
    if (attributes.difficulty) base.difficulty = attributes.difficulty;
    if (attributes.estimatedMinutes != null) base.estimatedMinutes = Number(attributes.estimatedMinutes);
    if (Array.isArray(attributes.quizIds) && attributes.quizIds.length) base.quizIds = attributes.quizIds;
  }
  if (attributes.type === 'syllabus') base.optional = attributes.optional !== false;
  return base;
}

function itemFromQuiz(filePath, languages) {
  const quiz = readJson(filePath);
  const { path: relativePath } = relativeWithoutLanguage(filePath);
  if (!quiz.id || quiz.type !== 'quiz') return null;

  const availableLanguages = detectLanguages(relativePath, languages);
  const title = localizedQuizField(relativePath, availableLanguages, 'title');
  const setLabel = localizedQuizField(relativePath, availableLanguages, 'setLabel');
  return {
    id: quiz.id,
    type: 'quiz',
    path: relativePath,
    languages: availableLanguages,
    ...(Object.keys(title).length ? { title } : {}),
    ...(Object.keys(setLabel).length ? { setLabel } : {}),
    curriculum: quiz.curriculum || 'general',
    grade: Number(quiz.grade),
    subject: quiz.subject,
    chapter: quiz.chapter,
    topic: quiz.topic,
    ...(quiz.difficulty ? { difficulty: quiz.difficulty } : {}),
    ...(quiz.timeLimitSeconds != null ? { timeLimitSeconds: Number(quiz.timeLimitSeconds) } : {}),
    ...(quiz.passingPercentage != null ? { passingPercentage: Number(quiz.passingPercentage) } : {}),
    questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
    ...(quiz.seriesId ? { seriesId: quiz.seriesId } : {}),
    ...(quiz.setNumber ? { setNumber: Number(quiz.setNumber) } : {}),
    ...(Array.isArray(quiz.sourceNoteIds) && quiz.sourceNoteIds.length ? { sourceNoteIds: quiz.sourceNoteIds } : {})
  };
}

function relationshipKey(item) {
  if (!item || !item.subject || !item.chapter || !item.topic || !item.grade) return null;
  return [
    item.curriculum || 'general',
    Number(item.grade),
    item.subject,
    item.chapter,
    item.topic
  ].join('|');
}

function linkStudyMaterialsAndQuizzes(items) {
  const notes = new Map();
  const quizzes = new Map();

  for (const item of items) {
    const key = relationshipKey(item);
    if (!key) continue;
    if (item.type === 'note') notes.set(key, [...(notes.get(key) || []), item]);
    if (item.type === 'quiz') quizzes.set(key, [...(quizzes.get(key) || []), item]);
  }

  for (const [key, topicNotes] of notes.entries()) {
    const topicQuizzes = [...(quizzes.get(key) || [])]
      .sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0) || a.id.localeCompare(b.id));
    const quizIds = topicQuizzes.map((quiz) => quiz.id);

    for (const note of topicNotes) {
      note.quizIds = unique([...(note.quizIds || []), ...quizIds]);
    }

    const noteIds = topicNotes.map((note) => note.id);
    for (const quiz of topicQuizzes) {
      quiz.sourceNoteIds = unique([...(quiz.sourceNoteIds || []), ...noteIds]);
    }
  }

  return items;
}

function sortItems(items) {
  const order = { syllabus: 0, note: 1, quiz: 2 };
  return items.sort((a, b) => {
    return (a.grade - b.grade)
      || String(a.subject).localeCompare(String(b.subject))
      || (order[a.type] ?? 9) - (order[b.type] ?? 9)
      || Number(a.order || 0) - Number(b.order || 0)
      || String(a.chapter || '').localeCompare(String(b.chapter || ''))
      || String(a.topic || '').localeCompare(String(b.topic || ''))
      || Number(a.setNumber || 0) - Number(b.setNumber || 0)
      || a.id.localeCompare(b.id);
  });
}

function ensureGrades(manifest, items) {
  const existing = new Map((manifest.grades || []).map((g) => [Number(g.id), g]));
  for (const grade of unique(items.map((i) => Number(i.grade)).filter(Boolean))) {
    if (!existing.has(grade)) {
      const labels = Object.fromEntries(supportedLanguageIds(manifest).map((lang) => [lang, `Grade ${grade}`]));
      labels.en = `Grade ${grade}`;
      existing.set(grade, { id: grade, label: labels });
    }
  }
  return [...existing.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

function ensureSubjects(manifest, items) {
  const existing = new Map((manifest.subjects || []).map((s) => [s.id, s]));
  for (const subjectId of unique(items.map((i) => i.subject))) {
    if (!subjectId || existing.has(subjectId)) continue;
    const label = titleCaseFromSlug(subjectId);
    existing.set(subjectId, {
      id: subjectId,
      label: Object.fromEntries(supportedLanguageIds(manifest).map((lang) => [lang, label])),
      gradeScoped: true
    });
  }
  return [...existing.values()];
}

export function rebuildManifest() {
  const manifestPath = safeRepoPath(config.rootDir, 'manifest.json');
  const current = readJson(manifestPath);
  const canonicalLanguage = current.defaultLanguage || config.defaultLanguage;
  const languages = supportedLanguageIds(current);
  const canonicalRoot = safeRepoPath(config.rootDir, canonicalLanguage);
  const files = walkFiles(canonicalRoot).filter((file) => file.includes(`${path.sep}grade-`));
  const items = [];
  for (const file of files) {
    if (file.endsWith('.md')) {
      const item = itemFromMarkdown(file, languages);
      if (item && ['note', 'syllabus'].includes(item.type)) items.push(item);
    } else if (file.endsWith('.json') && file.includes(`${path.sep}quizzes${path.sep}`)) {
      const item = itemFromQuiz(file, languages);
      if (item) items.push(item);
    }
  }

  linkStudyMaterialsAndQuizzes(items);

  const next = {
    ...current,
    schemaVersion: 2,
    contentVersion: contentVersionNow(),
    generatedAt: new Date().toISOString(),
    defaultLanguage: current.defaultLanguage || config.defaultLanguage,
    fallbackLanguage: current.fallbackLanguage || config.fallbackLanguage,
    grades: ensureGrades(current, items),
    subjects: ensureSubjects(current, items),
    items: sortItems(items)
  };
  writeJson(manifestPath, next);
  return next;
}
