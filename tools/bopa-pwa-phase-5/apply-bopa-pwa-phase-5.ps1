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
  throw "PWA Phase 5 requires the exact Dexie 4.4.4 dependency installed by Phase 2."
}

$expectedHashes = @{
  "public\offline-workspace.html" = "949c169ff5f123e8f355f0d7462fb7bda9eaff8678ab8544dca6ad9cf664cd03"
  "public\offline-write.css" = "5a93b43d6c40dc1a9fb7ae1659d8ed91d84c621411f26758ddfbc891aaf2d71b"
  "public\offline-write.js" = "d343e5aff54b45b89b4e6c3a762e3826a4c813a13ccb4b8d9f6953b976ad79b7"
  "public\sw.js" = "2eec79fe45740c72342b0a09cc2887346f778bf6e708d7b900a58cd556d608cc"
  "src\components\pwa\pwa-runtime.tsx" = "ee0589de68771e4544ce5e04138a01942e7fe0e8b9d6c8384f2340fdca144a17"
  "src\lib\offline\database.ts" = "65b8a6365cff993001c1cbda8b237b5c61501ce8ee32140f058773a255cae9f6"
  "src\lib\offline\initialize.ts" = "6e95f0868e8c4c9db504385491651e2cd9768c4317efffb8f02fca1830d639af"
  "src\lib\offline\outbox.repository.ts" = "0aec2d15455eca191a1de3eb9b025cbe6e0ed28eef517757579c881cbe8c577d"
  "src\lib\offline\push-sync.client.ts" = "32b71d47232aae7c5452a388f97487fdc22dc8e9c6d1e376772641034faa1152"
  "src\lib\offline\read-sync.client.ts" = "66aa67f22b1d9d163a3093228c9b66cea8d65d83244e9c67b0b1340d10732839"
  "src\lib\offline\read-sync.repository.ts" = "8d4a47dc24dacc944b320a61498580bcade2a489cad1921c535bf46cada0fd7b"
  "src\lib\offline\session.ts" = "0ecb248a85c877b0dddf2fb461a09d7fd7a1f5b9c21effbc4a4a28256f26dfd7"
  "src\lib\offline\sync-orchestrator.ts" = "79c26b52e9be6514d92e36c86303553935e36bbcf7e0c25b8595588d95f4727a"
  "src\lib\offline\sync-status-store.ts" = "ffe4e85c031f1333e243f8f52a8dd1285943d8413956ce9f89e31441f4fdb5c0"
  "src\lib\offline\types.ts" = "9545c6e96f18002605fa8ecfe47b0275f041d67691e06130a608995e1dc0d78c"
  "src\server\offline\safe-mutation.service.ts" = "1a6709357205621e1997c2bdb62bd1b305986e2acbda00800e2b358504b5020a"
}

foreach ($relativePath in $expectedHashes.Keys) {
  $currentPath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $currentPath -PathType Leaf)) {
    throw "Required PWA file is missing: $relativePath"
  }

  $currentHash = (
    Get-FileHash `
      -LiteralPath $currentPath `
      -Algorithm SHA256
  ).Hash.ToLowerInvariant()

  if ($currentHash -ne $expectedHashes[$relativePath]) {
    throw @"
PWA Phase 5 stopped before changing anything because this reviewed file has changed:
$relativePath

Provide the current file before applying Phase 5.
"@
  }
}

$newFiles = @(
  "docs\PWA_OFFLINE_SECURITY.md"
  "src\lib\offline\cleanup.ts"
  "src\lib\offline\coordination.ts"
  "src\lib\offline\health-store.ts"
  "src\lib\offline\sync-lock.ts"
  "supabase\migrations\20260717010000_offline_sync_hardening.sql"
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
PWA Phase 5 stopped before changing anything because these new paths already exist:

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
Write-Host "BOPA PWA Phase 5 installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No new npm dependency is required." -ForegroundColor Green
Write-Host "Run the Supabase migration before deployment:" -ForegroundColor Yellow
Write-Host "supabase\migrations\20260717010000_offline_sync_hardening.sql" -ForegroundColor Yellow
Write-Host "Restart the Next.js development server after the migration." -ForegroundColor Green
