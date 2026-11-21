#!/bin/bash
# setup-git.sh: raise git's ref lock timeouts in this clone. Run once per clone,
# from any worktree (worktrees share .git/config, refs and packed-refs).
# Without it, two agents fetching at the same time fail with "cannot lock ref"
# after git's 100 ms default (core.filesRefLockTimeout).
# A longer timeout only helps lock contention, not the changed-ref race: if
# another agent updates a ref first, a fetch can still fail the expected
# old-value check ("is at X but expected Y"). That is a race, not a timeout:
# run the fetch again.
set -euo pipefail
git config --local core.filesRefLockTimeout 5000
git config --local core.packedRefsTimeout 5000
printf 'ref lock timeouts set: filesRef %s ms, packedRefs %s ms\n' \
	"$(git config --local core.filesRefLockTimeout)" \
	"$(git config --local core.packedRefsTimeout)"
