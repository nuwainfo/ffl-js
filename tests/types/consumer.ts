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

import {
  DownloadSession,
  downloadStream,
  shareStream,
  type DownloadOptions,
  type DownloadStreamOptions,
} from 'ffl-js';
import { Readable } from 'node:stream';

async function useFFL(): Promise<void> {
  const readable = Readable.from(['payload']);
  await shareStream(readable, { name: 'payload.txt' });

  const streamOptions: DownloadStreamOptions = { resume: true };
  const transfer: DownloadSession = await downloadStream(
    'https://example.test/download',
    streamOptions,
  );

  for await (const chunk of transfer.iterStdout()) {
    const binaryChunk: Buffer = chunk;
    void binaryChunk;
  }

  // stdout is an internal implementation detail of downloadStream().
  // @ts-expect-error DownloadOptions must not expose a binary stdout switch.
  const invalidOptions: DownloadOptions = { stdout: true };
  void invalidOptions;
}

void useFFL;
