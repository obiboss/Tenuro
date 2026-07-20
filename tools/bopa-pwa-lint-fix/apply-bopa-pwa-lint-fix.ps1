$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\HP\Documents\tenuro"
$payloadRoot = Join-Path $PSScriptRoot "payload"

if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
  throw "Project folder not found: $projectRoot"
}

if (-not (Test-Path -LiteralPath $payloadRoot -PathType Container)) {
  throw "Fix payload folder not found: $payloadRoot"
}

$expectedHashes = @{
  "src\components\pwa\pwa-runtime.tsx" = "21b0c7a45f7a68904faf973b64d1bb56385d4e5e18d5099fe9501986baab527d"
  "src\lib\offline\push-sync.client.ts" = "064956cc5ad331c703a25c6d423a5a8917c226d20fdbb9674469bb8af60d0388"
}

foreach ($relativePath in $expectedHashes.Keys) {
  $currentPath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $currentPath -PathType Leaf)) {
    throw "Required file is missing: $relativePath"
  }

  $currentHash = (
    Get-FileHash `
      -LiteralPath $currentPath `
      -Algorithm SHA256
  ).Hash.ToLowerInvariant()

  if ($currentHash -ne $expectedHashes[$relativePath]) {
    throw @"
The fix stopped before changing anything because this file differs from the reviewed Phase 5 version:
$relativePath

Provide the current full file before applying this fix.
"@
  }
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

  Copy-Item `
    -LiteralPath $payloadFile.FullName `
    -Destination $destination `
    -Force

  Write-Host "Written: $relativePath" -ForegroundColor Green
}

Write-Host ""
Write-Host "BOPA PWA lint fix installed." -ForegroundColor Cyan
Write-Host "Rerun the release check with -IncludeBuild." -ForegroundColor Green
