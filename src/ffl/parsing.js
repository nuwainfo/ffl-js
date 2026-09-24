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

import { access } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';

import { FFLOutputError } from './errors.js';
import { DownloadResult, KeygenResult, TransferMode } from './models.js';

export class FFLResultParser {
  static _combinedOutput(process) {
    return [process.stdout, process.stderr].filter(Boolean).join('\n');
  }

  static _detectTransferMode(output) {
    if (
      output.includes('P2P direct')
      || output.includes('P2P TCP')
      || output.includes('WebRTC P2P')
    ) {
      return TransferMode.WEBRTC_P2P;
    }

    if (output.includes('HTTP fallback')) {
      return TransferMode.HTTP_FALLBACK;
    }

    if (
      output.includes('HTTP download')
      || output.includes('downloading directly via HTTP')
      || output.includes('WebRTC not supported')
    ) {
      return TransferMode.HTTP_DIRECT;
    }

    return TransferMode.UNKNOWN;
  }

  static _detectDownloadPath(output, cwd) {
    const downloaded = /^Downloaded:\s+(.+)$/m.exec(output);
    const downloading = /Downloading\s+(.+?)\s+\(/.exec(output);
    const match = downloaded ?? downloading;

    if (match === null) {
      return null;
    }

    return resolve(cwd, match[1].trim());
  }

  static parseDownload(process, requestedOutputPath, cwd) {
    const output = this._combinedOutput(process);
    const outputPath = requestedOutputPath === null || requestedOutputPath === undefined
      ? this._detectDownloadPath(output, cwd)
      : resolve(cwd, requestedOutputPath);

    return new DownloadResult(
      process,
      outputPath,
      this._detectTransferMode(output),
    );
  }

  static async parseKeygen(process, cwd) {
    const output = this._combinedOutput(process);
    const privateMatch = /^\s*Private key\s*:\s*(.+?)\s*$/m.exec(output);
    const publicMatch = /^\s*Public key\s*:\s*(.+?)(?:\s+←.*)?$/m.exec(output);
    if (privateMatch === null || publicMatch === null) {
      throw new FFLOutputError('FFL keygen output did not contain both key paths');
    }

    const privateKeyPath = isAbsolute(privateMatch[1].trim())
      ? privateMatch[1].trim()
      : resolve(cwd, privateMatch[1].trim());
    const publicKeyPath = isAbsolute(publicMatch[1].trim())
      ? publicMatch[1].trim()
      : resolve(cwd, publicMatch[1].trim());

    try {
      await access(privateKeyPath);
      await access(publicKeyPath);
    } catch (error) {
      throw new FFLOutputError(
        'FFL keygen reported key files that do not exist',
        { cause: error },
      );
    }

    return new KeygenResult(process, privateKeyPath, publicKeyPath);
  }
}
