import * as fs from "node:fs";
import * as path from "node:path";

import { ZATCAInvoice, InvoiceType, PaymentMeans, GENESIS_PREVIOUS_INVOICE_HASH } from "@jaicome/zatca-core";
import type {
  ZATCAInvoiceProps,
  ZATCAInvoiceLineItem,
} from "@jaicome/zatca-core";
import {
  EGS,
  NodeSigner,
  REQUIRED_COMPLIANCE_STEPS,
} from "@jaicome/zatca-server";
import type {
  ComplianceCheckPayload,
  ZATCAComplianceStep,
  EGSInfo,
} from "@jaicome/zatca-server";

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardResult {
  previousInvoiceHash: string;
  invoiceCounterStart: number;
}

export interface SingleReportResult {
  invoiceSerialNumber: string;
  success: boolean;
  invoiceHash: string;
  reportingStatus?: string;
  clearanceStatus?: string;
  error?: string;
}

export type BatchReportResult = SingleReportResult[];

// ============================================================================
// CONSTANTS & EGS INFO
// ============================================================================

const SERVER_JSON_PATH = path.join(__dirname, "./tmp/server.json");


// Re-export for client usage
export { GENESIS_PREVIOUS_INVOICE_HASH };

// Sample line items for compliance invoices
const lineItem1: ZATCAInvoiceLineItem = {
  discounts: [{ amount: 1, reason: "discount" }],
  id: "1",
  name: "TEST NAME",
  quantity: 44,
  taxExclusivePrice: 22,
  vatPercent: 0.15,
};

const lineItem2: ZATCAInvoiceLineItem = {
  discounts: [{ amount: 2, reason: "discount" }],
  id: "2",
  name: "TEST NAME 1",
  quantity: 10,
  taxExclusivePrice: 5,
  vatPercent: 0.05,
};

const lineItem3: ZATCAInvoiceLineItem = {
  id: "3",
  name: "TEST NAME 2",
  quantity: 10,
  taxExclusivePrice: 5,
  vatCategory: {
    code: "Z",
    reason: "Supply of a qualifying means of transport",
    reasonCode: "VATEX-SA-34-4",
  },
  vatPercent: 0,
};

export const egsInfo: EGSInfo = {
  branchIndustry: "Food",
  branchName: "My Branch Name",
  id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  location: {
    building: "0000",
    city: "Khobar",
    citySubdivision: "West",
    plotIdentification: "0000",
    postalZone: "31952",
    street: "King Fahahd st",
  },
  model: "IOS",
  name: "EGS2",
  vatName: "شركة جاي كوم لتقنية المعلومات",
  vatNumber: "311497191800003",
};

// ============================================================================
// MODULE STATE
// ============================================================================

let egs: EGS | null = null;
let signer: NodeSigner | null = null;
const serverInvoices: {
  invoiceSerialNumber: string;
  invoiceHash: string;
  signedXml: string;
  reportingStatus: string;
  timestamp: string;
}[] = [];

// ============================================================================
// HELPERS
// ============================================================================

const saveServerState = (): void => {
  fs.mkdirSync(path.dirname(SERVER_JSON_PATH), { recursive: true });
  fs.writeFileSync(
    SERVER_JSON_PATH,
    JSON.stringify(serverInvoices, null, 2),
    "utf8"
  );
};

const buildInvoicePropsForComplianceStep = (
  step: ZATCAComplianceStep,
  invoiceCounterNumber: number,
  previousInvoiceHash: string,
  canceledSerialInvoiceNumber: string
): ZATCAInvoiceProps => {
  const invoiceSerialNumber = `EGS1-886431145-${100 + invoiceCounterNumber}`;
  const issueDate = new Date("2024-02-29");

  const shared = {
    crnNumber: "7032256278",
    customerInfo: {
      building: "00",
      buyerName: "S7S",
      city: "jeddah",
      citySubdivision: "ssss",
      customerCrnNumber: "7052156278",
      postalZone: "00000",
      street: "__",
      vatNumber: "311498192800003",
    },
    egsInfo,
    invoiceCounterNumber,
    invoiceSerialNumber,
    issueDate,
    lineItems: [lineItem1, lineItem2, lineItem3],
    previousInvoiceHash,
  };

  if (step === "standard-compliant") {
    return {
      ...shared,
      actualDeliveryDate: new Date("2024-02-29"),
      invoiceCode: "STANDARD",
      invoiceType: InvoiceType.INVOICE,
    };
  }

  if (step === "simplified-compliant") {
    return {
      ...shared,
      actualDeliveryDate: new Date("2024-02-29"),
      invoiceCode: "SIMPLIFIED",
      invoiceType: InvoiceType.INVOICE,
    };
  }

  const is_credit_note =
    step === "standard-credit-note-compliant" ||
    step === "simplified-credit-note-compliant";
  const is_standard_note =
    step === "standard-credit-note-compliant" ||
    step === "standard-debit-note-compliant";

  return {
    ...shared,
    cancelation: {
      canceledSerialInvoiceNumber,
      paymentMethod: PaymentMeans.CASH,
      reason: "Compliance onboarding reference",
    },
    invoiceCode: is_standard_note ? "STANDARD" : "SIMPLIFIED",
    invoiceType: is_credit_note ? InvoiceType.CREDIT_NOTE : InvoiceType.DEBIT_NOTE,
  };
};

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export const onboardEGS = async (otp: string): Promise<OnboardResult> => {
  console.log("[SERVER] Starting EGS onboarding...");

  // 1. Initialize EGS
  egs = new EGS(egsInfo, "simulation");

  // 2. Generate Keys & CSR
  console.log("[SERVER] Generating keys and CSR...");
  await egs.generateNewKeysAndCSR("Server-Client Example");

  // 3. Issue compliance certificate
  console.log("[SERVER] Issuing compliance certificate...");
  console.log(`[SERVER] Received OTP from client: ${otp.slice(0, 3)}***`); // Masked for security
  const complianceCertResult = await egs.issueComplianceCertificate(otp);
  if (complianceCertResult.isErr()) {
    throw new Error(
      `Failed to issue compliance certificate: ${complianceCertResult.error}`
    );
  }
  const compliance_request_id = complianceCertResult.value;
  console.log("[SERVER] Compliance certificate issued");

  // 4. Create NodeSigner
  signer = new NodeSigner(egs.getComplianceCertificate()!);

  // 5. Build and sign all 6 compliance check invoices
  console.log("[SERVER] Building and signing 6 compliance check invoices...");
  const complianceChecks: Partial<
    Record<ZATCAComplianceStep, ComplianceCheckPayload>
  > = {};
  const complianceStepExecutionOrder: readonly ZATCAComplianceStep[] = [
    "standard-debit-note-compliant",
    "standard-compliant",
    "standard-credit-note-compliant",
    "simplified-debit-note-compliant",
    "simplified-compliant",
    "simplified-credit-note-compliant",
  ];

  let previousHash = GENESIS_PREVIOUS_INVOICE_HASH;
  let previousSerial = "EGS1-886431145-100";

  for (const [index, step] of complianceStepExecutionOrder.entries()) {
    const invoice = new ZATCAInvoice({
      acceptWarning: true,
      props: buildInvoicePropsForComplianceStep(
        step,
        index + 1,
        previousHash,
        previousSerial
      ),
      signer: signer!,
    });

    const result = await invoice.sign(
      egs.getPrivateKey()!
    );
    const signedInvoiceString = result.signedXml;
    const { invoiceHash } = result;

    complianceChecks[step] = { invoiceHash, signedInvoiceString };
    previousHash = invoiceHash;
    previousSerial = `EGS1-886431145-${101 + index}`;

    console.log(`[SERVER] Compliance step ${index + 1}/6: ${step} signed`);
  }

  // 6. Run compliance checks
  console.log("[SERVER] Running compliance checks...");
  const complianceResultsResult =
    await egs.runComplianceChecksForProduction(complianceChecks);
  if (complianceResultsResult.isErr()) {
    throw new Error(
      `Compliance checks failed: ${complianceResultsResult.error}`
    );
  }
  const complianceResults = complianceResultsResult.value;
  REQUIRED_COMPLIANCE_STEPS.forEach((step) => {
    const stepResult = complianceResults[step];
    console.log(
      `[SERVER] Compliance step ${step}: ${stepResult?.validationResults?.status}`
    );
  });

  // 7. Issue production certificate
  console.log("[SERVER] Issuing production certificate...");
  const productionResult = await egs.issueProductionCertificate(
    compliance_request_id
  );
  if (productionResult.isErr()) {
    throw new Error(
      `Failed to issue production certificate: ${productionResult.error}`
    );
  }
  console.log(
    "[SERVER] EGS onboarding complete. Production certificate issued."
  );

  return {
    invoiceCounterStart: 7,
    previousInvoiceHash: previousHash,
  };
};

export const signAndReportInvoice = async (
  invoiceProps: ZATCAInvoiceProps
): Promise<SingleReportResult> => {
  if (!egs || !signer) {
    throw new Error("EGS not initialized. Call onboardEGS() first.");
  }

  const serial = invoiceProps.invoiceSerialNumber;
  console.log(`[SERVER] Signing and reporting invoice: ${serial}...`);

  // Create and sign invoice
  const invoice = new ZATCAInvoice({
    acceptWarning: true,
    props: invoiceProps,
    signer,
  });

  const signResult = await invoice.sign(
    egs.getPrivateKey()!
  );
  const { signedXml } = signResult;
  const { invoiceHash } = signResult;

  // Report invoice
  const reportResult = await egs.reportInvoice(signedXml, invoiceHash);

  if (reportResult.isErr()) {
    console.log(
      `[SERVER] Invoice ${serial} failed: ${String(reportResult.error)}`
    );
    serverInvoices.push({
      invoiceHash,
      invoiceSerialNumber: serial,
      reportingStatus: "FAILED",
      signedXml,
      timestamp: new Date().toISOString(),
    });
    saveServerState();
    return {
      error: String(reportResult.error),
      invoiceHash,
      invoiceSerialNumber: serial,
      success: false,
    };
  }

  console.log(`[SERVER] Invoice ${serial} reported successfully`);
  serverInvoices.push({
    invoiceHash,
    invoiceSerialNumber: serial,
    reportingStatus: reportResult.value.reportingStatus,
    signedXml,
    timestamp: new Date().toISOString(),
  });
  saveServerState();

  return {
    clearanceStatus: reportResult.value.clearanceStatus,
    invoiceHash,
    invoiceSerialNumber: serial,
    reportingStatus: reportResult.value.reportingStatus,
    success: true,
  };
};

export const signAndReportBatch = async (
  invoicePropsArray: ZATCAInvoiceProps[]
): Promise<BatchReportResult> => {
  if (!egs || !signer) {
    throw new Error("EGS not initialized. Call onboardEGS() first.");
  }

  console.log(
    `[SERVER] Processing batch of ${invoicePropsArray.length} invoices...`
  );
  const results: SingleReportResult[] = [];

  // Process sequentially
  for (let i = 0; i < invoicePropsArray.length; i++) {
    const invoiceProps = invoicePropsArray[i];
    const serial = invoiceProps.invoiceSerialNumber;

    try {
      // Create and sign invoice
      const invoice = new ZATCAInvoice({
        acceptWarning: true,
        props: invoiceProps,
        signer,
      });

      const signResult = await invoice.sign(
        egs.getPrivateKey()!
      );
      const { signedXml } = signResult;
      const { invoiceHash } = signResult;

      // Report invoice
      const reportResult = await egs.reportInvoice(signedXml, invoiceHash);

      if (reportResult.isErr()) {
        console.log(
          `[SERVER] Batch invoice ${i + 1}/${invoicePropsArray.length}: FAILED`
        );
        serverInvoices.push({
          invoiceHash,
          invoiceSerialNumber: serial,
          reportingStatus: "FAILED",
          signedXml,
          timestamp: new Date().toISOString(),
        });
        results.push({
          error: String(reportResult.error),
          invoiceHash,
          invoiceSerialNumber: serial,
          success: false,
        });
      } else {
        console.log(
          `[SERVER] Batch invoice ${i + 1}/${invoicePropsArray.length}: OK`
        );
        serverInvoices.push({
          invoiceHash,
          invoiceSerialNumber: serial,
          reportingStatus: reportResult.value.reportingStatus,
          signedXml,
          timestamp: new Date().toISOString(),
        });
        results.push({
          clearanceStatus: reportResult.value.clearanceStatus,
          invoiceHash,
          invoiceSerialNumber: serial,
          reportingStatus: reportResult.value.reportingStatus,
          success: true,
        });
      }
    } catch (error: any) {
      console.log(
        `[SERVER] Batch invoice ${i + 1}/${invoicePropsArray.length}: FAILED`
      );
      results.push({
        error: error.message || "Unknown error",
        invoiceHash: "",
        invoiceSerialNumber: serial,
        success: false,
      });
    }
  }

  // Save state once at the end
  saveServerState();

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[SERVER] Batch complete: ${successCount}/${invoicePropsArray.length} succeeded`
  );

  return results;
};
