# SourceRating Windows B — dedicated E2E workspace. UNTESTED on a real Windows host (written without access to it).
# Run once as the machine owner in an elevated PowerShell. It never touches the production workspace.
param(
  [string]$Root = 'D:\AgentWorkspaces\sourcerating-e2e',
  [string]$Branch = 'qa/windows-b-e2e-20261114',
  [string]$AgyUser = $env:USERNAME
)
$ErrorActionPreference = 'Stop'
if ($Root -notlike 'D:\AgentWorkspaces\*') { throw 'Root must be under D:\AgentWorkspaces' }
New-Item -ItemType Directory -Force -Path $Root, "$Root\secrets" | Out-Null
if (-not (Test-Path "$Root\repo\.git")) { git clone --branch $Branch https://github.com/Jamescheng2022/sourcerating.git "$Root\repo" }
Push-Location "$Root\repo"; git fetch origin; git checkout $Branch; git pull --ff-only; Pop-Location
Push-Location "$Root\repo\apps\web"; npm ci; Pop-Location
Push-Location "$Root\repo\qa\windows-b"; npm install; Pop-Location

# Pin the judging files and show the root hash; the owner stores it, the Test Director cannot.
$hash = node "$Root\repo\qa\windows-b\runner\pin.cjs"
Write-Host $hash
Write-Host 'Store the QA_INTEGRITY_ROOT_SHA256 value in the owner-held environment (not readable by AGY).'

# Least privilege: AGY may read the harness, write only runs\ and work\, and cannot touch secrets\.
$qa = "$Root\repo\qa\windows-b"
icacls $Root /inheritance:r /grant:r "Administrators:(OI)(CI)F" "${AgyUser}:(OI)(CI)RX" | Out-Null
foreach ($d in 'runs','work') { icacls "$qa\$d" /grant:r "${AgyUser}:(OI)(CI)M" | Out-Null }
foreach ($d in 'profile','acceptance','oracle','lib','runner','tools') { icacls "$qa\$d" /inheritance:r /grant:r "Administrators:(OI)(CI)F" "${AgyUser}:(OI)(CI)RX" | Out-Null }
icacls "$Root\secrets" /inheritance:r /grant:r "Administrators:(OI)(CI)F" | Out-Null
Write-Host "Put synthetic accounts in $Root\secrets\users.json ([{key,email,pw}], keys a1 a2 b1 b2). Never commit it."
Write-Host 'Then add agy\mcp-config.json as the ONLY MCP server for AGY, and paste agy\test-director-prompt.md as its role.'
