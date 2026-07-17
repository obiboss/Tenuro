param(
  [string]$ProductionUrl = "",
  [switch]$IncludeBuild,
  [switch]$IncludeTests,
  [switch]$SkipProjectScripts
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (
  Join-Path $PSScriptRoot "..\.."
)

Set-Location -LiteralPath $projectRoot
[Environment]::CurrentDirectory = $projectRoot

$reportFolder = Join-Path `
  $projectRoot `
  "artifacts\pwa-production"

New-Item `
  -ItemType Directory `
  -Path $reportFolder `
  -Force |
Out-Null

$staticChecker = Join-Path `
  $PSScriptRoot `
  "verify-static.mjs"

$productionChecker = Join-Path `
  $PSScriptRoot `
  "verify-production.mjs"

if (-not (Test-Path -LiteralPath $staticChecker -PathType Leaf)) {
  throw "Static PWA checker not found: $staticChecker"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is not available in this terminal."
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "npm is not available in this terminal."
}

$steps = New-Object System.Collections.Generic.List[object]

function Add-StepResult {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Details
  )

  $steps.Add(
    [pscustomobject]@{
      Name = $Name
      Status = $Status
      Details = $Details
    }
  )
}

function Invoke-CheckedCommand {
  param(
    [string]$StepName,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "Running: $StepName" -ForegroundColor Cyan

  & $Command

  if ($LASTEXITCODE -ne 0) {
    Add-StepResult `
      -Name $StepName `
      -Status "FAILED" `
      -Details "Exit code $LASTEXITCODE"

    throw "$StepName failed with exit code $LASTEXITCODE."
  }

  Add-StepResult `
    -Name $StepName `
    -Status "PASSED" `
    -Details "Completed successfully."
}

Invoke-CheckedCommand `
  -StepName "PWA static production readiness" `
  -Command {
    & node `
      $staticChecker `
      --project $projectRoot `
      --output $reportFolder
  }

$packagePath = Join-Path `
  $projectRoot `
  "package.json"

if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
  throw "package.json was not found."
}

$packageJson = Get-Content `
  -LiteralPath $packagePath `
  -Raw |
ConvertFrom-Json

$scripts = @{}

if ($packageJson.scripts) {
  foreach ($property in $packageJson.scripts.PSObject.Properties) {
    $scripts[$property.Name] = [string]$property.Value
  }
}

function Test-ScriptExists {
  param(
    [string]$ScriptName
  )

  return $scripts.ContainsKey($ScriptName)
}

function Invoke-NpmScriptIfPresent {
  param(
    [string]$ScriptName,
    [string]$StepLabel
  )

  if (-not (Test-ScriptExists -ScriptName $ScriptName)) {
    Add-StepResult `
      -Name $StepLabel `
      -Status "SKIPPED" `
      -Details "No '$ScriptName' script exists in package.json."

    return $false
  }

  Write-Host ""
  Write-Host "Running: $StepLabel" -ForegroundColor Cyan

  & npm.cmd run $ScriptName

  if ($LASTEXITCODE -ne 0) {
    Add-StepResult `
      -Name $StepLabel `
      -Status "FAILED" `
      -Details "Exit code $LASTEXITCODE"

    throw "$StepLabel failed with exit code $LASTEXITCODE."
  }

  Add-StepResult `
    -Name $StepLabel `
    -Status "PASSED" `
    -Details "Completed successfully."

  return $true
}

if (-not $SkipProjectScripts) {
  Invoke-NpmScriptIfPresent `
    -ScriptName "lint" `
    -StepLabel "Existing lint command" |
  Out-Null

  $typeScriptCandidates = @(
    "typecheck",
    "type-check",
    "check-types"
  )

  $typeScriptRun = $false

  foreach ($candidate in $typeScriptCandidates) {
    if (
      Invoke-NpmScriptIfPresent `
        -ScriptName $candidate `
        -StepLabel "Existing TypeScript check ($candidate)"
    ) {
      $typeScriptRun = $true
      break
    }
  }

  if (-not $typeScriptRun) {
    Add-StepResult `
      -Name "Existing TypeScript check" `
      -Status "SKIPPED" `
      -Details "No typecheck, type-check, or check-types script exists."
  }

  if ($IncludeTests) {
    Invoke-NpmScriptIfPresent `
      -ScriptName "test" `
      -StepLabel "Existing test command" |
    Out-Null
  }

  if ($IncludeBuild) {
    Invoke-NpmScriptIfPresent `
      -ScriptName "build" `
      -StepLabel "Existing production build command" |
    Out-Null
  }
}

if ($ProductionUrl) {
  if (-not (Test-Path -LiteralPath $productionChecker -PathType Leaf)) {
    throw "Production PWA checker not found: $productionChecker"
  }

  Invoke-CheckedCommand `
    -StepName "Deployed PWA production verification" `
    -Command {
      & node `
        $productionChecker `
        --url $ProductionUrl `
        --output $reportFolder
    }
} else {
  Add-StepResult `
    -Name "Deployed PWA production verification" `
    -Status "SKIPPED" `
    -Details "No -ProductionUrl value was supplied."
}

$summaryPath = Join-Path `
  $reportFolder `
  "pwa-release-command-summary.json"

$summary = [pscustomobject]@{
  generatedAt = (
    Get-Date
  ).ToUniversalTime().ToString("o")
  projectRoot = [string]$projectRoot
  productionUrl = $ProductionUrl
  includeBuild = [bool]$IncludeBuild
  includeTests = [bool]$IncludeTests
  steps = $steps
}

$summary |
ConvertTo-Json -Depth 6 |
Set-Content `
  -LiteralPath $summaryPath `
  -Encoding UTF8

Write-Host ""
Write-Host "BOPA PWA release checks completed." -ForegroundColor Green
Write-Host ""

$steps |
Format-Table `
  -Property Name, Status, Details `
  -AutoSize

Write-Host ""
Write-Host "Reports: $reportFolder" -ForegroundColor Cyan
