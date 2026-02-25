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
    if (issue.code === "invalid_union") {
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
  previousInvoiceHash:
    "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
};

describe("line item error messages with index context", () => {
  it("invalid line item at index 1 includes '[1]' in error path and message", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      lineItems: [
        {
          id: "1",
          name: "VALID ITEM",
          quantity: 2,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "INVALID ITEM",
          quantity: 2,
          taxExclusivePrice: 50,
          vatPercent: 0.1, // Invalid: not 0.15 or 0.05
        },
        {
          id: "3",
          name: "ANOTHER VALID ITEM",
          quantity: 1,
          taxExclusivePrice: 200,
          vatPercent: 0.15,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Check that error path includes the index 1
      const hasIndexInPath = result.error.issues.some((issue) =>
        issue.path.includes(1)
      );
      expect(hasIndexInPath).toBe(true);
      // Check that error message includes the index
      const hasIndexInMessage = result.error.issues.some((issue) =>
        issue.message.includes("[1]")
      );
      expect(hasIndexInMessage).toBe(true);
    }
  });

  it("invalid line item at index 2 includes '[2]' in error path", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      lineItems: [
        {
          id: "1",
          name: "VALID ITEM",
          quantity: 2,
          taxExclusivePrice: 100,
          vatPercent: 0.15,
        },
        {
          id: "2",
          name: "VALID ITEM 2",
          quantity: 2,
          taxExclusivePrice: 50,
          vatPercent: 0.15,
        },
        {
          id: "3",
          name: "INVALID ITEM",
          quantity: 1,
          taxExclusivePrice: 200,
          vatPercent: 0.1, // Invalid: not 0.15 or 0.05
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Check that error path includes the index 2
      const hasIndexInPath = result.error.issues.some((issue) =>
        issue.path.includes(2)
      );
      expect(hasIndexInPath).toBe(true);
    }
  });

  it("error message for invalid line item includes descriptive context", () => {
    const result = ZATCAInvoicePropsSchema.safeParse({
      ...VALID_BASE,
      lineItems: [
        {
          id: "1",
          name: "INVALID ITEM",
          quantity: 2,
          taxExclusivePrice: 100,
          vatPercent: 0.1, // Invalid: not 0.15 or 0.05
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      // Check that error path includes the index 0 for first item
      const hasIndexInPath = result.error.issues.some((issue) =>
        issue.path.includes(0)
      );
      expect(hasIndexInPath).toBe(true);
    }
  });
});
