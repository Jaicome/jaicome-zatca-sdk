#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

CORE_PATH="packages/zatca-core/src"
GREP_ARGS=(--exclude-dir="__tests__")
VIOLATIONS=0

echo "Checking boundaries for zatca-core package..."
echo "Scanning: $CORE_PATH"
echo ""

# Check for forbidden imports in zatca-core/src
# Pattern 1: import fs from 'fs' or import fs from "fs"
if grep -r "${GREP_ARGS[@]}" "from ['\"]fs['\"]" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: fs module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 2: import ... from 'child_process' or import ... from "child_process"
if grep -r "${GREP_ARGS[@]}" "from ['\"]child_process['\"]" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: child_process module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 3: import crypto from 'crypto' or import crypto from "crypto" or import ... from 'node:crypto'
if grep -r "${GREP_ARGS[@]}" "from ['\"]crypto['\"]" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: crypto module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if grep -r "${GREP_ARGS[@]}" "from ['\"]node:crypto['\"]" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: node:crypto module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 4: Buffer usage (Buffer.from or new Buffer)
if grep -r "${GREP_ARGS[@]}" "Buffer\." "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden usage: Buffer.* calls${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if grep -r "${GREP_ARGS[@]}" "new Buffer(" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden usage: new Buffer() constructor${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 5: Direct process.env usage
if grep -r "${GREP_ARGS[@]}" "process\.env\[" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden usage: process.env direct access${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Also check for require() patterns
if grep -r "${GREP_ARGS[@]}" "require(['\"]fs['\"])" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: fs module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if grep -r "${GREP_ARGS[@]}" "require(['\"]child_process['\"])" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: child_process module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if grep -r "${GREP_ARGS[@]}" "require(['\"]crypto['\"])" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: crypto module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

if grep -r "${GREP_ARGS[@]}" "require(['\"]node:crypto['\"])" "$CORE_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: node:crypto module${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

echo ""
if [ "$VIOLATIONS" -eq 0 ]; then
  echo -e "${GREEN}✓ All boundary checks passed! zatca-core is runtime-agnostic.${NC}"
  exit 0
else
  echo -e "${RED}✗ Found $VIOLATIONS boundary violation(s) in zatca-core package.${NC}"
  echo "zatca-core must not import Node.js builtins (fs, crypto, child_process, Buffer, process)."
  exit 1
fi
