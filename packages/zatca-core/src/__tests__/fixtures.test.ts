/**
 * Test suite for shared test fixtures.
 * Validates that all fixtures conform to current Zod schemas.
 */

import { describe, it, expect } from "vitest";
import {
  ZATCAInvoicePropsSchema,
  EGSInfoSchema,
  CustomerInfoSchema,
  ZATCAInvoiceLineItemSchema,
} from "../schemas/index";
import {
  SAMPLE_SELLER,
  SAMPLE_LINE_ITEM,
  SAMPLE_LINE_ITEMS,
  SAMPLE_CUSTOMER_INFO,
  SAMPLE_INVOICE_PROPS,
  SAMPLE_CREDIT_NOTE_PROPS,
  SAMPLE_CERTIFICATE,
  SAMPLE_PRIVATE_KEY,
} from "./fixtures";

describe("Shared Test Fixtures", () => {
  describe("SAMPLE_SELLER", () => {
    it("passes EGSInfoSchema validation", () => {
      const result = EGSInfoSchema.safeParse(SAMPLE_SELLER);
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error("Validation errors:", result.error.issues);
      }
    });

    it("has all required fields", () => {
      expect(SAMPLE_SELLER.branchIndustry).toBeDefined();
      expect(SAMPLE_SELLER.branchName).toBeDefined();
      expect(SAMPLE_SELLER.id).toBeDefined();
      expect(SAMPLE_SELLER.model).toBeDefined();
      expect(SAMPLE_SELLER.name).toBeDefined();
      expect(SAMPLE_SELLER.vatName).toBeDefined();
      expect(SAMPLE_SELLER.vatNumber).toBeDefined();
    });
  });

  describe("SAMPLE_LINE_ITEM", () => {
    it("passes ZATCAInvoiceLineItemSchema validation", () => {
      const result = ZATCAInvoiceLineItemSchema.safeParse(SAMPLE_LINE_ITEM);
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error("Validation errors:", result.error.issues);
      }
    });

    it("has all required fields", () => {
      expect(SAMPLE_LINE_ITEM.id).toBeDefined();
      expect(SAMPLE_LINE_ITEM.name).toBeDefined();
      expect(SAMPLE_LINE_ITEM.quantity).toBeDefined();
      expect(SAMPLE_LINE_ITEM.taxExclusivePrice).toBeDefined();
      expect(SAMPLE_LINE_ITEM.vatPercent).toBeDefined();
    });
  });

  describe("SAMPLE_LINE_ITEMS", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(SAMPLE_LINE_ITEMS)).toBe(true);
      expect(SAMPLE_LINE_ITEMS.length).toBeGreaterThan(0);
    });

    it("all items pass ZATCAInvoiceLineItemSchema validation", () => {
      for (const item of SAMPLE_LINE_ITEMS) {
        const result = ZATCAInvoiceLineItemSchema.safeParse(item);
        expect(result.success).toBe(true);
        if (!result.success) {
          console.error(`Item ${item.id} validation errors:`, result.error.issues);
        }
      }
    });

    it("includes items with different VAT rates", () => {
      const vatRates = SAMPLE_LINE_ITEMS.map((item) => item.vatPercent);
      expect(vatRates).toContain(0.15);
      expect(vatRates).toContain(0.05);
      expect(vatRates).toContain(0);
    });

    it("includes zero-tax item with vatCategory", () => {
      const zeroTaxItem = SAMPLE_LINE_ITEMS.find((item) => item.vatPercent === 0);
      expect(zeroTaxItem).toBeDefined();
      expect(zeroTaxItem?.vatCategory).toBeDefined();
      expect(zeroTaxItem?.vatCategory?.code).toBe("Z");
    });
  });

  describe("SAMPLE_CUSTOMER_INFO", () => {
    it("passes CustomerInfoSchema validation", () => {
      const result = CustomerInfoSchema.safeParse(SAMPLE_CUSTOMER_INFO);
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error("Validation errors:", result.error.issues);
      }
    });

    it("has required buyerName field", () => {
      expect(SAMPLE_CUSTOMER_INFO.buyerName).toBeDefined();
      expect(SAMPLE_CUSTOMER_INFO.buyerName.length).toBeGreaterThan(0);
    });
  });

  describe("SAMPLE_INVOICE_PROPS", () => {
    it("passes ZATCAInvoicePropsSchema validation", () => {
      const result = ZATCAInvoicePropsSchema.safeParse(SAMPLE_INVOICE_PROPS);
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error("Validation errors:", result.error.issues);
      }
    });

    it("has all required fields", () => {
      expect(SAMPLE_INVOICE_PROPS.crnNumber).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.egsInfo).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.invoiceCode).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.invoiceCounterNumber).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.invoiceSerialNumber).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.invoiceType).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.issueDate).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.lineItems).toBeDefined();
      expect(SAMPLE_INVOICE_PROPS.previousInvoiceHash).toBeDefined();
    });

    it("uses Date objects for issueDate", () => {
      expect(SAMPLE_INVOICE_PROPS.issueDate).toBeInstanceOf(Date);
    });

    it("has at least one line item", () => {
      expect(SAMPLE_INVOICE_PROPS.lineItems.length).toBeGreaterThan(0);
    });

    it("invoiceType is INVOICE (not CREDIT_NOTE)", () => {
      expect(SAMPLE_INVOICE_PROPS.invoiceType).toBe("INVOICE");
    });
  });

  describe("SAMPLE_CREDIT_NOTE_PROPS", () => {
    it("passes ZATCAInvoicePropsSchema validation", () => {
      const result = ZATCAInvoicePropsSchema.safeParse(SAMPLE_CREDIT_NOTE_PROPS);
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error("Validation errors:", result.error.issues);
      }
    });

    it("has invoiceType CREDIT_NOTE", () => {
      expect(SAMPLE_CREDIT_NOTE_PROPS.invoiceType).toBe("CREDIT_NOTE");
    });

    it("has cancelation object with required fields", () => {
      expect(SAMPLE_CREDIT_NOTE_PROPS.cancelation).toBeDefined();
      expect(SAMPLE_CREDIT_NOTE_PROPS.cancelation?.canceledSerialInvoiceNumber).toBeDefined();
      expect(SAMPLE_CREDIT_NOTE_PROPS.cancelation?.paymentMethod).toBeDefined();
      expect(SAMPLE_CREDIT_NOTE_PROPS.cancelation?.reason).toBeDefined();
    });
  });

  describe("SAMPLE_CERTIFICATE", () => {
    it("is a non-empty string", () => {
      expect(typeof SAMPLE_CERTIFICATE).toBe("string");
      expect(SAMPLE_CERTIFICATE.length).toBeGreaterThan(0);
    });

    it("is base64 encoded (no PEM wrappers)", () => {
      expect(SAMPLE_CERTIFICATE).not.toContain("BEGIN CERTIFICATE");
      expect(SAMPLE_CERTIFICATE).not.toContain("END CERTIFICATE");
      expect(SAMPLE_CERTIFICATE).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });

  describe("SAMPLE_PRIVATE_KEY", () => {
    it("is a non-empty string", () => {
      expect(typeof SAMPLE_PRIVATE_KEY).toBe("string");
      expect(SAMPLE_PRIVATE_KEY.length).toBeGreaterThan(0);
    });

    it("is base64 encoded (no PEM wrappers)", () => {
      expect(SAMPLE_PRIVATE_KEY).not.toContain("BEGIN EC PRIVATE KEY");
      expect(SAMPLE_PRIVATE_KEY).not.toContain("END EC PRIVATE KEY");
      expect(SAMPLE_PRIVATE_KEY).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });
});
