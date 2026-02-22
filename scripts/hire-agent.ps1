param (
    [Parameter(Mandatory=$true)]
    [string]$AgentId,
    
    [Parameter(Mandatory=$true)]
    [string]$Role,
    
    [Parameter(Mandatory=$true)]
    [string]$Tasks
)

$workspaceRoot = "D:\Project\openclaw\.openclaw\workspace"
$agentDir = Join-Path $workspaceRoot $AgentId

if (Test-Path $agentDir) {
    Write-Host "Agent $AgentId already exists!" -ForegroundColor Red
    exit
}

Write-Host "Hiring new specialist: $AgentId..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $agentDir -Force | Out-Null

$soulContent = @"
# $AgentId Soul
Role: $Role

## Missions
$Tasks

## Operational Focus
- Maintain isolated context in $agentDir
- Coordinate with other agents when cross-functional help is needed.
"@

Set-Content -Path (Join-Path $agentDir "SOUL.md") -Value $soulContent

Write-Host "Welcome aboard, $AgentId!" -ForegroundColor Green
Write-Host "Workspace initialized at: $agentDir"
Write-Host "The OpenClaw gateway will auto-discover this agent on next refresh."
