import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { config } from '../config.js';
import { parseFrontmatter } from './frontmatter.js';
import { readJson, safeRepoPath } from './utils.js';

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

function issue(level, code, message, file = null) {
  return { level, code, message, file };
}

function validateQuizAlignment(source, target, language, file, issues) {
  if (source.id !== target.id) issues.push(issue('error', 'QUIZ_ID_MISMATCH', `${language} quiz ID differs from English.`, file));
  if (source.correctOption !== target.correctOption && source.correctOption) {
    // quiz-level correctOption is uncommon; question-level checked below
  }
  if (source.questions.length !== target.questions.length) {
    issues.push(issue('error', 'QUESTION_COUNT_MISMATCH', `${language} question count differs from English.`, file));
    return;
  }
  source.questions.forEach((sourceQ, index) => {
    const targetQ = target.questions[index];
    if (sourceQ.id !== targetQ.id) issues.push(issue('error', 'QUESTION_ID_MISMATCH', `${language} question ${index + 1} ID must remain ${sourceQ.id}.`, file));
    if (sourceQ.correctOption !== targetQ.correctOption) issues.push(issue('error', 'CORRECT_OPTION_MISMATCH', `${language} question ${sourceQ.id} changed correctOption.`, file));
    const sourceIds = sourceQ.options.map((o) => o.id).join('|');
    const targetIds = targetQ.options.map((o) => o.id).join('|');
    if (sourceIds !== targetIds) issues.push(issue('error', 'OPTION_ID_MISMATCH', `${language} question ${sourceQ.id} option IDs/order differ from English.`, file));
  });
}

export function validateRepository() {
  const issues = [];
  const manifestPath = safeRepoPath(config.rootDir, 'manifest.json');
  let manifest;
  try { manifest = readJson(manifestPath); }
  catch (error) { return { issues: [issue('error', 'MANIFEST_PARSE', error.message, 'manifest.json')], summary: { errors: 1, warnings: 0 } }; }
  if (manifest.schemaVersion !== 2) issues.push(issue('error', 'MANIFEST_SCHEMA', `Expected manifest schemaVersion 2, found ${manifest.schemaVersion}.`, 'manifest.json'));

  const ids = new Set();
  for (const item of manifest.items || []) {
    if (ids.has(item.id)) issues.push(issue('error', 'DUPLICATE_ID', `Duplicate manifest ID: ${item.id}`, 'manifest.json'));
    ids.add(item.id);
    for (const lang of item.languages || []) {
      const relative = `${lang}/${item.path}`;
      const full = safeRepoPath(config.rootDir, relative);
      if (!fs.existsSync(full)) issues.push(issue('error', 'MISSING_FILE', `Manifest points to missing file: ${relative}`, relative));
    }
    if (item.type === 'note') {
      const en = safeRepoPath(config.rootDir, 'en', item.path);
      if (fs.existsSync(en)) {
        try {
          const { attributes } = parseFrontmatter(fs.readFileSync(en, 'utf8'));
          if (attributes.id !== item.id) issues.push(issue('error', 'FRONTMATTER_ID', `Frontmatter ID ${attributes.id} does not match manifest ${item.id}.`, `en/${item.path}`));
          for (const quizId of attributes.quizIds || []) if (!ids.has(quizId) && !(manifest.items || []).some((i) => i.id === quizId)) issues.push(issue('warning', 'UNKNOWN_QUIZ_REF', `${item.id} references missing quiz ${quizId}.`, `en/${item.path}`));
        } catch (error) { issues.push(issue('error', 'FRONTMATTER_PARSE', error.message, `en/${item.path}`)); }
      }
    }
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  let quizValidator = null;
  try { quizValidator = ajv.compile(readJson(safeRepoPath(config.rootDir, 'schemas/quiz.schema.json'))); } catch {}
  for (const item of (manifest.items || []).filter((i) => i.type === 'quiz')) {
    const englishFile = safeRepoPath(config.rootDir, 'en', item.path);
    if (!fs.existsSync(englishFile)) continue;
    let english;
    try { english = readJson(englishFile); } catch (error) { issues.push(issue('error', 'QUIZ_PARSE', error.message, `en/${item.path}`)); continue; }
    if (quizValidator && !quizValidator(english)) {
      issues.push(issue('error', 'QUIZ_SCHEMA', ajv.errorsText(quizValidator.errors, { separator: '; ' }), `en/${item.path}`));
    }
    for (const question of english.questions || []) {
      const idsForQuestion = new Set((question.options || []).map((o) => o.id));
      if (!idsForQuestion.has(question.correctOption)) issues.push(issue('error', 'INVALID_CORRECT_OPTION', `${question.id}: correctOption ${question.correctOption} is not an option ID.`, `en/${item.path}`));
    }
    for (const lang of config.languages.filter((l) => l !== 'en' && item.languages?.includes(l))) {
      const targetFile = safeRepoPath(config.rootDir, lang, item.path);
      try { validateQuizAlignment(english, readJson(targetFile), lang, `${lang}/${item.path}`, issues); }
      catch (error) { issues.push(issue('error', 'QUIZ_PARSE', error.message, `${lang}/${item.path}`)); }
    }
  }

  for (const planRef of manifest.examPlans || []) {
    for (const lang of planRef.languages || []) {
      const file = safeRepoPath(config.rootDir, lang, planRef.path);
      if (!fs.existsSync(file)) issues.push(issue('error', 'MISSING_EXAM_PLAN', `Missing exam plan ${lang}/${planRef.path}.`, `${lang}/${planRef.path}`));
    }
  }

  const files = walkFiles(config.rootDir).filter((f) => !f.includes(`${path.sep}node_modules${path.sep}`));
  if (files.some((f) => f.includes(`${path.sep}examples${path.sep}`))) issues.push(issue('warning', 'LEGACY_EXAMPLES', 'Legacy examples/ folder exists; UI i18n belongs in the Qurio client app.', 'examples/'));

  const summary = {
    errors: issues.filter((i) => i.level === 'error').length,
    warnings: issues.filter((i) => i.level === 'warning').length
  };
  return { issues, summary };
}
