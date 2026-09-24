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

import type { DownloadResult, DownloadSession, KeygenResult, ShareSession } from './models.js';
import type { APEProcessResult, ProcessSession, RawOptions } from './_runtime.js';
import type { Readable } from 'node:stream';

export interface ShareOptions {
  name?: string | null;
  e2ee?: boolean;
  authUser?: string | null;
  authPassword?: string | null;
  maxDownloads?: number | null;
  timeoutSeconds?: number | null;
  hookUrl?: string | null;
  captureHookEvents?: boolean;
  eventHistoryLimit?: number;
  proxy?: string | null;
  exclude?: string | null;
  recipientAuth?: string | null;
  pickupCode?: string | null;
  recipientPublicKey?: string | null;
  recipientEmail?: string | null;
  recipientOtpApiBase?: string | null;
  alias?: string | null;
  receipt?: string | boolean | null;
  receiptConfirm?: string | boolean | null;
  forceRelay?: boolean;
  upload?: string | boolean | null;
  resumeUpload?: boolean;
  vfs?: boolean;
  preferredTunnel?: string | null;
  port?: number | null;
  invite?: boolean;
  pause?: number | null;
  enableReporting?: boolean;
  qr?: string | boolean | null;
  stdinCache?: string | null;
  logLevel?: string | null;
}

export interface ShareContentOptions extends ShareOptions {
  name?: string;
}

export interface DownloadOptions {
  outputPath?: string | null;
  resume?: boolean;
  authUser?: string | null;
  authPassword?: string | null;
  proxy?: string | null;
  recipientAuth?: string | null;
  pickupCode?: string | null;
  recipientPrivateKey?: string | null;
  signal?: AbortSignal | null;
  enableReporting?: boolean;
  hookUrl?: string | null;
  logLevel?: string | null;
}

export interface DownloadStreamOptions extends Omit<DownloadOptions, 'outputPath'> {}

export interface KeygenOptions {
  enableReporting?: boolean;
  logLevel?: string | null;
}

export interface LowLevelBinding {
  version(parameters?: Record<string, unknown>): Promise<string>;
  share(parameters?: Record<string, unknown>): Promise<ProcessSession>;
  download(parameters: Record<string, unknown>): Promise<ProcessSession>;
  keygen(parameters?: Record<string, unknown>): Promise<APEProcessResult>;
  raw(
    arguments_: readonly unknown[],
    options?: RawOptions,
  ): Promise<APEProcessResult | ProcessSession>;
}

export class FFLClient {
  constructor(binding?: LowLevelBinding);
  version(): Promise<string>;
  share(
    paths: string | readonly string[],
    options?: ShareOptions,
  ): Promise<ShareSession>;
  shareText(text: string, options?: ShareContentOptions): Promise<ShareSession>;
  shareBytes(data: Uint8Array, options?: ShareContentOptions): Promise<ShareSession>;
  shareStream(readable: Readable, options?: ShareContentOptions): Promise<ShareSession>;
  download(url: string, options?: DownloadOptions): Promise<DownloadResult>;
  startDownload(url: string, options?: DownloadOptions): Promise<DownloadSession>;
  downloadStream(
    url: string,
    options?: DownloadStreamOptions,
  ): Promise<DownloadSession>;
  keygen(name?: string | null, options?: KeygenOptions): Promise<KeygenResult>;
  raw(
    arguments_: readonly unknown[],
    options?: RawOptions,
  ): Promise<APEProcessResult | ProcessSession>;
}
