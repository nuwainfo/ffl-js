#!/usr/bin/env node
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

import { APEProcessError, raw } from './index.js';

function writeOutput(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

try {
  const result = await raw(process.argv.slice(2));
  writeOutput(result);
} catch (error) {
  if (error instanceof APEProcessError) {
    writeOutput(error.result);
    process.exitCode = error.result.returnCode;
  } else {
    console.error(error);
    process.exitCode = 1;
  }
}
