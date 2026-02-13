#!/usr/bin/env bash
set -e  # exit immediately on error

# -----------------------------
# Configuration
# -----------------------------
OUTPUT_DIR="./bin"   # destination folder for the binary
PROFILE="release"             # "debug" or "release"

# -----------------------------
# Create output directory
# -----------------------------
mkdir -p "$OUTPUT_DIR"

# -----------------------------
# Build the Rust project
# -----------------------------
echo "Building Rust project ($PROFILE mode)..."
cargo build --"$PROFILE"

# -----------------------------
# Copy the binary to OUTPUT_DIR
# -----------------------------
# Replace "my_app" with your binary name from Cargo.toml
BINARY_NAME="scod"

SRC_BINARY="target/$PROFILE/$BINARY_NAME"
DEST_BINARY="$OUTPUT_DIR/$BINARY_NAME"

if [ ! -f "$SRC_BINARY" ]; then
    echo "Error: Binary not found at $SRC_BINARY"
    exit 1
fi

cp "$SRC_BINARY" "$DEST_BINARY"

echo "✅ Build complete! Binary copied to $DEST_BINARY"
