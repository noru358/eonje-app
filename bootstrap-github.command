#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
REPO_NAME="${1:-eonje-app}"

if ! command -v git >/dev/null 2>&1; then
  echo "git이 필요합니다."
  exit 1
fi
if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI(gh)가 필요합니다: https://cli.github.com/"
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  gh auth login
fi

if [ ! -d .git ]; then
  git init -b main
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "chore: bootstrap eonje v0.2"
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "origin이 이미 있습니다: $(git remote get-url origin)"
  git push -u origin HEAD
else
  gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
fi

echo "완료: $(git remote get-url origin)"
