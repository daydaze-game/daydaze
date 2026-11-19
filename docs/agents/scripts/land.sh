#!/bin/bash
# land.sh <branch> <worktree-name> <message>: push the branch, open its PR (reusing one
# that exists) and put it in GitHub's merge queue. The queue merges it once the PR's
# checks are green and ci.yml passes on it combined with main and every PR ahead of it,
# so two green PRs can never merge into a red main. Waits for the merge, then removes
# the worktree and branches. No local verify, so the owner's machine stays free.
b=$1; w=$2; msg=$3; M=${DAYDAZE_MAIN:-$HOME/git/daydaze}; d=$M/.worktrees/$w
[ -d "$d" ] || { git -C "$M" worktree add -q "$d" "$b" && ln -s "$M/node_modules" "$d/node_modules"; }
cd "$d" || exit 1
[ -z "$(git status --porcelain)" ] || { echo "$w DIRTY: $(git status --porcelain | head -3 | tr '\n' ' ')"; exit 1; }
# GitHub adds merge commits from main to PR branches: pull them first or the push is rejected
if git ls-remote --exit-code --heads origin "$b" > /dev/null 2>&1; then
  git pull -q --no-rebase origin "$b" > "/tmp/land-$w-pull.log" 2>&1 || { echo "$w PULL-FAILED: $(head -2 "/tmp/land-$w-pull.log" | tr '\n' ' ')"; exit 1; }
fi
# a conflict with main has to be solved here; the queue cannot merge a conflicted PR
git fetch -q origin main
if ! git rebase origin/main > "/tmp/land-$w-rebase.log" 2>&1; then git rebase --abort; echo "$w CONFLICT $(grep -o 'Merge conflict in .*' "/tmp/land-$w-rebase.log" | tr '\n' ' ')"; exit 1; fi
git push -q --force-with-lease origin "HEAD:refs/heads/$b" 2>&1 | grep -v "^remote:"
pr=$(gh pr list --head "$b" --state open --json number -q '.[0].number')
[ -n "$pr" ] || pr=$(gh pr create --base main --head "$b" --title "$(git log -1 --format=%s)" --body "$msg

Landed with \`docs/agents/scripts/land.sh\`." | grep -o '[0-9]*$')
[ -n "$pr" ] || { echo "$w NO-PR for $b"; exit 1; }
gh pr ready "$pr" > /dev/null 2>&1
# --auto: join the queue as soon as the PR's own checks (browser suites included) pass
gh pr merge "$pr" --auto > /dev/null || { echo "$w QUEUE-REFUSED PR #$pr"; exit 1; }
echo "$w QUEUED PR #$pr"
# the PR checks take ~35 min (browser suites on SwiftShader); the queue run ~5 more
state=""; for _ in $(seq 1 120); do
  state=$(gh pr view "$pr" --json state,autoMergeRequest -q 'if .state == "OPEN" and .autoMergeRequest == null then "DROPPED" else .state end')
  [ "$state" = OPEN ] || break; sleep 60
done
case $state in
  MERGED)
    echo "$w MERGED PR #$pr"
    cd "$M" && git worktree remove --force "$d" && git branch -D "$b" > /dev/null
    git push -q origin --delete "$b" 2>&1 | grep -v "^remote:" ;;
  DROPPED) echo "$w DROPPED from the queue (a check failed): gh pr checks $pr"; exit 1 ;;
  *) echo "$w NOT-MERGED PR #$pr is $state"; exit 1 ;;
esac
