#!/usr/bin/env bash
# Copies a CI run's files into a permanent GitHub release on the artifacts repo
# (dpologdvinity/daydaze-artifacts). Actions artifacts expire after at most 90
# days; release assets do not, and they stay out of every repo's git history.
#   bash scripts/archive-run.sh screenshots shots/*.png
#   bash scripts/archive-run.sh recording recordings/*.mp4
# Runs inside GitHub Actions. Env:
#   ARTIFACTS_TOKEN  fine-grained token with Contents read/write on the
#                    artifacts repo; unset (forks, Dependabot) warns and skips
#   ARCHIVE_REF      branch the files came from (the PR head branch on PRs)
#   ARCHIVE_SHA      commit the files came from
#   ARCHIVE_NOTES    optional extra line for the release notes (the shots, the scene)
# Writes the release URL to the step summary and as the `url` step output.
set -euo pipefail
kind=$1
shift
if [[ -z "${ARTIFACTS_TOKEN:-}" ]]; then
  echo "::warning::ARTIFACTS_TOKEN is not set, so this run is not archived permanently"
  exit 0
fi
if [[ $# -eq 0 ]]; then
  echo "::warning::no files to archive"
  exit 0
fi
repo=${ARTIFACTS_REPO:-dpologdvinity/daydaze-artifacts}
slug=$(printf '%s' "$ARCHIVE_REF" | tr '/' '-' | tr -c 'A-Za-z0-9._-' '-')
short=${ARCHIVE_SHA:0:7}
# the run id and attempt make the tag unique, so a rerun gets its own release
tag="$kind-$slug-$short-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
run_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
notes="Branch \`$ARCHIVE_REF\` at $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/commit/$ARCHIVE_SHA
Run: $run_url
${ARCHIVE_NOTES:-}"
GH_TOKEN=$ARTIFACTS_TOKEN gh release create "$tag" "$@" --repo "$repo" \
  --title "$kind: $ARCHIVE_REF at $short (run $GITHUB_RUN_ID)" --notes "$notes"
url="$GITHUB_SERVER_URL/$repo/releases/tag/$tag"
echo "Permanent copy: $url" >> "$GITHUB_STEP_SUMMARY"
echo "url=$url" >> "${GITHUB_OUTPUT:-/dev/null}"
