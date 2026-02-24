#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MATRIX_FILE="$ROOT_DIR/docs/METHOD_MATRIX.md"

if [[ ! -f "$MATRIX_FILE" ]]; then
  echo "[method-matrix] Missing matrix file: $MATRIX_FILE"
  exit 1
fi

ROOT_DIR="$ROOT_DIR" MATRIX_FILE="$MATRIX_FILE" node <<'NODE'
const fs = require("fs");
const path = require("path");

const rootDir = process.env.ROOT_DIR;
const matrixFile = process.env.MATRIX_FILE;

const CORE_PACKAGE = "@jaicome/zatca-core";
const SERVER_PACKAGE = "@jaicome/zatca-server";

const expectedCoreRuntime = [
  "Calc",
  "DEFAULT_RUNTIME_CAPABILITIES",
  "EGSUnitCustomerInfoSchema",
  "EGSUnitInfoSchema",
  "EGSUnitLocationSchema",
  "SigningInputSchema",
  "XMLDocument",
  "ZATCAInvoice",
  "ZATCAInvoiceLineItemSchema",
  "ZATCAInvoicePropsSchema",
  "ZATCAInvoiceTypeSchema",
  "ZATCAPaymentMethodSchema",
  "InvoiceCodeSchema",
  "INVOICE_TYPE_CODES",
  "PAYMENT_METHOD_CODES",
  "INVOICE_CODE_VALUES",
  "ZodValidationError",
  "base64ToUint8Array",
  "buildInvoice",
  "concatUint8Arrays",
  "defaultUBLExtensions",
  "defaultUBLExtensionsSignedProperties",
  "defaultUBLExtensionsSignedPropertiesForSigning",
  "generatePhaseOneQR",
  "generatePhaseOneQRFromXml",
  "hexToUint8Array",
  "log",
  "parseInvoice",
  "prepareSigningInput",
  "setLogging",
  "stringToUint8Array",
  "uint8ArrayToBase64",
  "uint8ArrayToHex",
  "uint8ArrayToString",
  "uint8ArrayToUtf8",
  "utf8ToUint8Array",
  "valid_simplified_invoice_xml_sample",
].sort();

const expectedServerRuntime = [
  "EGS",
  "EGSUnitInfoSchema",
  "NodeSigner",
  "REQUIRED_COMPLIANCE_STEPS",
  "ZodValidationError",
  "cleanUpCertificateString",
  "cleanUpPrivateKeyString",
  "createInvoiceDigitalSignature",
  "generatePhaseOneQR",
  "generateQR",
  "generateSignedXMLString",
  "getCertificateHash",
  "getCertificateInfo",
  "getInvoiceHash",
  "getPureInvoiceString",
].sort();

const expectedCoreTypes = [
  "RuntimeCapabilities",
  "SignatureResult",
  "SignedInvoiceArtifacts",
  "Signer",
  "SigningInput",
  "XMLObject",
  "XMLQueryResult",
  "ZATCAInvoiceLineItemDiscount",
  "ZATCAInvoiceLineItemTax",
  "ZATCAInvoiceLineItem",
  "ZATCAInvoiceCancellation",
  "EGSUnitLocation",
  "EGSUnitCustomerInfo",
  "EGSUnitInfo",
  "ZATCAInvoiceProps",
].sort();

const expectedServerTypes = [
  "GenerateSignedXMLStringParams",
  "SignedXMLResult",
  "EGSUnitLocation",
  "EGSUnitCustomerInfo",
  "EGSUnitInfo",
  "ZATCAComplianceStep",
  "ComplianceCheckPayload",
].sort();

const coreRuntime = Object.keys(require(path.join(rootDir, "packages/zatca-core/lib/index.js"))).sort();
const serverRuntime = Object.keys(require(path.join(rootDir, "packages/zatca-server/lib/index.js"))).sort();

const diff = (actual, expected) => ({
  missing: expected.filter((item) => !actual.includes(item)),
  extra: actual.filter((item) => !expected.includes(item)),
});

const coreRuntimeDiff = diff(coreRuntime, expectedCoreRuntime);
const serverRuntimeDiff = diff(serverRuntime, expectedServerRuntime);

const matrixText = fs.readFileSync(matrixFile, "utf8");
const matrixKeys = new Set();
for (const line of matrixText.split(/\r?\n/)) {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/);
  if (match) {
    const symbol = match[1].trim();
    const pkg = match[2].trim();
    matrixKeys.add(`${pkg}:${symbol}`);
  }
}

const expectedPairs = [
  ...expectedCoreRuntime.map((symbol) => `${CORE_PACKAGE}:${symbol}`),
  ...expectedServerRuntime.map((symbol) => `${SERVER_PACKAGE}:${symbol}`),
  ...expectedCoreTypes.map((symbol) => `${CORE_PACKAGE}:${symbol}`),
  ...expectedServerTypes.map((symbol) => `${SERVER_PACKAGE}:${symbol}`),
];

const missingFromMatrix = expectedPairs.filter((pair) => !matrixKeys.has(pair));
const unmappedActualRuntime = [
  ...coreRuntime.map((symbol) => `${CORE_PACKAGE}:${symbol}`),
  ...serverRuntime.map((symbol) => `${SERVER_PACKAGE}:${symbol}`),
].filter((pair) => !matrixKeys.has(pair));

let hasErrors = false;

if (coreRuntimeDiff.missing.length || coreRuntimeDiff.extra.length) {
  hasErrors = true;
  console.error("[method-matrix] Runtime export drift detected in @jaicome/zatca-core");
  if (coreRuntimeDiff.missing.length) {
    console.error(`  Missing from runtime: ${coreRuntimeDiff.missing.join(", ")}`);
  }
  if (coreRuntimeDiff.extra.length) {
    console.error(`  New/unexpected runtime exports: ${coreRuntimeDiff.extra.join(", ")}`);
  }
}

if (serverRuntimeDiff.missing.length || serverRuntimeDiff.extra.length) {
  hasErrors = true;
  console.error("[method-matrix] Runtime export drift detected in @jaicome/zatca-server");
  if (serverRuntimeDiff.missing.length) {
    console.error(`  Missing from runtime: ${serverRuntimeDiff.missing.join(", ")}`);
  }
  if (serverRuntimeDiff.extra.length) {
    console.error(`  New/unexpected runtime exports: ${serverRuntimeDiff.extra.join(", ")}`);
  }
}

if (missingFromMatrix.length) {
  hasErrors = true;
  console.error("[method-matrix] Expected symbols missing from docs/METHOD_MATRIX.md:");
  for (const item of missingFromMatrix) {
    console.error(`  - ${item}`);
  }
}

if (unmappedActualRuntime.length) {
  hasErrors = true;
  console.error("[method-matrix] Actual runtime exports missing from docs/METHOD_MATRIX.md:");
  for (const item of unmappedActualRuntime) {
    console.error(`  - ${item}`);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log("[method-matrix] OK: all expected symbols are mapped and runtime exports are covered.");
NODE
