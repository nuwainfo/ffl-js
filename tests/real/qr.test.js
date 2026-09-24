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
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { downloadSharedFile, withTestDirectory } from './helpers.js';


test('share writes a QR image and downloads the file', async () => {
  await withTestDirectory(async (directory) => {
    const source = join(directory, 'qr-source.txt');
    const received = join(directory, 'qr-received.txt');
    const qr = join(directory, 'share.png');

    await writeFile(source, 'QR share payload');

    await downloadSharedFile(source, received, { qr });

    assert.equal(await readFile(received, 'utf8'), 'QR share payload');
    assert.ok((await stat(qr)).size > 0);
  });
});
