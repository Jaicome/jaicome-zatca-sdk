import * as fs from "node:fs";
import * as path from "node:path";

import { ZATCAInvoice } from "@jaicome/zatca-core";
import type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
} from "@jaicome/zatca-core";

import {
  egsInfo,
  GENESIS_PREVIOUS_INVOICE_HASH,
  onboardEGS,
  signAndReportBatch,
  signAndReportInvoice,
} from "./server";
import type { OnboardResult, SingleReportResult } from "./server";

// Get OTP from environment variable or use default for testing
const ZATCA_OTP = "112534";

// ============================================================================
// CONSTANTS
// ============================================================================

const CLIENT_JSON_PATH = path.join(__dirname, "./tmp/client.json");

// Line items (2-3 different items with different VAT rates)
const lineItem1SAR: ZATCAInvoiceLineItem = {
  id: "1",
  name: "Item 1 SAR",
  quantity: 1,
  taxExclusivePrice: 1,
  vatPercent: 0.15,
};

const lineItem5SAR: ZATCAInvoiceLineItem = {
  id: "2",
  name: "Item 5 SAR",
  quantity: 1,
  taxExclusivePrice: 5,
  vatPercent: 0.05,
};

// Customer info
const customerInfo = {
  building: "100",
  buyerName: "Test Customer",
  city: "Riyadh",
  citySubdivision: "Al Malaz",
  postalZone: "11564",
  street: "Test Street",
};

// ============================================================================
// TYPES
// ============================================================================

interface ClientInvoiceRecord {
  invoiceSerialNumber: string;
  invoiceCounterNumber: number;
  previousInvoiceHash: string;
  props: ZATCAInvoiceProps;
  status: "pending" | "reported" | "failed";
  serverResponse?: SingleReportResult;
  createdAt: string;
}

// ============================================================================
// CLIENT STATE
// ============================================================================

const clientInvoices: ClientInvoiceRecord[] = [];
let currentHash: string = GENESIS_PREVIOUS_INVOICE_HASH;
let currentCounter: number = 1;

// ============================================================================
// HELPERS
// ============================================================================

const saveClientState = (): void => {
  fs.mkdirSync(path.dirname(CLIENT_JSON_PATH), { recursive: true });
  fs.writeFileSync(
    CLIENT_JSON_PATH,
    JSON.stringify(clientInvoices, null, 2),
    "utf8"
  );
};

const buildInvoiceProps = (
  lineItems: ZATCAInvoiceLineItem[]
): ZATCAInvoiceProps => {
  const now = new Date();
  const issueDate = now.toISOString().split("T")[0];
  const issueTime = now.toISOString().split("T")[1].slice(0, 8);

  const invoiceSerialNumber = `INV-${currentCounter}`;
  const props: ZATCAInvoiceProps = {
    crnNumber: "1234567890",
    customerInfo,
    egsInfo,
    invoiceCode: "SIMPLIFIED",
    invoiceCounterNumber: currentCounter,
    invoiceSerialNumber,
    invoiceType: "INVOICE",
    issueDate,
    issueTime: `${issueTime}Z`,
    lineItems,
    previousInvoiceHash: currentHash,
  };

  currentCounter++; // Increment for next invoice
  return props;
};

// ============================================================================
// MAIN FLOW
// ============================================================================

async function main() {
  // ========== PHASE 1: ONBOARDING ==========
  console.log("[CLIENT] ========== PHASE 1: ONBOARDING ==========");
  console.log("[CLIENT] Requesting server to onboard EGS...");

  const onboardResult = await onboardEGS(ZATCA_OTP);
  console.log(`[CLIENT] Using OTP: ${ZATCA_OTP}`);
  currentHash = onboardResult.previousInvoiceHash;
  currentCounter = onboardResult.invoiceCounterStart;

  console.log(
    `[CLIENT] Server onboarding complete. Starting hash: ${currentHash.slice(0, 20)}...`
  );

  // ========== PHASE 2: INDIVIDUAL INVOICES (Online) ==========
  console.log(
    "[CLIENT] ========== PHASE 2: INDIVIDUAL INVOICES (Online) =========="
  );

  // Invoice 1
  console.log("[CLIENT] Building invoice 1...");
  const props1 = buildInvoiceProps([lineItem1SAR]);
  new ZATCAInvoice({ acceptWarning: true, props: props1 }); // Validate XML locally
  clientInvoices.push({
    createdAt: new Date().toISOString(),
    invoiceCounterNumber: props1.invoiceCounterNumber,
    invoiceSerialNumber: props1.invoiceSerialNumber,
    previousInvoiceHash: props1.previousInvoiceHash,
    props: props1,
    status: "pending",
  });
  saveClientState();

  console.log("[CLIENT] Invoice 1 built. Sending to server...");
  const result1 = await signAndReportInvoice(props1);
  currentHash = result1.invoiceHash; // Update hash chain
  const invoice1 = clientInvoices.find(
    (inv) => inv.invoiceSerialNumber === props1.invoiceSerialNumber
  );
  if (invoice1) {
    invoice1.status = result1.success ? "reported" : "failed";
    invoice1.serverResponse = result1;
  }
  saveClientState();
  console.log(
    `[CLIENT] Invoice 1 result: ${result1.reportingStatus || "FAILED"}`
  );

  // Invoice 2
  console.log("[CLIENT] Building invoice 2...");
  const props2 = buildInvoiceProps([lineItem5SAR]);
  new ZATCAInvoice({ acceptWarning: true, props: props2 }); // Validate XML locally
  clientInvoices.push({
    createdAt: new Date().toISOString(),
    invoiceCounterNumber: props2.invoiceCounterNumber,
    invoiceSerialNumber: props2.invoiceSerialNumber,
    previousInvoiceHash: props2.previousInvoiceHash,
    props: props2,
    status: "pending",
  });
  saveClientState();

  console.log("[CLIENT] Invoice 2 built. Sending to server...");
  const result2 = await signAndReportInvoice(props2);
  currentHash = result2.invoiceHash; // Update hash chain
  const invoice2 = clientInvoices.find(
    (inv) => inv.invoiceSerialNumber === props2.invoiceSerialNumber
  );
  if (invoice2) {
    invoice2.status = result2.success ? "reported" : "failed";
    invoice2.serverResponse = result2;
  }
  saveClientState();
  console.log(
    `[CLIENT] Invoice 2 result: ${result2.reportingStatus || "FAILED"}`
  );

  // ========== PHASE 3: OFFLINE BATCH (Simulating offline mode) ==========
  console.log(
    "[CLIENT] ========== PHASE 3: OFFLINE BATCH (Simulating offline mode) =========="
  );
  console.log("[CLIENT] App is offline. Building invoices locally...");

  const offlineInvoices: ZATCAInvoiceProps[] = [];
  for (let i = 0; i < 4; i++) {
    const lineItems = [lineItem1SAR, lineItem5SAR]; // Mix of items
    const props = buildInvoiceProps(lineItems);

    // Store in client state with "pending"
    clientInvoices.push({
      createdAt: new Date().toISOString(),
      invoiceCounterNumber: props.invoiceCounterNumber,
      invoiceSerialNumber: props.invoiceSerialNumber,
      previousInvoiceHash: props.previousInvoiceHash,
      props,
      status: "pending",
    });

    offlineInvoices.push(props);
    console.log(
      `[CLIENT] Built offline invoice ${i + 1}: ${props.invoiceSerialNumber}`
    );
  }

  saveClientState(); // Now client.json has 4 pending invoices
  console.log(
    `[CLIENT] ${offlineInvoices.length} invoices stored locally. Reconnecting to server...`
  );

  console.log(
    `[CLIENT] Sending batch of ${offlineInvoices.length} invoices to server...`
  );
  const batchResults = await signAndReportBatch(offlineInvoices);

  // Process batch results
  for (const result of batchResults) {
    const invoice = clientInvoices.find(
      (inv) => inv.invoiceSerialNumber === result.invoiceSerialNumber
    );
    if (invoice) {
      invoice.status = result.success ? "reported" : "failed";
      invoice.serverResponse = result;
      if (result.success) {
        currentHash = result.invoiceHash; // Update chain for next invoice
      }
      console.log(
        `[CLIENT] Batch invoice ${result.invoiceSerialNumber}: ${result.success ? "SUCCESS" : "FAILED - " + result.error}`
      );
    }
  }

  saveClientState();

  // ========== PHASE 4: SUMMARY ==========
  console.log("[CLIENT] ========== SUMMARY ==========");

  const total = clientInvoices.length;
  const reported = clientInvoices.filter(
    (inv) => inv.status === "reported"
  ).length;
  const failed = clientInvoices.filter((inv) => inv.status === "failed").length;
  console.log(`[CLIENT] Total invoices: ${total}`);
  console.log(`[CLIENT] Reported: ${reported}, Failed: ${failed}`);

  console.log("[CLIENT] Hash chain:");
  clientInvoices.forEach((inv) => {
    console.log(
      `  ${inv.invoiceSerialNumber}: ${inv.props.previousInvoiceHash.slice(0, 15)}... → ${inv.serverResponse?.invoiceHash?.slice(0, 15) || "pending"}...`
    );
  });

  console.log(`[CLIENT] Client records saved to: ${CLIENT_JSON_PATH}`);
  console.log("[CLIENT] Server records saved to: ./tmp/server.json");
  console.log("[CLIENT] Done!");
}

main().catch(console.error);
