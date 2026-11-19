#!/bin/bash
# land.sh <branch> <worktree-name> <message>: push the branch, open its PR (reusing one
# that exists) and merge it once it is safe. main's branch protection requires a PR to be
# up to date with main and green on the fast checks (setup, lint, test, build), so two PRs
# that are green alone can never merge into a red main. The slow browser suites must pass
# once on the PR; after that, catching up with main only re-runs the fast checks. Removes
# the worktree and branches after the merge. No local verify: the owner's machine stays free.
b=$1; w=$2; msg=$3; M=${DAYDAZE_MAIN:-$HOME/git/daydaze}; d=$M/.worktrees/$w
FAST="setup lint test build"; BROWSER="browser (1)|browser (2)|browser (3)|browser (4)|minigames"
[ -d "$d" ] || { git -C "$M" worktree add -q "$d" "$b" && ln -s "$M/node_modules" "$d/node_modules"; }
cd "$d" || exit 1
[ -z "$(git status --porcelain)" ] || { echo "$w DIRTY: $(git status --porcelain | head -3 | tr '\n' ' ')"; exit 1; }
git pull -q --no-rebase origin "$b" 2>/dev/null
git push -q origin "HEAD:refs/heads/$b" 2>&1 | grep -v "^remote:"
pr=$(gh pr list --head "$b" --state open --json number -q '.[0].number')
[ -n "$pr" ] || pr=$(gh pr create --base main --head "$b" --title "$(git log -1 --format=%s)" --body "$msg

Landed with \`docs/agents/scripts/land.sh\`." | grep -o '[0-9]*$')
[ -n "$pr" ] || { echo "$w NO-PR for $b"; exit 1; }
gh pr ready "$pr" > /dev/null 2>&1
# bucket of each named check on the PR's head: pass, fail, pending, skipping or cancel
bucket() { gh pr checks "$pr" --json name,bucket -q ".[] | select(.name == \"$1\") | .bucket" 2>/dev/null | head -1; }
browser_ok=""
# the browser suites take ~35 min on SwiftShader; poll for up to 3 hours
for _ in $(seq 1 180); do
  state=$(gh pr view "$pr" --json state,mergeStateStatus -q '"\(.state) \(.mergeStateStatus)"')
  case $state in
    MERGED*) break ;;
    CLOSED*) echo "$w CLOSED PR #$pr"; exit 1 ;;
    *DIRTY) echo "$w CONFLICT with main on PR #$pr: merge main into $b and rerun"; exit 1 ;;
  esac
  if [ -z "$browser_ok" ]; then
    b_all=$(gh pr checks "$pr" --json name,bucket -q ".[] | select(.name | test(\"^($BROWSER)\$\")) | .bucket" 2>/dev/null)
    echo "$b_all" | grep -qE "fail|cancel" && { echo "$w BROWSER-FAIL on PR #$pr: gh pr checks $pr"; exit 1; }
    [ "$(echo "$b_all" | grep -c pass)" -ge 5 ] && browser_ok=1
  fi
  fast=""; for c in $FAST; do fast="$fast $(bucket "$c")"; done
  echo "$fast" | grep -q fail && { echo "$w CHECK-FAIL on PR #$pr:$fast (setup lint test build)"; exit 1; }
  if [ "${state#* }" = BEHIND ]; then
    # main moved: merge it in; only the fast checks must pass again
    gh pr update-branch "$pr" > /dev/null 2>&1
  elif [ -n "$browser_ok" ] && [ "$fast" = " pass pass pass pass" ]; then
    gh pr merge "$pr" --merge > /dev/null 2>&1
  fi
  sleep 60
done
if [ "$(gh pr view "$pr" --json state -q .state)" = MERGED ]; then
  echo "$w MERGED PR #$pr"
  cd "$M" && git worktree remove --force "$d" && git branch -D "$b" > /dev/null
  git push -q origin --delete "$b" 2>&1 | grep -v "^remote:"
else echo "$w TIMEOUT: PR #$pr not merged after 3 hours"; exit 1; fi
