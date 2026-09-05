import yaml from 'js-yaml';

export function parseFrontmatter(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) {
    return { attributes: {}, body: source };
  }
  const normalized = source.replace(/\r\n/g, '\n');
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) throw new Error('Invalid Markdown frontmatter: closing --- delimiter not found.');
  const raw = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  return { attributes: yaml.load(raw) || {}, body };
}

export function stringifyFrontmatter(attributes, body = '') {
  const raw = yaml.dump(attributes, {
    noRefs: true,
    lineWidth: 120,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false
  }).trimEnd();
  return `---\n${raw}\n---\n\n${String(body).replace(/^\s+/, '')}`;
}
