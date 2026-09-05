import fs from 'node:fs';
import { config } from '../config.js';
import { getItemById, loadManifest, localizedPath, readLocalizedItem } from './catalog.js';
import { stringifyFrontmatter } from './frontmatter.js';
import { ensureDirForFile, todayIso, writeJson } from './utils.js';
import { supportedLanguageIds } from './catalog-management.js';

function canonicalLanguage() {
  return loadManifest().defaultLanguage || config.defaultLanguage;
}

function assertTarget(targetLanguage) {
  const ids = supportedLanguageIds();
  const defaultLanguage = canonicalLanguage();
  if (!ids.includes(targetLanguage) || targetLanguage === defaultLanguage) {
    throw new Error(`Target language must be a supported non-canonical language. Add languages from Catalog Setup first.`);
  }
}

export function getTranslationEditorData(id, targetLanguage) {
  assertTarget(targetLanguage);
  const item = getItemById(id);
  if (!item) throw new Error(`Unknown content ID: ${id}`);
  const source = readLocalizedItem(item, canonicalLanguage());
  if (!source) throw new Error(`Canonical source is missing for ${id}.`);
  const target = readLocalizedItem(item, targetLanguage);
  return { item, source, target, targetLanguage };
}

export function saveMarkdownTranslation({ id, targetLanguage, title, body }) {
  assertTarget(targetLanguage);
  const item = getItemById(id);
  if (!item || !['note', 'syllabus'].includes(item.type)) throw new Error('This item is not translatable Markdown content.');
  const source = readLocalizedItem(item, canonicalLanguage());
  if (!source) throw new Error('Canonical source is missing.');
  const attrs = {
    ...source.attributes,
    title: String(title || source.attributes.title).trim(),
    language: targetLanguage,
    updatedAt: todayIso()
  };
  const filePath = localizedPath(item, targetLanguage);
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, `${stringifyFrontmatter(attrs, body || '')}\n`, 'utf8');
  return filePath;
}

function assertAlignedQuiz(sourceQuiz, translatedQuiz) {
  if (!translatedQuiz || !Array.isArray(translatedQuiz.questions)) throw new Error('Translated quiz questions are missing.');
  if (translatedQuiz.questions.length !== sourceQuiz.questions.length) throw new Error('Translation must keep the same question count as the canonical source.');
  for (let index = 0; index < sourceQuiz.questions.length; index++) {
    const sourceQ = sourceQuiz.questions[index];
    const targetQ = translatedQuiz.questions[index];
    if (!targetQ) throw new Error(`Question ${sourceQ.id} is missing.`);
    if (targetQ.id && targetQ.id !== sourceQ.id) throw new Error(`Question ID ${sourceQ.id} cannot be changed.`);
    if (!Array.isArray(targetQ.options) || targetQ.options.length !== sourceQ.options.length) {
      throw new Error(`Question ${sourceQ.id} must keep the same number of options.`);
    }
  }
}

export function saveQuizTranslation({ id, targetLanguage, translated }) {
  assertTarget(targetLanguage);
  const item = getItemById(id);
  if (!item || item.type !== 'quiz') throw new Error('This item is not a quiz.');
  const source = readLocalizedItem(item, canonicalLanguage());
  if (!source) throw new Error('Canonical quiz source is missing.');
  assertAlignedQuiz(source.data, translated);

  const questions = source.data.questions.map((sourceQ, index) => {
    const targetQ = translated.questions[index];
    return {
      ...sourceQ,
      id: sourceQ.id,
      question: String(targetQ.question || '').trim(),
      hint: String(targetQ.hint || '').trim(),
      options: sourceQ.options.map((sourceOption, optionIndex) => ({
        ...sourceOption,
        id: sourceOption.id,
        text: String(targetQ.options?.[optionIndex]?.text || '').trim(),
        feedback: String(targetQ.options?.[optionIndex]?.feedback || '').trim()
      })),
      correctOption: sourceQ.correctOption,
      explanation: String(targetQ.explanation || '').trim()
    };
  });

  const result = {
    ...source.data,
    language: targetLanguage,
    setLabel: String(translated.setLabel || source.data.setLabel || '').trim(),
    title: String(translated.title || source.data.title || '').trim(),
    description: String(translated.description || '').trim(),
    updatedAt: todayIso(),
    questions
  };
  const filePath = localizedPath(item, targetLanguage);
  writeJson(filePath, result);
  return filePath;
}
