param(
  [switch]$ForceDownload,
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TemplatePath = Join-Path $Root "src\index.template.html"
$AppConfigPath = Join-Path $Root "app.config.json"
$DependenciesPath = Join-Path $Root "dependencies.json"
$VerifyPath = Join-Path $Root "scripts\verify-standalone.ps1"
$CacheRoot = Join-Path $Root ".cache"
$DistRoot = Join-Path $Root "dist"

function Write-Step([string]$Message) { Write-Host "[QR Reader] $Message" -ForegroundColor Cyan }
function Get-Json([string]$Path) {
  if (-not (Test-Path $Path)) { throw "Required file not found: $Path" }
  return Get-Content -Raw -Encoding UTF8 $Path | ConvertFrom-Json
}
function Safe-Id([string]$Value) {
  if ($Value -notmatch '^[a-z0-9][a-z0-9._-]*$') { throw "Invalid dependency id/key: $Value" }
  return $Value
}
function Mime-Type([string]$Path) {
  switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".js" { "text/javascript" }
    ".css" { "text/css" }
    ".wasm" { "application/wasm" }
    ".json" { "application/json" }
    default { "application/octet-stream" }
  }
}
function Safe-Json([object]$Value, [int]$Depth = 40) {
  return ($Value | ConvertTo-Json -Compress -Depth $Depth).Replace("<", "\u003c").Replace(">", "\u003e").Replace("&", "\u0026")
}
function Get-NpmPackage([string]$Name, [string]$Version) {
  $key = (($Name -replace "[^A-Za-z0-9._-]", "-") + "-" + $Version)
  $root = Join-Path $CacheRoot $key
  $archive = Join-Path $root "package.tgz"
  $extract = Join-Path $root "extracted"
  $package = Join-Path $extract "package"
  if ($ForceDownload -and (Test-Path $root)) { Remove-Item -Recurse -Force $root }
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  if (-not (Test-Path $archive)) {
    $encoded = [Uri]::EscapeDataString($Name)
    Write-Step "Resolving $Name@$Version"
    $meta = Invoke-RestMethod -Uri "https://registry.npmjs.org/$encoded/$Version" -UseBasicParsing -Headers @{ "User-Agent" = "htmlapps-qr-reader/1.0" }
    if (-not $meta.dist.tarball) { throw "npm tarball URL not found for $Name@$Version" }
    Write-Step "Downloading $Name@$Version"
    $partial = "$archive.part"
    Remove-Item -Force -ErrorAction SilentlyContinue $partial
    Invoke-WebRequest -Uri ([string]$meta.dist.tarball) -OutFile $partial -UseBasicParsing -Headers @{ "User-Agent" = "htmlapps-qr-reader/1.0" }
    Move-Item -Force $partial $archive
  }
  if (-not (Test-Path $package)) {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $extract
    New-Item -ItemType Directory -Force -Path $extract | Out-Null
    Write-Step "Extracting $Name@$Version"
    & tar.exe -xzf $archive -C $extract
    if ($LASTEXITCODE -ne 0) { throw "tar.exe failed while extracting $archive" }
  }
  $actual = [string]((Get-Content -Raw -Encoding UTF8 (Join-Path $package "package.json") | ConvertFrom-Json).version)
  if ($actual -ne $Version) { throw "Expected $Name@$Version but found $actual" }
  return @{ Root = $package; Archive = $archive; ArchiveSha256 = (Get-FileHash -Algorithm SHA256 $archive).Hash.ToLowerInvariant() }
}

if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) { throw "tar.exe was not found. Use a current Windows 10/11 environment." }
New-Item -ItemType Directory -Force -Path $CacheRoot, $DistRoot | Out-Null
$app = Get-Json $AppConfigPath
$depsConfig = Get-Json $DependenciesPath
if ([string]::IsNullOrWhiteSpace($OutputPath)) { $OutputPath = Join-Path $Root ([string]$app.build.output) }
elseif (-not [IO.Path]::IsPathRooted($OutputPath)) { $OutputPath = Join-Path $Root $OutputPath }

$bundle = [ordered]@{ schemaVersion = 1; dependencies = [ordered]@{} }
$manifestDeps = @()
$ids = @{}
foreach ($dep in @($depsConfig.dependencies)) {
  $id = Safe-Id ([string]$dep.id)
  if ($ids.ContainsKey($id)) { throw "Duplicate dependency id: $id" }
  $ids[$id] = $true
  $pkg = Get-NpmPackage ([string]$dep.package) ([string]$dep.version)
  $assets = [ordered]@{}
  $manifestAssets = @()
  $assetKeys = @{}
  $packageRoot = [IO.Path]::GetFullPath([string]$pkg.Root).TrimEnd([char[]]@([char]92, [char]47))
  foreach ($asset in @($dep.assets)) {
    $key = Safe-Id ([string]$asset.key)
    if ($assetKeys.ContainsKey($key)) { throw "Duplicate asset key '$key' in dependency '$id'." }
    $assetKeys[$key] = $true
    $path = [IO.Path]::GetFullPath((Join-Path $pkg.Root ([string]$asset.path)))
    if (-not $path.StartsWith($packageRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Dependency asset path escapes package root: $($asset.path)"
    }
    if (-not (Test-Path $path)) { throw "Dependency asset not found: $path" }
    $textExtensions = @('.js','.mjs','.css')
    if ($textExtensions -contains [IO.Path]::GetExtension($path).ToLowerInvariant()) {
      $text = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
      if ($asset.PSObject.Properties.Name -contains 'stripSourceMapComment' -and [bool]$asset.stripSourceMapComment) {
        $text = [regex]::Replace($text, '(?m)^\s*//# sourceMappingURL=.*$', '')
        $text = [regex]::Replace($text, '(?m)^\s*/\*# sourceMappingURL=.*?\*/\s*$', '')
      }
      $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    } else { $bytes = [IO.File]::ReadAllBytes($path) }
    $mime = if ($asset.PSObject.Properties.Name -contains 'mime' -and -not [string]::IsNullOrWhiteSpace([string]$asset.mime)) { [string]$asset.mime } else { Mime-Type $path }
    $shaAlgo = [Security.Cryptography.SHA256]::Create(); try { $hash = $shaAlgo.ComputeHash($bytes) } finally { $shaAlgo.Dispose() }
    $sha = ($hash | ForEach-Object { $_.ToString('x2') }) -join ''
    $assets[$key] = [ordered]@{ mime = $mime; base64 = [Convert]::ToBase64String($bytes) }
    $manifestAssets += [ordered]@{ key = $key; path = [string]$asset.path; mime = $mime; bytes = $bytes.Length; sha256 = $sha }
  }
  $bundle.dependencies[$id] = [ordered]@{ package = [string]$dep.package; version = [string]$dep.version; assets = $assets }
  $manifestDeps += [ordered]@{ id = $id; package = [string]$dep.package; version = [string]$dep.version; license = [string]$dep.license; homepage = [string]$dep.homepage; tarballSha256 = $pkg.ArchiveSha256; assets = $manifestAssets }
}

$manifest = [ordered]@{
  schemaVersion = 1
  builder = "htmlapps-template-compatible/1.0"
  generatedAtUtc = [DateTime]::UtcNow.ToString('o')
  app = [ordered]@{ name = [string]$app.name; slug = [string]$app.slug; version = [string]$app.version }
  dependencies = $manifestDeps
}

Write-Step "Generating standalone HTML"
$template = [IO.File]::ReadAllText($TemplatePath, [Text.Encoding]::UTF8)
$bundleJson = Safe-Json $bundle 50
$replacements = [ordered]@{
  '__APP_CONFIG_JSON__' = Safe-Json $app 20
  '__BUILD_MANIFEST_JSON__' = Safe-Json $manifest 40
  '__EMBEDDED_ASSET_BUNDLE_BASE64__' = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($bundleJson))
}
foreach ($entry in $replacements.GetEnumerator()) {
  $count = ([regex]::Matches($template, [regex]::Escape($entry.Key))).Count
  if ($count -ne 1) { throw "Template placeholder $($entry.Key) must occur exactly once; found $count." }
  $template = $template.Replace($entry.Key, [string]$entry.Value)
}
$directory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $directory | Out-Null
[IO.File]::WriteAllText($OutputPath, $template, (New-Object System.Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $directory 'dependency-manifest.json'), ($manifest | ConvertTo-Json -Depth 40), (New-Object System.Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $directory '.nojekyll'), '', (New-Object System.Text.UTF8Encoding($false)))
& $VerifyPath -Path $OutputPath -RequireNetworkBlock ([bool]$app.build.blockRuntimeNetwork)
$hash = (Get-FileHash -Algorithm SHA256 $OutputPath).Hash.ToLowerInvariant()
$sizeMb = [Math]::Round((Get-Item $OutputPath).Length / 1MB, 2)
Write-Host ""
Write-Host "[OK] Standalone HTML: $OutputPath" -ForegroundColor Green
Write-Host "[OK] Size: $sizeMb MB"
Write-Host "[OK] SHA-256: $hash"
