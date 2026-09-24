// SPDX-License-Identifier: Apache-2.0
//
// FastFileLink JavaScript binding - Fast, no-fuss file sharing
// Copyright (C) 2025-2026 FastFileLink contributors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, '..', '..');


function runNpm(arguments_, options) {
  if (process.platform === 'win32') {
    return execFileAsync(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', 'npm.cmd', ...arguments_],
      options,
    );
  }

  return execFileAsync('npm', arguments_, options);
}


test('npm pack installs into a clean project and runs bundled ffl.com', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ffl-js-package-'));
  const packDirectory = join(directory, 'pack');
  const consumerDirectory = join(directory, 'consumer');

  await mkdir(packDirectory, { recursive: true });
  await mkdir(consumerDirectory, { recursive: true });

  const packed = await runNpm(
    ['pack', '--pack-destination', packDirectory],
    { cwd: projectRoot },
  );

  const tarballName = packed.stdout.trim().split('\n').at(-1);
  const tarballPath = join(packDirectory, tarballName);

  await writeFile(
    join(consumerDirectory, 'package.json'),
    JSON.stringify({ type: 'module', private: true }),
  );

  await runNpm(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath],
    { cwd: consumerDirectory },
  );

  await writeFile(
    join(consumerDirectory, 'test.mjs'),
    "import { version } from 'ffl-js'; console.log(await version());\n",
  );

  const executed = await execFileAsync('node', ['test.mjs'], { cwd: consumerDirectory });

  assert.match(executed.stdout, /FastFileLink/);

  const installedPackage = JSON.parse(
    await readFile(join(consumerDirectory, 'node_modules', 'ffl-js', 'package.json')),
  );

  assert.equal(installedPackage.dependencies, undefined);
  if (process.platform !== 'win32') {
    const binary = await stat(
      join(consumerDirectory, 'node_modules', 'ffl-js', 'src', 'ffl', 'bin', 'ffl.com'),
    );
    assert.notEqual(binary.mode & 0o111, 0);
  }
});
