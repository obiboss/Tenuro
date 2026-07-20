$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\HP\Documents\tenuro"
$payloadRoot = Join-Path $PSScriptRoot "payload"
$newComponentRelativePath = `
  "src\components\platform-admin\admin-free-tool-usage.tsx"
$newComponentPath = Join-Path `
  $projectRoot `
  $newComponentRelativePath

function Get-NormalizedSha256 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $content = [System.IO.File]::ReadAllText($Path)
  $normalized = $content.
    Replace("`r`n", "`n").
    Replace("`r", "`n").
    TrimEnd() + "`n"

  $encoding = [System.Text.UTF8Encoding]::new($false)
  $bytes = $encoding.GetBytes($normalized)
  $sha256 = [System.Security.Cryptography.SHA256]::Create()

  try {
    return (
      [System.BitConverter]::ToString(
        $sha256.ComputeHash($bytes)
      )
    ).Replace("-", "").ToLowerInvariant()
  }
  finally {
    $sha256.Dispose()
  }
}

if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
  throw "Project folder not found: $projectRoot"
}

if (-not (Test-Path -LiteralPath $payloadRoot -PathType Container)) {
  throw "Package payload not found: $payloadRoot"
}

$expectedHashes = @{
  "src\app\(platform-admin)\admin\page.tsx" = "cc71e47be21153e9d9ed0a86da377082894f7caff5ad8fde1be26cbe2b1114c7"
  "src\server\repositories\platform-admin-dashboard.repository.ts" = "1f8a00bcd8f645953440c48b9162150d21c6a00e032bd8f654560bb7d83d7a4b"
  "src\server\services\platform-admin-dashboard.service.ts" = "31dfca0f122c493a02b0e8faf6d5b17770307805cbb380c587a67c8d47583993"
}

foreach ($relativePath in $expectedHashes.Keys) {
  $currentPath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $currentPath -PathType Leaf)) {
    throw "Required project file is missing: $relativePath"
  }

  $currentHash = Get-NormalizedSha256 -Path $currentPath

  if ($currentHash -ne $expectedHashes[$relativePath]) {
    throw @"
Installation stopped before changing anything because this file has changed since the latest review:
$relativePath

Provide the current full file before applying this package.
"@
  }
}

if (Test-Path -LiteralPath $newComponentPath -PathType Leaf) {
  throw @"
Installation stopped before changing anything because this file already exists:
$newComponentRelativePath
"@
}

$backupRoot = Join-Path `
  ([System.IO.Path]::GetTempPath()) `
  ("bopa-platform-admin-free-tool-usage-" + [guid]::NewGuid())

New-Item `
  -ItemType Directory `
  -Path $backupRoot `
  -Force |
Out-Null

$locationChanged = $false

try {
  foreach ($relativePath in $expectedHashes.Keys) {
    $source = Join-Path $projectRoot $relativePath
    $backup = Join-Path $backupRoot $relativePath
    $backupFolder = Split-Path -Parent $backup

    New-Item `
      -ItemType Directory `
      -Path $backupFolder `
      -Force |
    Out-Null

    Copy-Item `
      -LiteralPath $source `
      -Destination $backup `
      -Force
  }

  $payloadFiles = Get-ChildItem `
    -LiteralPath $payloadRoot `
    -Recurse `
    -File

  foreach ($payloadFile in $payloadFiles) {
    $relativePath = $payloadFile.FullName.Substring(
      $payloadRoot.Length + 1
    )
    $destination = Join-Path $projectRoot $relativePath
    $destinationFolder = Split-Path -Parent $destination

    New-Item `
      -ItemType Directory `
      -Path $destinationFolder `
      -Force |
    Out-Null

    Copy-Item `
      -LiteralPath $payloadFile.FullName `
      -Destination $destination `
      -Force

    Write-Host "Written: $relativePath" -ForegroundColor Green
  }

  Push-Location $projectRoot
  $locationChanged = $true

  & npm run lint

  if ($LASTEXITCODE -ne 0) {
    throw "Lint validation failed with exit code $LASTEXITCODE."
  }

  Write-Host ""
  Write-Host `
    "Platform-admin free tool usage installed successfully." `
    -ForegroundColor Cyan
}
catch {
  if ($locationChanged) {
    Pop-Location
    $locationChanged = $false
  }

  foreach ($relativePath in $expectedHashes.Keys) {
    $backup = Join-Path $backupRoot $relativePath
    $destination = Join-Path $projectRoot $relativePath

    if (Test-Path -LiteralPath $backup -PathType Leaf) {
      Copy-Item `
        -LiteralPath $backup `
        -Destination $destination `
        -Force
    }
  }

  Remove-Item `
    -LiteralPath $newComponentPath `
    -Force `
    -ErrorAction SilentlyContinue

  throw
}
finally {
  if ($locationChanged) {
    Pop-Location
  }

  Remove-Item `
    -LiteralPath $backupRoot `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue
}
