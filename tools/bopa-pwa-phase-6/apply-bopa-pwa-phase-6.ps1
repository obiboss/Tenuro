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
  throw "PWA Phase 6 requires the exact Dexie 4.4.4 dependency installed by Phase 2."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is not available in this terminal."
}

$expectedHashes = @{
  "docs\PWA_OFFLINE_SECURITY.md" = "59dd80699d2ec082efdf7efaa3d77e99f9baff43a0e02cd1c05f56ece39851be"
  "public\offline-workspace.html" = "ee6573cfe7202e98bd762932a0ba6986f9d1e6129e8d754f76f6831a06ca7f76"
  "public\offline.html" = "dc66e8fcabce3081ee295c107e402a6fdeaaa30b73ef3cf2ec629ce94a7b8685"
  "public\sw.js" = "f4061086fb46e04428c62cff8ebf8ec96f3b296216a6bc54adc1588e74af3d76"
  "src\app\api\offline\push\route.ts" = "6a7f8fc65fe505e29684e52ca1ffca33085c9cf7d80e389b45cc210cf8256787"
  "src\app\api\offline\read\route.ts" = "c9a332d105abe80af56bd7ea0a062f650d9c56c9d548edc785a9dcd6400e844f"
  "src\app\manifest.ts" = "a25fb222f2eaff924a1079894b80badc6c94405f4cbc9bbecd870e8b8a8f9b87"
  "src\components\pwa\pwa-runtime.tsx" = "21b0c7a45f7a68904faf973b64d1bb56385d4e5e18d5099fe9501986baab527d"
  "src\server\offline\read-snapshot.service.ts" = "53a88cce534c6f781070cdecff9c898cdde3c7bbdea11d6710ae7dd1dc5f854b"
  "supabase\migrations\20260717000000_offline_safe_mutations.sql" = "8582eeec518cccfeb4c794811e1310efef3b2dd207fea80c5c8d3f5f3a41b628"
  "supabase\migrations\20260717010000_offline_sync_hardening.sql" = "54421b5a56cfe87cc9b1a2df98d38d8e09215de853828d533ec592f3060ce356"
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
PWA Phase 6 stopped before changing anything because this reviewed file has changed:
$relativePath

Provide the current file before applying Phase 6.
"@
  }
}

$newFiles = @(
  "docs\PWA_DEVICE_TEST_MATRIX.md"
  "docs\PWA_INSTALLATION_GUIDE.md"
  "docs\PWA_PRODUCTION_RELEASE.md"
  "docs\PWA_ROLLBACK.md"
  "tools\bopa-pwa-production\pwa-check-lib.mjs"
  "tools\bopa-pwa-production\run-release-checks.ps1"
  "tools\bopa-pwa-production\verify-production.mjs"
  "tools\bopa-pwa-production\verify-static.mjs"
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
PWA Phase 6 stopped before changing anything because these new paths already exist:

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

$staticChecker = Join-Path `
  $projectRoot `
  "tools\bopa-pwa-production\verify-static.mjs"
$reportFolder = Join-Path `
  $projectRoot `
  "artifacts\pwa-production"

Write-Host ""
Write-Host "Running the Phase 6 static readiness check..." -ForegroundColor Cyan

& node `
  $staticChecker `
  --project $projectRoot `
  --output $reportFolder

if ($LASTEXITCODE -ne 0) {
  throw "The PWA static readiness check failed. Review the report in artifacts\pwa-production."
}

if (Test-Path -LiteralPath $payloadRoot) {
  Remove-Item `
    -LiteralPath $payloadRoot `
    -Recurse `
    -Force

  Write-Host "Removed installer payload." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "BOPA PWA Phase 6 installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No new npm dependency is required." -ForegroundColor Green
Write-Host "No Supabase migration is required." -ForegroundColor Green
Write-Host "Static readiness report: artifacts\pwa-production" -ForegroundColor Green
Write-Host "Deploy before running the production URL verification." -ForegroundColor Green
