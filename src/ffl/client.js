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

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

import * as generated from './_generated.js';
import { FFLHookEventChannel } from './events.js';
import { DownloadSession, ShareSession } from './models.js';
import { FFLResultParser } from './parsing.js';

export class FFLClient {
  constructor(binding = generated) {
    this._binding = binding;
  }

  static _normalizeOptionalValue(value) {
    return value === '' ? true : value;
  }

  async _shareTemporaryBytes(data, name, shareOptions) {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'ffl-js-'));
    const temporaryPath = join(
      temporaryDirectory,
      `source${extname(name)}`,
    );

    try {
      await writeFile(temporaryPath, data);
      const session = await this.share(temporaryPath, {
        ...shareOptions,
        name,
      });
      return session.attachCleanupPaths([temporaryDirectory]);
    } catch (error) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  async version() {
    return this._binding.version({ version: true });
  }

  async share(paths, options = {}) {
    if (paths === null || paths === undefined) {
      throw new TypeError('paths is required');
    }

    const {
      name = null,
      e2ee = false,
      authUser = null,
      authPassword = null,
      maxDownloads = null,
      timeoutSeconds = null,
      hookUrl = null,
      captureHookEvents = true,
      eventHistoryLimit = 1000,
      proxy = null,
      exclude = null,
      recipientAuth = null,
      pickupCode = null,
      recipientPublicKey = null,
      recipientEmail = null,
      recipientOtpApiBase = null,
      alias = null,
      receipt = null,
      receiptConfirm = null,
      forceRelay = false,
      upload = null,
      resumeUpload = false,
      vfs = false,
      preferredTunnel = null,
      port = null,
      invite = false,
      pause = null,
      enableReporting = false,
      qr = null,
      stdinCache = null,
      stdin = null,
      logLevel = null,
    } = options;

    const eventChannel = captureHookEvents
      ? await FFLHookEventChannel.create(hookUrl, eventHistoryLimit)
      : null;

    try {
      const session = await this._binding.share({
      paths,
      logLevel,
      proxy,
      hook: eventChannel === null ? hookUrl : eventChannel.url,
      enableReporting,
      name,
      exclude,
      upload: FFLClient._normalizeOptionalValue(upload),
      resume: resumeUpload,
      pause,
      maxDownloads,
      timeout: timeoutSeconds,
      port,
      authUser,
      authPassword,
      recipientAuth,
      pickupCode,
      recipientPublicKey,
      recipientEmail,
      recipientOtpApiBase,
      forceRelay,
      e2ee,
      invite,
      qr: FFLClient._normalizeOptionalValue(qr),
      disableClipboard: true,
      vfs,
      stdinCache,
      stdin,
      foreground: true,
      alias,
      receipt: FFLClient._normalizeOptionalValue(receipt),
      receiptConfirm: FFLClient._normalizeOptionalValue(receiptConfirm),
      preferredTunnel,
      });
      return new ShareSession(session, [], eventChannel);
    } catch (error) {
      await eventChannel?.close();
      throw error;
    }
  }

  async shareText(text, options = {}) {
    const { name = 'shared.txt', ...shareOptions } = options;
    return this._shareTemporaryBytes(
      Buffer.from(text, 'utf8'),
      name,
      shareOptions,
    );
  }

  async shareBytes(data, options = {}) {
    const { name = 'data.bin', ...shareOptions } = options;
    return this._shareTemporaryBytes(data, name, shareOptions);
  }

  async shareStream(readable, options = {}) {
    if (readable === null || typeof readable?.pipe !== 'function') {
      throw new TypeError('readable must be a Node.js Readable stream');
    }

    return this.share('-', {
      ...options,
      stdin: readable,
      stdinCache: options.stdinCache ?? 'off',
    });
  }

  async download(url, options = {}) {
    const session = await this.startDownload(url, options);
    return session.done;
  }

  async startDownload(url, options = {}) {
    return this._startDownload(url, options);
  }

  async _startDownload(url, options, streamOutput = false) {
    const {
      outputPath = null,
      resume = false,
      authUser = null,
      authPassword = null,
      proxy = null,
      recipientAuth = null,
      pickupCode = null,
      recipientPrivateKey = null,
      signal = null,
      enableReporting = false,
      hookUrl = null,
      logLevel = null,
    } = options;

    if (signal?.aborted) {
      throw DownloadSession.abortError();
    }

    const cwd = process.cwd();

    const processSession = await this._binding.download({
      url,
      logLevel,
      proxy,
      hook: hookUrl,
      enableReporting,
      outputPath,
      resume,
      authUser,
      authPassword,
      recipientAuth,
      pickupCode,
      recipientPrivateKey,
      stdout: streamOutput,
      _apebindCaptureStdout: !streamOutput,
    });

    const session = new DownloadSession(
      processSession,
      (processResult) => FFLResultParser.parseDownload(processResult, outputPath, cwd),
    );

    if (signal !== null) {
      if (signal.aborted) {
        await session.abort();
      } else {
        const onAbort = () => {
          void session.abort();
        };

        signal.addEventListener('abort', onAbort, { once: true });
        processSession.onExit(() => {
          signal.removeEventListener('abort', onAbort);
        });
      }
    }

    return session;
  }

  async downloadStream(url, options = {}) {
    return this._startDownload(url, {
      ...options,
      outputPath: null,
    }, true);
  }

  async keygen(name = null, options = {}) {
    const {
      enableReporting = false,
      logLevel = null,
    } = options;

    const cwd = process.cwd();

    const processResult = await this._binding.keygen({
      name,
      enableReporting,
      logLevel,
    });

    return FFLResultParser.parseKeygen(processResult, cwd);
  }

  async raw(arguments_, options = {}) {
    return this._binding.raw(arguments_, options);
  }
}
