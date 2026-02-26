import { describe, it, expect } from "bun:test";
import { buildInvoice } from "../api";
import { ZodValidationError } from "../schemas/index";
import type { ZATCAInvoiceProps } from "../zatca-simplified-tax-invoice";

describe("customerInfo requirement for standard invoices", () => {
  const issueDate = new Date();
  const issueTime = issueDate.toISOString().split("T")[1].slice(0, 8);

  const baseProps = {
    crnNumber: "1234567890",
    egsInfo: {
      branchIndustry: "Technology",
      branchName: "Main Branch",
      id: "EGS-001",
      model: "IOS",
      name: "Company Name",
      vatName: "Company VAT Name",
      vatNumber: "300000000000003",
    },
    invoiceCounterNumber: 1,
    invoiceSerialNumber: "INV-001",
    issueDate,
    issueTime,
    lineItems: [
      {
        id: "1",
        name: "Product A",
        quantity: 1,
        taxExclusivePrice: 100,
        vatPercent: 0.15,
      },
    ],
    previousInvoiceHash: "hash123",
    invoiceType: "INVOICE" as const,
    paymentMethod: "CASH" as const,
  } as const satisfies Partial<ZATCAInvoiceProps>;

  it("should reject STANDARD invoice without customerInfo", () => {
    const props = {
      ...baseProps,
      invoiceCode: "STANDARD" as const,
    } as ZATCAInvoiceProps;

    expect(() => buildInvoice(props)).toThrow(ZodValidationError);
    try {
      buildInvoice(props);
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      const errorMessage = zodErr.issues.map((i) => i.message).join("; ");
      expect(errorMessage).toContain(
        "Customer info (BG-7) is required for standard/tax invoices"
      );
    }
  });

  it("should reject 0100000 invoice without customerInfo", () => {
    const props = {
      ...baseProps,
      invoiceCode: "0100000" as const,
    } as ZATCAInvoiceProps;

    expect(() => buildInvoice(props)).toThrow(ZodValidationError);
    try {
      buildInvoice(props);
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ZodValidationError);
      const zodErr = error as ZodValidationError;
      const errorMessage = zodErr.issues.map((i) => i.message).join("; ");
      expect(errorMessage).toContain(
        "Customer info (BG-7) is required for standard/tax invoices"
      );
    }
  });

  it("should accept STANDARD invoice with customerInfo", () => {
    const props = {
      ...baseProps,
      invoiceCode: "STANDARD" as const,
      customerInfo: {
        buyerName: "Customer Name",
        vatNumber: "300000000000003",
      },
    } as ZATCAInvoiceProps;

    const invoice = buildInvoice(props);
    expect(invoice).toBeDefined();
  });

  it("should accept 0100000 invoice with customerInfo", () => {
    const props = {
      ...baseProps,
      invoiceCode: "0100000" as const,
      customerInfo: {
        buyerName: "Customer Name",
        vatNumber: "300000000000003",
      },
    } as ZATCAInvoiceProps;

    const invoice = buildInvoice(props);
    expect(invoice).toBeDefined();
  });

  it("should accept SIMPLIFIED invoice without customerInfo", () => {
    const props = {
      ...baseProps,
      invoiceCode: "SIMPLIFIED" as const,
    } as ZATCAInvoiceProps;

    const invoice = buildInvoice(props);
    expect(invoice).toBeDefined();
  });

  it("should accept 0200000 invoice without customerInfo", () => {
    const props = {
      ...baseProps,
      invoiceCode: "0200000" as const,
    } as ZATCAInvoiceProps;

    const invoice = buildInvoice(props);
    expect(invoice).toBeDefined();
  });

  it("should accept SIMPLIFIED invoice with customerInfo", () => {
    const props = {
      ...baseProps,
      invoiceCode: "SIMPLIFIED" as const,
      customerInfo: {
        buyerName: "Customer Name",
        vatNumber: "300000000000003",
      },
    } as ZATCAInvoiceProps;

    const invoice = buildInvoice(props);
    expect(invoice).toBeDefined();
  });
});
