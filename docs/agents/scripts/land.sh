#!/bin/bash
# land.sh <branch> <worktree-name> <message>: push the branch, open its PR (reusing one
# that exists) and turn on GitHub's auto-merge. main merges a PR only when it is up to
# date with main and every required check passes (browser suites included), so two PRs
# that are green alone can never merge into a red main. The auto-update workflow brings
# the oldest auto-merge PR up to date whenever main moves, one at a time, and GitHub merges
# it once its checks pass. This waits for that merge, then removes the worktree and the
# local and remote branch. No local verify: the owner's machine stays free.
b=$1; w=$2; msg=$3; M=${DAYDAZE_MAIN:-$HOME/git/daydaze}; d=$M/.worktrees/$w
# gh finds the repo from the cwd, which another landing of the same PR can delete
export GH_REPO=${GH_REPO:-$(git -C "$M" remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##')}
[ -d "$d" ] || git -C "$M" worktree add -q "$d" "$b"
# Dependencies and ESLint's cache are shared with the main checkout. Keep cache
# creation lazy so a fresh checkout still works when lint has not run there yet.
[ -e "$d/node_modules" ] || ln -s "$M/node_modules" "$d/node_modules"
[ -e "$M/.cache" ] && { [ -e "$d/.cache" ] || ln -s "$M/.cache" "$d/.cache"; }
cd "$d" || exit 1
[ -z "$(git status --porcelain)" ] || { echo "$w DIRTY: $(git status --porcelain | head -3 | tr '\n' ' ')"; exit 1; }
# bots and the auto-update workflow add commits to PR branches: take them first
git pull -q --no-rebase --no-edit origin "$b" 2>/dev/null
git push -q origin "HEAD:refs/heads/$b" 2>&1 | grep -v "^remote:"
pr=$(gh pr list --head "$b" --state open --json number -q '.[0].number')
[ -n "$pr" ] || pr=$(gh pr create --base main --head "$b" --assignee dpologdvinity --title "$(git log -1 --format=%s)" --body "$msg

Landed with \`docs/agents/scripts/land.sh\`." | grep -o '[0-9]*$')
[ -n "$pr" ] || { echo "$w NO-PR for $b"; exit 1; }
gh pr ready "$pr" > /dev/null 2>&1
gh pr merge "$pr" --auto --merge > /dev/null || { echo "$w AUTO-MERGE-REFUSED on PR #$pr"; exit 1; }
echo "$w QUEUED PR #$pr (auto-merge on)"
# a full browser run is ~35 min, and the line is one PR at a time: poll for up to 4 hours
for _ in $(seq 1 240); do
  state=$(gh pr view "$pr" --json state,mergeStateStatus,autoMergeRequest -q '"\(.state) \(.mergeStateStatus) \(.autoMergeRequest != null)"')
  case $state in
    MERGED*) break ;;
    CLOSED*) echo "$w CLOSED PR #$pr"; exit 1 ;;
    *DIRTY*) echo "$w CONFLICT with main on PR #$pr: merge main into $b, push, rerun"; exit 1 ;;
    *false) echo "$w AUTO-MERGE-OFF on PR #$pr (someone turned it off)"; exit 1 ;;
  esac
  failed=$(gh pr checks "$pr" --json name,bucket -q '[.[] | select(.bucket == "fail") | .name] | join(", ")' 2>/dev/null)
  [ -z "$failed" ] || { echo "$w CHECK-FAIL on PR #$pr: $failed (fix, push and rerun)"; exit 1; }
  sleep 60
done
if [ "$(gh pr view "$pr" --json state -q .state)" = MERGED ]; then
  echo "$w MERGED PR #$pr"
  cd "$M" && git worktree remove --force "$d" && git branch -D "$b" > /dev/null
  git push -q origin --delete "$b" 2>&1 | grep -v "^remote:"
else echo "$w TIMEOUT: PR #$pr not merged after 4 hours"; exit 1; fi
