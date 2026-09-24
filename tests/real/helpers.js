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
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';

import * as ffl from '../../src/ffl/index.js';

export async function withTestDirectory(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'ffl-js-test-'));
  const originalCwd = process.cwd();

  try {
    process.chdir(directory);
    await callback(directory);
  } finally {
    process.chdir(originalCwd);
    await rm(directory, { recursive: true, force: true });
  }
}


export async function downloadSharedFile(source, received, options = {}) {
  const session = await ffl.share(source, {
    name: options.name ?? received.split(/[\\/]/).pop(),
    maxDownloads: 1,
    timeoutSeconds: 90,
    ...options,
  });

  try {
    const result = await ffl.download(session.link, {
      outputPath: received,
      authUser: options.authUser,
      authPassword: options.authPassword,
      recipientAuth: options.recipientAuth,
      pickupCode: options.pickupCode,
      recipientPrivateKey: options.recipientPrivateKey,
    });

    assert.equal(result.returnCode, 0);
    assert.notEqual(result.transferMode, ffl.TransferMode.UNKNOWN);
    return result;
  } finally {
    await session.close();
  }
}


export function readZipEntry(archive, entryName) {
  for (let offset = 0; offset + 46 <= archive.length;) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }

    const compression = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);

    const name = archive.toString('utf8', offset + 46, offset + 46 + fileNameLength);
    if (name === entryName) {
      const localNameLength = archive.readUInt16LE(localOffset + 26);
      const localExtraLength = archive.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const data = archive.subarray(dataOffset, dataOffset + compressedSize);

      return compression === 0 ? data : inflateRawSync(data);
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return null;
}
