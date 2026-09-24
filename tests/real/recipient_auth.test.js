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

import * as ffl from '../../src/ffl/index.js';
import { downloadSharedFile, withTestDirectory } from './helpers.js';


test('public-key recipient auth downloads with the matching private key', async () => {
  await withTestDirectory(async (directory) => {
    const keyPair = await ffl.keygen('recipient');

    const source = join(directory, 'recipient-source.txt');
    const received = join(directory, 'recipient-received.txt');

    await writeFile(source, 'Public key protected payload');

    await downloadSharedFile(source, received, {
      recipientAuth: 'pubkey',
      recipientPublicKey: keyPair.publicKeyPath,
      recipientPrivateKey: keyPair.privateKeyPath,
    });

    assert.equal(await readFile(received, 'utf8'), 'Public key protected payload');
  });
});
