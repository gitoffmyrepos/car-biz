#!/usr/bin/env bash
# GigWheels code-quality gate — scanaislop/aislop (vendored skill: skills/aislop/).
# Scans changed files for AI-generated code slop (narrative comments, swallowed
# exceptions, hallucinated imports, dead code, oversized functions, etc.).
#
# This is the CODEBASE quality layer. Customer-facing TEXT is humanized separately
# at runtime in chat-brain/humanize.py (blader/humanizer rules).
#
# Pinned over `npx` floating per the skill's supply-chain policy.
set -euo pipefail
PIN="${AISLOP_VERSION:-latest}"
MODE="${1:---changes}"   # --changes (default) or --all
echo "aislop scan ($MODE) — see skills/aislop/SKILL.md for the rule catalog"
npx --yes "aislop@${PIN}" scan "$MODE" "${@:2}"
