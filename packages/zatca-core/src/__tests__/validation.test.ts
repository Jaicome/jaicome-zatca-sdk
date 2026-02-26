import { buildInvoice, prepareSigningInput } from "../api";
import { ZodValidationError } from "../schemas/index";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice";

const now = new Date();
const issueDate = now;

const validProps: ZATCAInvoiceProps = {
  crnNumber: "7032256278",
  egsInfo: {
    branchIndustry: "Software",
    branchName: "Main",
    id: "6f4d20e0-6bfe-4a80-9389-7dabe6620f14",
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

describe("validation contracts - zatca-core", () => {
  it("buildInvoice succeeds with valid invoice props", () => {
    const invoice = buildInvoice(validProps);
    expect(invoice).toBeDefined();
    expect(invoice.getXML).toBeDefined();
  });

  it("buildInvoice throws ZodValidationError when invoiceSerialNumber is missing", () => {
    const invalid = { ...validProps, invoiceSerialNumber: "" };
    expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(
      ZodValidationError
    );
  });

  it("zodValidationError carries typed issue path for empty invoiceSerialNumber", () => {
    const invalid = { ...validProps, invoiceSerialNumber: "" };
    try {
      buildInvoice(invalid as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      const paths = zodErr.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("invoiceSerialNumber"))).toBeTruthy();
    }
  });

  it("buildInvoice throws ZodValidationError when vatNumber is empty string", () => {
    const invalid = {
      ...validProps,
      egsInfo: { ...validProps.egsInfo, vatNumber: "" },
    };
    expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(
      ZodValidationError
    );
  });

  it("buildInvoice throws ZodValidationError when lineItems is empty", () => {
    const invalid = { ...validProps, lineItems: [] };
    expect(() => buildInvoice(invalid as ZATCAInvoiceProps)).toThrow(
      ZodValidationError
    );
  });

  it("prepareSigningInput returns valid SigningInput for a built invoice", () => {
    const invoice = buildInvoice(validProps);
    const signingInput = prepareSigningInput(invoice);
    expectTypeOf(signingInput.invoiceXml).toBeString();
    expect(signingInput.invoiceXml.length).toBeGreaterThan(0);
    expectTypeOf(signingInput.invoiceHash).toBeString();
    expectTypeOf(signingInput.privateKeyReference).toBeString();
  });

  it("zodValidationError message includes field path info", () => {
    const invalid = { ...validProps, invoiceSerialNumber: "" };
    try {
      buildInvoice(invalid as ZATCAInvoiceProps);
      expect.fail("should have thrown");
    } catch (error) {
      const zodErr = error as ZodValidationError;
      expect(zodErr.message).toContain("Validation failed");
      expect(zodErr.name).toBe("ZodValidationError");
    }
  });
});
