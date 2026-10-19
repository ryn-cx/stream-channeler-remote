param(
    [ValidateSet("release", "debug")]
    [string]$Variant = "release"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Push-Location $root
    npm install
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { exit $code }
}

if (-not $env:ANDROID_HOME -and -not (Test-Path "local.properties")) {
    $sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (-not (Test-Path $sdk)) {
        Write-Error "Android SDK not found. Set ANDROID_HOME or install the SDK to $sdk."
    }
    $env:ANDROID_HOME = $sdk
}

$task = if ($Variant -eq "debug") { "assembleDebug" } else { "assembleRelease" }
& .\gradlew.bat $task
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Get-ChildItem "build\outputs\apk\$Variant\*.apk" | ForEach-Object { $_.FullName }
