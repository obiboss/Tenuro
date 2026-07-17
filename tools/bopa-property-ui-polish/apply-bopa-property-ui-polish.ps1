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
  "src\app\manager\properties\[propertyId]\page.tsx",
  "src\app\manager\properties\[propertyId]\settings\page.tsx",
  "src\components\manager\manager-property-service-charge-settings.tsx",
  "src\components\manager\manager-property-tenant-requirements.tsx",
  "src\components\manager\manager-property-maintenance-activity.tsx",
  "src\components\manager\manager-unit-list.tsx",
  "src\components\ui\currency-input.tsx"
)

foreach ($relativePath in $requiredFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Required project file is missing: $relativePath"
  }
}

Set-Location -LiteralPath $projectRoot
[Environment]::CurrentDirectory = $projectRoot

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)

$payloadFiles = @(
  "src\app\manager\properties\[propertyId]\page.tsx",
  "src\app\manager\properties\[propertyId]\settings\page.tsx",
  "src\components\manager\manager-property-service-charge-settings.tsx",
  "src\components\manager\manager-property-tenant-requirements.tsx",
  "src\components\manager\manager-property-maintenance-activity.tsx",
  "src\components\manager\manager-unit-list.tsx",
  "src\components\ui\currency-input.tsx"
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

if (Test-Path -LiteralPath $payloadRoot) {
  Remove-Item `
    -LiteralPath $payloadRoot `
    -Recurse `
    -Force

  Write-Host "Removed UI polish installer payload." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "BOPA property UI polish installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No Supabase migration is required." -ForegroundColor Green
Write-Host "Restart the Next.js development server if it is already running." -ForegroundColor Green
