$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\HP\Documents\tenuro"
$payloadRoot = Join-Path $PSScriptRoot "payload"

if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
  throw "Project folder not found: $projectRoot"
}

if (-not (Test-Path -LiteralPath $payloadRoot -PathType Container)) {
  throw "Package payload folder not found: $payloadRoot"
}

Set-Location -LiteralPath $projectRoot
[Environment]::CurrentDirectory = $projectRoot

$packagePath = Join-Path $projectRoot "package.json"

if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
  throw "package.json was not found."
}

$packageJson = Get-Content `
  -LiteralPath $packagePath `
  -Raw |
ConvertFrom-Json

if ($packageJson.dependencies.dexie -ne "4.4.4") {
  throw "PWA Phase 3 requires the exact Dexie 4.4.4 dependency installed by Phase 2."
}

$expectedHashes = @{
  "src\components\pwa\pwa-runtime.tsx" = "1d2927efe5365d787f0b1af1ad875b8338e24a62c136247bfd49734642d6b21c"
  "public\sw.js" = "d0ca5c91af3d8878ca94c35264172e457cc45a0d1ef18235cbb671189b8609db"
}

foreach ($relativePath in $expectedHashes.Keys) {
  $currentPath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $currentPath -PathType Leaf)) {
    throw "PWA Phase 2 file is missing: $relativePath"
  }

  $currentHash = (
    Get-FileHash `
      -LiteralPath $currentPath `
      -Algorithm SHA256
  ).Hash.ToLowerInvariant()

  if ($currentHash -ne $expectedHashes[$relativePath]) {
    throw @"
PWA Phase 3 stopped before changing anything because this Phase 2 file has changed:
$relativePath

Provide the current file before applying Phase 3.
"@
  }
}

$newFiles = @(
  "public\offline-workspace.html"
  "src\app\api\offline\read\route.ts"
  "src\lib\offline\read-sync.client.ts"
  "src\lib\offline\read-sync.repository.ts"
  "src\lib\offline\read-sync.types.ts"
  "src\server\offline\read-snapshot.service.ts"
)

$conflicts = @(
  $newFiles |
  Where-Object {
    Test-Path `
      -LiteralPath (Join-Path $projectRoot $_)
  }
)

if ($conflicts.Count -gt 0) {
  $conflictList = $conflicts -join [Environment]::NewLine

  throw @"
PWA Phase 3 stopped before changing anything because these new paths already exist:

$conflictList
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

if (Test-Path -LiteralPath $payloadRoot) {
  Remove-Item `
    -LiteralPath $payloadRoot `
    -Recurse `
    -Force

  Write-Host "Removed installer payload." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "BOPA PWA Phase 3 installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No new npm dependency is required." -ForegroundColor Green
Write-Host "No Supabase migration is required." -ForegroundColor Green
Write-Host "Restart the Next.js development server." -ForegroundColor Green
Write-Host "Deploy to Vercel before testing the offline workspace fallback." -ForegroundColor Green
