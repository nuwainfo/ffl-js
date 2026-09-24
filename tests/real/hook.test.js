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
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import * as ffl from '../../src/ffl/index.js';
import { withTestDirectory } from './helpers.js';


test('share sends events to a hook URL', async () => {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }

    requests.push({ path: request.url, body: Buffer.concat(chunks) });
    response.writeHead(204).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    await withTestDirectory(async (directory) => {
      const source = join(directory, 'hook-source.txt');
      const received = join(directory, 'hook-received.txt');

      await writeFile(source, 'Hook payload');

      const { port } = server.address();
      const session = await ffl.share(source, {
        name: 'hook-received.txt',
        hookUrl: `http://127.0.0.1:${port}/events`,
        maxDownloads: 1,
        timeoutSeconds: 90,
      });

      try {
        const result = await ffl.download(session.link, { outputPath: received });

        assert.equal(result.returnCode, 0);
        assert.equal(await readFile(received, 'utf8'), 'Hook payload');
        assert.ok(session.eventHistory.length > 0);
        const endpointEvents = session.eventHistory.filter(
          (event) => event.name === '/hook/server/endpoints/register',
        );

        assert.ok(endpointEvents.length > 0);

        const replayed = [];
        session.onRaw('/hook/server/endpoints/register', (event) => replayed.push(event));
        assert.deepEqual(replayed, endpointEvents);
      } finally {
        await session.close();
      }
    });

    assert.ok(requests.some((request) => request.path === '/events' && request.body.length > 0));
  } finally {
    server.close();
    await once(server, 'close');
  }
});
