import { validateRepository } from '../lib/validation-service.js';

const result = validateRepository();
console.log(`Qurio validation: ${result.summary.errors} error(s), ${result.summary.warnings} warning(s)`);
for (const issue of result.issues) {
  console.log(`${issue.level.toUpperCase()} ${issue.code}: ${issue.message}${issue.file ? ` [${issue.file}]` : ''}`);
}
process.exitCode = result.summary.errors ? 1 : 0;
