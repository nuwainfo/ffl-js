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
import test from 'node:test';

import * as generated from '../../src/ffl/_generated.js';


test('hidden commands are present in low-level Node binding', async () => {
  const downloadSession = await generated.download({
    url: 'https://example.invalid',
    version: true,
  });
  await downloadSession.wait();
  const download = downloadSession.processResult;
  const keygen = await generated.keygen({ version: true });

  assert.equal(download.returnCode, 0);
  assert.match(download.stdout, /FastFileLink/);
  assert.equal(keygen.returnCode, 0);
  assert.match(keygen.stdout, /FastFileLink/);
});
