import { describe, it, expect } from "bun:test";
import { EGSInfoSchema, CustomerInfoSchema } from "../schemas/index.js";

describe("VAT Number Validation", () => {
  describe("EGSInfoSchema (Seller VAT)", () => {
    it("accepts valid VAT number: 300000000000003", () => {
      const validData = {
        branchIndustry: "Test Industry",
        branchName: "Test Branch",
        id: "123",
        model: "Test Model",
        name: "Test EGS",
        vatName: "Test VAT Name",
        vatNumber: "300000000000003",
      };

      const result = EGSInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("rejects VAT number with wrong length: 1234567890", () => {
      const invalidData = {
        branchIndustry: "Test Industry",
        branchName: "Test Branch",
        id: "123",
        model: "Test Model",
        name: "Test EGS",
        vatName: "Test VAT Name",
        vatNumber: "1234567890",
      };

      const result = EGSInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("VAT number must be 15 digits");
      }
    });

    it("rejects VAT number not starting with 3: 200000000000003", () => {
      const invalidData = {
        branchIndustry: "Test Industry",
        branchName: "Test Branch",
        id: "123",
        model: "Test Model",
        name: "Test EGS",
        vatName: "Test VAT Name",
        vatNumber: "200000000000003",
      };

      const result = EGSInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("VAT number must be 15 digits");
      }
    });

    it("rejects VAT number not ending with 3: 300000000000002", () => {
      const invalidData = {
        branchIndustry: "Test Industry",
        branchName: "Test Branch",
        id: "123",
        model: "Test Model",
        name: "Test EGS",
        vatName: "Test VAT Name",
        vatNumber: "300000000000002",
      };

      const result = EGSInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("VAT number must be 15 digits");
      }
    });
  });

  describe("CustomerInfoSchema (Buyer VAT)", () => {
    it("accepts valid VAT number: 300000000000003", () => {
      const validData = {
        buyerName: "Test Buyer",
        vatNumber: "300000000000003",
      };

      const result = CustomerInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts missing VAT number (optional field)", () => {
      const validData = {
        buyerName: "Test Buyer",
      };

      const result = CustomerInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("rejects VAT number with wrong length: 1234567890", () => {
      const invalidData = {
        buyerName: "Test Buyer",
        vatNumber: "1234567890",
      };

      const result = CustomerInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("VAT number must be 15 digits");
      }
    });

    it("rejects VAT number not starting with 3: 200000000000003", () => {
      const invalidData = {
        buyerName: "Test Buyer",
        vatNumber: "200000000000003",
      };

      const result = CustomerInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("VAT number must be 15 digits");
      }
    });

    it("rejects VAT number not ending with 3: 300000000000002", () => {
      const invalidData = {
        buyerName: "Test Buyer",
        vatNumber: "300000000000002",
      };

      const result = CustomerInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const message = result.error.issues[0].message;
        expect(message).toContain("VAT number must be 15 digits");
      }
    });
  });
});
