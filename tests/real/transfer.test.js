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
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import * as ffl from '../../src/ffl/index.js';
import { downloadSharedFile, readZipEntry, withTestDirectory } from './helpers.js';


test('version and raw access report the bundled FFL version', async () => {
  assert.match(await ffl.version(), /FastFileLink/);

  const result = await ffl.raw(['download', '--version']);

  assert.equal(result.returnCode, 0);
  assert.match(result.stdout, /FastFileLink/);
});


test('share and download preserve a binary file', async () => {
  await withTestDirectory(async (directory) => {
    const source = join(directory, 'source.bin');
    const received = join(directory, 'received.bin');
    const payload = Buffer.concat([Buffer.from([...Array(256).keys()]), Buffer.from('ffl-js transfer')]);

    await writeFile(source, payload);

    await downloadSharedFile(source, received);

    assert.deepEqual(await readFile(received), payload);
  });
});


test('shareText preserves UTF-8 and removes its temporary source', async () => {
  await withTestDirectory(async (directory) => {
    const received = join(directory, 'message.txt');
    const text = 'FFL JavaScript: portable APE.\n';
    const temporaryDirectories = new Set(
      (await readdir(tmpdir())).filter((name) => name.startsWith('ffl-js-')),
    );

    const session = await ffl.shareText(text, { name: 'message.txt' });
    try {
      const result = await ffl.download(session.link, { outputPath: received });
      assert.equal(result.returnCode, 0);
    } finally {
      await session.close();
    }

    assert.equal(await readFile(received, 'utf8'), text);
    assert.deepEqual(
      (await readdir(tmpdir())).filter((name) => name.startsWith('ffl-js-')),
      [...temporaryDirectories],
    );
  });
});


test('shareBytes preserves binary content', async () => {
  await withTestDirectory(async (directory) => {
    const received = join(directory, 'payload.dat');
    const payload = Buffer.from([0, 255, 16, 102, 102, 108, 0]);

    const session = await ffl.shareBytes(payload, { name: 'payload.dat' });
    try {
      const result = await ffl.download(session.link, { outputPath: received });
      assert.equal(result.returnCode, 0);
    } finally {
      await session.close();
    }

    assert.deepEqual(await readFile(received), payload);
  });
});


test('share multiple files downloads a named zip archive', async () => {
  await withTestDirectory(async (directory) => {
    const first = join(directory, 'first.txt');
    const second = join(directory, 'second.txt');
    const archive = join(directory, 'bundle.zip');

    await writeFile(first, 'first file');
    await writeFile(second, 'second file');

    await downloadSharedFile([first, second], archive, { name: 'bundle.zip' });

    const contents = await readFile(archive);
    assert.deepEqual(readZipEntry(contents, 'first.txt'), Buffer.from('first file'));
    assert.deepEqual(readZipEntry(contents, 'second.txt'), Buffer.from('second file'));
  });
});


test('keygen creates the reported key pair', async () => {
  await withTestDirectory(async (directory) => {
    const result = await ffl.keygen('node-recipient');

    assert.equal(result.returnCode, 0);
    assert.equal(result.privateKeyPath, join(directory, 'node-recipient.fflkey'));
    assert.equal(result.publicKeyPath, join(directory, 'node-recipient.fflpub'));
    assert.match(await readFile(result.privateKeyPath, 'utf8'), /.+/);
    assert.match(await readFile(result.publicKeyPath, 'utf8'), /.+/);
  });
});
