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

import type { Readable } from 'node:stream';
import type { APEProcessResult, ProcessSession } from './_runtime.js';

export const TransferMode: Readonly<{
  UNKNOWN: 'unknown';
  WEBRTC_P2P: 'webrtc_p2p';
  HTTP_FALLBACK: 'http_fallback';
  HTTP_DIRECT: 'http_direct';
}>;

export type TransferModeValue = typeof TransferMode[keyof typeof TransferMode];

export class FFLHookEvent {
  readonly name: string;
  readonly semanticName: 'ready' | 'progress' | 'transport' | 'completed' | null;
  readonly timestamp: string | null;
  readonly data: Readonly<Record<string, unknown>>;
  readonly raw: Readonly<Record<string, unknown>>;
}

export class ShareSession {
  constructor(session: ProcessSession, cleanupPaths?: readonly string[]);
  readonly argv: readonly string[];
  readonly link: string;
  readonly pid: number | undefined;
  readonly running: boolean;
  readonly returnCode: number | null;
  readonly stdout: Readable;
  readonly stderr: Readable;
  readonly eventHistory: readonly FFLHookEvent[];
  on(name: string, listener: (event: FFLHookEvent) => void): this;
  onRaw(name: string, listener: (event: FFLHookEvent) => void): this;
  events(): AsyncIterableIterator<FFLHookEvent>;
  rawEvents(): AsyncIterableIterator<FFLHookEvent>;
  attachCleanupPaths(paths: readonly string[]): ShareSession;
  iterStdout(): AsyncGenerator<Buffer>;
  wait(timeoutSeconds?: number | null): Promise<number>;
  stop(timeoutSeconds?: number): Promise<void>;
  close(): Promise<void>;
}

export class DownloadResult {
  constructor(
    process: APEProcessResult,
    outputPath: string | null,
    transferMode: TransferModeValue,
  );
  readonly process: APEProcessResult;
  readonly outputPath: string | null;
  readonly transferMode: TransferModeValue;
  readonly argv: readonly string[];
  readonly returnCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export class DownloadSession {
  readonly argv: readonly string[];
  readonly pid: number | undefined;
  readonly running: boolean;
  readonly returnCode: number | null;
  readonly cancelled: boolean;
  readonly stdout: Readable;
  readonly stderr: Readable;
  readonly done: Promise<DownloadResult>;
  iterStdout(): AsyncGenerator<Buffer>;
  abort(timeoutSeconds?: number): Promise<void>;
  stop(timeoutSeconds?: number): Promise<void>;
  close(): Promise<void>;
}

export class KeygenResult {
  constructor(
    process: APEProcessResult,
    privateKeyPath: string,
    publicKeyPath: string,
  );
  readonly process: APEProcessResult;
  readonly privateKeyPath: string;
  readonly publicKeyPath: string;
  readonly argv: readonly string[];
  readonly returnCode: number;
  readonly stdout: string;
  readonly stderr: string;
}
