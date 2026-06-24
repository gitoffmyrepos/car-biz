#!/bin/bash
# Upload a final cut to MinIO gigwheels-videos + print a presigned download link.
# Usage: tools/share.sh <file.mp4> [expire e.g. 168h]
F="$1"; EXP="${2:-168h}"; AL="${MC_ALIAS:-forex-internal}"
[ -f "$F" ] || { echo "no such file: $F"; exit 1; }
n=$(basename "$F")
mc cp "$F" "$AL/gigwheels-videos/$n" >/dev/null 2>&1 && \
mc share download --expire "$EXP" "$AL/gigwheels-videos/$n" 2>/dev/null | grep -i "URL:" | sed 's/.*URL: //'
