#!/usr/bin/env bash
# Baut js/hero-mark.js aus src/hero-mark.js (three.js wird mit eingebunden, eine Datei, ohne CDN).
# Voraussetzung: Node.js. Aufruf aus dem Projektordner:  bash tools/build-hero-mark.sh
set -euo pipefail
cd "$(dirname "$0")/.."
WORK="$(mktemp -d)"
( cd "$WORK" && npm init -y >/dev/null && npm i --silent three@0.187.0 esbuild@0.28.2 )
NODE_PATH="$WORK/node_modules" "$WORK/node_modules/.bin/esbuild" src/hero-mark.js \
  --bundle --minify --format=iife --target=es2019 --legal-comments=none \
  --outfile=js/hero-mark.js
echo "js/hero-mark.js gebaut."
