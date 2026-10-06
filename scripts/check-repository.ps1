param([switch]$ForceDownload)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$required = @('APP_SPEC.md','app.config.json','dependencies.json','src\index.template.html','build-standalone.ps1','scripts\verify-standalone.ps1','README.md','README.ja.md','LICENSE','THIRD_PARTY_NOTICES.md')
foreach ($relative in $required) { if (-not (Test-Path (Join-Path $Root $relative))) { throw "Required repository file is missing: $relative" } }
$arguments = @{}; if ($ForceDownload) { $arguments.ForceDownload = $true }
& (Join-Path $Root 'build-standalone.ps1') @arguments
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22 or later is required for repository regression tests. The standalone build itself does not require Node.js.' }
& node --test (Join-Path $Root 'tests/qr-reader.test.cjs')
if ($LASTEXITCODE -ne 0) { throw 'QR Reader regression tests failed.' }
Write-Host '[OK] Repository check passed.' -ForegroundColor Green
