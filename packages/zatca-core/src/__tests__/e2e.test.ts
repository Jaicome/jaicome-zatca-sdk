import {
  buildInvoice,
  parseInvoice,
  prepareSigningInput,
  generatePhaseOneQR,
} from "../api.js";
import { valid_simplified_invoice_xml_sample } from "../samples/index.js";
import { ZodValidationError } from "../schemas/index.js";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice.js";

const now = new Date();
const issueDate = now;

const validSampleProps: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
    location: {
      building: "0000",
      city: "Khobar",
      citySubdivision: "West",
      plotIdentification: "0000",
      postalZone: "31952",
      street: "King Fahd st",
    },
    model: "IOS",
    name: "EGS1",
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
      id: "1",
      name: "Sample Product",
      quantity: 2,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  paymentMethod: "CASH",
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

describe("@jaicome/zatca-core — end-to-end pipeline", () => {
  it("buildInvoice returns a ZATCAInvoice with non-empty XML", () => {
    const invoice = buildInvoice(validSampleProps);

    expect(invoice).toBeDefined();
    const xml = invoice.getXML().toString({});
    expectTypeOf(xml).toBeString();
    expect(xml.length).toBeGreaterThan(0);
    expect(xml).toContain("Invoice");
  });

  it("prepareSigningInput returns a SigningInput with non-empty invoiceXml", () => {
    const invoice = buildInvoice(validSampleProps);
    const signingInput = prepareSigningInput(invoice);

    expect(signingInput).toBeDefined();
    expectTypeOf(signingInput.invoiceXml).toBeString();
    expect(signingInput.invoiceXml.length).toBeGreaterThan(0);
    expect(signingInput).toHaveProperty("invoiceHash");
    expect(signingInput).toHaveProperty("privateKeyReference");
  });

  it("generatePhaseOneQR returns a non-empty base64 string from sample XML", () => {
    const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
    const qr = generatePhaseOneQR(invoice);

    expectTypeOf(qr).toBeString();
    expect(qr.length).toBeGreaterThan(0);
    expect(qr).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("parseInvoice parses XML string and returns a ZATCAInvoice", () => {
    const invoice = parseInvoice(valid_simplified_invoice_xml_sample);
    const invoiceId = invoice.getXML().get("Invoice/cbc:ID")?.[0];

    expect(invoice).toBeDefined();
    expect(invoiceId).toBe("SME00062");
  });

  it("full pipeline: buildInvoice → prepareSigningInput → generatePhaseOneQR", () => {
    const invoice = buildInvoice(validSampleProps);
    const xml = invoice.getXML().toString({});
    expect(xml.length).toBeGreaterThan(0);

    const signingInput = prepareSigningInput(invoice);
    expect(signingInput.invoiceXml.length).toBeGreaterThan(0);

    const qr = generatePhaseOneQR(invoice);
    expect(qr.length).toBeGreaterThan(0);
    expect(qr).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("parseInvoice round-trip: buildInvoice XML can be re-parsed", () => {
    const invoice = buildInvoice(validSampleProps);
    const xmlString = invoice.getXML().toString({});

    const reparsed = parseInvoice(xmlString);
    expect(reparsed).toBeDefined();
    const reparsedXml = reparsed.getXML().toString({});
    expect(reparsedXml.length).toBeGreaterThan(0);
  });

  it("buildInvoice throws ZodValidationError for invalid (empty) props", () => {
    expect(() =>
      buildInvoice(undefined as unknown as ZATCAInvoiceProps)
    ).toThrow(ZodValidationError);
  });

  it("buildInvoice throws ZodValidationError when invoice_serial_number is empty", () => {
    const invalidProps = { ...validSampleProps, invoiceSerialNumber: "" };
    expect(() => buildInvoice(invalidProps as ZATCAInvoiceProps)).toThrow(
      ZodValidationError
    );
  });

  it("zodValidationError includes field path info for invalid invoice", () => {
    const invalidProps = { ...validSampleProps, invoiceSerialNumber: "" };
    try {
      buildInvoice(invalidProps as ZATCAInvoiceProps);
      expect.fail("should have thrown ZodValidationError");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      expect(zodErr.message).toContain("Validation failed");
      expect(zodErr.name).toBe("ZodValidationError");
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("invoiceSerialNumber"))).toBeTruthy();
    }
  });
});
