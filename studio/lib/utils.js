import fs from 'node:fs';
import path from 'node:path';

export function slugify(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function pad2(value) {
  return String(Number(value)).padStart(2, '0');
}

export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function contentVersionNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}.${m}.${day}-studio.${hh}${mm}${ss}`;
}

export function subjectShort(subject) {
  const known = {
    mathematics: 'math',
    science: 'sci',
    english: 'eng',
    'social-studies': 'sst',
    intelligence: 'int',
    'general-knowledge': 'gk'
  };
  return known[subject] || slugify(subject).replace(/-/g, '').slice(0, 5) || 'subj';
}

export function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function safeRepoPath(rootDir, ...parts) {
  const resolved = path.resolve(rootDir, ...parts);
  const root = path.resolve(rootDir) + path.sep;
  if (resolved !== path.resolve(rootDir) && !resolved.startsWith(root)) {
    throw new Error('Refusing to access a path outside the Qurio content repository.');
  }
  return resolved;
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function splitList(value) {
  if (Array.isArray(value)) return value.flatMap(splitList);
  return unique(String(value || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean));
}

export function titleCaseFromSlug(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
