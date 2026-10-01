param([string]$Executable = "release/win-unpacked/Meta Lens.exe")
$ErrorActionPreference = 'Stop'
$testProfile = Join-Path ([System.IO.Path]::GetTempPath()) ("meta-lens-smoke-" + [guid]::NewGuid().ToString('N'))
$env:META_LENS_SMOKE_DIR = $testProfile
$testApp = Start-Process -FilePath (Resolve-Path -LiteralPath $Executable) -ArgumentList '--smoke-test' -WindowStyle Hidden -PassThru
try {
  if (-not $testApp.WaitForExit(45000)) { throw 'Desktop smoke test timed out.' }
  $result = Get-Content -LiteralPath (Join-Path $testProfile 'smoke-result.json') -Raw | ConvertFrom-Json
  if (-not $result.ok -or $testApp.ExitCode -ne 0) { throw ($result | ConvertTo-Json) }
  $result | ConvertTo-Json
} finally {
  if (-not $testApp.HasExited) { $testApp.Kill() }
  Remove-Item Env:META_LENS_SMOKE_DIR -ErrorAction SilentlyContinue
}
