#!/bin/bash

# InstantHost Skill Installer
# This script installs the InstantHost publishing skill.

set -e

echo "Installing InstantHost skill..."

# Check requirements
command -v curl >/dev/null 2>&1 || { echo "Error: curl is required." >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required." >&2; exit 1; }
command -v file >/dev/null 2>&1 || { echo "Error: file is required." >&2; exit 1; }

# Determine install location
INSTALL_DIR="$HOME/.instanthost"
mkdir -p "$INSTALL_DIR/scripts"

# Base URL for assets (replace with your domain)
BASE_URL="https://yourdomain.com"

echo "Downloading scripts..."
curl -fsSL "$BASE_URL/skill/scripts/publish.sh" -o "$INSTALL_DIR/scripts/publish.sh"
curl -fsSL "$BASE_URL/skill/scripts/publish.py" -o "$INSTALL_DIR/scripts/publish.py"
curl -fsSL "$BASE_URL/skill/scripts/publish.js" -o "$INSTALL_DIR/scripts/publish.js"

chmod +x "$INSTALL_DIR/scripts/publish.sh"

echo "InstantHost skill installed to $INSTALL_DIR"
echo "To use the skill, call $INSTALL_DIR/scripts/publish.sh"
