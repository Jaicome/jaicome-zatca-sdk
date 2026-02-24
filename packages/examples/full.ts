import * as fs from "node:fs";
import * as path from "node:path";
import {
  ZATCAInvoice,
  type ZATCAInvoiceLineItem,
  type ZATCAInvoiceProps,
} from "@jaicome/zatca-core";
import {
  type ComplianceCheckPayload,
  EGS,
  type EGSInfo,
  NodeSigner,
  REQUIRED_COMPLIANCE_STEPS,
  type ZATCAComplianceStep,
} from "@jaicome/zatca-server";

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);
const outputDir = path.resolve(process.cwd(), "tmp");
fs.mkdirSync(outputDir, { recursive: true });
const GENESIS_PREVIOUS_INVOICE_HASH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

// Sample line items
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

// Sample EGSUnit
const egsunit: EGSInfo = {
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

const buildInvoicePropsForComplianceStep = (
  step: ZATCAComplianceStep,
  invoiceCounterNumber: number,
  previousInvoiceHash: string,
  canceledSerialInvoiceNumber: string,
): ZATCAInvoiceProps => {
  const invoiceSerialNumber = `EGS1-886431145-${100 + invoiceCounterNumber}`;
  const shared = {
    egsInfo: egsunit,
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
    invoiceType: is_credit_note
      ? "CREDIT_NOTE"
      : "DEBIT_NOTE",
    invoiceCode: is_standard_note ? "STANDARD" : "SIMPLIFIED",
    cancelation: {
      canceledSerialInvoiceNumber,
      paymentMethod: "CASH",
      reason: "Compliance onboarding reference",
    },
  };
};

const baseInvoice = new ZATCAInvoice({
  props: buildInvoicePropsForComplianceStep(
    "simplified-compliant",
    1,
    GENESIS_PREVIOUS_INVOICE_HASH,
    "EGS1-886431145-100",
  ),
  acceptWarning: true,
});
const invoiceXMLString = baseInvoice.getXML().toString({ no_header: false });
fs.writeFileSync(
  path.join(outputDir, "test_invoice.xml"),
  invoiceXMLString,
  "utf8",
);
console.log("✅ Invoice XML (unsigned) saved in tmp/test_invoice.xml");

const main = async () => {
  try {
    console.log("Starting ZATCA e-invoice process...");

    // 1. Initialize EGS unit
    const egs = new EGS(egsunit, "simulation");

    // 2. Generate Keys & CSR
    await egs.generateNewKeysAndCSR(false, "solution_name");
    console.log("Keys and CSR generated successfully");

    // 3. Issue compliance certificate
    const otp = "231324";
    const complianceCertResult = await egs.issueComplianceCertificate(otp);
    if (complianceCertResult.isErr()) {
      console.error("Failed to issue compliance certificate:", complianceCertResult.error);
      return;
    }
    const compliance_request_id = complianceCertResult.value;
    console.log(
      "Compliance certificate issued with request ID:",
      compliance_request_id,
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
        props: buildInvoicePropsForComplianceStep(
          step,
          index + 1,
          previousHash,
          previousSerial,
        ),
        signer,
        acceptWarning: true,
      });

      const result = await invoice.sign(
        egs.getComplianceCertificate()!,
        egs.getPrivateKey()!,
      );
      const signedInvoiceString = result.signedXml;
      const invoiceHash = result.invoiceHash;
      complianceChecks[step] = { signedInvoiceString, invoiceHash };
      serialByStep[step] = `EGS1-886431145-${101 + index}`;
      previousHash = invoiceHash;
      previousSerial = serialByStep[step];

      fs.writeFileSync(
        path.join(outputDir, `invoice_${step}.xml`),
        signedInvoiceString,
        "utf8",
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
        stepResult?.validationResults?.status,
      );
    });

    const productionResult = await egs.issueProductionCertificate(
      compliance_request_id,
    );
    if (productionResult.isErr()) {
      console.error("Failed to issue production certificate:", productionResult.error);
      return;
    }
    const production_request_id = productionResult.value;
    console.log(
      "Production certificate issued with request ID:",
      production_request_id,
    );

    const reportInvoice = new ZATCAInvoice({
      props: buildInvoicePropsForComplianceStep(
        "simplified-compliant",
        7,
        previousHash,
        previousSerial,
      ),
      signer,
      acceptWarning: true,
    });
    const reportResult = await reportInvoice.sign(
      egs.getComplianceCertificate()!,
      egs.getPrivateKey()!,
    );
    const signedInvoiceString = reportResult.signedXml;
    const invoiceHash = reportResult.invoiceHash;
    const reportedInvoiceResult = await egs.reportInvoice(
      signedInvoiceString,
      invoiceHash,
    );
    if (reportedInvoiceResult.isErr()) {
      console.error("Failed to report invoice:", reportedInvoiceResult.error);
      return;
    }
    console.log("Invoice reporting status:", reportedInvoiceResult.value?.reportingStatus);

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
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    };
    console.error("Error summary:", JSON.stringify(error_summary, null, 2));
  }
};

main();
