# Forge installer (Windows) - irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex
$Repo = "oomerevren-beep/forge"
$Version = if ($env:FORGE_VERSION) { $env:FORGE_VERSION } else { "0.1.1" }
Write-Host "[forge] installer - $Repo@$Version"

function Show-PathHelp($cmd) {
  Write-Host "[forge] '$cmd' is installed but not on your PATH. Fix in 2 steps:"
  Write-Host "[forge]   1. Find npm's global bin: npm prefix -g  (append \node_modules\.bin is NOT it - use the prefix root)"
  Write-Host "[forge]   2. Add it to PATH: `$env:Path += ';' + (npm prefix -g)` (current shell) or via System Settings (permanent)"
  Write-Host "[forge]      then restart your shell and run: forge doctor"
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
  Write-Host "[forge] installing via npm..."
  npm i -g tryforge
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[forge] npm install failed (see error above). Fix npm first, then rerun this script."
    exit 1
  }
  if (Get-Command forge -ErrorAction SilentlyContinue) {
    Write-Host "[forge] installed via npm - run 'forge doctor' to verify (also 'tryforge')"
    exit 0
  }
  if (Get-Command tryforge -ErrorAction SilentlyContinue) {
    Write-Host "[forge] installed via npm as 'tryforge' - run 'tryforge doctor' to verify"
    Write-Host "[forge] note: the 'forge' alias is not on PATH; 'tryforge' works everywhere."
    exit 0
  }
  Show-PathHelp "forge"
  exit 1
}

$Url = "https://github.com/$Repo/releases/download/v$Version/forge-v$Version-windows-x64.zip"
Write-Host "[forge] npm not found, trying $Url ..."
try {
  $tmp = "$env:TEMP\forge.zip"
  Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing
  if (-not (Test-Path $tmp) -or ((Get-Item $tmp).Length -eq 0)) {
    throw "downloaded asset is missing or empty - the release may not ship windows-x64 yet"
  }
  $dest = "$env:USERPROFILE\.forge\bin"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Expand-Archive -Path $tmp -DestinationPath $dest -Force
  $bin = Join-Path $dest "forge.exe"
  if (-not (Test-Path $bin)) { $bin = Join-Path $dest "forge" }
  if (-not (Test-Path $bin)) {
    throw "extraction succeeded but no forge executable found in $dest"
  }
  Write-Host "[forge] extracted to $dest"
  Write-Host "[forge] REQUIRED: add it to PATH (System Settings > Environment Variables), restart shell, run: forge doctor"
  exit 0
} catch {
  Write-Host "[forge] binary fallback failed: $($_.Exception.Message)"
  Write-Host "[forge] do this instead:"
  Write-Host "[forge]   1. Install Node.js 18+ from https://nodejs.org (npm comes with it)"
  Write-Host "[forge]   2. Restart PowerShell, then run: npm i -g tryforge"
  Write-Host "[forge]   3. Verify with: forge doctor"
  exit 1
}
