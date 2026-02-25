import { describe, expect, it } from "vitest";
import type { ZodIssue } from "zod";

import { ZATCAInvoicePropsSchema } from "../schemas/index.js";

/**
 * Recursively collects all error messages from Zod issues,
 * including those nested in invalid_union errors.
 */
function collectMessages(issues: ZodIssue[]): string[] {
  const messages: string[] = [];
  for (const issue of issues) {
    messages.push(issue.message);
    if (issue.code === "invalid_union" && issue.unionErrors) {
      for (const ue of issue.unionErrors) {
        messages.push(...collectMessages(ue.issues));
      }
    }
  }
  return messages;
}

const VALID_BASE = {
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
  issueDate: new Date("2024-01-15T10:00:00Z"),
  lineItems: [
    {
      id: "1",
      name: "TEST ITEM",
      quantity: 2,
      taxExclusivePrice: 100,
      vatPercent: 0.15,
    },
  ],
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

describe("contextual error messages — invoiceType", () => {
  it("invalid invoiceType '999' includes '388 (invoice)' in error messages", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      invoiceType: "999",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(messages.some((m) => m.includes("388 (invoice)"))).toBe(true);
    }
  });

  it("invalid invoiceType '999' full message is 'Must be 388 (invoice), 381 (credit note), 383 (debit note), or 386 (prepayment)'", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      invoiceType: "999",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(
        messages.some(
          (m) =>
            m ===
            "Must be 388 (invoice), 381 (credit note), 383 (debit note), or 386 (prepayment)"
        )
      ).toBe(true);
    }
  });
});

describe("contextual error messages — invoiceCode", () => {
  it("invalid invoiceCode '9999999' includes '0100000 (tax invoice)' in error messages", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      invoiceCode: "9999999",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(messages.some((m) => m.includes("0100000 (tax invoice)"))).toBe(
        true
      );
    }
  });

  it("invalid invoiceCode '9999999' full message is 'Must be 0100000 (tax invoice) or 0200000 (simplified)'", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      invoiceCode: "9999999",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(
        messages.some(
          (m) => m === "Must be 0100000 (tax invoice) or 0200000 (simplified)"
        )
      ).toBe(true);
    }
  });
});

describe("contextual error messages — paymentMethod", () => {
  it("invalid paymentMethod '99' includes '10 (cash)' in error messages", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      paymentMethod: "99",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(messages.some((m) => m.includes("10 (cash)"))).toBe(true);
    }
  });

  it("invalid paymentMethod '99' full message is 'Must be 10 (cash), 30 (credit), 42 (bank transfer), 48 (card), or 1 (not defined)'", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      paymentMethod: "99",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(
        messages.some(
          (m) =>
            m ===
            "Must be 10 (cash), 30 (credit), 42 (bank transfer), 48 (card), or 1 (not defined)"
        )
      ).toBe(true);
    }
  });
});

describe("contextual error messages — vatPercent", () => {
  it("invalid vatPercent 0.1 includes '15% (0.15)' in error messages", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      lineItems: [
        {
          id: "1",
          name: "TEST ITEM",
          quantity: 2,
          taxExclusivePrice: 100,
          vatPercent: 0.1,
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(messages.some((m) => m.includes("15% (0.15)"))).toBe(true);
    }
  });

  it("invalid vatPercent 0.1 full message is 'Saudi Arabia standard VAT rate is 15% (0.15)'", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      lineItems: [
        {
          id: "1",
          name: "TEST ITEM",
          quantity: 2,
          taxExclusivePrice: 100,
          vatPercent: 0.1,
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = collectMessages(result.error.issues);
      expect(
        messages.some(
          (m) => m === "Saudi Arabia standard VAT rate is 15% (0.15)"
        )
      ).toBe(true);
    }
  });
});
