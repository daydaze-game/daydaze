#!/bin/bash
# main-merged-only.sh <head-sha>: prints "true" when a pull request's head
# commit only merges main into a commit whose Tests workflow (the browser
# suites) already succeeded, "false" otherwise. Updating a PR with main
# ("Update branch", or the auto-update workflow) then re-runs only the fast
# checks: the PR's own changes were already browser-tested, and main's full
# browser run after the merge catches anything the combination breaks.
# Needs GH_TOKEN and GH_REPO (owner/name).
head=$1
read -r p1 p2 < <(gh api "repos/$GH_REPO/commits/$head" -q '[.parents[].sha] | join(" ")')
# not a merge commit
[ -n "$p2" ] || { echo false; exit 0; }
# the merged-in side must already be on main (compare p2...main: main is ahead of it, or equal)
case $(gh api "repos/$GH_REPO/compare/$p2...main" -q .status 2>/dev/null) in
  ahead | identical) ;;
  *) echo false; exit 0 ;;
esac
ok=$(gh run list -R "$GH_REPO" --workflow Tests --commit "$p1" --status success -L 1 --json databaseId -q '.[0].databaseId')
if [ -n "$ok" ]; then echo true; else echo false; fi
