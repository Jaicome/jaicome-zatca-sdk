import * as fs from "node:fs";
import * as path from "node:path";

import { ZATCAInvoice, InvoiceType, PaymentMeans, GENESIS_PREVIOUS_INVOICE_HASH } from "@jaicome/zatca-core";
import type {
  ZATCAInvoiceLineItem,
  ZATCAInvoiceProps,
} from "@jaicome/zatca-core";
import {
  EGS,
  NodeSigner,
  REQUIRED_COMPLIANCE_STEPS,
} from "@jaicome/zatca-server";
import type {
  ComplianceCheckPayload,
  EGSInfo,
  ZATCAComplianceStep,
} from "@jaicome/zatca-server";

const issueDate = new Date();
const outputDir = path.resolve(process.cwd(), "tmp");
fs.mkdirSync(outputDir, { recursive: true });

// Sample line items
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

// Sample EGSUnit
const egsunit: EGSInfo = {
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

const buildInvoicePropsForComplianceStep = (
  step: ZATCAComplianceStep,
  invoiceCounterNumber: number,
  previousInvoiceHash: string,
  canceledSerialInvoiceNumber: string
): ZATCAInvoiceProps => {
  const invoiceSerialNumber = `EGS1-886431145-${100 + invoiceCounterNumber}`;
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
    egsInfo: egsunit,
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

const baseInvoice = new ZATCAInvoice({
  acceptWarning: true,
  props: buildInvoicePropsForComplianceStep(
    "simplified-compliant",
    1,
    GENESIS_PREVIOUS_INVOICE_HASH,
    "EGS1-886431145-100"
  ),
});
const invoiceXMLString = baseInvoice.getXML().toString({ no_header: false });
fs.writeFileSync(
  path.join(outputDir, "test_invoice.xml"),
  invoiceXMLString,
  "utf8"
);
console.log("✅ Invoice XML (unsigned) saved in tmp/test_invoice.xml");

const main = async () => {
  try {
    console.log("Starting ZATCA e-invoice process...");

    // 1. Initialize EGS unit
    const egs = new EGS(egsunit, "simulation");

    // 2. Generate Keys & CSR
    await egs.generateNewKeysAndCSR("Jaicome ZATCA Test");
    console.log("Keys and CSR generated successfully");

    // 3. Issue compliance certificate
    const otp = "846130";
    const complianceCertResult = await egs.issueComplianceCertificate(otp);
    if (complianceCertResult.isErr()) {
      console.error(
        "Failed to issue compliance certificate:",
        complianceCertResult.error
      );
      return;
    }
    const compliance_request_id = complianceCertResult.value;
    console.log(
      "Compliance certificate issued with request ID:",
      compliance_request_id
    );

    // 4. Create NodeSigner using compliance certificate
    const signer = new NodeSigner(egs.getComplianceCertificate()!);

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
    const serialByStep = {} as Record<ZATCAComplianceStep, string>;
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
        signer,
      });

      const result = await invoice.sign(
        egs.getPrivateKey()!
      );
      const signedInvoiceString = result.signedXml;
      const { invoiceHash } = result;
      complianceChecks[step] = { invoiceHash, signedInvoiceString };
      serialByStep[step] = `EGS1-886431145-${101 + index}`;
      previousHash = invoiceHash;
      previousSerial = serialByStep[step];

      fs.writeFileSync(
        path.join(outputDir, `invoice_${step}.xml`),
        signedInvoiceString,
        "utf8"
      );
      console.log(`✅ Signed invoice for ${step} generated`);
    }

    const complianceResultsResult =
      await egs.runComplianceChecksForProduction(complianceChecks);
    if (complianceResultsResult.isErr()) {
      console.error("Compliance checks failed:", complianceResultsResult.error);
      return;
    }
    const complianceResults = complianceResultsResult.value;
    REQUIRED_COMPLIANCE_STEPS.forEach((step) => {
      const stepResult = complianceResults[step];
      console.log(
        `Compliance step ${step}:`,
        stepResult?.validationResults?.status
      );
    });

    const productionResult = await egs.issueProductionCertificate(
      compliance_request_id
    );
    if (productionResult.isErr()) {
      console.error(
        "Failed to issue production certificate:",
        productionResult.error
      );
      return;
    }
    const production_request_id = productionResult.value;
    console.log(
      "Production certificate issued with request ID:",
      production_request_id
    );

    const reportInvoice = new ZATCAInvoice({
      acceptWarning: true,
      props: buildInvoicePropsForComplianceStep(
        "simplified-compliant",
        7,
        previousHash,
        previousSerial
      ),
      signer,
    });
    const reportResult = await reportInvoice.sign(
      egs.getPrivateKey()!
    );
    const signedInvoiceString = reportResult.signedXml;
    const { invoiceHash } = reportResult;
    const reportedInvoiceResult = await egs.reportInvoice(
      signedInvoiceString,
      invoiceHash
    );
    if (reportedInvoiceResult.isErr()) {
      console.error("Failed to report invoice:", reportedInvoiceResult.error);
      return;
    }
    console.log(
      "Invoice reporting status:",
      reportedInvoiceResult.value?.reportingStatus
    );

    console.log("Process completed successfully!");
  } catch (error: any) {
    console.error("Error occurred in the process:");
    console.error("Error message:", error.message);
    if (error.response) {
      console.error("API Response data:", error.response.data);
      console.error("API Response status:", error.response.status);
      console.error("API Response headers:", error.response.headers);
    }
    const error_summary = {
      code: error?.code,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    };
    console.error("Error summary:", JSON.stringify(error_summary, null, 2));
  }
};

main();
