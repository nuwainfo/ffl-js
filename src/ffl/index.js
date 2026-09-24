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

import { FFLClient } from './client.js';

const defaultClient = new FFLClient();

export const version = defaultClient.version.bind(defaultClient);
export const share = defaultClient.share.bind(defaultClient);
export const shareText = defaultClient.shareText.bind(defaultClient);
export const shareBytes = defaultClient.shareBytes.bind(defaultClient);
export const shareStream = defaultClient.shareStream.bind(defaultClient);
export const download = defaultClient.download.bind(defaultClient);
export const startDownload = defaultClient.startDownload.bind(defaultClient);
export const downloadStream = defaultClient.downloadStream.bind(defaultClient);
export const keygen = defaultClient.keygen.bind(defaultClient);
export const raw = defaultClient.raw.bind(defaultClient);

export { FFLClient } from './client.js';
export { FFLOutputError } from './errors.js';
export {
  DownloadResult,
  DownloadSession,
  KeygenResult,
  ShareSession,
  TransferMode,
} from './models.js';
export { FFLHookEvent } from './events.js';
export {
  APEProcessError,
  APEProcessResult,
  APETimeoutError,
  ProcessSession,
} from './_runtime.js';
