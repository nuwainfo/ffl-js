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
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { downloadSharedFile, withTestDirectory } from './helpers.js';


test('basic-auth share downloads with matching credentials', async () => {
  await withTestDirectory(async (directory) => {
    const source = join(directory, 'protected-source.txt');
    const received = join(directory, 'protected-received.txt');

    await writeFile(source, 'HTTP Basic Auth protected payload');

    await downloadSharedFile(source, received, {
      authUser: 'ffl-js-test',
      authPassword: 'correct-horse-battery-staple',
    });

    assert.equal(await readFile(received, 'utf8'), 'HTTP Basic Auth protected payload');
  });
});


test('pickup-code share downloads with the matching code', async () => {
  await withTestDirectory(async (directory) => {
    const source = join(directory, 'pickup-source.txt');
    const received = join(directory, 'pickup-received.txt');

    await writeFile(source, 'Pickup code protected payload');

    await downloadSharedFile(source, received, {
      recipientAuth: 'pickup',
      pickupCode: '654321',
    });

    assert.equal(await readFile(received, 'utf8'), 'Pickup code protected payload');
  });
});
