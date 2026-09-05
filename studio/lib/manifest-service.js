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

function itemFromMarkdown(filePath, languages) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { attributes } = parseFrontmatter(raw);
  const { path: relativePath } = relativeWithoutLanguage(filePath);
  if (!attributes.id || !attributes.type) return null;
  const base = {
    id: attributes.id,
    type: attributes.type,
    path: relativePath,
    languages: detectLanguages(relativePath, languages),
    curriculum: attributes.curriculum || 'general',
    grade: Number(attributes.grade),
    subject: attributes.subject
  };
  if (attributes.type === 'note') {
    base.chapter = attributes.chapter;
    base.topic = attributes.topic;
    if (Array.isArray(attributes.quizIds) && attributes.quizIds.length) base.quizIds = attributes.quizIds;
  }
  if (attributes.type === 'syllabus') base.optional = attributes.optional !== false;
  return base;
}

function itemFromQuiz(filePath, languages) {
  const quiz = readJson(filePath);
  const { path: relativePath } = relativeWithoutLanguage(filePath);
  if (!quiz.id || quiz.type !== 'quiz') return null;
  return {
    id: quiz.id,
    type: 'quiz',
    path: relativePath,
    languages: detectLanguages(relativePath, languages),
    curriculum: quiz.curriculum || 'general',
    grade: Number(quiz.grade),
    subject: quiz.subject,
    chapter: quiz.chapter,
    topic: quiz.topic,
    ...(quiz.seriesId ? { seriesId: quiz.seriesId } : {}),
    ...(quiz.setNumber ? { setNumber: Number(quiz.setNumber) } : {}),
    ...(Array.isArray(quiz.sourceNoteIds) && quiz.sourceNoteIds.length ? { sourceNoteIds: quiz.sourceNoteIds } : {})
  };
}

function sortItems(items) {
  const order = { syllabus: 0, note: 1, quiz: 2 };
  return items.sort((a, b) => {
    return (a.grade - b.grade)
      || String(a.subject).localeCompare(String(b.subject))
      || (order[a.type] ?? 9) - (order[b.type] ?? 9)
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
