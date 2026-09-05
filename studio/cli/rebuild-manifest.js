import { rebuildManifest } from '../lib/manifest-service.js';

const manifest = rebuildManifest();
console.log(`Rebuilt manifest.json -> ${manifest.contentVersion} (${manifest.items.length} learning items)`);
