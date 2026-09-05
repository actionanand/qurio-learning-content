import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { parseFrontmatter } from './frontmatter.js';
import { readJson, safeRepoPath } from './utils.js';
import { supportedLanguageIds } from './catalog-management.js';

export function loadManifest() {
  return readJson(safeRepoPath(config.rootDir, 'manifest.json'));
}

export function getItemById(id) {
  return loadManifest().items.find((item) => item.id === id) || null;
}

export function localizedPath(item, language) {
  return safeRepoPath(config.rootDir, language, item.path);
}

export function readLocalizedItem(item, language) {
  const filePath = localizedPath(item, language);
  if (!fs.existsSync(filePath)) return null;
  if (item.type === 'quiz') return { kind: 'quiz', filePath, data: readJson(filePath) };
  const text = fs.readFileSync(filePath, 'utf8');
  return { kind: 'markdown', filePath, ...parseFrontmatter(text) };
}

export function resolveLanguage(item, requestedLanguage) {
  if (item.languages?.includes(requestedLanguage)) return requestedLanguage;
  if (item.languages?.includes(config.fallbackLanguage)) return config.fallbackLanguage;
  return item.languages?.[0] || config.defaultLanguage;
}

export function listTranslationRows() {
  const manifest = loadManifest();
  return manifest.items.map((item) => ({
    ...item,
    status: Object.fromEntries(supportedLanguageIds(manifest).map((lang) => [lang, item.languages?.includes(lang) || false]))
  }));
}

export function listDashboardStats() {
  const manifest = loadManifest();
  const counts = { notes: 0, quizzes: 0, syllabi: 0 };
  for (const item of manifest.items) {
    if (item.type === 'note') counts.notes++;
    if (item.type === 'quiz') counts.quizzes++;
    if (item.type === 'syllabus') counts.syllabi++;
  }
  const missingTranslations = manifest.items.reduce((sum, item) => {
    return sum + supportedLanguageIds(manifest).filter((lang) => lang !== manifest.defaultLanguage && !item.languages?.includes(lang)).length;
  }, 0);
  return {
    manifest,
    counts,
    missingTranslations,
    exams: manifest.exams?.length || 0,
    examPlans: manifest.examPlans?.length || 0
  };
}

export function getEditableContent(id, language) {
  const item = getItemById(id);
  if (!item) throw new Error(`Unknown content ID: ${id}`);
  const resolved = readLocalizedItem(item, language);
  if (!resolved) throw new Error(`No ${language} file exists for ${id}.`);
  return { item, ...resolved };
}

export function listExistingChapters(grade, subject) {
  const manifest = loadManifest();
  return [...new Set(manifest.items
    .filter((i) => Number(i.grade) === Number(grade) && i.subject === subject && i.chapter)
    .map((i) => i.chapter))].sort();
}

export function getRepoRelative(filePath) {
  return path.relative(config.rootDir, filePath).replaceAll(path.sep, '/');
}
