import { execFileSync } from 'node:child_process';
import { config } from '../config.js';

export function getGitStatus() {
  try {
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: config.rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const status = execFileSync('git', ['status', '--short'], { cwd: config.rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return { available: true, branch: branch || '(detached)', changes: status ? status.split('\n') : [] };
  } catch {
    return { available: false, branch: null, changes: [] };
  }
}
