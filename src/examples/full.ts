import * as fs from "fs";
import {
  type ComplianceCheckPayload,
  EGS,
  type EGSUnitInfo,
  REQUIRED_COMPLIANCE_STEPS,
  type ZATCAComplianceStep,
  NodeSigner,
} from "@jaicome/zatca-server";
import {
  ZATCAInvoice,
  type ZATCAInvoiceLineItem,
  type ZATCAInvoiceProps,
  ZATCAInvoiceTypes,
  ZATCAPaymentMethods,
} from "@jaicome/zatca-core";

const now = new Date();
const issueDate = now.toISOString().split("T")[0];
const issueTime = now.toISOString().split("T")[1].slice(0, 8);
const GENESIS_PREVIOUS_INVOICE_HASH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

// Sample line items
const line_item_1: ZATCAInvoiceLineItem = {
  id: "1",
  name: "TEST NAME",
  quantity: 44,
  tax_exclusive_price: 22,
  VAT_percent: 0.15,
  discounts: [{ amount: 1, reason: "discount" }],
};

const line_item_2: ZATCAInvoiceLineItem = {
  id: "2",
  name: "TEST NAME 1",
  quantity: 10,
  tax_exclusive_price: 5,
  VAT_percent: 0.05,
  discounts: [{ amount: 2, reason: "discount" }],
};

const line_item_3: ZATCAInvoiceLineItem = {
  id: "3",
  name: "TEST NAME 2",
  quantity: 10,
  tax_exclusive_price: 5,
  VAT_percent: 0.0,
  vat_category: {
    code: "Z",
    reason_code: "VATEX-SA-34-4",
    reason: "Supply of a qualifying means of transport",
  },
};

// Sample EGSUnit
const egsunit: EGSUnitInfo = {
  uuid: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
  custom_id: "EGS2",
  model: "IOS",
  CRN_number: "7032256278",
  VAT_name: "شركة جاي كوم لتقنية المعلومات",
  VAT_number: "311497191800003",
  location: {
    city: "Khobar",
    city_subdivision: "West",
    street: "King Fahahd st",
    plot_identification: "0000",
    building: "0000",
    postal_zone: "31952",
  },
  customer_info: {
    city: "jeddah",
    city_subdivision: "ssss",
    buyer_name: "S7S",
    building: "00",
    postal_zone: "00000",
    street: "__",
    vat_number: "311498192800003",
    customer_crn_number: "7052156278", // 10-digit CRN for the buyer
  },
  branch_name: "My Branch Name",
  branch_industry: "Food",
};

const buildInvoicePropsForComplianceStep = (
  step: ZATCAComplianceStep,
  invoice_counter_number: number,
  previous_invoice_hash: string,
  canceled_serial_invoice_number: string,
): ZATCAInvoiceProps => {
  const invoice_serial_number = `EGS1-886431145-${100 + invoice_counter_number}`;
  const shared = {
    egs_info: egsunit,
    invoice_counter_number,
    invoice_serial_number,
    issue_date: issueDate,
    issue_time: `${issueTime}Z`,
    previous_invoice_hash,
    line_items: [line_item_1, line_item_2, line_item_3],
  };

  if (step === "standard-compliant") {
    return {
      ...shared,
      invoice_type: ZATCAInvoiceTypes.INVOICE,
      invoice_code: "0100000",
      actual_delivery_date: "2024-02-29",
    };
  }

  if (step === "simplified-compliant") {
    return {
      ...shared,
      invoice_type: ZATCAInvoiceTypes.INVOICE,
      invoice_code: "0200000",
      actual_delivery_date: "2024-02-29",
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
    invoice_type: is_credit_note
      ? ZATCAInvoiceTypes.CREDIT_NOTE
      : ZATCAInvoiceTypes.DEBIT_NOTE,
    invoice_code: is_standard_note ? "0100000" : "0200000",
    cancelation: {
      canceled_serial_invoice_number,
      payment_method: ZATCAPaymentMethods.CASH,
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
fs.writeFileSync("test_invoice.xml", invoiceXMLString, "utf8");
console.log("✅ Invoice XML (unsigned) saved as test_invoice.xml");

const main = async () => {
  try {
    console.log("Starting ZATCA e-invoice process...");

    // 1. Initialize EGS unit
    const egs = new EGS(egsunit, "simulation");

    // 2. Generate Keys & CSR
    await egs.generateNewKeysAndCSR(false, "solution_name");
    console.log("Keys and CSR generated successfully");

    // 3. Issue compliance certificate
    const otp = "555453";
    const compliance_request_id = await egs.issueComplianceCertificate(otp);
    console.log(
      "Compliance certificate issued with request ID:",
      compliance_request_id,
    );

    // 4. Create NodeSigner using compliance certificate
    const signer = new NodeSigner(egs.get().compliance_certificate!);

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
        egs.get().compliance_certificate!,
        egs.get().private_key!,
      );
      const signed_invoice_string = result.signedXml;
      const invoice_hash = result.invoiceHash;
      complianceChecks[step] = { signed_invoice_string, invoice_hash };
      serialByStep[step] = `EGS1-886431145-${101 + index}`;
      previousHash = invoice_hash;
      previousSerial = serialByStep[step];

      fs.writeFileSync(`invoice_${step}.xml`, signed_invoice_string, "utf8");
      console.log(`✅ Signed invoice for ${step} generated`);
    }

    const complianceResults =
      await egs.runComplianceChecksForProduction(complianceChecks);
    REQUIRED_COMPLIANCE_STEPS.forEach((step) => {
      const stepResult = complianceResults[step];
      console.log(
        `Compliance step ${step}:`,
        stepResult?.validationResults?.status,
      );
    });

    const production_request_id = await egs.issueProductionCertificate(
      compliance_request_id,
    );
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
      egs.get().compliance_certificate!,
      egs.get().private_key!,
    );
    const signed_invoice_string = reportResult.signedXml;
    const invoice_hash = reportResult.invoiceHash;

    const reportedInvoice = await egs.reportInvoice(
      signed_invoice_string,
      invoice_hash,
    );
    console.log("Invoice reporting status:", reportedInvoice?.reportingStatus);

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
