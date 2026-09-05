import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { loadManifest } from './catalog.js';
import { supportedLanguages } from './catalog-management.js';
import { contentVersionNow, ensureDirForFile, pad2, readJson, safeRepoPath, slugify, splitList, todayIso, writeJson } from './utils.js';

const manifestPath = () => safeRepoPath(config.rootDir, 'manifest.json');

function text(value) {
  return String(value ?? '').trim();
}

function saveManifest(manifest) {
  manifest.schemaVersion = 2;
  manifest.contentVersion = contentVersionNow();
  manifest.generatedAt = new Date().toISOString();
  writeJson(manifestPath(), manifest);
  return manifest;
}

function examId(value) {
  const id = slugify(value);
  if (!id) throw new Error('Exam ID is required and must contain letters or numbers.');
  return id;
}

function localizedValues(input, prefix, languages, fallback = '') {
  const values = {};
  for (const language of languages) {
    const value = text(input[`${prefix}_${language.id}`]);
    if (value) values[language.id] = value;
  }
  const canonical = values.en || fallback || Object.values(values).find(Boolean) || '';
  if (!canonical) throw new Error(`${prefix === 'label' ? 'Exam display name' : 'Exam full name'} is required in at least one language.`);
  for (const language of languages) {
    if (!values[language.id]) values[language.id] = canonical;
  }
  return values;
}

export function listExams() {
  const manifest = loadManifest();
  const planCounts = {};
  for (const plan of manifest.examPlans || []) planCounts[plan.examId] = (planCounts[plan.examId] || 0) + 1;
  return (manifest.exams || []).map((exam) => ({ ...exam, planCount: planCounts[exam.id] || 0 }));
}

export function getExam(idValue) {
  const id = examId(idValue);
  return (loadManifest().exams || []).find((exam) => exam.id === id) || null;
}

export function saveExam(input) {
  const manifest = loadManifest();
  manifest.exams ||= [];
  const mode = input.mode || 'new';
  const id = examId(input.id);
  const existing = manifest.exams.find((exam) => exam.id === id);
  if (mode === 'new' && existing) throw new Error(`Exam ${id} already exists.`);
  if (mode === 'edit' && !existing) throw new Error(`Unknown exam: ${id}`);

  const languages = supportedLanguages(manifest);
  const fallbackLabel = existing?.label?.en || text(input.shortName) || id.toUpperCase();
  const fallbackFull = existing?.fullName?.en || fallbackLabel;
  const value = {
    id,
    shortName: text(input.shortName) || existing?.shortName || id.toUpperCase(),
    label: localizedValues(input, 'label', languages, fallbackLabel),
    fullName: localizedValues(input, 'fullName', languages, fallbackFull),
    category: slugify(input.category || existing?.category || 'other') || 'other',
    officialInfoUrl: text(input.officialInfoUrl || existing?.officialInfoUrl || '')
  };

  if (existing) Object.assign(existing, value);
  else manifest.exams.push(value);
  manifest.exams.sort((a, b) => String(a.shortName || a.id).localeCompare(String(b.shortName || b.id)));
  saveManifest(manifest);
  return value;
}

export function deleteExam(idValue) {
  const manifest = loadManifest();
  const id = examId(idValue);
  const existing = (manifest.exams || []).find((exam) => exam.id === id);
  if (!existing) throw new Error(`Unknown exam: ${id}`);
  const plans = (manifest.examPlans || []).filter((plan) => plan.examId === id);
  if (plans.length) throw new Error(`Cannot delete ${id}; ${plans.length} exam plan(s) still reference it.`);
  manifest.exams = (manifest.exams || []).filter((exam) => exam.id !== id);
  saveManifest(manifest);
}

export function getExamManagerData() {
  const manifest = loadManifest();
  return { manifest, exams: listExams(), languages: supportedLanguages(manifest) };
}

function planRefById(manifest, planId) {
  return (manifest.examPlans || []).find((plan) => plan.id === planId) || null;
}

function planDirectory(planRef) {
  return path.posix.dirname(planRef.path);
}

function localizedPlanPath(planRef, language, relative = null) {
  const rel = relative ? path.posix.join(planDirectory(planRef), relative) : planRef.path;
  return safeRepoPath(config.rootDir, language, rel);
}

function writeText(filePath, value) {
  ensureDirForFile(filePath);
  const content = String(value || '');
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function parsePhases(jsonText) {
  let phases;
  try { phases = JSON.parse(jsonText || '[]'); }
  catch { throw new Error('Plan phases could not be parsed.'); }
  if (!Array.isArray(phases) || phases.length === 0) throw new Error('Add at least one preparation phase.');
  const ids = new Set();
  return phases.map((phase, index) => {
    const id = slugify(phase.id || `phase-${index + 1}`) || `phase-${index + 1}`;
    if (ids.has(id)) throw new Error(`Duplicate phase ID: ${id}`);
    ids.add(id);
    const startDate = text(phase.startDate);
    const endDate = text(phase.endDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error(`Phase ${id} requires valid start and end dates.`);
    }
    return {
      id,
      order: Number(phase.order || index + 1),
      name: text(phase.name) || `Phase ${index + 1}`,
      startDate,
      endDate
    };
  }).sort((a, b) => a.order - b.order);
}

function parseCalendarMonths(value) {
  const months = splitList(value);
  for (const month of months) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error(`Invalid calendar month: ${month}. Use YYYY-MM.`);
  }
  return [...new Set(months)].sort();
}

function validatePlanDates(input) {
  const start = text(input.planStartDate);
  const end = text(input.planEndDate);
  const target = text(input.targetDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error('Plan start and end dates are required.');
  }
  if (target && !/^\d{4}-\d{2}-\d{2}$/.test(target)) throw new Error('Target date must use YYYY-MM-DD.');
  if (start > end) throw new Error('Plan start date cannot be after plan end date.');
  return { start, end, target: target || null };
}

function blankCalendar(planId, language, month) {
  return { schemaVersion: 1, planId, language, month, days: [] };
}

export function createExamPlan(input) {
  const manifest = loadManifest();
  manifest.examPlans ||= [];
  const exam = (manifest.exams || []).find((value) => value.id === input.examId);
  if (!exam) throw new Error('Choose a valid exam before creating a plan.');
  const entryClass = Number(input.entryClass);
  const examYear = Number(input.examYear);
  if (!Number.isInteger(entryClass) || entryClass < 1 || entryClass > 99) throw new Error('Entry class must be a whole number.');
  if (!Number.isInteger(examYear) || examYear < 2000 || examYear > 2200) throw new Error('Exam year is invalid.');
  const language = text(input.language || manifest.defaultLanguage || 'en');
  if (!supportedLanguages(manifest).some((value) => value.id === language)) throw new Error(`Unsupported language: ${language}`);
  const defaultId = `${exam.id}-${examYear}-class-${pad2(entryClass)}${input.demo === 'on' ? '-demo' : ''}`;
  const id = slugify(input.id || defaultId);
  if (!id) throw new Error('Plan ID is required.');
  if (planRefById(manifest, id)) throw new Error(`Exam plan ${id} already exists.`);

  const pathValue = `exams/${exam.id}/class-${pad2(entryClass)}/${examYear}/plan.json`;
  if ((manifest.examPlans || []).some((plan) => plan.path === pathValue)) throw new Error(`Another plan already uses ${pathValue}.`);
  const dates = validatePlanDates(input);
  const phases = parsePhases(input.phasesJson);
  const months = parseCalendarMonths(input.calendarMonths);
  const calendarFiles = months.map((month) => `calendar/${month}.json`);
  const plan = {
    schemaVersion: 1,
    id,
    type: 'exam-plan',
    examId: exam.id,
    language,
    title: text(input.title) || `${exam.shortName || exam.id.toUpperCase()} ${examYear} — Preparation Plan`,
    subtitle: text(input.subtitle),
    entryClass,
    examYear,
    demo: input.demo === 'on' || input.demo === true,
    officialSchedule: input.officialSchedule === 'on' || input.officialSchedule === true,
    planStartDate: dates.start,
    planEndDate: dates.end,
    targetDate: dates.target,
    contentRefs: { overview: 'overview.md', syllabus: 'syllabus.md', strategy: 'strategy.md' },
    phases,
    calendarFiles,
    version: Number(input.version || 1),
    updatedAt: todayIso()
  };
  if (!plan.subtitle) delete plan.subtitle;

  const planRef = { id, examId: exam.id, entryClass, examYear, path: pathValue, languages: [language], demo: plan.demo };
  writeJson(localizedPlanPath(planRef, language), plan);
  writeText(localizedPlanPath(planRef, language, 'overview.md'), input.overview || `# ${plan.title}\n\nAdd the exam overview here.`);
  writeText(localizedPlanPath(planRef, language, 'syllabus.md'), input.syllabus || `# Full Syllabus\n\nAdd the syllabus here.`);
  writeText(localizedPlanPath(planRef, language, 'strategy.md'), input.strategy || `# Preparation Strategy\n\nAdd the preparation strategy here.`);
  for (const month of months) writeJson(localizedPlanPath(planRef, language, `calendar/${month}.json`), blankCalendar(id, language, month));

  manifest.examPlans.push(planRef);
  manifest.examPlans.sort((a, b) => String(a.examId).localeCompare(String(b.examId)) || a.examYear - b.examYear || a.entryClass - b.entryClass);
  saveManifest(manifest);
  return { planRef, plan };
}

export function updateExamPlan(input) {
  const manifest = loadManifest();
  const planRef = planRefById(manifest, input.id);
  if (!planRef) throw new Error(`Unknown exam plan: ${input.id}`);
  const language = text(input.language);
  if (!planRef.languages?.includes(language)) throw new Error(`${language} is not an existing translation of this plan.`);
  const planPath = localizedPlanPath(planRef, language);
  const current = readJson(planPath);
  const dates = validatePlanDates(input);
  const phases = parsePhases(input.phasesJson);
  const plan = {
    ...current,
    id: planRef.id,
    type: 'exam-plan',
    examId: planRef.examId,
    language,
    entryClass: planRef.entryClass,
    examYear: planRef.examYear,
    title: text(input.title) || current.title,
    subtitle: text(input.subtitle),
    demo: input.demo === 'on' || input.demo === true,
    officialSchedule: input.officialSchedule === 'on' || input.officialSchedule === true,
    planStartDate: dates.start,
    planEndDate: dates.end,
    targetDate: dates.target,
    contentRefs: current.contentRefs || { overview: 'overview.md', syllabus: 'syllabus.md', strategy: 'strategy.md' },
    phases,
    calendarFiles: Array.isArray(current.calendarFiles) ? current.calendarFiles : [],
    version: Number(input.version || current.version || 1),
    updatedAt: todayIso()
  };
  if (!plan.subtitle) delete plan.subtitle;
  writeJson(planPath, plan);
  for (const [key, content] of [['overview', input.overview], ['syllabus', input.syllabus], ['strategy', input.strategy]]) {
    const ref = plan.contentRefs?.[key];
    if (ref) writeText(localizedPlanPath(planRef, language, ref), content || '');
  }
  planRef.demo = plan.demo;
  saveManifest(manifest);
  return plan;
}

export function createPlanTranslation(planId, targetLanguage) {
  const manifest = loadManifest();
  const planRef = planRefById(manifest, planId);
  if (!planRef) throw new Error(`Unknown exam plan: ${planId}`);
  const language = text(targetLanguage);
  if (!supportedLanguages(manifest).some((value) => value.id === language)) throw new Error(`Unsupported language: ${language}`);
  if (planRef.languages?.includes(language)) throw new Error(`${language} already exists for this plan.`);
  const sourceLanguage = planRef.languages?.includes(manifest.defaultLanguage) ? manifest.defaultLanguage : planRef.languages?.[0];
  if (!sourceLanguage) throw new Error('No source language exists for this plan.');
  const source = readJson(localizedPlanPath(planRef, sourceLanguage));
  const translated = { ...source, language, updatedAt: todayIso() };
  writeJson(localizedPlanPath(planRef, language), translated);
  for (const ref of Object.values(source.contentRefs || {})) {
    const src = localizedPlanPath(planRef, sourceLanguage, ref);
    const dest = localizedPlanPath(planRef, language, ref);
    if (fs.existsSync(src)) writeText(dest, fs.readFileSync(src, 'utf8'));
  }
  for (const relative of source.calendarFiles || []) {
    const src = localizedPlanPath(planRef, sourceLanguage, relative);
    if (!fs.existsSync(src)) continue;
    const calendar = readJson(src);
    calendar.language = language;
    writeJson(localizedPlanPath(planRef, language, relative), calendar);
  }
  planRef.languages = [...new Set([...(planRef.languages || []), language])];
  saveManifest(manifest);
  return translated;
}

export function addCalendarMonth(planId, monthValue) {
  const manifest = loadManifest();
  const planRef = planRefById(manifest, planId);
  if (!planRef) throw new Error(`Unknown exam plan: ${planId}`);
  const month = text(monthValue);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Calendar month must use YYYY-MM.');
  const relative = `calendar/${month}.json`;
  for (const language of planRef.languages || []) {
    const planFile = localizedPlanPath(planRef, language);
    const plan = readJson(planFile);
    plan.calendarFiles ||= [];
    if (!plan.calendarFiles.includes(relative)) plan.calendarFiles.push(relative);
    plan.calendarFiles.sort();
    plan.updatedAt = todayIso();
    writeJson(planFile, plan);
    const calendarFile = localizedPlanPath(planRef, language, relative);
    if (!fs.existsSync(calendarFile)) writeJson(calendarFile, blankCalendar(planId, language, month));
  }
  saveManifest(manifest);
  return relative;
}

export function deleteCalendarMonth(planId, monthValue) {
  const manifest = loadManifest();
  const planRef = planRefById(manifest, planId);
  if (!planRef) throw new Error(`Unknown exam plan: ${planId}`);
  const month = text(monthValue);
  const relative = `calendar/${month}.json`;
  for (const language of planRef.languages || []) {
    const calendarFile = localizedPlanPath(planRef, language, relative);
    if (fs.existsSync(calendarFile)) {
      const calendar = readJson(calendarFile);
      if (Array.isArray(calendar.days) && calendar.days.length > 0) {
        throw new Error(`Cannot remove ${month}; the ${language} calendar contains ${calendar.days.length} day(s). Clear the days first.`);
      }
    }
  }
  for (const language of planRef.languages || []) {
    const planFile = localizedPlanPath(planRef, language);
    const plan = readJson(planFile);
    plan.calendarFiles = (plan.calendarFiles || []).filter((value) => value !== relative);
    plan.updatedAt = todayIso();
    writeJson(planFile, plan);
    const calendarFile = localizedPlanPath(planRef, language, relative);
    if (fs.existsSync(calendarFile)) fs.unlinkSync(calendarFile);
  }
  saveManifest(manifest);
}

export function deleteExamPlan(planId) {
  const manifest = loadManifest();
  const planRef = planRefById(manifest, planId);
  if (!planRef) throw new Error(`Unknown exam plan: ${planId}`);
  for (const language of planRef.languages || []) {
    const dir = safeRepoPath(config.rootDir, language, planDirectory(planRef));
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }
  manifest.examPlans = (manifest.examPlans || []).filter((plan) => plan.id !== planId);
  saveManifest(manifest);
}
