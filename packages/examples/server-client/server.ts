import * as fs from "node:fs";
import * as path from "node:path";
import {
  EGS,
  NodeSigner,
  REQUIRED_COMPLIANCE_STEPS,
  type ComplianceCheckPayload,
  type ZATCAComplianceStep,
  type EGSInfo,
} from "@jaicome/zatca-server";
import {
  ZATCAInvoice,
  type ZATCAInvoiceProps,
  type ZATCAInvoiceLineItem,
} from "@jaicome/zatca-core";

// ============================================================================
// TYPES
// ============================================================================

export type OnboardResult = {
  previousInvoiceHash: string;
  invoiceCounterStart: number;
};

export type SingleReportResult = {
  invoiceSerialNumber: string;
  success: boolean;
  invoiceHash: string;
  reportingStatus?: string;
  clearanceStatus?: string;
  error?: string;
};

export type BatchReportResult = SingleReportResult[];

// ============================================================================
// CONSTANTS & EGS INFO
// ============================================================================

const SERVER_JSON_PATH = path.join(__dirname, "./tmp/server.json");

const GENESIS_PREVIOUS_INVOICE_HASH = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

// Re-export for client usage
export { GENESIS_PREVIOUS_INVOICE_HASH };

// Sample line items for compliance invoices
const lineItem1: ZATCAInvoiceLineItem = {
  id: "1",
  name: "TEST NAME",
  quantity: 44,
  taxExclusivePrice: 22,
  vatPercent: 0.15,
  discounts: [{ amount: 1, reason: "discount" }],
};

const lineItem2: ZATCAInvoiceLineItem = {
  id: "2",
  name: "TEST NAME 1",
  quantity: 10,
  taxExclusivePrice: 5,
  vatPercent: 0.05,
  discounts: [{ amount: 2, reason: "discount" }],
};

const lineItem3: ZATCAInvoiceLineItem = {
  id: "3",
  name: "TEST NAME 2",
  quantity: 10,
  taxExclusivePrice: 5,
  vatPercent: 0.0,
  vatCategory: {
    code: "Z",
    reasonCode: "VATEX-SA-34-4",
    reason: "Supply of a qualifying means of transport",
  },
};

export const egsInfo: EGSInfo = {
  id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  name: "EGS2",
  model: "IOS",
  vatName: "شركة جاي كوم لتقنية المعلومات",
  vatNumber: "311497191800003",
  location: {
    city: "Khobar",
    citySubdivision: "West",
    street: "King Fahahd st",
    plotIdentification: "0000",
    building: "0000",
    postalZone: "31952",
  },
  branchName: "My Branch Name",
  branchIndustry: "Food",
};

// ============================================================================
// MODULE STATE
// ============================================================================

let egs: EGS | null = null;
let signer: NodeSigner | null = null;
let serverInvoices: Array<{
  invoiceSerialNumber: string;
  invoiceHash: string;
  signedXml: string;
  reportingStatus: string;
  timestamp: string;
}> = [];

// ============================================================================
// HELPERS
// ============================================================================

const saveServerState = (): void => {
  fs.mkdirSync(path.dirname(SERVER_JSON_PATH), { recursive: true });
  fs.writeFileSync(SERVER_JSON_PATH, JSON.stringify(serverInvoices, null, 2), "utf8");
};

const buildInvoicePropsForComplianceStep = (
  step: ZATCAComplianceStep,
  invoiceCounterNumber: number,
  previousInvoiceHash: string,
  canceledSerialInvoiceNumber: string,
): ZATCAInvoiceProps => {
  const invoiceSerialNumber = `EGS1-886431145-${100 + invoiceCounterNumber}`;
  const issueDate = "2024-02-29";
  const issueTime = "15:30:00";

  const shared = {
    egsInfo,
    invoiceCounterNumber,
    invoiceSerialNumber,
    issueDate,
    issueTime: `${issueTime}Z`,
    previousInvoiceHash,
    lineItems: [lineItem1, lineItem2, lineItem3],
    crnNumber: "7032256278",
    customerInfo: {
      buyerName: "S7S",
      city: "jeddah",
      citySubdivision: "ssss",
      building: "00",
      postalZone: "00000",
      street: "__",
      vatNumber: "311498192800003",
      customerCrnNumber: "7052156278",
    },
  };

  if (step === "standard-compliant") {
    return {
      ...shared,
      invoiceType: "INVOICE",
      invoiceCode: "STANDARD",
      actualDeliveryDate: "2024-02-29",
    };
  }

  if (step === "simplified-compliant") {
    return {
      ...shared,
      invoiceType: "INVOICE",
      invoiceCode: "SIMPLIFIED",
      actualDeliveryDate: "2024-02-29",
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
    invoiceType: is_credit_note ? "CREDIT_NOTE" : "DEBIT_NOTE",
    invoiceCode: is_standard_note ? "STANDARD" : "SIMPLIFIED",
    cancelation: {
      canceledSerialInvoiceNumber,
      paymentMethod: "CASH",
      reason: "Compliance onboarding reference",
    },
  };
};

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export const onboardEGS = async (): Promise<OnboardResult> => {
  console.log("[SERVER] Starting EGS onboarding...");

  // 1. Initialize EGS
  egs = new EGS(egsInfo, "simulation");

  // 2. Generate Keys & CSR
  console.log("[SERVER] Generating keys and CSR...");
  await egs.generateNewKeysAndCSR("Server-Client Example");

  // 3. Issue compliance certificate
  console.log("[SERVER] Issuing compliance certificate...");
  const complianceCertResult = await egs.issueComplianceCertificate("123456");
  if (complianceCertResult.isErr()) {
    throw new Error(`Failed to issue compliance certificate: ${complianceCertResult.error}`);
  }
  const compliance_request_id = complianceCertResult.value;
  console.log("[SERVER] Compliance certificate issued");

  // 4. Create NodeSigner
  signer = new NodeSigner(egs.getComplianceCertificate()!);

  // 5. Build and sign all 6 compliance check invoices
  console.log("[SERVER] Building and signing 6 compliance check invoices...");
  const complianceChecks: Partial<Record<ZATCAComplianceStep, ComplianceCheckPayload>> = {};
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
      props: buildInvoicePropsForComplianceStep(step, index + 1, previousHash, previousSerial),
      signer: signer!,
      acceptWarning: true,
    });

    const result = await invoice.sign(egs.getComplianceCertificate()!, egs.getPrivateKey()!);
    const signedInvoiceString = result.signedXml;
    const invoiceHash = result.invoiceHash;

    complianceChecks[step] = { signedInvoiceString, invoiceHash };
    previousHash = invoiceHash;
    previousSerial = `EGS1-886431145-${101 + index}`;

    console.log(`[SERVER] Compliance step ${index + 1}/6: ${step} signed`);
  }

  // 6. Run compliance checks
  console.log("[SERVER] Running compliance checks...");
  const complianceResultsResult = await egs.runComplianceChecksForProduction(complianceChecks);
  if (complianceResultsResult.isErr()) {
    throw new Error(`Compliance checks failed: ${complianceResultsResult.error}`);
  }
  const complianceResults = complianceResultsResult.value;
  REQUIRED_COMPLIANCE_STEPS.forEach((step) => {
    const stepResult = complianceResults[step];
    console.log(`[SERVER] Compliance step ${step}: ${stepResult?.validationResults?.status}`);
  });

  // 7. Issue production certificate
  console.log("[SERVER] Issuing production certificate...");
  const productionResult = await egs.issueProductionCertificate(compliance_request_id);
  if (productionResult.isErr()) {
    throw new Error(`Failed to issue production certificate: ${productionResult.error}`);
  }
  console.log("[SERVER] EGS onboarding complete. Production certificate issued.");

  return {
    previousInvoiceHash: previousHash,
    invoiceCounterStart: 7,
  };
};

export const signAndReportInvoice = async (
  invoiceProps: ZATCAInvoiceProps,
): Promise<SingleReportResult> => {
  if (!egs || !signer) {
    throw new Error("EGS not initialized. Call onboardEGS() first.");
  }

  const serial = invoiceProps.invoiceSerialNumber;
  console.log(`[SERVER] Signing and reporting invoice: ${serial}...`);

  // Create and sign invoice
  const invoice = new ZATCAInvoice({
    props: invoiceProps,
    signer,
    acceptWarning: true,
  });

  const signResult = await invoice.sign(egs.getComplianceCertificate()!, egs.getPrivateKey()!);
  const signedXml = signResult.signedXml;
  const invoiceHash = signResult.invoiceHash;

  // Report invoice
  const reportResult = await egs.reportInvoice(signedXml, invoiceHash);

  if (reportResult.isErr()) {
    console.log(`[SERVER] Invoice ${serial} failed: ${String(reportResult.error)}`);
    serverInvoices.push({
      invoiceSerialNumber: serial,
      invoiceHash,
      signedXml,
      reportingStatus: "FAILED",
      timestamp: new Date().toISOString(),
    });
    saveServerState();
    return {
      invoiceSerialNumber: serial,
      success: false,
      invoiceHash,
      error: String(reportResult.error),
    };
  }

  console.log(`[SERVER] Invoice ${serial} reported successfully`);
  serverInvoices.push({
    invoiceSerialNumber: serial,
    invoiceHash,
    signedXml,
    reportingStatus: reportResult.value.reportingStatus,
    timestamp: new Date().toISOString(),
  });
  saveServerState();

  return {
    invoiceSerialNumber: serial,
    success: true,
    invoiceHash,
    reportingStatus: reportResult.value.reportingStatus,
    clearanceStatus: reportResult.value.clearanceStatus,
  };
};

export const signAndReportBatch = async (
  invoicePropsArray: ZATCAInvoiceProps[],
): Promise<BatchReportResult> => {
  if (!egs || !signer) {
    throw new Error("EGS not initialized. Call onboardEGS() first.");
  }

  console.log(`[SERVER] Processing batch of ${invoicePropsArray.length} invoices...`);
  const results: SingleReportResult[] = [];

  // Process sequentially
  for (let i = 0; i < invoicePropsArray.length; i++) {
    const invoiceProps = invoicePropsArray[i];
    const serial = invoiceProps.invoiceSerialNumber;

    try {
      // Create and sign invoice
      const invoice = new ZATCAInvoice({
        props: invoiceProps,
        signer,
        acceptWarning: true,
      });

      const signResult = await invoice.sign(egs.getComplianceCertificate()!, egs.getPrivateKey()!);
      const signedXml = signResult.signedXml;
      const invoiceHash = signResult.invoiceHash;

      // Report invoice
      const reportResult = await egs.reportInvoice(signedXml, invoiceHash);

      if (reportResult.isErr()) {
        console.log(`[SERVER] Batch invoice ${i + 1}/${invoicePropsArray.length}: FAILED`);
        serverInvoices.push({
          invoiceSerialNumber: serial,
          invoiceHash,
          signedXml,
          reportingStatus: "FAILED",
          timestamp: new Date().toISOString(),
        });
        results.push({
          invoiceSerialNumber: serial,
          success: false,
          invoiceHash,
          error: String(reportResult.error),
        });
      } else {
        console.log(`[SERVER] Batch invoice ${i + 1}/${invoicePropsArray.length}: OK`);
        serverInvoices.push({
          invoiceSerialNumber: serial,
          invoiceHash,
          signedXml,
          reportingStatus: reportResult.value.reportingStatus,
          timestamp: new Date().toISOString(),
        });
        results.push({
          invoiceSerialNumber: serial,
          success: true,
          invoiceHash,
          reportingStatus: reportResult.value.reportingStatus,
          clearanceStatus: reportResult.value.clearanceStatus,
        });
      }
    } catch (error: any) {
      console.log(`[SERVER] Batch invoice ${i + 1}/${invoicePropsArray.length}: FAILED`);
      results.push({
        invoiceSerialNumber: serial,
        success: false,
        invoiceHash: "",
        error: error.message || "Unknown error",
      });
    }
  }

  // Save state once at the end
  saveServerState();

  const successCount = results.filter((r) => r.success).length;
  console.log(`[SERVER] Batch complete: ${successCount}/${invoicePropsArray.length} succeeded`);

  return results;
};
