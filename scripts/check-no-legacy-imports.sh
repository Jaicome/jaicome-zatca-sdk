#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

PACKAGES_PATH="packages"
VIOLATIONS=0

echo "Checking for legacy root src imports in packages..."
echo "Scanning: $PACKAGES_PATH"
echo ""

# Pattern 1: import from "../../src/zatca/*"
if grep -r "from ['\"]../../src/zatca" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: ../../src/zatca${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 2: import from "../src/zatca/*"
if grep -r "from ['\"]../src/zatca" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: ../src/zatca${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 3: import from "src/zatca/*"
if grep -r "from ['\"]src/zatca" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: src/zatca${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 4: import from "../../src/*" (root src)
if grep -r "from ['\"]../../src/" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: ../../src/${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 5: import from "../src/*" (root src)
if grep -r "from ['\"]../src/" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden import: ../src/${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 6: require("../../src/zatca/*")
if grep -r "require(['\"]../../src/zatca" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: ../../src/zatca${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 7: require("../src/zatca/*")
if grep -r "require(['\"]../src/zatca" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: ../src/zatca${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 8: require("src/zatca/*")
if grep -r "require(['\"]src/zatca" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: src/zatca${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 9: require("../../src/*") (root src)
if grep -r "require(['\"]../../src/" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: ../../src/${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Pattern 10: require("../src/*") (root src)
if grep -r "require(['\"]../src/" "$PACKAGES_PATH" 2>/dev/null; then
  echo -e "${RED}✗ Found forbidden require: ../src/${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

echo ""
if [ "$VIOLATIONS" -eq 0 ]; then
  echo -e "${GREEN}✓ All import checks passed! No packages import from legacy root src.${NC}"
  exit 0
else
  echo -e "${RED}✗ Found $VIOLATIONS import violation(s) in packages.${NC}"
  echo "Packages must not import from root src/ or src/zatca/ legacy paths."
  exit 1
fi
