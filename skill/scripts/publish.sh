#!/bin/bash

# Emmdee Publish Script
# Version: 1.0.0

set -e

# Default values
BASE_URL="https://emmdee.host"
API_KEY=""
SLUG=""
CLAIM_TOKEN=""
TITLE=""
DESCRIPTION=""
TTL=""

# Helper: Print usage
usage() {
  echo "Usage: $0 {file-or-dir} [options]"
  echo "Options:"
  echo "  --slug {slug}          Update existing publish"
  echo "  --claim-token {token}  Override claim token"
  echo "  --title {text}         Viewer title"
  echo "  --description {text}   Viewer description"
  echo "  --ttl {seconds}        Custom TTL (authenticated only)"
  echo "  --base-url {url}       API base URL"
  echo "  --api-key {key}        API key override"
  exit 1
}

# Parse arguments
if [ "$#" -lt 1 ]; then usage; fi
TARGET=$1
shift

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --slug) SLUG="$2"; shift ;;
    --claim-token) CLAIM_TOKEN="$2"; shift ;;
    --title) TITLE="$2"; shift ;;
    --description) DESCRIPTION="$2"; shift ;;
    --ttl) TTL="$2"; shift ;;
    --base-url) BASE_URL="$2"; shift ;;
    --api-key) API_KEY="$2"; shift ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
  shift
done

# Step 1: Resolve API Key
if [ -z "$API_KEY" ]; then
  if [ -n "$EMMDEE_API_KEY" ]; then
    API_KEY="$EMMDEE_API_KEY"
  elif [ -f ~/.emmdee/credentials ]; then
    API_KEY=$(cat ~/.emmdee/credentials | tr -d '\n\r')
  fi
fi

AUTH_HEADER=""
if [ -n "$API_KEY" ]; then
  AUTH_HEADER="Authorization: Bearer $API_KEY"
fi

# Step 3: Build files array
FILES_JSON="[]"
TARGET_DIR=""

if [ -d "$TARGET" ]; then
    TARGET_DIR="$TARGET"
    # Find all files in directory
    FILES_LIST=$(find "$TARGET" -type f)
    for FILE_PATH in $FILES_LIST; do
        REL_PATH=${FILE_PATH#$TARGET/}
        SIZE=$(stat -c%s "$FILE_PATH")
        MIME=$(file --mime-type -b "$FILE_PATH")
        FILES_JSON=$(echo "$FILES_JSON" | jq --arg p "$REL_PATH" --arg s "$SIZE" --arg m "$MIME" '. += [{"path": $p, "size": ($s|tonumber), "contentType": $m}]')
    done
else
    # Single file
    FILENAME=$(basename "$TARGET")
    SIZE=$(stat -c%s "$TARGET")
    MIME=$(file --mime-type -b "$TARGET")
    FILES_JSON=$(jq -n --arg p "$FILENAME" --arg s "$SIZE" --arg m "$MIME" '[{"path": $p, "size": ($s|tonumber), "contentType": $m}]')
fi

# Step 4: Call API
REQUEST_BODY=$(jq -n \
  --argjson files "$FILES_JSON" \
  --arg ttl "$TTL" \
  --arg title "$TITLE" \
  --arg desc "$DESCRIPTION" \
  --arg ct "$CLAIM_TOKEN" \
  '{
    files: $files,
    ttlSeconds: (if $ttl != "" then ($ttl|tonumber) else null end),
    claimToken: (if $ct != "" then $ct else null end),
    viewer: {
      title: (if $title != "" then $title else null end),
      description: (if $desc != "" then $desc else null end)
    }
  }')

if [ -n "$SLUG" ]; then
    API_URL="$BASE_URL/api/v1/publish/$SLUG"
    API_METHOD="PUT"
else
    API_URL="$BASE_URL/api/v1/publish"
    API_METHOD="POST"
fi

RESPONSE=$(curl -s -X "$API_METHOD" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
  -d "$REQUEST_BODY" \
  "$API_URL")

# Step 5: Parse Response
ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
if [ -n "$ERROR" ]; then
    echo "Error: $ERROR" >&2
    exit 1
fi

SLUG=$(echo "$RESPONSE" | jq -r '.slug')
SITE_URL=$(echo "$RESPONSE" | jq -r '.siteUrl')
FINALIZE_URL=$(echo "$RESPONSE" | jq -r '.finalizeUrl')
VERSION_ID=$(echo "$RESPONSE" | jq -r '.versionId')
UPLOADS=$(echo "$RESPONSE" | jq -r '.uploads')
IS_ANONYMOUS=$(echo "$RESPONSE" | jq -r '.anonymous // false')
CLAIM_TOKEN_RESP=$(echo "$RESPONSE" | jq -r '.claimToken // empty')
CLAIM_URL_RESP=$(echo "$RESPONSE" | jq -r '.claimUrl // empty')

# Step 6: Parallel Uploads
for row in $(echo "$UPLOADS" | jq -r '.[] | @base64'); do
    _jq() {
     echo ${row} | base64 --decode | jq -r ${1}
    }
    FILE_PATH_REL=$(_jq '.path')
    UPLOAD_URL=$(_jq '.url')
    UPLOAD_METHOD=$(_jq '.method')
    CONTENT_TYPE=$(_jq '.headers["Content-Type"]')

    if [ -n "$TARGET_DIR" ]; then
        LOCAL_PATH="$TARGET_DIR/$FILE_PATH_REL"
    else
        LOCAL_PATH="$TARGET"
    fi

    # Upload in background
    curl -s -X "$UPLOAD_METHOD" -H "Content-Type: $CONTENT_TYPE" --data-binary "@$LOCAL_PATH" "$UPLOAD_URL" &
done

wait # Wait for all uploads to finish

# Step 7: Finalize
FINALIZE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
  -d "{\"versionId\": \"$VERSION_ID\"}" \
  "$FINALIZE_URL")

# Step 8: Write results to stderr
echo "publish_result.site_url=$SITE_URL" >&2
if [ "$IS_ANONYMOUS" = "true" ]; then
    echo "publish_result.auth_mode=anonymous" >&2
    echo "publish_result.claim_url=$CLAIM_URL_RESP" >&2
else
    echo "publish_result.auth_mode=authenticated" >&2
fi

# Step 9: Save state
STATE_FILE=".emmdee/state.json"
mkdir -p .emmdee
if [ -f "$STATE_FILE" ]; then
    EXISTING_STATE=$(cat "$STATE_FILE")
else
    EXISTING_STATE='{"publishes": {}}'
fi

NEW_STATE=$(echo "$EXISTING_STATE" | jq --arg slug "$SLUG" \
    --arg siteUrl "$SITE_URL" \
    --arg claimToken "$CLAIM_TOKEN_RESP" \
    --arg claimUrl "$CLAIM_URL_RESP" \
    --arg expiresAt "$(echo "$RESPONSE" | jq -r '.expiresAt // empty')" \
    '.publishes[$slug] = {siteUrl: $siteUrl, claimToken: $claimToken, claimUrl: $claimUrl, expiresAt: $expiresAt}')

echo "$NEW_STATE" > "$STATE_FILE"

# Step 10: Print siteUrl to stdout
echo "$SITE_URL"
