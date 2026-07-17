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
  throw "PWA Phase 4 requires the exact Dexie 4.4.4 dependency installed by Phase 2."
}

$expectedHashes = @{
  "public\offline-workspace.html" = "1460974d4fb3da6662e5f34e2c7e0c79681801f74ba8e89743f60a0fa14954a2"
  "public\sw.js" = "af0a82b911d09b63a61239165db5f78d6af320e638cd9bd9dded2fd40a78b8c0"
  "src\components\pwa\pwa-runtime.tsx" = "7666960f9257ca1bfbc67fa5aa20d0127e0e03234a426c692689457678bcab97"
  "src\lib\offline\conflict.repository.ts" = "0c8924605747230412aea9724c2283bb04fc0124fbd0da13859aa452798255e6"
  "src\lib\offline\outbox.repository.ts" = "9b0042a8da086568822ccb3d2b737d3b60037954b7116c6e45b567cddd03579f"
  "src\lib\offline\types.ts" = "85440a4087cdf91c525090c220b2fec75b53179d8e435e859b9599a5a2be595d"
  "src\server\offline\read-snapshot.service.ts" = "b475a1d8ffcd7cba3340309910eb0845a66cde925bf37524b74795e41c2cd6f9"
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
PWA Phase 4 stopped before changing anything because this reviewed file has changed:
$relativePath

Provide the current file before applying Phase 4.
"@
  }
}

$newFiles = @(
  "public\offline-write.css"
  "public\offline-write.js"
  "src\app\api\offline\push\route.ts"
  "src\lib\offline\push-sync.client.ts"
  "src\lib\offline\safe-mutation.types.ts"
  "src\server\offline\safe-mutation.service.ts"
  "src\server\validators\offline-safe-mutation.schema.ts"
  "supabase\migrations\20260717000000_offline_safe_mutations.sql"
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
PWA Phase 4 stopped before changing anything because these new paths already exist:

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
Write-Host "BOPA PWA Phase 4 installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No new npm dependency is required." -ForegroundColor Green
Write-Host "Run the Supabase migration before deployment:" -ForegroundColor Yellow
Write-Host "supabase\migrations\20260717000000_offline_safe_mutations.sql" -ForegroundColor Yellow
Write-Host "Restart the Next.js development server after the migration." -ForegroundColor Green
