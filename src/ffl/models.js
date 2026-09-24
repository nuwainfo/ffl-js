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

import { rm } from 'node:fs/promises';

export const TransferMode = Object.freeze({
  UNKNOWN: 'unknown',
  WEBRTC_P2P: 'webrtc_p2p',
  HTTP_FALLBACK: 'http_fallback',
  HTTP_DIRECT: 'http_direct',
});

export class ShareSession {
  constructor(session, cleanupPaths = [], eventChannel = null) {
    this._session = session;
    this._cleanupPaths = [...cleanupPaths];
    this._eventChannel = eventChannel;
    this._cleanupPromise = null;

    session.onExit(() => {
      void this._cleanup();
    });
  }

  get argv() {
    return this._session.argv;
  }

  get link() {
    const link = this._session.result;
    if (typeof link !== 'string' || link.length === 0) {
      throw new Error('FFL share session does not have a valid link result');
    }

    return link;
  }

  get pid() {
    return this._session.pid;
  }

  get running() {
    return this._session.running;
  }

  get returnCode() {
    return this._session.returnCode;
  }

  get stdout() {
    return this._session.stdout;
  }

  get stderr() {
    return this._session.stderr;
  }

  get eventHistory() {
    return this._eventChannel === null ? [] : this._eventChannel.history;
  }

  on(name, listener) {
    if (this._eventChannel === null) {
      throw new Error('FFL hook events are not available for this session');
    }

    this._eventChannel.onSemantic(name, listener);
    return this;
  }

  onRaw(name, listener) {
    if (this._eventChannel === null) {
      throw new Error('FFL hook events are not available for this session');
    }

    this._eventChannel.on(name, listener);
    return this;
  }

  events() {
    return this._eventChannel === null
      ? (async function* emptyEvents() {})()
      : this._eventChannel.events();
  }

  rawEvents() {
    return this.events();
  }

  attachCleanupPaths(paths) {
    this._cleanupPaths.push(...paths);
    return this;
  }

  async _cleanup() {
    if (this._cleanupPromise !== null) {
      return this._cleanupPromise;
    }

    this._cleanupPromise = this._cleanupResources();
    return this._cleanupPromise;
  }

  async _cleanupResources() {
    const paths = this._cleanupPaths;
    this._cleanupPaths = [];

    await Promise.all(
      paths.map((path) => rm(path, { recursive: true, force: true })),
    );

    if (this._eventChannel !== null) {
      await this._eventChannel.close();
    }
  }

  iterStdout() {
    return this._session.iterStdout();
  }

  async wait(timeoutSeconds = null) {
    try {
      const result = await this._session.wait(timeoutSeconds);
      this._eventChannel?.raiseIfError();
      return result;
    } finally {
      if (!this._session.running) {
        await this._cleanup();
      }
    }
  }

  async stop(timeoutSeconds = 5) {
    try {
      await this._session.stop(timeoutSeconds);
    } finally {
      await this._cleanup();
    }
  }

  async close() {
    try {
      await this._session.close();
    } finally {
      await this._cleanup();
    }
  }
}

export class DownloadResult {
  constructor(process, outputPath, transferMode) {
    this.process = process;
    this.outputPath = outputPath;
    this.transferMode = transferMode;
  }

  get argv() {
    return this.process.argv;
  }

  get returnCode() {
    return this.process.returnCode;
  }

  get stdout() {
    return this.process.stdout;
  }

  get stderr() {
    return this.process.stderr;
  }
}

export class DownloadSession {
  constructor(session, createResult) {
    this._session = session;
    this._createResult = createResult;
    this._done = null;
    this._abortError = null;
  }

  get argv() {
    return this._session.argv;
  }

  get pid() {
    return this._session.pid;
  }

  get running() {
    return this._session.running;
  }

  get returnCode() {
    return this._session.returnCode;
  }

  get stdout() {
    return this._session.stdout;
  }

  get stderr() {
    return this._session.stderr;
  }

  get done() {
    this._done ??= this._waitForResult();
    return this._done;
  }

  get cancelled() {
    return this._abortError !== null;
  }

  iterStdout() {
    return this._session.iterStdout();
  }

  async _waitForResult() {
    await this._session.wait();

    if (this._abortError !== null) {
      throw this._abortError;
    }

    return this._createResult(this._session.processResult);
  }

  static abortError() {
    const error = new Error('FFL download was aborted');
    error.name = 'AbortError';
    return error;
  }

  async abort(timeoutSeconds = 5) {
    this._abortError ??= DownloadSession.abortError();
    await this._session.stop(timeoutSeconds);
  }

  stop(timeoutSeconds = 5) {
    return this.abort(timeoutSeconds);
  }

  async close() {
    if (this.running) {
      await this.abort();
      return;
    }

    await this._session.close();
  }
}

export class KeygenResult {
  constructor(process, privateKeyPath, publicKeyPath) {
    this.process = process;
    this.privateKeyPath = privateKeyPath;
    this.publicKeyPath = publicKeyPath;
  }

  get argv() {
    return this.process.argv;
  }

  get returnCode() {
    return this.process.returnCode;
  }

  get stdout() {
    return this.process.stdout;
  }

  get stderr() {
    return this.process.stderr;
  }
}
