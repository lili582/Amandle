#!/usr/bin/env bash
# Pushes the v0.1.0 fix (curated artists, Israel listener estimate, Spotify
# pictures) on its own branch and opens a PR. You merge the PR yourself.
#
# Run from Git Bash in the Amanle folder:
#   bash push-fix.sh
set -euo pipefail

BRANCH="fix/curated-artists-and-pictures"
VERSION="v0.1.0"
TITLE="Curated artists, Israel listener estimate, Spotify pictures ($VERSION)"

cd "$(dirname "$0")"

die() { echo "ERROR: $*" >&2; exit 1; }

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not a git repository"

# Start from an up-to-date main (or keep using the branch if it already exists).
current=$(git rev-parse --abbrev-ref HEAD)
if [ "$current" != "$BRANCH" ]; then
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git checkout "$BRANCH"
  else
    [ "$current" = "main" ] || die "you are on '$current'. Switch to main first: git checkout main"
    git pull --ff-only origin main || die "could not update main (local changes conflict?)"
    git checkout -b "$BRANCH"
  fi
fi

echo "== Running tests and typecheck =="
npm test
npm run typecheck

echo "== Committing =="
git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git status --short
  git commit -m "$TITLE" -m "- Hand-checked artists always in the pool (src/lib/curatedArtists.ts): איפה הילד, מיכאל סוויסה, אופק אדנק, בן צור, ששון איפרם שאולוב, מור, טונה and more
- Listeners in Israel = total x Israel's share of top cities (top-5 sum undercounted)
- Pictures from each artist's Spotify profile; fixes סטטיק's wrong photo
- DATA_SCHEMA_VERSION v12, enrichment cache enrich:v3
- Fix date-dependent storage test
- CHANGELOG.md, version 0.1.0"
fi

echo "== Pushing =="
git push -u origin "$BRANCH"

echo "== Pull request =="
remote=$(git remote get-url origin)
repo=$(echo "$remote" | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if gh pr view "$BRANCH" >/dev/null 2>&1; then
    echo "PR already open:"; gh pr view "$BRANCH" --web || true
  else
    gh pr create --base main --head "$BRANCH" --title "$TITLE" \
      --body "See CHANGELOG.md ($VERSION) and the 2026-11-02 entry in DECISIONS.md." \
      && gh pr view "$BRANCH" --web || true
  fi
else
  echo "GitHub CLI not available or not logged in. Open the PR here:"
  echo "  https://github.com/$repo/compare/main...$BRANCH?expand=1"
fi

cat <<EOF

Done. After you merge the PR on GitHub:
  git checkout main && git pull
  git tag $VERSION && git push origin $VERSION
  git branch -d $BRANCH && git push origin --delete $BRANCH
  deploy-vercel.bat
EOF
