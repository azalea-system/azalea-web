import fs from 'node:fs';

const envPath = 'build/env.js';
let env = fs.readFileSync(envPath, 'utf-8');

env = env.replace(
  "import path from 'node:path';",
  "import fs from 'node:fs';\nimport path from 'node:path';"
);

env = env.replace(
  "const dir = path.dirname(fileURLToPath(import.meta.url));",
  [
    "/** @type {string} */",
    "let dir;",
    "try {",
    "\tdir = path.dirname(fileURLToPath(import.meta.url));",
    "} catch {",
    "\tdir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(process.execPath);",
    "}",
    "if (!fs.existsSync(path.join(dir, 'client'))) {",
    "\tdir = path.dirname(process.execPath);",
    "}",
  ].join('\n')
);

fs.writeFileSync(envPath, env);
