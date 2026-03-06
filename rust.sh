#!/usr/bin/env bash
set -e 

OUTPUT_DIR="./bin"
PROFILE="release" 

mkdir -p "$OUTPUT_DIR"

echo "Building Rust project ($PROFILE mode)..."
cargo build --"$PROFILE"
BINARY_NAME="scod"

SRC_BINARY="target/$PROFILE/$BINARY_NAME"
DEST_BINARY="$OUTPUT_DIR/$BINARY_NAME"

cp "$SRC_BINARY" "$DEST_BINARY"

echo "✅ Build complete! Binary copied to $DEST_BINARY"
