#!/bin/sh

set -eu

commit_message_path=${1:-}
if [ -z "$commit_message_path" ]; then
  echo "verify-commit-msg: missing commit message file path" >&2
  exit 1
fi

header="$(sed -n '1p' "$commit_message_path" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"

if [ -z "$header" ] || printf '%s\n' "$header" | grep -Eq '^Merge '; then
  exit 0
fi

if ! printf '%s\n' "$header" | grep -Eq '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([[:alnum:]_.\/-]+\))?!?: .{1,100}$'; then
  cat >&2 <<EOF

✖ Commit message does not follow Conventional Commits.

  Received: "$header"
  Expected: <type>(<optional scope>): <description>

  Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

  Examples:
    feat(elements): add karsa-button component
    fix(core): correct focus trap edge case
    docs(tokens): document spacing scale
EOF
  exit 1
fi
