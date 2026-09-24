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
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { getEventListeners } from 'node:events';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import { APEProcessResult, ProcessSession } from '../../src/ffl/_runtime.js';
import { FFLClient } from '../../src/ffl/client.js';
import { FFLHookEventChannel } from '../../src/ffl/events.js';
import { TransferMode } from '../../src/ffl/models.js';

class FakeProcessSession {
  constructor(link = 'https://example.test/share') {
    this.argv = ['share', 'file.txt'];
    this.pid = 1234;
    this.running = true;
    this.returnCode = null;
    this.stdout = null;
    this.stderr = null;
    this.result = link;
    this._exitListeners = [];
  }

  async *iterStdout() {}

  async wait() {
    this._finish();
    return 0;
  }

  async stop() {
    this._finish();
  }

  async close() {
    this._finish();
  }

  _finish() {
    this.running = false;
    this.returnCode = 0;
    this.processResult ??= new APEProcessResult(this.argv, 0, '', '');
    this._notifyExitListeners();
  }

  onExit(listener) {
    this._exitListeners.push(listener);
  }

  _notifyExitListeners() {
    const listeners = this._exitListeners;
    this._exitListeners = [];
    for (const listener of listeners) {
      listener();
    }
  }
}


function fakeBinding(overrides = {}) {
  return {
    version: async () => 'FastFileLink version 4.1.0',
    share: async () => new FakeProcessSession(),
    download: async () => new APEProcessResult([], 0, '', ''),
    keygen: async () => new APEProcessResult([], 0, '', ''),
    raw: async () => new APEProcessResult([], 0, '', ''),
    ...overrides,
  };
}


test('share maps semantic options to generated camelCase binding', async () => {
  let captured;
  const binding = fakeBinding({
    share: async (parameters) => {
      captured = parameters;
      return new FakeProcessSession();
    },
  });

  const session = await new FFLClient(binding).share('file.txt', {
    timeoutSeconds: 1800,
    hookUrl: 'http://127.0.0.1/events',
    upload: true,
    receipt: '',
    receiptConfirm: '',
    qr: true,
    resumeUpload: true,
  });

  assert.equal(session.link, 'https://example.test/share');
  assert.equal(captured.paths, 'file.txt');
  assert.equal(captured.timeout, 1800);
  assert.match(captured.hook, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.equal(captured.upload, true);
  assert.equal(captured.receipt, true);
  assert.equal(captured.receiptConfirm, true);
  assert.equal(captured.qr, true);
  assert.equal(captured.resume, true);
  assert.equal(captured.foreground, true);
  assert.equal(captured.disableClipboard, true);
  await session.close();
});


test('share projects FFL hook payloads as replayable semantic events', async () => {
  let hookUrl;
  const binding = fakeBinding({
    share: async (parameters) => {
      hookUrl = parameters.hook;
      return new FakeProcessSession();
    },
  });

  const session = await new FFLClient(binding).share('file.txt');

  const payload = {
    event: '/hook/server/endpoints/register',
    timestamp: '2026-09-07T00:00:00Z',
    data: { fileName: 'file.txt', fileSize: 5 },
  };

  const response = await fetch(hookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(response.status, 204);
  assert.equal(session.eventHistory.length, 1);
  assert.equal(session.eventHistory[0].name, payload.event);
  assert.equal(session.eventHistory[0].data.fileName, 'file.txt');

  const semantic = [];
  const raw = [];
  session.on('ready', (event) => semantic.push(event));
  session.onRaw(payload.event, (event) => raw.push(event));
  assert.deepEqual(semantic, session.eventHistory);
  assert.deepEqual(raw, session.eventHistory);

  const iterator = session.events();
  assert.deepEqual((await iterator.next()).value, session.eventHistory[0]);
  await session.close();
});


test('share bounds hook history and never waits for webhook forwarding', async () => {
  const forwardServer = createServer(() => {});
  await new Promise((resolve) => forwardServer.listen(0, '127.0.0.1', resolve));
  const forwardAddress = forwardServer.address();
  const forwardUrl = `http://127.0.0.1:${forwardAddress.port}/events`;

  let hookUrl;
  const binding = fakeBinding({
    share: async (parameters) => {
      hookUrl = parameters.hook;
      return new FakeProcessSession();
    },
  });

  const session = await new FFLClient(binding).share('file.txt', {
    hookUrl: forwardUrl,
    eventHistoryLimit: 1,
  });

  try {
    const first = await fetch(hookUrl, {
      method: 'POST',
      body: JSON.stringify({ event: 'first' }),
    });
    const second = await fetch(hookUrl, {
      method: 'POST',
      body: JSON.stringify({ event: 'second' }),
    });

    assert.equal(first.status, 204);
    assert.equal(second.status, 204);
    assert.deepEqual(session.eventHistory.map((event) => event.name), ['second']);
  } finally {
    await session.close();
    await new Promise((resolve) => forwardServer.close(resolve));
  }
});


test('hook responses do not wait for local event listeners', async () => {
  const channel = await FFLHookEventChannel.create();
  const shared = new SharedArrayBuffer(4);

  channel.on('/hook/transfer/progress', () => {
    Atomics.wait(new Int32Array(shared), 0, 0, 300);
  });

  const response = {
    status: null,
    ended: false,
    writeHead(status) {
      this.status = status;
    },
    end() {
      this.ended = true;
    },
  };

  try {
    const started = performance.now();
    await channel._handle(
      Readable.from([Buffer.from(JSON.stringify({
        event: '/hook/transfer/progress',
        data: { index: 1 },
      }))]),
      response,
    );

    assert.ok(performance.now() - started < 100);
    assert.equal(response.status, 204);
    assert.equal(response.ended, true);
  } finally {
    await channel.close();
  }
});


test('hook event iterators preserve live events after history eviction', async () => {
  let hookUrl;
  const binding = fakeBinding({
    share: async (parameters) => {
      hookUrl = parameters.hook;
      return new FakeProcessSession();
    },
  });

  const session = await new FFLClient(binding).share('file.txt', {
    eventHistoryLimit: 2,
  });

  const publish = async (name) => fetch(hookUrl, {
    method: 'POST',
    body: JSON.stringify({ event: name }),
  });

  const iterator = session.events();

  await publish('first');
  assert.equal((await iterator.next()).value.name, 'first');
  await publish('second');
  await publish('third');
  await publish('fourth');

  assert.deepEqual(session.eventHistory.map((event) => event.name), ['third', 'fourth']);
  assert.equal((await iterator.next()).value.name, 'second');
  assert.equal((await iterator.next()).value.name, 'third');
  assert.equal((await iterator.next()).value.name, 'fourth');
  await session.close();
});


test('share can defer hook event handling to the caller', async () => {
  let captured;
  const binding = fakeBinding({
    share: async (parameters) => {
      captured = parameters;
      return new FakeProcessSession();
    },
  });

  const hookUrl = 'http://127.0.0.1:9000/events';
  const session = await new FFLClient(binding).share('file.txt', {
    hookUrl,
    captureHookEvents: false,
  });

  assert.equal(captured.hook, hookUrl);
  assert.deepEqual(session.eventHistory, []);

  await session.close();
});


test('share releases hook resources when the FFL process exits naturally', async () => {
  let hookUrl;
  const processSession = new FakeProcessSession();
  const binding = fakeBinding({
    share: async (parameters) => {
      hookUrl = parameters.hook;
      return processSession;
    },
  });

  await new FFLClient(binding).share('file.txt');
  await processSession.wait();
  await new Promise((resolve) => setImmediate(resolve));

  await assert.rejects(fetch(hookUrl));
});


test('shareText owns temporary source until the session closes', async () => {
  let captured;
  const binding = fakeBinding({
    share: async (parameters) => {
      captured = parameters;
      return new FakeProcessSession();
    },
  });

  const session = await new FFLClient(binding).shareText('hello', {
    name: 'message.txt',
  });

  assert.equal(await readFile(captured.paths, 'utf8'), 'hello');
  assert.equal(captured.name, 'message.txt');

  await session.close();
  await assert.rejects(readFile(captured.paths, 'utf8'), { code: 'ENOENT' });
});


test('shareStream passes a Readable to FFL stdin without creating a file', async () => {
  let captured;
  const binding = fakeBinding({
    share: async (parameters) => {
      captured = parameters;
      return new FakeProcessSession();
    },
  });

  const readable = Readable.from(['streamed content']);
  const session = await new FFLClient(binding).shareStream(readable, {
    name: 'dump.sql',
  });

  assert.equal(captured.paths, '-');
  assert.equal(captured.stdin, readable);
  assert.equal(captured.stdinCache, 'off');
  assert.equal(session.link, 'https://example.test/share');

  await session.close();
});


test('download returns a structured result', async () => {
  const processResult = new APEProcessResult(
    ['download', 'https://example.test/file'],
    0,
    'WebRTC P2P\nDownloaded: package.zip\n',
    '',
  );

  const processSession = new FakeProcessSession();
  processSession.processResult = processResult;

  const binding = fakeBinding({ download: async () => processSession });
  const result = await new FFLClient(binding).download('https://example.test/file');

  assert.equal(result.process, processResult);
  assert.equal(result.transferMode, TransferMode.WEBRTC_P2P);
  assert.equal(result.outputPath, join(process.cwd(), 'package.zip'));
});


test('download explicit output path wins', async () => {
  const processResult = new APEProcessResult(
    ['download', 'https://example.test/file'],
    0,
    'HTTP fallback\nDownloaded: ignored.zip\n',
    '',
  );

  const processSession = new FakeProcessSession();
  processSession.processResult = processResult;

  const binding = fakeBinding({ download: async () => processSession });
  const result = await new FFLClient(binding).download(
    'https://example.test/file',
    { outputPath: 'chosen.bin' },
  );

  assert.equal(result.transferMode, TransferMode.HTTP_FALLBACK);
  assert.equal(result.outputPath, join(process.cwd(), 'chosen.bin'));
});


test('download recognizes P2P TCP output', async () => {
  const processSession = new FakeProcessSession();
  processSession.processResult = new APEProcessResult(
    ['download', 'https://example.test/package'],
    0,
    'Using P2P TCP download\nDownloaded: package.zip\n',
    '',
  );

  const binding = fakeBinding({ download: async () => processSession });
  const client = new FFLClient(binding);

  const result = await client.download('https://example.test/package');

  assert.equal(result.transferMode, TransferMode.WEBRTC_P2P);
});


test('startDownload exposes a cancellable session and download waits for it', async () => {
  const processResult = new APEProcessResult(
    ['download', 'https://example.test/file'],
    0,
    'HTTP fallback\nDownloaded: package.zip\n',
    '',
  );

  const processSession = new FakeProcessSession();
  processSession.processResult = processResult;

  const binding = fakeBinding({ download: async () => processSession });
  const client = new FFLClient(binding);
  const transfer = await client.startDownload('https://example.test/file');

  assert.equal(transfer.running, true);
  assert.equal((await transfer.done).process, processResult);
  assert.equal(transfer.running, false);

  await transfer.stop();
});


test('startDownload rejects done with AbortError when its AbortSignal is aborted', async () => {
  const controller = new AbortController();
  const processSession = new FakeProcessSession();
  const binding = fakeBinding({ download: async () => processSession });

  const transfer = await new FFLClient(binding).startDownload('https://example.test/file', {
    signal: controller.signal,
  });

  controller.abort();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(processSession.running, false);
  assert.equal(transfer.cancelled, true);
  await assert.rejects(transfer.done, { name: 'AbortError' });
});


test('startDownload removes its AbortSignal listener after normal completion', async () => {
  const controller = new AbortController();
  const processSession = new FakeProcessSession();
  processSession.processResult = new APEProcessResult([], 0, 'Downloaded: file.bin', '');
  const binding = fakeBinding({ download: async () => processSession });

  for (let index = 0; index < 20; index += 1) {
    const transfer = await new FFLClient(binding).startDownload('https://example.test/file', {
      signal: controller.signal,
    });

    await transfer.done;
  }

  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});


test('stopping a download rejects done as an AbortError', async () => {
  const processSession = new FakeProcessSession();
  const binding = fakeBinding({ download: async () => processSession });

  const transfer = await new FFLClient(binding).startDownload('https://example.test/file');

  await transfer.stop();

  assert.equal(transfer.cancelled, true);
  await assert.rejects(transfer.done, { name: 'AbortError' });
});


test('closing a running download rejects done as an AbortError', async () => {
  const processSession = new FakeProcessSession();
  const binding = fakeBinding({ download: async () => processSession });

  const transfer = await new FFLClient(binding).startDownload('https://example.test/file');

  await transfer.close();

  assert.equal(transfer.cancelled, true);
  await assert.rejects(transfer.done, { name: 'AbortError' });
});


test('startDownload rejects an already-aborted signal before spawning FFL', async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  const binding = fakeBinding({
    download: async () => {
      called = true;
      return new FakeProcessSession();
    },
  });

  await assert.rejects(
    new FFLClient(binding).startDownload('https://example.test/file', {
      signal: controller.signal,
    }),
    { name: 'AbortError' },
  );

  assert.equal(called, false);
});


test('downloadStream preserves bytes without retaining its stdout in the result', async () => {
  let captured;
  const child = spawn(process.execPath, [
    '-e',
    "process.stdout.write(Buffer.alloc(1024 * 1024, 255))",
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const processSession = new ProcessSession(
    child,
    ['download'],
    null,
    null,
    { captureStdout: false },
  );

  const binding = fakeBinding({
    download: async (parameters) => {
      captured = parameters;
      return processSession;
    },
  });

  const transfer = await new FFLClient(binding).downloadStream('https://example.test/file');
  const chunks = [];
  for await (const chunk of transfer.iterStdout()) {
    chunks.push(chunk);
  }

  assert.equal(captured.stdout, true);
  assert.equal(captured._apebindCaptureStdout, false);
  assert.deepEqual(Buffer.concat(chunks), Buffer.alloc(1024 * 1024, 255));

  await transfer.done;
  assert.equal(processSession.processResult.stdout, '');
});


test('downloadStream requires stdout consumption before waiting', async () => {
  const child = spawn(process.execPath, [
    '-e',
    "process.stdout.write(Buffer.alloc(2 * 1024 * 1024, 255))",
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const processSession = new ProcessSession(
    child,
    ['download'],
    null,
    null,
    { captureStdout: false },
  );

  try {
    await assert.rejects(
      processSession.wait(),
      /streamed stdout must be consumed before waiting/,
    );
  } finally {
    await processSession.stop();
  }
});


test('persistent stdin handles an early child exit without EPIPE', async () => {
  const source = Readable.from((async function* generate() {
    while (true) {
      yield Buffer.alloc(64 * 1024);
    }
  })());
  const child = spawn(process.execPath, [
    '-e', 'process.stdin.destroy(); setTimeout(() => process.exit(0), 10);',
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  const session = new ProcessSession(child, ['input']);
  session._attachInput(source);

  await session.wait();

  assert.equal(source.destroyed, true);
});


test('keygen parses reported key paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ffl-js-test-'));
  const privateKey = join(directory, 'alice.fflkey');
  const publicKey = join(directory, 'alice.fflpub');
  await writeFile(privateKey, 'private');
  await writeFile(publicKey, 'public');

  const processResult = new APEProcessResult(
    ['keygen', '--name', 'alice'],
    0,
    (
      'Generated RSA-2048 keypair:\n'
      + `  Private key : ${privateKey}\n`
      + `  Public key  : ${publicKey}  ← share with sender\n`
    ),
    '',
  );

  const binding = fakeBinding({ keygen: async () => processResult });
  const result = await new FFLClient(binding).keygen('alice');

  assert.equal(result.privateKeyPath, privateKey);
  assert.equal(result.publicKeyPath, publicKey);
});


test('version is a semantic wrapper', async () => {
  let parameters;
  const binding = fakeBinding({
    version: async (values) => {
      parameters = values;
      return 'FastFileLink version 4.1.0';
    },
  });

  const value = await new FFLClient(binding).version();

  assert.equal(value, 'FastFileLink version 4.1.0');
  assert.deepEqual(parameters, { version: true });
});
