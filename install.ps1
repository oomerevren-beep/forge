# Forge installer (Windows) — irm https://raw.githubusercontent.com/oomerevren-beep/forge/main/install.ps1 | iex
$Repo = "oomerevren-beep/forge"
$Version = if ($env:FORGE_VERSION) { $env:FORGE_VERSION } else { "0.1.1" }
Write-Host "[forge] installer — $Repo@$Version"

if (Get-Command npm -ErrorAction SilentlyContinue) {
  Write-Host "[forge] installing via npm..."
  npm i -g tryforge
  Write-Host "[forge] ✓ installed via npm — run 'forge doctor' to verify (also 'tryforge')"
  exit 0
}

$Url = "https://github.com/$Repo/releases/download/v$Version/forge-v$Version-windows-x64.zip"
Write-Host "[forge] npm not found, trying $Url ..."
try {
  $tmp = "$env:TEMP\forge.zip"
  Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing
  $dest = "$env:USERPROFILE\.forge\bin"
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Expand-Archive -Path $tmp -DestinationPath $dest -Force
  Write-Host "[forge] ✓ extracted to $dest — add to PATH"
  exit 0
} catch {
  Write-Host "[forge] npm not found — please install Node.js 18+ from https://nodejs.org"
  Write-Host "[forge] then rerun: npm i -g tryforge"
  exit 1
}
