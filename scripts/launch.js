import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = join(root, 'node_modules/typescript/bin/tsc');

if (!existsSync(tsc)) {
  console.error('TypeScript is not installed. Run npm install in the sleeper_mcp repo.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [tsc, '-p', join(root, 'tsconfig.build.json')],
  {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || 'TypeScript compile failed.');
  process.exit(result.status ?? 1);
}

await import(pathToFileURL(join(root, 'dist/index.js')).href);
