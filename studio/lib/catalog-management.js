import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { readJson, safeRepoPath, slugify, titleCaseFromSlug, writeJson } from './utils.js';

const MANIFEST = () => safeRepoPath(config.rootDir, 'manifest.json');

function load() {
  return readJson(MANIFEST());
}

function save(manifest) {
  manifest.generatedAt = new Date().toISOString();
  writeJson(MANIFEST(), manifest);
  return manifest;
}

function text(value) {
  return String(value ?? '').trim();
}

function languageId(value) {
  const id = text(value).toLowerCase();
  if (!/^[a-z]{2,8}(?:-[a-z0-9]{2,8})?$/.test(id)) {
    throw new Error('Language ID must be a lowercase code such as en, ta, hi, kn, ml or pt-br.');
  }
  return id;
}

function catalogId(value, label) {
  const id = slugify(value);
  if (!id) throw new Error(`${label} ID is required and must contain letters or numbers.`);
  return id;
}

function labelFromInput(input, languages, fallback) {
  const labels = {};
  for (const lang of languages) {
    const value = text(input[`label_${lang.id}`]);
    if (value) labels[lang.id] = value;
  }
  if (!labels.en && fallback) labels.en = fallback;
  const first = Object.values(labels).find(Boolean) || fallback;
  for (const lang of languages) {
    if (!labels[lang.id]) labels[lang.id] = first;
  }
  return labels;
}

export function supportedLanguages(manifest = load()) {
  const langs = Array.isArray(manifest.supportedLanguages) ? manifest.supportedLanguages : [];
  if (langs.length) return langs;
  return [{ id: manifest.defaultLanguage || 'en', name: 'English', nativeName: 'English' }];
}

export function supportedLanguageIds(manifest = load()) {
  return supportedLanguages(manifest).map((language) => language.id);
}

export function defaultCurriculumId(manifest = load()) {
  return manifest.curricula?.find((c) => c.isDefault)?.id || manifest.curricula?.[0]?.id || 'general';
}

export function getSubjectCode(subjectId, manifest = load()) {
  const subject = manifest.subjects?.find((s) => s.id === subjectId);
  const explicit = text(subject?.shortCode).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (explicit) return explicit;
  const known = {
    mathematics: 'math',
    science: 'sci',
    english: 'eng',
    'social-studies': 'sst',
    intelligence: 'int',
    'general-knowledge': 'gk'
  };
  return known[subjectId] || slugify(subjectId).replace(/-/g, '').slice(0, 5) || 'subj';
}

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}

function countSubjectId(value, subjectId) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countSubjectId(item, subjectId), 0);
  if (!value || typeof value !== 'object') return 0;
  let count = value.subjectId === subjectId ? 1 : 0;
  for (const child of Object.values(value)) count += countSubjectId(child, subjectId);
  return count;
}

function subjectExamReferenceCount(subjectId) {
  let count = 0;
  for (const language of supportedLanguageIds()) {
    const examRoot = safeRepoPath(config.rootDir, language, 'exams');
    for (const file of filesUnder(examRoot)) {
      if (!file.endsWith('.json')) continue;
      try { count += countSubjectId(readJson(file), subjectId); }
      catch { /* validation will report malformed content separately */ }
    }
  }
  return count;
}

export function getCatalogUsage(manifest = load()) {
  const language = Object.fromEntries(supportedLanguageIds(manifest).map((id) => [id, 0]));
  const curriculum = Object.fromEntries((manifest.curricula || []).map((c) => [c.id, 0]));
  const grade = Object.fromEntries((manifest.grades || []).map((g) => [String(g.id), 0]));
  const subject = Object.fromEntries((manifest.subjects || []).map((s) => [s.id, 0]));

  for (const item of manifest.items || []) {
    for (const lang of item.languages || []) language[lang] = (language[lang] || 0) + 1;
    if (item.curriculum) curriculum[item.curriculum] = (curriculum[item.curriculum] || 0) + 1;
    if (Number.isFinite(Number(item.grade))) grade[String(item.grade)] = (grade[String(item.grade)] || 0) + 1;
    if (item.subject) subject[item.subject] = (subject[item.subject] || 0) + 1;
  }
  for (const plan of manifest.examPlans || []) {
    for (const lang of plan.languages || []) language[lang] = (language[lang] || 0) + 1;
  }
  for (const id of Object.keys(subject)) subject[id] += subjectExamReferenceCount(id);
  return { language, curriculum, grade, subject };
}

export function saveLanguage(input) {
  const manifest = load();
  const id = languageId(input.id);
  const languages = supportedLanguages(manifest);
  const existing = languages.find((language) => language.id === id);
  const value = {
    id,
    name: text(input.name) || existing?.name || id.toUpperCase(),
    nativeName: text(input.nativeName) || existing?.nativeName || text(input.name) || id.toUpperCase()
  };
  if (existing) Object.assign(existing, value);
  else languages.push(value);
  manifest.supportedLanguages = languages;
  // Backfill display labels so clients can safely render the new language before translations are entered.
  for (const grade of manifest.grades || []) {
    grade.label ||= {};
    if (!grade.label[id]) grade.label[id] = grade.label.en || `Grade ${grade.id}`;
  }
  for (const subject of manifest.subjects || []) {
    subject.label ||= {};
    if (!subject.label[id]) subject.label[id] = subject.label.en || titleCaseFromSlug(subject.id);
  }
  fs.mkdirSync(safeRepoPath(config.rootDir, id), { recursive: true });
  save(manifest);
  return value;
}

export function deleteLanguage(idValue) {
  const manifest = load();
  const id = languageId(idValue);
  if (id === manifest.defaultLanguage || id === manifest.fallbackLanguage) {
    throw new Error(`Cannot delete ${id}; it is the default or fallback language.`);
  }
  const usage = getCatalogUsage(manifest).language[id] || 0;
  if (usage > 0) throw new Error(`Cannot delete ${id}; it is referenced by ${usage} content/plan item(s).`);
  manifest.supportedLanguages = supportedLanguages(manifest).filter((language) => language.id !== id);
  save(manifest);
}

export function saveCurriculum(input) {
  const manifest = load();
  const id = catalogId(input.id, 'Curriculum');
  manifest.curricula ||= [];
  const existing = manifest.curricula.find((curriculum) => curriculum.id === id);
  const makeDefault = input.isDefault === 'on' || input.isDefault === true;
  if (makeDefault) for (const curriculum of manifest.curricula) curriculum.isDefault = false;
  const value = { id, name: text(input.name) || existing?.name || titleCaseFromSlug(id), isDefault: makeDefault || existing?.isDefault || false };
  if (existing) Object.assign(existing, value);
  else manifest.curricula.push(value);
  if (!manifest.curricula.some((curriculum) => curriculum.isDefault)) manifest.curricula[0].isDefault = true;
  save(manifest);
  return value;
}

export function deleteCurriculum(idValue) {
  const manifest = load();
  const id = catalogId(idValue, 'Curriculum');
  const target = manifest.curricula?.find((curriculum) => curriculum.id === id);
  if (!target) throw new Error(`Unknown curriculum: ${id}`);
  if (target.isDefault) throw new Error('Set another curriculum as default before deleting this one.');
  const usage = getCatalogUsage(manifest).curriculum[id] || 0;
  if (usage > 0) throw new Error(`Cannot delete ${id}; it is used by ${usage} content item(s).`);
  manifest.curricula = manifest.curricula.filter((curriculum) => curriculum.id !== id);
  save(manifest);
}

export function saveGrade(input) {
  const manifest = load();
  const id = Number(input.id);
  if (!Number.isInteger(id) || id < 1 || id > 99) throw new Error('Grade must be a whole number between 1 and 99.');
  manifest.grades ||= [];
  const existing = manifest.grades.find((grade) => Number(grade.id) === id);
  const languages = supportedLanguages(manifest);
  const fallback = text(input.label_en) || existing?.label?.en || `Grade ${id}`;
  const label = { ...(existing?.label || {}), ...labelFromInput(input, languages, fallback) };
  const value = { id, label };
  if (existing) Object.assign(existing, value);
  else manifest.grades.push(value);
  manifest.grades.sort((a, b) => Number(a.id) - Number(b.id));
  save(manifest);
  return value;
}

export function deleteGrade(idValue) {
  const manifest = load();
  const id = Number(idValue);
  const usage = getCatalogUsage(manifest).grade[String(id)] || 0;
  if (usage > 0) throw new Error(`Cannot delete Grade ${id}; it is used by ${usage} content item(s).`);
  manifest.grades = (manifest.grades || []).filter((grade) => Number(grade.id) !== id);
  save(manifest);
}

export function saveSubject(input) {
  const manifest = load();
  const id = catalogId(input.id, 'Subject');
  manifest.subjects ||= [];
  const existing = manifest.subjects.find((subject) => subject.id === id);
  const languages = supportedLanguages(manifest);
  const fallback = text(input.label_en) || existing?.label?.en || titleCaseFromSlug(id);
  const label = { ...(existing?.label || {}), ...labelFromInput(input, languages, fallback) };
  const shortCode = text(input.shortCode || existing?.shortCode).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (shortCode && (shortCode.length < 2 || shortCode.length > 8)) throw new Error('Subject short code must contain 2–8 letters/numbers.');
  const value = {
    id,
    label,
    gradeScoped: input.gradeScoped === 'on' || input.gradeScoped === true,
    ...(shortCode ? { shortCode } : {})
  };
  if (existing) Object.assign(existing, value);
  else manifest.subjects.push(value);
  manifest.subjects.sort((a, b) => String(a.label?.en || a.id).localeCompare(String(b.label?.en || b.id)));
  save(manifest);
  return value;
}

export function deleteSubject(idValue) {
  const manifest = load();
  const id = catalogId(idValue, 'Subject');
  const usage = getCatalogUsage(manifest).subject[id] || 0;
  if (usage > 0) throw new Error(`Cannot delete ${id}; it is referenced ${usage} time(s) by learning or exam-plan content.`);
  manifest.subjects = (manifest.subjects || []).filter((subject) => subject.id !== id);
  save(manifest);
}

export function getCatalogData() {
  const manifest = load();
  return {
    manifest,
    languages: supportedLanguages(manifest),
    curricula: manifest.curricula || [],
    grades: manifest.grades || [],
    subjects: manifest.subjects || [],
    usage: getCatalogUsage(manifest),
    defaultCurriculum: defaultCurriculumId(manifest)
  };
}
