import { describe, it, expect } from "vitest";
import {
  GENESIS_PREVIOUS_INVOICE_HASH,
  InvoiceType,
  TransactionTypeCode,
  PaymentMeans,
  VATCategory,
  ExemptionReasonCode,
  BuyerIdScheme,
} from "../constants";

describe("Constants", () => {
  describe("GENESIS_PREVIOUS_INVOICE_HASH", () => {
    it("exports the correct genesis hash value", () => {
      expect(GENESIS_PREVIOUS_INVOICE_HASH).toBe(
        "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ=="
      );
    });

    it("is a string", () => {
      expect(typeof GENESIS_PREVIOUS_INVOICE_HASH).toBe("string");
    });
  });

  describe("InvoiceType", () => {
    it("exports INVOICE code", () => {
      expect(InvoiceType.INVOICE).toBe("388");
    });

    it("exports CREDIT_NOTE code", () => {
      expect(InvoiceType.CREDIT_NOTE).toBe("381");
    });

    it("exports DEBIT_NOTE code", () => {
      expect(InvoiceType.DEBIT_NOTE).toBe("383");
    });

    it("exports PREPAYMENT code", () => {
      expect(InvoiceType.PREPAYMENT).toBe("386");
    });

    it("has correct literal types", () => {
      const invoiceType: "388" = InvoiceType.INVOICE;
      expect(invoiceType).toBe("388");
    });
  });

  describe("TransactionTypeCode", () => {
    it("exports TAX_INVOICE code", () => {
      expect(TransactionTypeCode.TAX_INVOICE).toBe("0100000");
    });

    it("exports SIMPLIFIED code", () => {
      expect(TransactionTypeCode.SIMPLIFIED).toBe("0200000");
    });

    it("has correct literal types", () => {
      const taxInvoice: "0100000" = TransactionTypeCode.TAX_INVOICE;
      expect(taxInvoice).toBe("0100000");
    });
  });

  describe("PaymentMeans", () => {
    it("exports CASH code", () => {
      expect(PaymentMeans.CASH).toBe("10");
    });

    it("exports CREDIT code", () => {
      expect(PaymentMeans.CREDIT).toBe("30");
    });

    it("exports BANK_ACCOUNT code", () => {
      expect(PaymentMeans.BANK_ACCOUNT).toBe("42");
    });

    it("exports BANK_CARD code", () => {
      expect(PaymentMeans.BANK_CARD).toBe("48");
    });

    it("exports NOT_DEFINED code", () => {
      expect(PaymentMeans.NOT_DEFINED).toBe("1");
    });

    it("has correct literal types", () => {
      const cash: "10" = PaymentMeans.CASH;
      expect(cash).toBe("10");
    });
  });

  describe("VATCategory", () => {
    it("exports STANDARD code", () => {
      expect(VATCategory.STANDARD).toBe("S");
    });

    it("exports ZERO_RATED code", () => {
      expect(VATCategory.ZERO_RATED).toBe("Z");
    });

    it("exports EXEMPT code", () => {
      expect(VATCategory.EXEMPT).toBe("E");
    });

    it("exports NOT_SUBJECT code", () => {
      expect(VATCategory.NOT_SUBJECT).toBe("O");
    });

    it("has correct literal types", () => {
      const standard: "S" = VATCategory.STANDARD;
      expect(standard).toBe("S");
    });
  });

  describe("ExemptionReasonCode", () => {
    it("exports VATEX_SA_29", () => {
      expect(ExemptionReasonCode.VATEX_SA_29).toBe("VATEX-SA-29");
    });

    it("exports VATEX_SA_29_7", () => {
      expect(ExemptionReasonCode.VATEX_SA_29_7).toBe("VATEX-SA-29-7");
    });

    it("exports VATEX_SA_30", () => {
      expect(ExemptionReasonCode.VATEX_SA_30).toBe("VATEX-SA-30");
    });

    it("exports VATEX_SA_32", () => {
      expect(ExemptionReasonCode.VATEX_SA_32).toBe("VATEX-SA-32");
    });

    it("exports VATEX_SA_33", () => {
      expect(ExemptionReasonCode.VATEX_SA_33).toBe("VATEX-SA-33");
    });

    it("exports VATEX_SA_34_1", () => {
      expect(ExemptionReasonCode.VATEX_SA_34_1).toBe("VATEX-SA-34-1");
    });

    it("exports VATEX_SA_34_2", () => {
      expect(ExemptionReasonCode.VATEX_SA_34_2).toBe("VATEX-SA-34-2");
    });

    it("exports VATEX_SA_34_3", () => {
      expect(ExemptionReasonCode.VATEX_SA_34_3).toBe("VATEX-SA-34-3");
    });

    it("exports VATEX_SA_34_4", () => {
      expect(ExemptionReasonCode.VATEX_SA_34_4).toBe("VATEX-SA-34-4");
    });

    it("exports VATEX_SA_34_5", () => {
      expect(ExemptionReasonCode.VATEX_SA_34_5).toBe("VATEX-SA-34-5");
    });

    it("exports VATEX_SA_35", () => {
      expect(ExemptionReasonCode.VATEX_SA_35).toBe("VATEX-SA-35");
    });

    it("exports VATEX_SA_36", () => {
      expect(ExemptionReasonCode.VATEX_SA_36).toBe("VATEX-SA-36");
    });

    it("exports VATEX_SA_EDU", () => {
      expect(ExemptionReasonCode.VATEX_SA_EDU).toBe("VATEX-SA-EDU");
    });

    it("exports VATEX_SA_HEA", () => {
      expect(ExemptionReasonCode.VATEX_SA_HEA).toBe("VATEX-SA-HEA");
    });

    it("exports VATEX_SA_MLTRY", () => {
      expect(ExemptionReasonCode.VATEX_SA_MLTRY).toBe("VATEX-SA-MLTRY");
    });

    it("exports VATEX_SA_OOS", () => {
      expect(ExemptionReasonCode.VATEX_SA_OOS).toBe("VATEX-SA-OOS");
    });

    it("has correct literal types", () => {
      const vatex: "VATEX-SA-29" = ExemptionReasonCode.VATEX_SA_29;
      expect(vatex).toBe("VATEX-SA-29");
    });
  });

  describe("BuyerIdScheme", () => {
    it("exports TIN", () => {
      expect(BuyerIdScheme.TIN).toBe("TIN");
    });

    it("exports CRN", () => {
      expect(BuyerIdScheme.CRN).toBe("CRN");
    });

    it("exports MOM", () => {
      expect(BuyerIdScheme.MOM).toBe("MOM");
    });

    it("exports MLS", () => {
      expect(BuyerIdScheme.MLS).toBe("MLS");
    });

    it("exports _700", () => {
      expect(BuyerIdScheme._700).toBe("700");
    });

    it("exports SAG", () => {
      expect(BuyerIdScheme.SAG).toBe("SAG");
    });

    it("exports NAT", () => {
      expect(BuyerIdScheme.NAT).toBe("NAT");
    });

    it("exports GCC", () => {
      expect(BuyerIdScheme.GCC).toBe("GCC");
    });

    it("exports IQA", () => {
      expect(BuyerIdScheme.IQA).toBe("IQA");
    });

    it("exports PAS", () => {
      expect(BuyerIdScheme.PAS).toBe("PAS");
    });

    it("exports OTH", () => {
      expect(BuyerIdScheme.OTH).toBe("OTH");
    });

    it("has correct literal types", () => {
      const tin: "TIN" = BuyerIdScheme.TIN;
      expect(tin).toBe("TIN");
    });
  });
});
