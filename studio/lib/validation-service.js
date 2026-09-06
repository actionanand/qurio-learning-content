import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { config } from '../config.js';
import { parseFrontmatter } from './frontmatter.js';
import { readJson, safeRepoPath } from './utils.js';
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

function issue(level, code, message, file = null) {
  return { level, code, message, file };
}

function validateQuizAlignment(source, target, language, file, issues) {
  if (source.id !== target.id) issues.push(issue('error', 'QUIZ_ID_MISMATCH', `${language} quiz ID differs from the canonical source.`, file));
  if (source.correctOption !== target.correctOption && source.correctOption) {
    // quiz-level correctOption is uncommon; question-level checked below
  }
  if (source.questions.length !== target.questions.length) {
    issues.push(issue('error', 'QUESTION_COUNT_MISMATCH', `${language} question count differs from the canonical source.`, file));
    return;
  }
  source.questions.forEach((sourceQ, index) => {
    const targetQ = target.questions[index];
    if (sourceQ.id !== targetQ.id) issues.push(issue('error', 'QUESTION_ID_MISMATCH', `${language} question ${index + 1} ID must remain ${sourceQ.id}.`, file));
    if (sourceQ.correctOption !== targetQ.correctOption) issues.push(issue('error', 'CORRECT_OPTION_MISMATCH', `${language} question ${sourceQ.id} changed correctOption.`, file));
    const sourceIds = sourceQ.options.map((o) => o.id).join('|');
    const targetIds = targetQ.options.map((o) => o.id).join('|');
    if (sourceIds !== targetIds) issues.push(issue('error', 'OPTION_ID_MISMATCH', `${language} question ${sourceQ.id} option IDs/order differ from the canonical source.`, file));
  });
}

export function validateRepository() {
  const issues = [];
  const manifestPath = safeRepoPath(config.rootDir, 'manifest.json');
  let manifest;
  try { manifest = readJson(manifestPath); }
  catch (error) { return { issues: [issue('error', 'MANIFEST_PARSE', error.message, 'manifest.json')], summary: { errors: 1, warnings: 0 } }; }
  if (manifest.schemaVersion !== 2) issues.push(issue('error', 'MANIFEST_SCHEMA', `Expected manifest schemaVersion 2, found ${manifest.schemaVersion}.`, 'manifest.json'));

  const duplicateValues = (values) => values.filter((value, index) => values.indexOf(value) !== index);
  const languageIds = supportedLanguageIds(manifest);
  for (const id of new Set(duplicateValues(languageIds))) issues.push(issue('error', 'DUPLICATE_LANGUAGE', `Duplicate language ID: ${id}`, 'manifest.json'));
  if (!languageIds.includes(manifest.defaultLanguage)) issues.push(issue('error', 'DEFAULT_LANGUAGE', `defaultLanguage ${manifest.defaultLanguage} is not in supportedLanguages.`, 'manifest.json'));
  if (!languageIds.includes(manifest.fallbackLanguage)) issues.push(issue('error', 'FALLBACK_LANGUAGE', `fallbackLanguage ${manifest.fallbackLanguage} is not in supportedLanguages.`, 'manifest.json'));

  const curriculumIds = (manifest.curricula || []).map((value) => value.id);
  for (const id of new Set(duplicateValues(curriculumIds))) issues.push(issue('error', 'DUPLICATE_CURRICULUM', `Duplicate curriculum ID: ${id}`, 'manifest.json'));
  const gradeIds = (manifest.grades || []).map((value) => String(value.id));
  for (const id of new Set(duplicateValues(gradeIds))) issues.push(issue('error', 'DUPLICATE_GRADE', `Duplicate grade ID: ${id}`, 'manifest.json'));
  const subjectIds = (manifest.subjects || []).map((value) => value.id);
  for (const id of new Set(duplicateValues(subjectIds))) issues.push(issue('error', 'DUPLICATE_SUBJECT', `Duplicate subject ID: ${id}`, 'manifest.json'));
  for (const grade of manifest.grades || []) {
    if (!grade.label?.[manifest.defaultLanguage]) issues.push(issue('warning', 'GRADE_LABEL', `Grade ${grade.id} has no ${manifest.defaultLanguage} label.`, 'manifest.json'));
  }
  for (const subject of manifest.subjects || []) {
    if (!subject.label?.[manifest.defaultLanguage]) issues.push(issue('warning', 'SUBJECT_LABEL', `Subject ${subject.id} has no ${manifest.defaultLanguage} label.`, 'manifest.json'));
  }

  const ids = new Set();
  for (const item of manifest.items || []) {
    if (ids.has(item.id)) issues.push(issue('error', 'DUPLICATE_ID', `Duplicate manifest ID: ${item.id}`, 'manifest.json'));
    ids.add(item.id);
    if (item.curriculum && !curriculumIds.includes(item.curriculum)) issues.push(issue('error', 'UNKNOWN_CURRICULUM', `${item.id} uses unknown curriculum ${item.curriculum}.`, 'manifest.json'));
    if (item.grade != null && !gradeIds.includes(String(item.grade))) issues.push(issue('error', 'UNKNOWN_GRADE', `${item.id} uses unknown grade ${item.grade}.`, 'manifest.json'));
    if (item.subject && !subjectIds.includes(item.subject)) issues.push(issue('error', 'UNKNOWN_SUBJECT', `${item.id} uses unknown subject ${item.subject}.`, 'manifest.json'));
    if (!item.title?.[manifest.defaultLanguage]) issues.push(issue('warning', 'CLIENT_TITLE_METADATA', `${item.id} has no ${manifest.defaultLanguage} client display title. Rebuild/sync the manifest.`, 'manifest.json'));
    for (const lang of item.languages || []) {
      if (!languageIds.includes(lang)) issues.push(issue('error', 'UNKNOWN_LANGUAGE', `${item.id} declares unsupported language ${lang}.`, 'manifest.json'));
      const relative = `${lang}/${item.path}`;
      const full = safeRepoPath(config.rootDir, relative);
      if (!fs.existsSync(full)) issues.push(issue('error', 'MISSING_FILE', `Manifest points to missing file: ${relative}`, relative));
    }
    if (item.type === 'note') {
      const canonicalLanguage = manifest.defaultLanguage || config.defaultLanguage;
      const en = safeRepoPath(config.rootDir, canonicalLanguage, item.path);
      if (fs.existsSync(en)) {
        try {
          const { attributes } = parseFrontmatter(fs.readFileSync(en, 'utf8'));
          if (attributes.id !== item.id) issues.push(issue('error', 'FRONTMATTER_ID', `Frontmatter ID ${attributes.id} does not match manifest ${item.id}.`, `${manifest.defaultLanguage || config.defaultLanguage}/${item.path}`));
          for (const quizId of attributes.quizIds || []) if (!ids.has(quizId) && !(manifest.items || []).some((i) => i.id === quizId)) issues.push(issue('warning', 'UNKNOWN_QUIZ_REF', `${item.id} references missing quiz ${quizId}.`, `${manifest.defaultLanguage || config.defaultLanguage}/${item.path}`));
        } catch (error) { issues.push(issue('error', 'FRONTMATTER_PARSE', error.message, `${manifest.defaultLanguage || config.defaultLanguage}/${item.path}`)); }
      }
    }
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  let quizValidator = null;
  try { quizValidator = ajv.compile(readJson(safeRepoPath(config.rootDir, 'schemas/quiz.schema.json'))); } catch {}
  for (const item of (manifest.items || []).filter((i) => i.type === 'quiz')) {
    const canonicalLanguage = manifest.defaultLanguage || config.defaultLanguage;
    const englishFile = safeRepoPath(config.rootDir, canonicalLanguage, item.path);
    if (!fs.existsSync(englishFile)) continue;
    let english;
    try { english = readJson(englishFile); } catch (error) { issues.push(issue('error', 'QUIZ_PARSE', error.message, `${manifest.defaultLanguage || config.defaultLanguage}/${item.path}`)); continue; }
    if (quizValidator && !quizValidator(english)) {
      issues.push(issue('error', 'QUIZ_SCHEMA', ajv.errorsText(quizValidator.errors, { separator: '; ' }), `${manifest.defaultLanguage || config.defaultLanguage}/${item.path}`));
    }
    for (const question of english.questions || []) {
      const idsForQuestion = new Set((question.options || []).map((o) => o.id));
      if (!idsForQuestion.has(question.correctOption)) issues.push(issue('error', 'INVALID_CORRECT_OPTION', `${question.id}: correctOption ${question.correctOption} is not an option ID.`, `${manifest.defaultLanguage || config.defaultLanguage}/${item.path}`));
    }
    for (const lang of supportedLanguageIds(manifest).filter((l) => l !== canonicalLanguage && item.languages?.includes(l))) {
      const targetFile = safeRepoPath(config.rootDir, lang, item.path);
      try { validateQuizAlignment(english, readJson(targetFile), lang, `${lang}/${item.path}`, issues); }
      catch (error) { issues.push(issue('error', 'QUIZ_PARSE', error.message, `${lang}/${item.path}`)); }
    }
  }

  const examIds = (manifest.exams || []).map((exam) => exam.id);
  for (const id of new Set(duplicateValues(examIds))) issues.push(issue('error', 'DUPLICATE_EXAM', `Duplicate exam ID: ${id}`, 'manifest.json'));
  for (const exam of manifest.exams || []) {
    if (!exam.label?.[manifest.defaultLanguage]) issues.push(issue('warning', 'EXAM_LABEL', `Exam ${exam.id} has no ${manifest.defaultLanguage} display label.`, 'manifest.json'));
    if (!exam.fullName?.[manifest.defaultLanguage]) issues.push(issue('warning', 'EXAM_FULL_NAME', `Exam ${exam.id} has no ${manifest.defaultLanguage} full name.`, 'manifest.json'));
  }

  const planIds = (manifest.examPlans || []).map((plan) => plan.id);
  for (const id of new Set(duplicateValues(planIds))) issues.push(issue('error', 'DUPLICATE_EXAM_PLAN', `Duplicate exam plan ID: ${id}`, 'manifest.json'));
  let examPlanValidator = null;
  let examCalendarValidator = null;
  try { examPlanValidator = ajv.compile(readJson(safeRepoPath(config.rootDir, 'schemas/exam-plan.schema.json'))); } catch {}
  try { examCalendarValidator = ajv.compile(readJson(safeRepoPath(config.rootDir, 'schemas/exam-calendar.schema.json'))); } catch {}

  for (const planRef of manifest.examPlans || []) {
    if (!examIds.includes(planRef.examId)) issues.push(issue('error', 'UNKNOWN_EXAM', `${planRef.id} references unknown exam ${planRef.examId}.`, 'manifest.json'));
    for (const lang of planRef.languages || []) {
      if (!languageIds.includes(lang)) issues.push(issue('error', 'UNKNOWN_PLAN_LANGUAGE', `${planRef.id} declares unsupported language ${lang}.`, 'manifest.json'));
      const file = safeRepoPath(config.rootDir, lang, planRef.path);
      if (!fs.existsSync(file)) {
        issues.push(issue('error', 'MISSING_EXAM_PLAN', `Missing exam plan ${lang}/${planRef.path}.`, `${lang}/${planRef.path}`));
        continue;
      }
      try {
        const plan = readJson(file);
        if (examPlanValidator && !examPlanValidator(plan)) issues.push(issue('error', 'EXAM_PLAN_SCHEMA', ajv.errorsText(examPlanValidator.errors, { separator: '; ' }), `${lang}/${planRef.path}`));
        if (plan.id !== planRef.id) issues.push(issue('error', 'EXAM_PLAN_ID', `Plan JSON ID ${plan.id} must match manifest ID ${planRef.id}.`, `${lang}/${planRef.path}`));
        if (plan.examId !== planRef.examId) issues.push(issue('error', 'EXAM_PLAN_EXAM', `Plan JSON examId ${plan.examId} must match manifest examId ${planRef.examId}.`, `${lang}/${planRef.path}`));
        if (Number(plan.entryClass) !== Number(planRef.entryClass) || Number(plan.examYear) !== Number(planRef.examYear)) issues.push(issue('error', 'EXAM_PLAN_IDENTITY', 'Plan entryClass/examYear must match the manifest reference.', `${lang}/${planRef.path}`));
        if (plan.language !== lang) issues.push(issue('error', 'EXAM_PLAN_LANGUAGE', `Plan language ${plan.language} must match folder language ${lang}.`, `${lang}/${planRef.path}`));
        const base = path.posix.dirname(planRef.path);
        for (const ref of Object.values(plan.contentRefs || {})) {
          const resource = safeRepoPath(config.rootDir, lang, path.posix.join(base, ref));
          if (!fs.existsSync(resource)) issues.push(issue('warning', 'MISSING_PLAN_MARKDOWN', `Missing plan Markdown ${lang}/${path.posix.join(base, ref)}.`, `${lang}/${path.posix.join(base, ref)}`));
        }
        for (const relative of plan.calendarFiles || []) {
          const calendarPath = safeRepoPath(config.rootDir, lang, path.posix.join(base, relative));
          if (!fs.existsSync(calendarPath)) {
            issues.push(issue('error', 'MISSING_EXAM_CALENDAR', `Missing calendar ${lang}/${path.posix.join(base, relative)}.`, `${lang}/${path.posix.join(base, relative)}`));
            continue;
          }
          try {
            const calendar = readJson(calendarPath);
            if (examCalendarValidator && !examCalendarValidator(calendar)) issues.push(issue('error', 'EXAM_CALENDAR_SCHEMA', ajv.errorsText(examCalendarValidator.errors, { separator: '; ' }), `${lang}/${path.posix.join(base, relative)}`));
            if (calendar.planId !== planRef.id) issues.push(issue('error', 'EXAM_CALENDAR_PLAN', `Calendar planId ${calendar.planId} must match ${planRef.id}.`, `${lang}/${path.posix.join(base, relative)}`));
            if (calendar.language !== lang) issues.push(issue('error', 'EXAM_CALENDAR_LANGUAGE', `Calendar language ${calendar.language} must match ${lang}.`, `${lang}/${path.posix.join(base, relative)}`));
          } catch (error) { issues.push(issue('error', 'EXAM_CALENDAR_PARSE', error.message, `${lang}/${path.posix.join(base, relative)}`)); }
        }
      } catch (error) { issues.push(issue('error', 'EXAM_PLAN_PARSE', error.message, `${lang}/${planRef.path}`)); }
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
