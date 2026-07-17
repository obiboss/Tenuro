$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\HP\Documents\tenuro"
$payloadRoot = Join-Path $PSScriptRoot "payload"

if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
  throw "Project folder not found: $projectRoot"
}

if (-not (Test-Path -LiteralPath $payloadRoot -PathType Container)) {
  throw "Package payload folder not found: $payloadRoot"
}

$requiredFiles = @(
  "src\server\services\manager-statement-documents.service.tsx",
  "src\server\repositories\manager-statement-documents.repository.ts",
  "src\components\manager\manager-report-document-history.tsx"
)

foreach ($relativePath in $requiredFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Required report file is missing: $relativePath"
  }
}

Set-Location -LiteralPath $projectRoot
[Environment]::CurrentDirectory = $projectRoot

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)

$payloadFiles = @(
  "supabase\migrations\20260716040000_manager_document_share_links.sql",
  "src\server\security\manager-document-share-token.ts",
  "src\server\validators\manager-document-share.schema.ts",
  "src\server\repositories\manager-document-share-links.repository.ts",
  "src\server\services\manager-public-statement-document.service.ts",
  "src\server\services\manager-statement-documents.service.tsx",
  "src\app\m\report\[token]\route.ts",
  "src\components\manager\manager-report-document-history.tsx"
)

foreach ($relativePath in $payloadFiles) {
  $source = Join-Path $payloadRoot $relativePath
  $destination = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Package file missing: $source"
  }

  [System.IO.Directory]::CreateDirectory(
    (Split-Path -Parent $destination)
  ) | Out-Null

  $content = [System.IO.File]::ReadAllText($source)

  [System.IO.File]::WriteAllText(
    $destination,
    $content,
    $utf8WithoutBom
  )

  Write-Host "Written: $relativePath" -ForegroundColor Green
}

$oldInstallerFolders = Get-ChildItem `
  -LiteralPath (Join-Path $projectRoot "tools") `
  -Directory `
  -Filter "phase-3-*" `
  -ErrorAction SilentlyContinue

foreach ($folder in $oldInstallerFolders) {
  Remove-Item `
    -LiteralPath $folder.FullName `
    -Recurse `
    -Force

  Write-Host "Removed old installer folder: $($folder.FullName)" -ForegroundColor Yellow
}

if (Test-Path -LiteralPath $payloadRoot) {
  Remove-Item `
    -LiteralPath $payloadRoot `
    -Recurse `
    -Force

  Write-Host "Removed Phase 4.1 installer payload." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Phase 4.1 secure report sharing installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "Required database step:" -ForegroundColor Yellow
Write-Host "Run this migration in Supabase SQL Editor with RLS enabled:" -ForegroundColor Yellow
Write-Host "supabase/migrations/20260716040000_manager_document_share_links.sql" -ForegroundColor Yellow
