<#
.SYNOPSIS
    Registers a daily Windows Task Scheduler job that runs the ClaudeOS Notion sync script.

.DESCRIPTION
    This script registers (or updates) a Windows Task Scheduler task named "ClaudeOS Notion Sync"
    that runs notion-sync.mjs every day at 06:00 local time.

    The scheduled task invokes the same notion-sync.mjs entry point as the manual Refresh button
    inside the Obsidian plugin, ensuring the dashboard snapshots stay fresh without needing
    Obsidian open (NOTION-07).

    The Notion API token is NOT embedded here. The task runs as the current user, who must have
    the NOTION_TOKEN environment variable set (or a %USERPROFILE%\.claudeos\notion.env file that
    notion-sync.mjs reads). See notion-sync.mjs for token-loading details.

.PARAMETER NodePath
    Full path to the node.exe executable. Defaults to the nvm-managed Node 20 binary.
    Override if your Node installation lives elsewhere:
      -NodePath "C:\Program Files\nodejs\node.exe"

.PARAMETER ScriptPath
    Full path to notion-sync.mjs. Defaults to notion-sync.mjs in the same folder as this script.
    Override if you have moved scripts to a different location:
      -ScriptPath "C:\path\to\notion-sync.mjs"

.PARAMETER TaskName
    Name of the Windows Task Scheduler task. Defaults to "ClaudeOS Notion Sync".
    Change this if you need multiple registrations or a custom name.

.EXAMPLE
    # Run from an elevated PowerShell in the repo root:
    powershell -ExecutionPolicy Bypass -File scripts\schedule-notion-sync.ps1

.EXAMPLE
    # With explicit paths:
    powershell -ExecutionPolicy Bypass -File scripts\schedule-notion-sync.ps1 `
        -NodePath "C:\Program Files\nodejs\node.exe" `
        -ScriptPath (Resolve-Path scripts\notion-sync.mjs).Path

.NOTES
    - Run from an elevated (Administrator) PowerShell session.
    - Re-running this script updates the existing task rather than creating a duplicate (-Force).
    - The task runs as the current user, so the user's environment variables are available.
    - To remove the task: Unregister-ScheduledTask -TaskName "ClaudeOS Notion Sync" -Confirm:$false
#>

param(
    [string]$NodePath = "C:\Users\scull\AppData\Local\nvm\v20.20.2\node.exe",
    [string]$ScriptPath,
    [string]$TaskName = "ClaudeOS Notion Sync"
)

# ── Resolve ScriptPath default ────────────────────────────────────────────────

if (-not $ScriptPath) {
    $defaultScript = Join-Path $PSScriptRoot "notion-sync.mjs"
    if (Test-Path $defaultScript) {
        $ScriptPath = $defaultScript
    } else {
        Write-Error "notion-sync.mjs not found at '$defaultScript'. Pass -ScriptPath explicitly."
        exit 1
    }
}

# ── Validate inputs ───────────────────────────────────────────────────────────

if (-not (Test-Path $NodePath)) {
    Write-Error "Node executable not found at '$NodePath'. Pass -NodePath with the correct path."
    exit 1
}

if (-not (Test-Path $ScriptPath)) {
    Write-Error "Sync script not found at '$ScriptPath'. Pass -ScriptPath with the correct path."
    exit 1
}

# ── Build Task Scheduler components ──────────────────────────────────────────

# Working directory = folder that contains notion-sync.mjs (so relative imports resolve)
$workingDir = Split-Path -Parent (Resolve-Path $ScriptPath)

# Argument: quote the script path to handle spaces in the path
$argument = "`"$ScriptPath`""

$action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument $argument `
    -WorkingDirectory $workingDir

# Daily trigger at 06:00 local time (D-15)
$trigger = New-ScheduledTaskTrigger -Daily -At 6:00am

# Register (or update) the task — -Force overwrites if it already exists
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Description "Runs the ClaudeOS Notion sync daily at 06:00 to keep dashboard snapshots fresh. Invokes the same notion-sync.mjs entry point as the manual Refresh button in Obsidian." `
    -Force | Out-Null

# ── Confirmation ──────────────────────────────────────────────────────────────

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    $taskInfo = $task | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue
    $nextRun = if ($taskInfo -and $taskInfo.NextRunTime) { $taskInfo.NextRunTime.ToString("yyyy-MM-dd HH:mm") } else { "unknown" }
    Write-Host "Registered task: '$TaskName' — next run: $nextRun"
    Write-Host ""
    Write-Host "Note: The task runs as the current user ($env:USERNAME)."
    Write-Host "Ensure NOTION_TOKEN is set in your user environment, or that"
    Write-Host "%USERPROFILE%\.claudeos\notion.env is readable by notion-sync.mjs."
    Write-Host "No token is embedded in this script (NOTION-02)."
} else {
    Write-Error "Task registration may have failed — task '$TaskName' not found after registration."
    exit 1
}
