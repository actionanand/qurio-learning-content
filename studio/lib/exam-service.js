import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { loadManifest } from './catalog.js';
import { ensureDirForFile, readJson, safeRepoPath, writeJson } from './utils.js';

export function listExamPlans() {
  const manifest = loadManifest();
  const exams = new Map((manifest.exams || []).map((exam) => [exam.id, exam]));
  return (manifest.examPlans || []).map((plan) => ({ ...plan, exam: exams.get(plan.examId) || null }));
}

export function getExamPlanRef(planId) {
  return (loadManifest().examPlans || []).find((plan) => plan.id === planId) || null;
}

function planDirFromRef(planRef) {
  return path.posix.dirname(planRef.path);
}

function localizedPlanFile(planRef, language, relative = null) {
  const rel = relative ? path.posix.join(planDirFromRef(planRef), relative) : planRef.path;
  return safeRepoPath(config.rootDir, language, rel);
}

export function loadExamPlanBundle(planId, language) {
  const planRef = getExamPlanRef(planId);
  if (!planRef) throw new Error(`Unknown exam plan: ${planId}`);
  const lang = planRef.languages?.includes(language) ? language : (planRef.languages?.includes('en') ? 'en' : planRef.languages?.[0]);
  if (!lang) throw new Error('This exam plan has no available language.');
  const planPath = localizedPlanFile(planRef, lang);
  const plan = readJson(planPath);
  const readMarkdown = (ref) => {
    if (!ref) return '';
    const full = localizedPlanFile(planRef, lang, ref);
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  };
  return {
    planRef,
    language: lang,
    plan,
    overview: readMarkdown(plan.contentRefs?.overview),
    syllabus: readMarkdown(plan.contentRefs?.syllabus),
    strategy: readMarkdown(plan.contentRefs?.strategy)
  };
}

export function saveExamPlanBundle(planId, language, payload) {
  const planRef = getExamPlanRef(planId);
  if (!planRef) throw new Error(`Unknown exam plan: ${planId}`);
  if (!config.languages.includes(language)) throw new Error(`Unsupported language: ${language}`);
  let plan;
  try { plan = JSON.parse(payload.planJson); }
  catch { throw new Error('Plan JSON is invalid.'); }
  if (plan.id !== planRef.id) throw new Error(`Plan ID must remain ${planRef.id}.`);
  plan.language = language;
  writeJson(localizedPlanFile(planRef, language), plan);
  for (const [key, content] of [['overview', payload.overview], ['syllabus', payload.syllabus], ['strategy', payload.strategy]]) {
    const ref = plan.contentRefs?.[key];
    if (!ref) continue;
    const file = localizedPlanFile(planRef, language, ref);
    ensureDirForFile(file);
    fs.writeFileSync(file, String(content || '').endsWith('\n') ? String(content || '') : `${String(content || '')}\n`, 'utf8');
  }
  return plan;
}

export function listCalendarFiles(planId, language) {
  const bundle = loadExamPlanBundle(planId, language);
  return (bundle.plan.calendarFiles || []).map((relative) => ({
    relative,
    month: path.posix.basename(relative, '.json')
  }));
}

export function loadCalendar(planId, language, month) {
  const bundle = loadExamPlanBundle(planId, language);
  const relative = (bundle.plan.calendarFiles || []).find((p) => path.posix.basename(p, '.json') === month);
  if (!relative) throw new Error(`Calendar ${month} is not listed by this plan.`);
  return { ...bundle, month, relative, calendar: readJson(localizedPlanFile(bundle.planRef, bundle.language, relative)) };
}

export function saveCalendar(planId, language, month, jsonText) {
  const bundle = loadExamPlanBundle(planId, language);
  const relative = (bundle.plan.calendarFiles || []).find((p) => path.posix.basename(p, '.json') === month);
  if (!relative) throw new Error(`Calendar ${month} is not listed by this plan.`);
  let calendar;
  try { calendar = JSON.parse(jsonText); }
  catch { throw new Error('Calendar JSON is invalid.'); }
  if (calendar.planId !== planId) throw new Error(`Calendar planId must remain ${planId}.`);
  calendar.language = language;
  writeJson(localizedPlanFile(bundle.planRef, language, relative), calendar);
  return calendar;
}
