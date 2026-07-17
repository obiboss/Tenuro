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

$requiredProjectFiles = @(
  "package.json",
  "tsconfig.json",
  "src\app\globals.css"
)

foreach ($relativePath in $requiredProjectFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Required project file is missing: $relativePath"
  }
}

$protectedNewFiles = @(
  "src\app\manifest.ts",
  "src\app\template.tsx",
  "src\components\pwa\pwa-runtime.tsx",
  "public\sw.js",
  "public\offline.html",
  "public\icons\bopa-192.png",
  "public\icons\bopa-512.png",
  "public\icons\bopa-maskable-512.png",
  "public\apple-touch-icon.png"
)

$conflicts = @(
  $protectedNewFiles |
  Where-Object {
    Test-Path `
      -LiteralPath (Join-Path $projectRoot $_)
  }
)

if ($conflicts.Count -gt 0) {
  $conflictList = $conflicts -join [Environment]::NewLine

  throw @"
PWA Phase 1 stopped before changing any files because these paths already exist:

$conflictList

Provide the existing files before merging this package.
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
Write-Host "BOPA PWA Phase 1 installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No dependency installation is required." -ForegroundColor Green
Write-Host "No Supabase migration is required." -ForegroundColor Green
Write-Host "The service worker registers only in production." -ForegroundColor Green
Write-Host "Deploy to Vercel to test installation and offline fallback." -ForegroundColor Green
