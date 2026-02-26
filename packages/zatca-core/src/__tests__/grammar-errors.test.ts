import { describe, it, expect } from "bun:test";
import { ZATCAInvoice } from "../zatca-simplified-tax-invoice";
import type { ZATCAInvoiceProps } from "../templates/simplified-tax-invoice-template";

describe("Grammar and Error Message Clarity", () => {
  const baseProps: ZATCAInvoiceProps = {
    crnNumber: "1234567890",
    egsInfo: {
      id: "EGS-001",
      name: "Test EGS",
      branchName: "Main Branch",
      branchIndustry: "Retail",
      model: "Model X",
      vatName: "Test VAT",
      vatNumber: "300000000000003",
    },
    invoiceCounterNumber: 1,
    invoiceSerialNumber: "INV-001",
    issueDate: new Date("2025-01-01"),
    previousInvoiceHash: "abc123",
    invoiceCode: "STANDARD",
    paymentMethod: "10",
    lineItems: [],
  };

  describe("Grammar: 'must has' → 'must have'", () => {
    it("should throw error with correct grammar when zero-tax item lacks vatCategory", () => {
      const props: ZATCAInvoiceProps = {
        ...baseProps,
        lineItems: [
          {
            id: "1",
            name: "Zero Tax Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0,
            // Missing vatCategory - should trigger error
          } as any,
        ],
      };

      try {
        new ZATCAInvoice({ props });
        expect.unreachable("Should have thrown an error");
      } catch (error: any) {
        const message = error.message || error.toString();
        // Verify the error contains correct grammar (no 'must has')
        expect(message).toContain("Zero-tax items must specify a VAT category code");
        // Verify the error does NOT contain incorrect grammar 'must has'
        expect(message).not.toContain("must has");
      }
    });
  });

  describe("Zero-tax validation: Clear error messages", () => {
    it("should require vatCategory for zero-tax items", () => {
      const props: ZATCAInvoiceProps = {
        ...baseProps,
        lineItems: [
          {
            id: "1",
            name: "Zero Tax Item",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0,
            // Missing vatCategory
          } as any,
        ],
      };

      try {
        new ZATCAInvoice({ props });
        expect.unreachable("Should have thrown an error");
      } catch (error: any) {
        const message = error.message || error.toString();
        expect(message).toContain("Zero-tax items must specify a VAT category code");
      }
    });

    it("should accept zero-tax items with valid vatCategory (E)", () => {
      const props: ZATCAInvoiceProps = {
        ...baseProps,
        lineItems: [
          {
            id: "1",
            name: "Zero Tax Item - Exempt",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0,
            vatCategory: {
              code: "E",
              reason: "Exempt supply",
              reasonCode: "EXEMPT",
            },
          },
        ],
      };

      // Should not throw
      const result = new ZATCAInvoice({ props });
      expect(result).toBeDefined();
    });

    it("should accept Z category (zero-rated)", () => {
      const props: ZATCAInvoiceProps = {
        ...baseProps,
        lineItems: [
          {
            id: "1",
            name: "Zero Tax Item - Zero Rated",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0,
            vatCategory: {
              code: "Z",
              reason: "Zero-rated supply",
              reasonCode: "ZERO_RATED",
            },
          },
        ],
      };

      const result = new ZATCAInvoice({ props });
      expect(result).toBeDefined();
    });

    it("should accept O category (out-of-scope)", () => {
      const props: ZATCAInvoiceProps = {
        ...baseProps,
        lineItems: [
          {
            id: "1",
            name: "Zero Tax Item - Out of Scope",
            quantity: 1,
            taxExclusivePrice: 100,
            vatPercent: 0,
            vatCategory: {
              code: "O",
              reason: "Out of scope",
              reasonCode: "OUT_OF_SCOPE",
            },
          },
        ],
      };

      const result = new ZATCAInvoice({ props });
      expect(result).toBeDefined();
    });
  });
});
