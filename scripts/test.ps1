# SPDX-License-Identifier: Apache-2.0
#
# FastFileLink JavaScript binding - Fast, no-fuss file sharing
# Copyright (C) 2025-2026 FastFileLink contributors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

param([ValidateSet('unit', 'real', 'packaging', 'all')][string]$Group = 'unit')
$groups = if ($Group -eq 'all') { 'unit', 'packaging', 'real' } else { $Group }
foreach ($name in $groups) {
  $arguments = switch ($name) {
    'unit' { @('test') }
    'real' { @('run', 'test:real') }
    'packaging' { @('run', 'test:packaging') }
  }

  & $env:ComSpec /d /s /c "npm.cmd $($arguments -join ' ')"

  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
