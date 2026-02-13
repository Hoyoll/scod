#!/usr/bin/env bash
set -e 
OUTPUT_DIR="./bin"
TARGET_DIR="./frontend"
DIST="$TARGET_DIR/dist/."

mkdir -p "$OUTPUT_DIR"

echo "Bundling the editor..."

npm run build --prefix "$TARGET_DIR"

cp -a "$DIST" "$OUTPUT_DIR"

echo "✅ Build complete! Bundle copied to $OUTPUT_DIR"

