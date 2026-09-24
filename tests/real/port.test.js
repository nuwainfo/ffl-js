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
import { createServer } from 'node:net';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { downloadSharedFile, withTestDirectory } from './helpers.js';


async function availablePort() {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  await new Promise((resolve) => server.close(resolve));

  return port;
}


test('share uses the requested port and downloads a file', async () => {
  await withTestDirectory(async (directory) => {
    const source = join(directory, 'port-source.txt');
    const received = join(directory, 'port-received.txt');

    await writeFile(source, 'Explicit port payload');

    await downloadSharedFile(source, received, { port: await availablePort() });

    assert.equal(await readFile(received, 'utf8'), 'Explicit port payload');
  });
});
