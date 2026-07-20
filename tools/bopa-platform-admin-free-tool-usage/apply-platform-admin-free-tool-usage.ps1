$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\HP\Documents\tenuro"
$payloadRoot = Join-Path $PSScriptRoot "payload"
$newComponentPath = Join-Path `
  $projectRoot `
  "src\components\platform-admin\admin-free-tool-usage.tsx"

if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
  throw "Project folder not found: $projectRoot"
}

if (-not (Test-Path -LiteralPath $payloadRoot -PathType Container)) {
  throw "Package payload not found: $payloadRoot"
}

$expectedHashes = @{
  "src\app\(platform-admin)\admin\page.tsx" = "e68ab79f404ce31335a2d661ff064882c1e959dd8078e7b1afad598b37c4a119"
  "src\server\repositories\platform-admin-dashboard.repository.ts" = "8cb6e75ff697954967e4485ddb83377255985719fa7d8ca0bc1306b8862190e9"
  "src\server\services\platform-admin-dashboard.service.ts" = "d3ef5c4ac409c20d3783cb8a5170e84cf148d74ddad61f5013a91f3ddc764593"
}

foreach ($relativePath in $expectedHashes.Keys) {
  $currentPath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $currentPath -PathType Leaf)) {
    throw "Required project file is missing: $relativePath"
  }

  $currentHash = (
    Get-FileHash `
      -LiteralPath $currentPath `
      -Algorithm SHA256
  ).Hash.ToLowerInvariant()

  if ($currentHash -ne $expectedHashes[$relativePath]) {
    throw @"
Installation stopped before changing anything because this file differs from the reviewed source:
$relativePath

Provide the current full file before applying this package.
"@
  }
}

if (Test-Path -LiteralPath $newComponentPath -PathType Leaf) {
  throw @"
Installation stopped before changing anything because this new file already exists:
src\components\platform-admin\admin-free-tool-usage.tsx
"@
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

  if (-not (Test-Path -LiteralPath $destinationFolder)) {
    New-Item `
      -ItemType Directory `
      -Path $destinationFolder `
      -Force |
    Out-Null
  }

  Copy-Item `
    -LiteralPath $payloadFile.FullName `
    -Destination $destination `
    -Force

  Write-Host "Written: $relativePath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Platform-admin free tool usage installed." -ForegroundColor Cyan
Write-Host "Run npm run lint from the project root." -ForegroundColor Green
