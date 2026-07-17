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
  "src\app\developer\(workspace)\page.tsx",
  "src\app\developer\(workspace)\estates\new\page.tsx",
  "src\components\developer\developer-estate-form.tsx",
  "src\components\layout\developer-shell.tsx"
)

foreach ($relativePath in $requiredFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $absolutePath -PathType Leaf)) {
    throw "Required developer UI file is missing: $relativePath"
  }
}

Set-Location -LiteralPath $projectRoot
[Environment]::CurrentDirectory = $projectRoot

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)

$payloadFiles = @(
  "src\app\developer\(workspace)\page.tsx",
  "src\app\developer\(workspace)\estates\new\page.tsx",
  "src\components\developer\developer-estate-form.tsx",
  "src\components\layout\developer-shell.tsx"
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

  Write-Host "Removed installer source payload." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "BOPA Developer UI correction installed." -ForegroundColor Cyan
Write-Host ""
Write-Host "No Supabase migration is required." -ForegroundColor Green
Write-Host "Restart the Next.js development server if it is already running." -ForegroundColor Green
