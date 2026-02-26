import * as fs from "node:fs";
import * as path from "node:path";

import { ZATCAInvoice } from "@jaicome/zatca-core";
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

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);
const outputDir = path.resolve(process.cwd(), "tmp");
fs.mkdirSync(outputDir, { recursive: true });

// Genesis hash for the first invoice in the chain
const GENESIS_PREVIOUS_INVOICE_HASH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

// Line item for 1 SAR invoice with 15% VAT (Total: 1.15 SAR)
const lineItem1SAR: ZATCAInvoiceLineItem = {
  id: "1",
  name: "Test Product 1 SAR",
  quantity: 1,
  taxExclusivePrice: 1,
  vatPercent: 0.15,
};

// EGS Unit configuration
const egsunit: EGSInfo = {
  branchIndustry: "Retail",
  branchName: "Main Branch",
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  location: {
    building: "5678",
    city: "Riyadh",
    citySubdivision: "Al Olaya",
    plotIdentification: "1234",
    postalZone: "12345",
    street: "King Fahd Road",
  },
  model: "TestDevice",
  name: "Production Refund Test EGS",
  vatName: "Production Test Company",
  vatNumber: "311497191800003",
};

// Helper function to build invoice props for compliance checks
const buildInvoicePropsForComplianceStep = (
  step: ZATCAComplianceStep,
  invoiceCounterNumber: number,
  previousInvoiceHash: string,
  canceledSerialInvoiceNumber: string
): ZATCAInvoiceProps => {
  const invoiceSerialNumber = `PROD-TEST-COMPLIANCE-${100 + invoiceCounterNumber}`;
  const shared = {
    crnNumber: "1234567890",
    customerInfo: {
      building: "100",
      buyerName: "Compliance Test Customer",
      city: "Riyadh",
      citySubdivision: "Al Malaz",
      postalZone: "11564",
      street: "Test Street",
    },
    egsInfo: egsunit,
    invoiceCounterNumber,
    invoiceSerialNumber,
    issueDate,
    issueTime: `${issueTime}Z`,
    lineItems: [lineItem1SAR],
    previousInvoiceHash,
  };

  if (step === "standard-compliant") {
    return {
      ...shared,
      actualDeliveryDate: issueDate,
      invoiceCode: "STANDARD",
      invoiceType: "INVOICE",
    };
  }

  if (step === "simplified-compliant") {
    return {
      ...shared,
      actualDeliveryDate: issueDate,
      invoiceCode: "SIMPLIFIED",
      invoiceType: "INVOICE",
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
      paymentMethod: "CASH",
      reason: "Compliance check",
    },
    invoiceCode: is_standard_note ? "STANDARD" : "SIMPLIFIED",
    invoiceType: is_credit_note ? "CREDIT_NOTE" : "DEBIT_NOTE",
  };
};

const main = async () => {
  try {
    console.log("🚀 Starting Production Refund Test...\n");

    // 1. Initialize EGS unit
    console.log("📝 Step 1: Initializing EGS...");
    const egs = new EGS(egsunit, "simulation");
    console.log("✅ EGS initialized\n");

    // 2. Generate Keys & CSR
    console.log("🔑 Step 2: Generating keys and CSR...");
    await egs.generateNewKeysAndCSR("Production Refund Test Solution");
    console.log("✅ Keys and CSR generated\n");

    // 3. Issue compliance certificate
    console.log("📜 Step 3: Issuing compliance certificate...");
    const otp = "563023"; // Replace with actual OTP from ZATCA portal
    const complianceCertResult = await egs.issueComplianceCertificate(otp);

    if (complianceCertResult.isErr()) {
      console.error(
        "❌ Failed to issue compliance certificate:",
        complianceCertResult.error
      );
      return;
    }

    const compliance_request_id = complianceCertResult.value;
    console.log(
      "✅ Compliance certificate issued (Request ID:",
      compliance_request_id,
      ")\n"
    );

    // 4. Run compliance checks (required before production certificate)
    console.log("🔍 Step 4: Running compliance checks...");
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
    let previousSerial = "PROD-TEST-COMPLIANCE-100";

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
        egs.getComplianceCertificate()!,
        egs.getPrivateKey()!
      );
      const signedInvoiceString = result.signedXml;
      const { invoiceHash } = result;
      complianceChecks[step] = { invoiceHash, signedInvoiceString };
      serialByStep[step] = `PROD-TEST-COMPLIANCE-${101 + index}`;
      previousHash = invoiceHash;
      previousSerial = serialByStep[step];

      console.log(`  ✅ Compliance check invoice for ${step} generated`);
    }

    const complianceResultsResult =
      await egs.runComplianceChecksForProduction(complianceChecks);
    if (complianceResultsResult.isErr()) {
      console.error(
        "❌ Compliance checks failed:",
        complianceResultsResult.error
      );
      return;
    }
    const complianceResults = complianceResultsResult.value;
    REQUIRED_COMPLIANCE_STEPS.forEach((step) => {
      const stepResult = complianceResults[step];
      console.log(
        `  ✅ Compliance step ${step}:`,
        stepResult?.validationResults?.status
      );
    });
    console.log();

    // 5. Issue production certificate
    console.log("🏭 Step 5: Issuing production certificate...");
    const productionResult = await egs.issueProductionCertificate(
      compliance_request_id
    );
    if (productionResult.isErr()) {
      console.error(
        "❌ Failed to issue production certificate:",
        productionResult.error
      );
      return;
    }
    const production_request_id = productionResult.value;
    console.log(
      "✅ Production certificate issued (Request ID:",
      production_request_id,
      ")\n"
    );

    // 6. Create and sign the first invoice (1 SAR + 15% VAT)
    console.log("📄 Step 6: Creating first invoice (1 SAR + 15% VAT)...");

    const firstInvoiceProps: ZATCAInvoiceProps = {
      egsInfo: egsunit,
      invoiceCounterNumber: 7,
      invoiceSerialNumber: "PROD-TEST-001",
      issueDate,
      issueTime: `${issueTime}Z`,
      previousInvoiceHash: previousHash, // Chain from last compliance check invoice
      lineItems: [lineItem1SAR],
      crnNumber: "1234567890",
      invoiceType: "INVOICE",
      invoiceCode: "SIMPLIFIED",
      customerInfo: {
        building: "100",
        buyerName: "Test Customer",
        city: "Riyadh",
        citySubdivision: "Al Malaz",
        postalZone: "11564",
        street: "Test Street",
      },
    };

    const firstInvoice = new ZATCAInvoice({
      acceptWarning: true,
      props: firstInvoiceProps,
      signer,
    });

    const firstInvoiceResult = await firstInvoice.sign(
      egs.getComplianceCertificate()!,
      egs.getPrivateKey()!
    );

    const firstInvoiceXML = firstInvoiceResult.signedXml;
    const firstInvoiceHash = firstInvoiceResult.invoiceHash;
    const firstInvoiceSerial = "PROD-TEST-001";

    // Save first invoice
    fs.writeFileSync(
      path.join(outputDir, "production_invoice_1_sar.xml"),
      firstInvoiceXML,
      "utf8"
    );
    console.log(
      "✅ First invoice (1 SAR + 15% VAT = 1.15 SAR) created and signed"
    );
    console.log("   Serial:", firstInvoiceSerial);
    console.log("   Hash:", firstInvoiceHash);
    console.log("   Saved to: tmp/production_invoice_1_sar.xml\n");

    // Report first invoice to ZATCA
    console.log("📤 Reporting first invoice to ZATCA...");
    const firstInvoiceReportResult = await egs.reportInvoice(
      firstInvoiceXML,
      firstInvoiceHash
    );

    if (firstInvoiceReportResult.isErr()) {
      console.error(
        "❌ Failed to report first invoice:",
        firstInvoiceReportResult.error
      );
      return;
    }

    console.log("✅ First invoice reported successfully");
    console.log(
      "   Reporting status:",
      firstInvoiceReportResult.value?.reportingStatus
    );
    console.log(
      "   Clearance status:",
      firstInvoiceReportResult.value?.clearanceStatus || "N/A"
    );
    console.log();

    // 7. Create and sign the refund invoice (Credit Note)
    console.log("💰 Step 7: Creating refund invoice (Credit Note)...");

    const refundInvoiceProps: ZATCAInvoiceProps = {
      egsInfo: egsunit,
      invoiceCounterNumber: 8,
      invoiceSerialNumber: "PROD-TEST-002",
      issueDate,
      issueTime: `${issueTime}Z`,
      previousInvoiceHash: firstInvoiceHash, // Chain to first invoice
      lineItems: [lineItem1SAR], // Same line item but as refund
      crnNumber: "1234567890",
      invoiceType: "CREDIT_NOTE",
      invoiceCode: "SIMPLIFIED",
      customerInfo: {
        building: "100",
        buyerName: "Test Customer",
        city: "Riyadh",
        citySubdivision: "Al Malaz",
        postalZone: "11564",
        street: "Test Street",
      },
      cancelation: {
        canceledSerialInvoiceNumber: firstInvoiceSerial, // Reference first invoice
        paymentMethod: "CASH",
        reason: "Customer requested refund",
      },
    };

    const refundInvoice = new ZATCAInvoice({
      acceptWarning: true,
      props: refundInvoiceProps,
      signer,
    });

    const refundInvoiceResult = await refundInvoice.sign(
      egs.getComplianceCertificate()!,
      egs.getPrivateKey()!
    );

    const refundInvoiceXML = refundInvoiceResult.signedXml;
    const refundInvoiceHash = refundInvoiceResult.invoiceHash;
    const refundInvoiceSerial = "PROD-TEST-002";

    // Save refund invoice
    fs.writeFileSync(
      path.join(outputDir, "production_refund_invoice.xml"),
      refundInvoiceXML,
      "utf8"
    );
    console.log("✅ Refund invoice (Credit Note) created and signed");
    console.log("   Serial:", refundInvoiceSerial);
    console.log("   Hash:", refundInvoiceHash);
    console.log("   Saved to: tmp/production_refund_invoice.xml\n");

    // Report refund invoice to ZATCA
    console.log("📤 Reporting refund invoice to ZATCA...");
    const refundInvoiceReportResult = await egs.reportInvoice(
      refundInvoiceXML,
      refundInvoiceHash
    );

    if (refundInvoiceReportResult.isErr()) {
      console.error(
        "❌ Failed to report refund invoice:",
        refundInvoiceReportResult.error
      );
      return;
    }

    console.log("✅ Refund invoice reported successfully");
    console.log(
      "   Reporting status:",
      refundInvoiceReportResult.value?.reportingStatus
    );
    console.log(
      "   Clearance status:",
      refundInvoiceReportResult.value?.clearanceStatus || "N/A"
    );
    console.log();

    // 8. Display chain information
    console.log("🔗 Invoice Chain:");
    console.log(
      "   Genesis → [6 Compliance Checks] → First Invoice → Refund Invoice"
    );
    console.log(
      "   " + GENESIS_PREVIOUS_INVOICE_HASH.slice(0, 15) + "... → ... →"
    );
    console.log("   " + firstInvoiceHash.slice(0, 15) + "... →");
    console.log("   " + refundInvoiceHash.slice(0, 15) + "...\n");

    console.log("✨ Production Refund Test completed successfully!");
    console.log("\nSummary:");
    console.log("- Completed 6 compliance check invoices");
    console.log("- Obtained production certificate from ZATCA");
    console.log("- First Invoice: 1 SAR + 15% VAT = 1.15 SAR total");
    console.log("- Refund Invoice: Credit Note for 1.15 SAR total");
    console.log("- All invoices properly chained");
    console.log("- Both test invoices reported to ZATCA successfully");
  } catch (error: any) {
    console.error("\n❌ Error occurred in the process:");
    console.error("Error message:", error.message);

    if (error.response) {
      console.error("API Response data:", error.response.data);
      console.error("API Response status:", error.response.status);
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
