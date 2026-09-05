import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { stringifyFrontmatter } from './frontmatter.js';
import { ensureDirForFile, pad2, safeRepoPath, slugify, splitList, todayIso, writeJson } from './utils.js';
import { defaultCurriculumId, getSubjectCode, supportedLanguageIds } from './catalog-management.js';

function assertLanguage(language) {
  if (!supportedLanguageIds().includes(language)) throw new Error(`Unsupported language: ${language}. Add it from Catalog Setup first.`);
}

function learningRoot(curriculum, grade, subject) {
  const curriculumId = slugify(curriculum || defaultCurriculumId());
  const gradePart = `grade-${pad2(grade)}`;
  // Keep the existing General paths stable; additional curricula get their own namespace.
  return curriculumId === 'general'
    ? `${gradePart}/${subject}`
    : `curricula/${curriculumId}/${gradePart}/${subject}`;
}

function logicalBaseId(curriculum, subject, grade, topic) {
  const curriculumId = slugify(curriculum || defaultCurriculumId());
  const base = `${getSubjectCode(subject)}-${pad2(grade)}-${topic}`;
  return curriculumId === 'general' ? base : `${curriculumId}-${base}`;
}

function writeText(filePath, value) {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

export function saveNote(input) {
  const language = input.language || 'en';
  assertLanguage(language);
  const grade = Number(input.grade);
  const subject = slugify(input.subject);
  const chapter = slugify(input.chapter);
  const topic = slugify(input.topic || input.title);
  if (!grade || !subject || !chapter || !topic || !input.title) throw new Error('Grade, subject, chapter, topic and title are required.');
  const curriculum = slugify(input.curriculum || defaultCurriculumId());
  const id = input.id || logicalBaseId(curriculum, subject, grade, topic);
  const relative = `${language}/${learningRoot(curriculum, grade, subject)}/notes/${chapter}/${topic}.md`;
  const filePath = safeRepoPath(config.rootDir, relative);
  if (fs.existsSync(filePath) && input.mode !== 'edit' && input.overwrite !== 'on') {
    throw new Error(`File already exists: ${relative}. Open it from Content Browser to edit, or enable overwrite.`);
  }
  const attributes = {
    id,
    type: 'note',
    title: String(input.title).trim(),
    language,
    curriculum,
    grade,
    subject,
    chapter,
    topic,
    order: Number(input.order || 1),
    difficulty: input.difficulty || 'beginner',
    estimatedMinutes: Number(input.estimatedMinutes || 10),
    quizIds: splitList(input.quizIds),
    tags: splitList(input.tags),
    version: Number(input.version || 1),
    updatedAt: todayIso()
  };
  writeText(filePath, stringifyFrontmatter(attributes, input.body || ''));
  return { id, relative, attributes };
}

export function saveSyllabus(input) {
  const language = input.language || 'en';
  assertLanguage(language);
  const grade = Number(input.grade);
  const subject = slugify(input.subject);
  if (!grade || !subject || !input.title) throw new Error('Grade, subject and title are required.');
  const curriculum = slugify(input.curriculum || defaultCurriculumId());
  const id = input.id || `syllabus-${curriculum}-${pad2(grade)}-${subject}`;
  const relative = `${language}/${learningRoot(curriculum, grade, subject)}/syllabus.md`;
  const filePath = safeRepoPath(config.rootDir, relative);
  if (fs.existsSync(filePath) && input.mode !== 'edit' && input.overwrite !== 'on') {
    throw new Error(`File already exists: ${relative}. Open it from Content Browser to edit, or enable overwrite.`);
  }
  const attributes = {
    id,
    type: 'syllabus',
    title: String(input.title).trim(),
    language,
    curriculum,
    grade,
    subject,
    optional: true,
    version: Number(input.version || 1),
    updatedAt: todayIso()
  };
  writeText(filePath, stringifyFrontmatter(attributes, input.body || ''));
  return { id, relative, attributes };
}

export function saveQuiz(input) {
  const language = input.language || 'en';
  assertLanguage(language);
  const grade = Number(input.grade);
  const subject = slugify(input.subject);
  const chapter = slugify(input.chapter);
  const topic = slugify(input.topic || input.title);
  const setNumber = Number(input.setNumber || 1);
  if (!grade || !subject || !chapter || !topic || !input.title || !setNumber) {
    throw new Error('Grade, subject, chapter, topic, set number and title are required.');
  }
  let questions;
  try { questions = JSON.parse(input.questionsJson || '[]'); }
  catch { throw new Error('Quiz questions could not be parsed. Please check the question form.'); }
  if (!Array.isArray(questions) || questions.length === 0) throw new Error('Add at least one quiz question.');
  const curriculum = slugify(input.curriculum || defaultCurriculumId());
  const baseId = logicalBaseId(curriculum, subject, grade, topic);
  const id = input.id || `${baseId}-${pad2(setNumber)}`;
  const seriesId = input.seriesId || `${baseId}-practice`;
  const filename = `${topic}-${pad2(setNumber)}.json`;
  const relative = `${language}/${learningRoot(curriculum, grade, subject)}/quizzes/${filename}`;
  const filePath = safeRepoPath(config.rootDir, relative);
  if (fs.existsSync(filePath) && input.mode !== 'edit' && input.overwrite !== 'on') {
    throw new Error(`File already exists: ${relative}. Open it from Content Browser to edit, or enable overwrite.`);
  }
  const data = {
    schemaVersion: 2,
    id,
    type: 'quiz',
    language,
    curriculum,
    grade,
    subject,
    chapter,
    topic,
    seriesId,
    setNumber,
    setLabel: String(input.setLabel || `Practice Set ${setNumber}`).trim(),
    title: String(input.title).trim(),
    description: String(input.description || '').trim(),
    difficulty: input.difficulty || 'beginner',
    timeLimitSeconds: Number(input.timeLimitSeconds || 180),
    passingPercentage: Number(input.passingPercentage || 70),
    shuffleQuestions: input.shuffleQuestions === 'on' || input.shuffleQuestions === true,
    shuffleOptions: input.shuffleOptions === 'on' || input.shuffleOptions === true,
    sourceNoteIds: splitList(input.sourceNoteIds),
    version: Number(input.version || 1),
    updatedAt: todayIso(),
    questions
  };
  writeJson(filePath, data);
  return { id, relative, data };
}
