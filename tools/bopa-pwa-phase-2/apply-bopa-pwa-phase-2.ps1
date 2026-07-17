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

$phaseOneFiles = @{
  "src\components\pwa\pwa-runtime.tsx" = "019602101a2caa94e2888a2fde7b40d8f9bddbe27de13e2b523cd83a1ccfb3b6"
  "public\sw.js" = "b8ef1cfc3913e6125b7fd302c1a963e34c35c2eec97975a09545bdb54c03903c"
}

foreach ($relativePath in $phaseOneFiles.Keys) {
  $currentPath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $currentPath -PathType Leaf)) {
    throw "PWA Phase 1 file is missing: $relativePath"
  }

  $currentHash = (
    Get-FileHash `
      -LiteralPath $currentPath `
      -Algorithm SHA256
  ).Hash.ToLowerInvariant()

  if ($currentHash -ne $phaseOneFiles[$relativePath]) {
    throw @"
PWA Phase 2 stopped before changing anything because this Phase 1 file has changed:
$relativePath

Provide the current file before applying Phase 2.
"@
  }
}

$newFiles = @(
  "src\lib\offline\conflict.repository.ts"
  "src\lib\offline\database.ts"
  "src\lib\offline\draft.repository.ts"
  "src\lib\offline\entity.repository.ts"
  "src\lib\offline\initialize.ts"
  "src\lib\offline\keys.ts"
  "src\lib\offline\meta.repository.ts"
  "src\lib\offline\outbox.repository.ts"
  "src\lib\offline\service-worker-sync.ts"
  "src\lib\offline\session.ts"
  "src\lib\offline\storage-persistence.ts"
  "src\lib\offline\sync-orchestrator.ts"
  "src\lib\offline\sync-status-store.ts"
  "src\lib\offline\types.ts"
  "src\lib\offline\workspace.repository.ts"
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
PWA Phase 2 stopped before changing anything because these new paths already exist:

$conflictList
"@
}

Write-Host "Installing Dexie 4.4.4..." -ForegroundColor Cyan

& npm install dexie@4.4.4 --save-exact

if ($LASTEXITCODE -ne 0) {
  throw "Dexie installation failed with exit code $LASTEXITCODE. No source files were changed."
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
Write-Host "BOPA PWA Phase 2 installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No Supabase migration is required." -ForegroundColor Green
Write-Host "Dexie 4.4.4 was installed as an exact production dependency." -ForegroundColor Green
Write-Host "Restart the Next.js development server." -ForegroundColor Green
