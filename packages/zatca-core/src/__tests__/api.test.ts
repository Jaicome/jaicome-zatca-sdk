import {
  buildInvoice,
  generatePhaseOneQR,
  parseInvoice,
  prepareSigningInput,
} from "../api.js";
import { valid_simplified_invoice_xml_sample } from "../samples/index.js";
import { ZodValidationError } from "../schemas/index.js";
import { base64ToUint8Array } from "../utils/index.js";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice.js";

const now = new Date();
const issueDate = now;

const validInvoiceProps: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    location: {
      city: "Khobar",
      citySubdivision: "West",
      street: "King Fahd st",
      plotIdentification: "0000",
      building: "0000",
      postalZone: "31952",
    },
    model: "IOS",
    name: "EGS2",
    vatName: "Jaicome Information Technology",
    vatNumber: "311497191800003",
  },
  invoiceCode: "SIMPLIFIED",
  invoiceCounterNumber: 1,
  invoiceSerialNumber: "EGS1-886431145-101",
  invoiceType: "INVOICE",
  issueDate,
  lineItems: [
    {
      discounts: [{ amount: 5, reason: "discount" }],
      id: "1",
      name: "TEST ITEM",
      quantity: 2,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  paymentMethod: "CASH",
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

describe("core public api", () => {
  it("buildInvoice creates invoice from props", () => {
    const invoice = buildInvoice(validInvoiceProps);
    const invoiceId = invoice.getXML().get("Invoice/cbc:ID")?.[0];

    expect(invoiceId).toBe(validInvoiceProps.invoiceSerialNumber);
  });

  it("buildInvoice throws a graceful error for empty props", () => {
    expect(() =>
      buildInvoice(undefined as unknown as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("parseInvoice parses XML into ZATCAInvoice", () => {
    const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
    const invoiceId = invoice.getXML().get("Invoice/cbc:ID")?.[0];

    expect(invoiceId).toBe("SME00062");
  });

  it("prepareSigningInput returns SigningInput contract shape", () => {
    const invoice = buildInvoice(validInvoiceProps);
    const signingInput = prepareSigningInput(invoice);

    expect(signingInput).toStrictEqual({
      invoiceHash: "",
      invoiceXml: invoice.getXML().toString({}),
      privateKeyReference: "",
    });
  });

  it("generatePhaseOneQR returns valid base64 TLV payload", () => {
    const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
    const qr = generatePhaseOneQR(invoice);
    const qrBytes = base64ToUint8Array(qr);

    expect(qr).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(qrBytes.length).toBeGreaterThan(0);
  });
});
