param([switch]$ForceDownload)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$required = @('APP_SPEC.md','app.config.json','dependencies.json','src\index.template.html','build-standalone.ps1','scripts\verify-standalone.ps1','README.md','README.ja.md','LICENSE','THIRD_PARTY_NOTICES.md')
foreach ($relative in $required) { if (-not (Test-Path (Join-Path $Root $relative))) { throw "Required repository file is missing: $relative" } }
$arguments = @{}; if ($ForceDownload) { $arguments.ForceDownload = $true }
& (Join-Path $Root 'build-standalone.ps1') @arguments
Write-Host '[OK] Repository check passed.' -ForegroundColor Green
