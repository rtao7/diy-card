#!/bin/bash

# Script to encode Google Sheets credentials for production deployment
# Usage: ./scripts/encode-credentials.sh /path/to/credentials.json

if [ -z "$1" ]; then
  echo "Usage: $0 /path/to/credentials.json"
  echo ""
  echo "This script will output the base64-encoded credentials"
  echo "Copy the output and paste it as the value for GOOGLE_SHEETS_CREDENTIALS_BASE64 in Vercel"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "Error: File not found: $1"
  exit 1
fi

echo "Encoding credentials file: $1"
echo ""
echo "=== Copy everything below this line ==="
cat "$1" | base64
echo "=== Copy everything above this line ==="
echo ""
echo "Paste this value into Vercel as GOOGLE_SHEETS_CREDENTIALS_BASE64"
