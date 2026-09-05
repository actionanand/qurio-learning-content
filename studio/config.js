import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, '..');

export const config = {
  rootDir: path.resolve(process.env.QURIO_CONTENT_ROOT || defaultRoot),
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 4310),
  defaultLanguage: 'en',
  fallbackLanguage: 'en'
};
