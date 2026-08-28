param([string]$RepoName = "eonje-app")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "git이 필요합니다." }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "GitHub CLI(gh)가 필요합니다: https://cli.github.com/" }

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) { gh auth login }

if (-not (Test-Path ".git")) { git init -b main }
git add .
$staged = git diff --cached --name-only
if ($staged) { git commit -m "chore: bootstrap eonje v0.2" }

$origin = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0 -and $origin) {
  Write-Host "origin이 이미 있습니다: $origin"
  git push -u origin HEAD
} else {
  gh repo create $RepoName --private --source=. --remote=origin --push
}

Write-Host "완료: $(git remote get-url origin)"
