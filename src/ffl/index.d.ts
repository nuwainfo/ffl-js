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

import type {
  DownloadOptions,
  DownloadStreamOptions,
  KeygenOptions,
  ShareContentOptions,
  ShareOptions,
} from './client.js';
import type { DownloadResult, DownloadSession, KeygenResult, ShareSession } from './models.js';
import type { APEProcessResult, ProcessSession, RawOptions } from './_runtime.js';
import type { Readable } from 'node:stream';

export { FFLClient } from './client.js';
export type {
  DownloadOptions,
  DownloadStreamOptions,
  KeygenOptions,
  LowLevelBinding,
  ShareContentOptions,
  ShareOptions,
} from './client.js';

export { FFLOutputError } from './errors.js';

export {
  DownloadResult,
  DownloadSession,
  FFLHookEvent,
  KeygenResult,
  ShareSession,
  TransferMode,
} from './models.js';
export type { TransferModeValue } from './models.js';

export {
  APEProcessError,
  APEProcessResult,
  APETimeoutError,
  ProcessSession,
} from './_runtime.js';

export function version(): Promise<string>;
export function share(
  paths: string | readonly string[],
  options?: ShareOptions,
): Promise<ShareSession>;
export function shareText(
  text: string,
  options?: ShareContentOptions,
): Promise<ShareSession>;
export function shareBytes(
  data: Uint8Array,
  options?: ShareContentOptions,
): Promise<ShareSession>;
export function shareStream(
  readable: Readable,
  options?: ShareContentOptions,
): Promise<ShareSession>;
export function download(url: string, options?: DownloadOptions): Promise<DownloadResult>;
export function startDownload(url: string, options?: DownloadOptions): Promise<DownloadSession>;
export function downloadStream(
  url: string,
  options?: DownloadStreamOptions,
): Promise<DownloadSession>;
export function keygen(name?: string | null, options?: KeygenOptions): Promise<KeygenResult>;
export function raw(
  arguments_: readonly unknown[],
  options?: RawOptions,
): Promise<APEProcessResult | ProcessSession>;
