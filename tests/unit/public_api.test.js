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

import * as ffl from '../../src/ffl/index.js';

test('top-level semantic API is exported', () => {
  for (const name of ['version', 'share', 'shareText', 'shareBytes', 'shareStream', 'download', 'startDownload', 'downloadStream', 'keygen', 'raw']) {
    assert.equal(typeof ffl[name], 'function');
  }

  assert.equal(typeof ffl.FFLClient, 'function');
  assert.equal(typeof ffl.ShareSession, 'function');
});
